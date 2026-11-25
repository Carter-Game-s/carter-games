"use client";
import { useState, useEffect, useRef } from "react";
import type { ExternalGameMetadata } from "@/games/types";
import { read, write } from "@/lib/storage";
export function ExternalGamePlayer({
  metadata,
  packed,
  onReady,
}: {
  metadata: ExternalGameMetadata;
  packed: boolean;
  onReady?: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const retries = useRef(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const [save, setSave] = useState<string | null>(null);
  const check = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<
    "loading" | "loaded" | "slow" | "retrying" | "error"
  >("loading");
  useEffect(() => {
    setStatus("loading");
    check.current = new AbortController();
    const timer = setTimeout(
      () => setStatus((s) => (s === "loading" ? "slow" : s)),
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
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const message = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== "null"
      )
        return;
      if (event.data?.type === "orbit-game-busy") {
        if (retryTimer) return;
        if (retries.current >= 2) {
          setStatus("error");
          return;
        }
        retries.current++;
        setStatus("retrying");
        retryTimer = setTimeout(
          () => setAttempt((value) => value + 1),
          2000 * retries.current + Math.random() * 500,
        );
        return;
      }
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
    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener("message", message);
    };
  }, [metadata.slug, packed, attempt]);
  return (
    <section aria-label={metadata.title} className="w-full">
      <div className="game-toolbar">
        <h2>{metadata.title}</h2>
        <button
          onClick={() => {
            retries.current = 0;
            setAttempt((a) => a + 1);
          }}
        >
          Reload game
        </button>
      </div>
      {status === "loading" && (
        <p className="game-loading" role="status">
          Loading game…
        </p>
      )}
      {status === "retrying" && (
        <p role="status">Other games are loading. Retrying shortly…</p>
      )}
      {status === "slow" && (
        <p role="status">
          Still loading. You can keep waiting or reload the game.
        </p>
      )}
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
              ? `/api/offline-games/${metadata.slug}?delivery=2${attempt ? `&retry=${attempt}` : ""}#orbit-save=${save}`
              : `${metadata.sourcePath}index.html`
          }
          title={metadata.title}
          sandbox={
            packed ? "allow-scripts allow-pointer-lock" : "allow-scripts"
          }
          allow="autoplay; fullscreen"
          loading="eager"
          referrerPolicy="no-referrer"
          onLoad={() => {
            if (packed) {
              setStatus((current) =>
                current === "error" || current === "retrying"
                  ? current
                  : "loaded",
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
          Preparing the game file. Larger games take longer on the first visit.
        </p>
      )}
    </section>
  );
}
