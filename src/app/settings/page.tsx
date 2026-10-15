"use client";
import { read as readStorage } from "@/lib/storage";
import { defaultAppearance, validAppearance } from "@/lib/client/themes";
function readAppearance() {
  const v = readStorage("appearance", defaultAppearance);
  return validAppearance(v) ? v : defaultAppearance;
}
import Link from "next/link";
import { QuickHideSettings } from "@/components/features/quick-hide-settings";
import { BackupSettings } from "@/components/features/backup-settings";
import { useState } from "react";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultSettings, type Settings } from "@/lib/storage/settings";
import { write, clearGames, remove } from "@/lib/storage";
import type { SearchEngine } from "@/lib/search";
export default function SettingsPage() {
  const [s, save] = useStorage("settings", defaultSettings);
  const [message, setMessage] = useState("");
  function patch(p: Partial<Settings>) {
    save({ ...s, ...p });
  }
  function clear(kind: string) {
    if (!confirm("Clear " + kind + "? This cannot be undone.")) return;
    if (kind === "games") clearGames();
    else remove(kind);
    setMessage("Cleared " + kind + ".");
  }
  return (
    <div className="page settings">
      <div className="eyebrow">Make yourself at home</div>
      <h1>Your preferences.</h1>
      <p className="muted">Saved in this browser, on this device.</p>
      <section className="panel">
        <div className="setting-row">
          <label htmlFor="engine">Default search engine</label>
          <select
            id="engine"
            value={s.engine}
            onChange={(e) => patch({ engine: e.target.value as SearchEngine })}
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="duckduckgo">DuckDuckGo</option>
          </select>
        </div>
        <div className="setting-row">
          <label htmlFor="theme">Appearance</label>
          <select
            id="theme"
            value={s.theme}
            onChange={(e) => {
              patch({ theme: e.target.value as Settings["theme"] });
              if (e.target.value !== "system") {
                const a = readAppearance();
                write("appearance", { ...a, selected: e.target.value });
              }
            }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
        {(
          [
            ["showRecent", "Recent searches on home"],
            ["showQuick", "Quick websites on home"],
            ["reducedMotion", "Reduce interface animations"],
          ] as const
        ).map(([key, label]) => (
          <div className="setting-row" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              type="checkbox"
              checked={s[key]}
              onChange={(e) => patch({ [key]: e.target.checked })}
            />
          </div>
        ))}
      </section>
      <div className="feature-actions mt-8">
        <Link className="button" href="/settings/appearance">
          Themes &amp; Appearance
        </Link>
        <Link className="button" href="/settings/saves">
          Game save backups
        </Link>
      </div>
      <QuickHideSettings />
      <BackupSettings />
      <h2 className="mt-8">Start fresh</h2>
      <section className="panel">
        {[
          ["searches", "Search history"],
          ["browsing", "Browsing history"],
          ["games", "Game saves & high scores"],
        ].map(([key, label]) => (
          <div className="setting-row" key={key}>
            <span>{label}</span>
            <button onClick={() => clear(key)}>Clear</button>
          </div>
        ))}
      </section>
      <p role="status" className="muted mt-4">
        {message}
      </p>
    </div>
  );
}
