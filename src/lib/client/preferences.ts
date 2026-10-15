import { object, safeURL, text, onlyKeys } from "./validation";
export type QuickHide = {
  enabled: boolean;
  url: string;
  shortcut: "double-escape" | "ctrl-shift-h" | "alt-q";
  button: boolean;
};
export const defaultQuickHide: QuickHide = {
  enabled: false,
  url: "https://www.wikipedia.org/",
  shortcut: "double-escape",
  button: true,
};
export function validQuickHide(v: unknown): v is QuickHide {
  if (
    !object(v) ||
    !onlyKeys(v, ["enabled", "url", "shortcut", "button"]) ||
    typeof v.enabled !== "boolean" ||
    typeof v.button !== "boolean" ||
    !["double-escape", "ctrl-shift-h", "alt-q"].includes(String(v.shortcut)) ||
    !text(v.url, 2048)
  )
    return false;
  try {
    return safeURL(v.url) === v.url;
  } catch {
    return false;
  }
}
export const widgets = [
  "search",
  "favorites",
  "recent",
  "continue",
  "quick",
  "random",
  "statistics",
  "achievements",
  "chat",
] as const;
export type Widget = (typeof widgets)[number];
export type HomeLayout = {
  version: 1;
  enabled: boolean;
  order: Widget[];
  hidden: Widget[];
  density: "compact" | "comfortable";
};
export const defaultHome: HomeLayout = {
  version: 1,
  enabled: false,
  order: [...widgets],
  hidden: [],
  density: "comfortable",
};
export function validHome(v: unknown): v is HomeLayout {
  return (
    object(v) &&
    v.version === 1 &&
    onlyKeys(v, ["version", "enabled", "order", "hidden", "density"]) &&
    typeof v.enabled === "boolean" &&
    Array.isArray(v.order) &&
    v.order.length === widgets.length &&
    new Set(v.order).size === widgets.length &&
    v.order.every((x) => widgets.includes(x)) &&
    Array.isArray(v.hidden) &&
    v.hidden.length <= widgets.length &&
    v.hidden.every((x) => widgets.includes(x)) &&
    ["compact", "comfortable"].includes(String(v.density))
  );
}
export type ClientPreferences = {
  version: 1;
  quickHide: QuickHide;
  restoreBrowser: boolean;
  achievementNotices: boolean;
  commandPalette: boolean;
};
export const defaultPreferences: ClientPreferences = {
  version: 1,
  quickHide: defaultQuickHide,
  restoreBrowser: false,
  achievementNotices: true,
  commandPalette: true,
};
export function validPreferences(v: unknown): v is ClientPreferences {
  return (
    object(v) &&
    v.version === 1 &&
    onlyKeys(v, [
      "version",
      "quickHide",
      "restoreBrowser",
      "achievementNotices",
      "commandPalette",
    ]) &&
    validQuickHide(v.quickHide) &&
    ["restoreBrowser", "achievementNotices", "commandPalette"].every(
      (k) => typeof v[k] === "boolean",
    )
  );
}
export function quickHideKey(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "repeat"
    | "ctrlKey"
    | "shiftKey"
    | "altKey"
    | "metaKey"
    | "timeStamp"
  >,
  shortcut: QuickHide["shortcut"],
  last: number | null,
): { fire: boolean; last: number | null } {
  if (event.repeat) return { fire: false, last };
  if (shortcut === "double-escape") {
    if (
      event.key !== "Escape" ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey
    )
      return { fire: false, last: null };
    return last !== null &&
      event.timeStamp - last <= 600 &&
      event.timeStamp > last
      ? { fire: true, last: null }
      : { fire: false, last: event.timeStamp };
  }
  return {
    fire:
      shortcut === "ctrl-shift-h"
        ? event.ctrlKey &&
          event.shiftKey &&
          !event.altKey &&
          !event.metaKey &&
          event.key.toLowerCase() === "h"
        : event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.key.toLowerCase() === "q",
    last: null,
  };
}
