"use client";
import { useState, useEffect, useRef } from "react";
import type { ExternalGameMetadata } from "@/games/types";
import { read, write } from "@/lib/storage";
import manifest from "@/lib/offline-games/manifest.json";
export function ExternalGamePlayer({
  metadata,
  onReady,
}: {
  metadata: ExternalGameMetadata;
  onReady?: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const packed = Object.hasOwn(manifest.games, metadata.slug);
  const [save, setSave] = useState<string | null>(null);
  const check = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  useEffect(() => {
    setStatus("loading");
    check.current = new AbortController();
    const timer = setTimeout(
      () => setStatus((s) => (s === "loading" ? "error" : s)),
      packed ? 150000 : 12000,
    );
    return () => {
      clearTimeout(timer);
      check.current?.abort();
    };
  }, [attempt, packed]);
  useEffect(() => {
    if (status === "loaded") readyRef.current?.();
  }, [status]);
  useEffect(() => {
    if (!packed) return;
    const values = read<Record<string, string>>(
      `game:${metadata.slug}:html-save`,
      {},
    );
    setSave(encodeURIComponent(JSON.stringify(values)));
    const message = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== "null"
      )
        return;
      if (event.data?.type === "orbit-game-error") setStatus("error");
      if (event.data?.type !== "orbit-game-storage") return;
      const value: unknown = event.data.values;
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const entries = Object.entries(value);
      if (
        entries.length > 1000 ||
        entries.some(
          ([key, entry]) => key.length > 1000 || typeof entry !== "string",
        )
      )
        return;
      if (JSON.stringify(value).length <= 128 * 1024)
        write(`game:${metadata.slug}:html-save`, value);
    };
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, [metadata.slug, packed, attempt]);
  return (
    <section aria-label={metadata.title} className="w-full">
      <div className="game-toolbar">
        <h2>{metadata.title}</h2>
        <button onClick={() => setAttempt((a) => a + 1)}>Reload game</button>
      </div>
      {status === "loading" && <p role="status">Loading game…</p>}
      {status === "error" && (
        <p role="alert" className="error">
          The game could not load. Reload to try again.
        </p>
      )}
      {(!packed || save !== null) && (
        <iframe
          ref={frame}
          key={attempt}
          className="external-frame"
          src={
            packed
              ? `/api/offline-games/${metadata.slug}#orbit-save=${save}`
              : `${metadata.sourcePath}index.html`
          }
          title={metadata.title}
          sandbox={
            packed ? "allow-scripts allow-pointer-lock" : "allow-scripts"
          }
          allow="autoplay; fullscreen"
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => {
            if (packed) {
              setStatus((current) =>
                current === "error" ? current : "loaded",
              );
              return;
            }
            const signal = check.current?.signal;
            void fetch(`${metadata.sourcePath}index.html`, {
              method: "HEAD",
              signal,
            })
              .then((response) => {
                if (!signal?.aborted)
                  setStatus(response.ok ? "loaded" : "error");
              })
              .catch(() => {
                if (!signal?.aborted) setStatus("error");
              });
          }}
          onError={() => setStatus("error")}
        />
      )}
      {packed && status === "loading" && (
        <p className="muted">
          The first launch downloads the game file. Large games can take a
          minute.
        </p>
      )}
    </section>
  );
}
