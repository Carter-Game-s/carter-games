"use client";
import { useState, useEffect, useRef } from "react";
import type { ExternalGameMetadata } from "@/games/types";
export function ExternalGamePlayer({
  metadata,
}: {
  metadata: ExternalGameMetadata;
}) {
  const [attempt, setAttempt] = useState(0);
  const check = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  useEffect(() => {
    setStatus("loading");
    check.current = new AbortController();
    const timer = setTimeout(
      () => setStatus((s) => (s === "loading" ? "error" : s)),
      12000,
    );
    return () => {
      clearTimeout(timer);
      check.current?.abort();
    };
  }, [attempt]);
  return (
    <section aria-label={metadata.title} className="w-full">
      <div className="game-toolbar">
        <h2>{metadata.title}</h2>
        <button onClick={() => setAttempt((a) => a + 1)}>Reload game</button>
      </div>
      {status === "loading" && <p role="status">Loading game…</p>}
      {status === "error" && (
        <p role="alert" className="error">
          The game did not load in time. Reload to try again.
        </p>
      )}
      <iframe
        key={attempt}
        className="external-frame"
        src={`${metadata.sourcePath}index.html`}
        title={metadata.title}
        sandbox="allow-scripts"
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => {
          const signal = check.current?.signal;
          void fetch(`${metadata.sourcePath}index.html`, {
            method: "HEAD",
            signal,
          })
            .then((response) => {
              if (!signal?.aborted) setStatus(response.ok ? "loaded" : "error");
            })
            .catch(() => {
              if (!signal?.aborted) setStatus("error");
            });
        }}
        onError={() => setStatus("error")}
      />
    </section>
  );
}
