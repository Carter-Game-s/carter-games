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
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/site-status", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) setStatus(await response.json());
      } catch {}
    }
    const update = (event: Event) =>
      setStatus((event as CustomEvent<SiteStatus>).detail);
    window.addEventListener("player-site-status", update);
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
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
