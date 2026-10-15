"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { EyeOff, Search, X } from "lucide-react";
import { useStorage } from "@/lib/storage/use-storage";
import { read } from "@/lib/storage";
import { defaultSettings } from "@/lib/storage/settings";
import {
  applyTheme,
  defaultAppearance,
  themes,
  validAppearance,
  validTheme,
  type Theme,
} from "@/lib/client/themes";
import {
  defaultPreferences,
  validPreferences,
  quickHideKey,
} from "@/lib/client/preferences";
import { editable, safeURL } from "@/lib/client/validation";
const CommandPalette = lazy(() =>
  import("./command-palette").then((m) => ({ default: m.CommandPalette })),
);
export function ClientTools() {
  const [a] = useStorage("appearance", defaultAppearance, validAppearance);
  const [s] = useStorage("settings", defaultSettings);
  const [p] = useStorage("preferences", defaultPreferences, validPreferences);
  const [preview, setPreview] = useState<Theme | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    document.documentElement.dataset.hydrated = "true";
  }, []);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme:light)"),
      motion = matchMedia("(prefers-reduced-motion:reduce)");
    const update = () => {
      const raw = read("appearance", null);
      const migrated =
        raw === null
          ? s.theme === "light"
            ? themes[1]
            : themes[0]
          : themes[0];
      const selected =
        [...themes, ...a.custom].find((t) => t.id === a.selected) || migrated;
      const theme =
        preview ||
        (s.theme === "system"
          ? system.matches
            ? themes[1]
            : themes[0]
          : raw === null
            ? migrated
            : selected);
      applyTheme(
        theme,
        preview ? { ...a, font: theme.font, density: theme.density } : a,
        s.reducedMotion || motion.matches,
      );
    };
    update();
    system.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => {
      system.removeEventListener("change", update);
      motion.removeEventListener("change", update);
    };
  }, [a, s, preview]);
  useEffect(() => {
    let last: number | null = null;
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "k" &&
        p.commandPalette &&
        !document.fullscreenElement
      ) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (
        !p.quickHide.enabled ||
        editable(e.target) ||
        document.fullscreenElement ||
        document.querySelector('dialog[open],[role="dialog"]') ||
        (e.target instanceof Element &&
          !!e.target.closest(".game-stage") &&
          !e.ctrlKey &&
          !e.altKey)
      ) {
        last = null;
        return;
      }
      const action = quickHideKey(e, p.quickHide.shortcut, last);
      last = action.last;
      if (action.fire) {
        e.preventDefault();
        window.location.replace(safeURL(p.quickHide.url));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [p]);
  useEffect(() => {
    const previewEvent = (e: Event) => {
      const v = (e as CustomEvent).detail;
      setPreview(
        v && (themes.some((t) => t.id === v.id) || validTheme(v)) ? v : null,
      );
    };
    const failure = (e: Event) => setNotice(String((e as CustomEvent).detail));
    const unlock = (e: Event) => {
      if (p.achievementNotices)
        setNotice(
          "Achievement unlocked: " +
            (e as CustomEvent<string[]>).detail.join(", "),
        );
    };
    const actions = () => {
      void import("@/lib/client/gaming").then((m) => m.checkAchievements());
    };
    window.addEventListener("orbit-theme-preview", previewEvent);
    window.addEventListener("orbit-storage-error", failure);
    window.addEventListener("orbit-achievement", unlock);
    window.addEventListener("orbit-game-action", actions);
    return () => {
      window.removeEventListener("orbit-theme-preview", previewEvent);
      window.removeEventListener("orbit-storage-error", failure);
      window.removeEventListener("orbit-achievement", unlock);
      window.removeEventListener("orbit-game-action", actions);
    };
  }, [p.achievementNotices]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <>
      <div className="client-tools">
        <button
          disabled={!ready}
          aria-label="Open command palette"
          title="Commands (Ctrl / ⌘ K)"
          onClick={() => setOpen(true)}
        >
          <Search size={18} />
        </button>
        {p.quickHide.enabled && p.quickHide.button && (
          <button
            aria-label="Quick Hide"
            title="Quick Hide"
            onClick={() => window.location.replace(safeURL(p.quickHide.url))}
          >
            <EyeOff size={18} />
          </button>
        )}
      </div>
      {open && (
        <Suspense fallback={<p role="status">Loading commands…</p>}>
          <CommandPalette onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {notice && (
        <div role="status" className="feature-toast">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
