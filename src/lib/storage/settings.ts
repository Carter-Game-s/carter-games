import type { SearchEngine } from "../search";
export type Settings = {
  engine: SearchEngine;
  theme: "dark" | "light" | "system";
  showRecent: boolean;
  showQuick: boolean;
  reducedMotion: boolean;
};
export const defaultSettings: Settings = {
  engine: "duckduckgo",
  theme: "dark",
  showRecent: true,
  showQuick: true,
  reducedMotion: false,
};
