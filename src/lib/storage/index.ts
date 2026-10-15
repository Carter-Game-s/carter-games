import type { GameStorage } from "@/games/types";
export const PREFIX = "orbit:";
export function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new Event("orbit-storage"));
  } catch {}
}
export function remove(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
    window.dispatchEvent(new Event("orbit-storage"));
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
