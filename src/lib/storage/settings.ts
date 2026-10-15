import type { SearchEngine } from "../search";
export type Settings = {
  engine: SearchEngine;
  theme: "dark" | "light" | "system";
  showRecent: boolean;
  showQuick: boolean;
  reducedMotion: boolean;
};
export const defaultSettings: Settings = {
  engine: "bing",
  theme: "dark",
  showRecent: true,
  showQuick: true,
  reducedMotion: false,
};
export function normalizeSettings(value: unknown): Settings {
  const v =
    value && typeof value === "object" ? (value as Partial<Settings>) : {};
  return {
    engine: ["google", "bing", "duckduckgo"].includes(String(v.engine))
      ? v.engine!
      : defaultSettings.engine,
    theme: ["dark", "light", "system"].includes(String(v.theme))
      ? v.theme!
      : defaultSettings.theme,
    showRecent: typeof v.showRecent === "boolean" ? v.showRecent : true,
    showQuick: typeof v.showQuick === "boolean" ? v.showQuick : true,
    reducedMotion:
      typeof v.reducedMotion === "boolean" ? v.reducedMotion : false,
  };
}
