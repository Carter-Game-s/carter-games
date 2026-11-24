"use client";
import { useEffect, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { type SiteStatus, siteFeatures } from "@/lib/player-chat/rules";
import styles from "./player.module.css";

export function SiteNotice() {
  const [status, setStatus] = useState<SiteStatus>({
    notice: null,
    pauses: {},
  });
  useEffect(() => {
    let active: AbortController | undefined;
    async function refresh() {
      if (document.visibilityState !== "visible" || active) return;
      const controller = new AbortController();
      active = controller;
      try {
        const response = await fetch("/api/site-status", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const snapshot: SiteStatus = await response.json();
          if (!controller.signal.aborted) setStatus(snapshot);
        }
      } catch {
        // A later refresh or live update can recover the current status.
      } finally {
        if (active === controller) active = undefined;
      }
    }
    const update = (event: Event) => {
      active?.abort();
      active = undefined;
      setStatus((event as CustomEvent<SiteStatus>).detail);
    };
    window.addEventListener("player-site-status", update);
    void refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active?.abort();
      clearInterval(timer);
      window.removeEventListener("player-site-status", update);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const paused = Object.keys(siteFeatures).filter(
    (key) => status.pauses[key as keyof typeof siteFeatures],
  );
  if (!status.notice && !paused.length) return null;
  const Icon = status.notice?.tone === "warning" ? TriangleAlert : Info;
  return (
    <aside
      className={styles.siteNotice}
      data-tone={status.notice?.tone}
      aria-label="Site status"
      role="status"
    >
      <Icon size={19} aria-hidden="true" />
      <div>
        {status.notice && <p>{status.notice.text}</p>}
        {paused.length > 0 && (
          <p>
            Temporarily paused:{" "}
            {paused
              .map((key) => siteFeatures[key as keyof typeof siteFeatures])
              .join(", ")}
            .
          </p>
        )}
      </div>
    </aside>
  );
}
