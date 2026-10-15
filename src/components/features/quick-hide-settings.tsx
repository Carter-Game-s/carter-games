"use client";
import { useState } from "react";
import { EyeOff } from "lucide-react";
import { useStorage } from "@/lib/storage/use-storage";
import {
  defaultPreferences,
  defaultQuickHide,
  validPreferences,
  type QuickHide,
} from "@/lib/client/preferences";
import { safeURL } from "@/lib/client/validation";
export function QuickHideSettings() {
  const [p, save] = useStorage(
    "preferences",
    defaultPreferences,
    validPreferences,
  );
  const [url, setURL] = useState<string | null>(null);
  const [error, setError] = useState("");
  function patch(v: Partial<QuickHide>) {
    save({ ...p, quickHide: { ...p.quickHide, ...v } });
  }
  return (
    <section className="panel" id="quick-hide">
      <h2>
        <EyeOff size={22} />
        Quick Hide
      </h2>
      <p className="muted">
        Navigate this tab to your chosen website. This does not erase history or
        affect monitoring.
      </p>
      <label>
        <input
          type="checkbox"
          checked={p.quickHide.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Enable Quick Hide
      </label>
      <label>
        Destination website
        <input
          aria-label="Quick Hide destination"
          value={url ?? p.quickHide.url}
          onChange={(e) => setURL(e.target.value)}
        />
      </label>
      <button
        onClick={() => {
          try {
            const normalized = safeURL(url ?? p.quickHide.url);
            patch({ url: normalized });
            setURL(null);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Save destination
      </button>
      <label>
        Shortcut
        <select
          aria-label="Quick Hide shortcut"
          value={p.quickHide.shortcut}
          onChange={(e) =>
            patch({ shortcut: e.target.value as QuickHide["shortcut"] })
          }
        >
          <option value="double-escape">Double Escape</option>
          <option value="ctrl-shift-h">Ctrl + Shift + H</option>
          <option value="alt-q">Alt + Q</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={p.quickHide.button}
          onChange={(e) => patch({ button: e.target.checked })}
        />
        Show navigation button when enabled
      </label>
      <div className="feature-actions">
        <button
          disabled={!p.quickHide.enabled}
          onClick={() => {
            try {
              window.location.replace(safeURL(url ?? p.quickHide.url));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Test Quick Hide
        </button>
        <button
          onClick={() => {
            patch(defaultQuickHide);
            setURL(null);
            setError("");
          }}
        >
          Reset Quick Hide to defaults
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <label>
        <input
          type="checkbox"
          checked={p.restoreBrowser}
          onChange={(e) => save({ ...p, restoreBrowser: e.target.checked })}
        />
        Restore previous browser session
      </label>
      <p className="muted">
        Restores Carter tab URLs, order, groups and supported in-app navigation
        entries. External website login state and URLs containing authentication
        parameters are not saved.
      </p>
      <label>
        <input
          type="checkbox"
          checked={p.achievementNotices}
          onChange={(e) => save({ ...p, achievementNotices: e.target.checked })}
        />
        Achievement unlock notifications
      </label>
      <label>
        <input
          type="checkbox"
          checked={p.commandPalette}
          onChange={(e) => save({ ...p, commandPalette: e.target.checked })}
        />
        Command palette keyboard shortcut
      </label>
    </section>
  );
}
