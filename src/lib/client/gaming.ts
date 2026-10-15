import { read, write } from "@/lib/storage";
import { getGameBySlug } from "@/games/registry";
import { object, finite, text } from "./validation";
export type GameStat = {
  launches: number;
  ms: number;
  best: number;
  last: number;
};
export type Statistics = {
  version: 1;
  games: Record<string, GameStat>;
  days: string[];
  longest: number;
  roulette: string[];
};
export const emptyStats: Statistics = {
  version: 1,
  games: {},
  days: [],
  longest: 0,
  roulette: [],
};
export function validStats(v: unknown): v is Statistics {
  return (
    object(v) &&
    v.version === 1 &&
    object(v.games) &&
    Object.keys(v.games).length <= 1000 &&
    Object.entries(v.games).every(
      ([k, g]) =>
        !!getGameBySlug(k) &&
        object(g) &&
        ["launches", "ms", "best", "last"].every((x) => finite(g[x])),
    ) &&
    Array.isArray(v.days) &&
    v.days.length <= 10000 &&
    v.days.every((x) => text(x, 10) && /^\d{4}-\d{2}-\d{2}$/.test(x)) &&
    finite(v.longest) &&
    Array.isArray(v.roulette) &&
    v.roulette.length <= 1000 &&
    v.roulette.every((x) => typeof x === "string" && !!getGameBySlug(x))
  );
}
export function getStats() {
  const v = read("statistics", emptyStats);
  return validStats(v) ? v : emptyStats;
}
export const totals = (s: Statistics) => ({
  launches: Object.values(s.games).reduce((n, g) => n + g.launches, 0),
  unique: Object.keys(s.games).length,
  ms: Object.values(s.games).reduce((n, g) => n + g.ms, 0),
});
export const achievementDefinitions = [
  {
    id: "first",
    name: "First Game Played",
    description: "Launch your first game.",
    icon: "Gamepad2",
    target: 1,
    progress: (s: Statistics) => totals(s).launches,
  },
  {
    id: "five",
    name: "Five Games Played",
    description: "Launch games five times.",
    icon: "Play",
    target: 5,
    progress: (s: Statistics) => totals(s).launches,
  },
  {
    id: "ten",
    name: "Ten Different Games",
    description: "Explore ten different games.",
    icon: "Compass",
    target: 10,
    progress: (s: Statistics) => totals(s).unique,
  },
  {
    id: "score",
    name: "First High Score",
    description: "Earn a positive high score in a supported game.",
    icon: "Trophy",
    target: 1,
    progress: (s: Statistics) =>
      Object.values(s.games).some((g) => g.best > 0) ? 1 : 0,
  },
  {
    id: "return",
    name: "Returning Player",
    description: "Play on two different days.",
    icon: "Calendar",
    target: 2,
    progress: (s: Statistics) => s.days.length,
  },
  {
    id: "favorites",
    name: "Five Favorites",
    description: "Save five favorite games.",
    icon: "Heart",
    target: 5,
    progress: (_s: Statistics, f: string[]) => f.length,
  },
  {
    id: "roulette",
    name: "Roulette Winner",
    description: "Launch a game selected by Surprise Me.",
    icon: "Shuffle",
    target: 1,
    progress: (s: Statistics) => s.roulette.length,
  },
  {
    id: "explorer",
    name: "Game Explorer",
    description: "Play games from four categories.",
    icon: "Map",
    target: 4,
    progress: (s: Statistics) =>
      new Set(
        Object.keys(s.games).map((k) => getGameBySlug(k)?.metadata.category),
      ).size,
  },
  {
    id: "dedicated",
    name: "Dedicated Player",
    description: "Accumulate one hour of active playtime.",
    icon: "Clock",
    target: 3600000,
    progress: (s: Statistics) => totals(s).ms,
  },
];
export type Achievements = { version: 1; unlocked: Record<string, number> };
export const emptyAchievements: Achievements = { version: 1, unlocked: {} };
export function validAchievements(v: unknown): v is Achievements {
  return (
    object(v) &&
    v.version === 1 &&
    object(v.unlocked) &&
    Object.entries(v.unlocked).every(
      ([k, t]) => achievementDefinitions.some((a) => a.id === k) && finite(t),
    )
  );
}
export function checkAchievements(stats = getStats()) {
  const saved = read("achievements", emptyAchievements);
  const state = validAchievements(saved)
    ? { ...saved, unlocked: { ...saved.unlocked } }
    : { version: 1 as const, unlocked: {} };
  const favorites = read<string[]>("favorites", []);
  const newly: string[] = [];
  for (const a of achievementDefinitions)
    if (
      !state.unlocked[a.id] &&
      a.progress(
        stats,
        Array.isArray(favorites)
          ? favorites.filter((slug) => !!getGameBySlug(slug))
          : [],
      ) >= a.target
    ) {
      state.unlocked[a.id] = Date.now();
      newly.push(a.name);
    }
  if (newly.length && write("achievements", state))
    window.dispatchEvent(
      new CustomEvent("orbit-achievement", { detail: newly }),
    );
}
const launched = new Set<string>();
export function launchGame(slug: string, session: string, roulette = false) {
  if (!getGameBySlug(slug) || launched.has(session)) return;
  launched.add(session);
  if (launched.size > 1000) launched.delete(launched.values().next().value!);
  const s = getStats();
  const now = Date.now();
  const d = new Date(now);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const g = s.games[slug] || { launches: 0, ms: 0, best: 0, last: 0 };
  const next: Statistics = {
    ...s,
    games: {
      ...s.games,
      [slug]: { ...g, launches: g.launches + 1, last: now },
    },
    days: [...new Set([...s.days, day])],
    roulette: roulette ? [...new Set([...s.roulette, slug])] : s.roulette,
  };
  write("statistics", next);
  checkAchievements(next);
}
export function recordScore(slug: string, score: number) {
  const saved = read<number>(`game:${slug}:highScore`, 0);
  if (finite(saved)) score = Math.max(score, saved);
  if (!getGameBySlug(slug) || !finite(score) || score === 0) return;
  const s = getStats();
  const g = s.games[slug];
  if (!g || g.best >= score) return;
  const next = { ...s, games: { ...s.games, [slug]: { ...g, best: score } } };
  write("statistics", next);
  checkAchievements(next);
}
export function recordTime(slug: string, ms: number, sessionMs: number) {
  if (!finite(ms, 120000) || !finite(sessionMs)) return;
  const s = getStats();
  const g = s.games[slug];
  if (!g) return;
  const next = {
    ...s,
    games: { ...s.games, [slug]: { ...g, ms: g.ms + ms } },
    longest: Math.max(s.longest, sessionMs),
  };
  write("statistics", next);
  checkAchievements(next);
}
export function roulettePool(
  category: string,
  favorites: string[],
  recent: string[],
  excludeFavorites: boolean,
  excludeRecent: boolean,
) {
  return importRegistry.filter(
    (g) =>
      (category === "all" || g.metadata.category === category) &&
      (!excludeFavorites || !favorites.includes(g.metadata.slug)) &&
      (!excludeRecent || !recent.includes(g.metadata.slug)) &&
      (g.metadata.kind === "native" ||
        g.metadata.sourcePath.startsWith("/external-games/")),
  );
}
import { allGames as importRegistry } from "@/games/registry";
export function activeDelta(
  last: number,
  now: number,
  visible: boolean,
  playing: boolean,
  lastInput: number,
) {
  return visible && playing && now - lastInput < 60000
    ? Math.max(0, Math.min(now - last, 2000))
    : 0;
}
export const duration = (ms: number) =>
  `${Math.floor(ms / 3600000)}h ${Math.floor(ms / 60000) % 60}m ${Math.floor(ms / 1000) % 60}s`;

export function beginGame(slug: string, session: string) {
  if (launched.has(session)) return;
  let roulette = false;
  try {
    roulette = sessionStorage.getItem("orbit:roulette") === slug;
    if (roulette) sessionStorage.removeItem("orbit:roulette");
  } catch {}
  launchGame(slug, session, roulette);
}
