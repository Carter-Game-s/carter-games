import { normalizeSettings } from "./settings";
import type { GameStorage } from "@/games/types";
export const PREFIX = "orbit:";
export function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) {
      if (
        key === "appearance" &&
        fallback &&
        typeof fallback === "object" &&
        "selected" in fallback
      ) {
        const legacy = normalizeSettings(
          JSON.parse(
            window.localStorage.getItem(PREFIX + "settings") || "null",
          ),
        );
        return {
          ...fallback,
          selected: legacy.theme === "light" ? "light" : "dark",
        } as T;
      }
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (key === "settings") return normalizeSettings(parsed) as T;
    if (
      ["favorites", "recentGames", "searches", "browsing"].includes(key) &&
      (!Array.isArray(parsed) ||
        parsed.length > 1000 ||
        parsed.some((v) => typeof v !== "string" || v.length > 4096))
    )
      return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}
export function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("orbit-storage", { detail: key }));
    return true;
  } catch {
    window.dispatchEvent(
      new CustomEvent("orbit-storage-error", {
        detail:
          "Local storage is full or unavailable. Your change could not be saved.",
      }),
    );
    return false;
  }
}
export function remove(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
    window.dispatchEvent(new CustomEvent("orbit-storage", { detail: key }));
  } catch {}
}
export function gameStorage(slug: string): GameStorage {
  return {
    get: <T>(key: string, fallback: T) => read(`game:${slug}:${key}`, fallback),
    set: (key, value) => write(`game:${slug}:${key}`, value),
    remove: (key) => remove(`game:${slug}:${key}`),
  };
}
export function clearGames() {
  try {
    Object.keys(window.localStorage)
      .filter(
        (k) => k.startsWith(PREFIX + "game:") || k === PREFIX + "recentGames",
      )
      .forEach((k) => window.localStorage.removeItem(k));
    window.dispatchEvent(new Event("orbit-storage"));
  } catch {}
}
export function toggleFavorite(slug: string) {
  const list = read<string[]>("favorites", []);
  write(
    "favorites",
    list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug],
  );
  window.dispatchEvent(new Event("orbit-game-action"));
}
export function recordRecent(slug: string) {
  write(
    "recentGames",
    [
      slug,
      ...read<string[]>("recentGames", []).filter((s) => s !== slug),
    ].slice(0, 20),
  );
}
