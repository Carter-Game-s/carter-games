"use client";
import Link from "next/link";
import {
  Trophy,
  Lock,
  Gamepad2,
  Clock,
  Heart,
  Compass,
  Calendar,
  Play,
  Shuffle,
  Map,
} from "lucide-react";
import { useStorage } from "@/lib/storage/use-storage";
import { write, gameStorage } from "@/lib/storage";
import { allGames, getGameBySlug } from "@/games/registry";
import {
  achievementDefinitions,
  emptyAchievements,
  validAchievements,
  emptyStats,
  validStats,
  totals,
  duration,
} from "@/lib/client/gaming";
const icons = {
  Trophy,
  Gamepad2,
  Clock,
  Heart,
  Compass,
  Calendar,
  Play,
  Shuffle,
  Map,
};
export function AchievementGallery() {
  const [stats] = useStorage("statistics", emptyStats, validStats);
  const [state] = useStorage(
    "achievements",
    emptyAchievements,
    validAchievements,
  );
  const [favorites] = useStorage<string[]>("favorites", []);
  return (
    <div className="feature-grid">
      {achievementDefinitions.map((a) => {
        const unlocked = state.unlocked[a.id];
        const progress = Math.min(a.target, a.progress(stats, favorites));
        const Icon = icons[a.icon as keyof typeof icons];
        return (
          <article className="panel achievement" key={a.id}>
            <Icon size={30} />
            <h2>{a.name}</h2>
            <p>{a.description}</p>
            <progress
              max={a.target}
              value={progress}
              aria-label={`${a.name} progress`}
            />
            <p>
              {a.id === "dedicated" ? duration(progress) : progress} /{" "}
              {a.id === "dedicated" ? "1 hour" : a.target}
            </p>
            <span className="tag">
              {unlocked ? (
                <>
                  <Trophy size={14} />
                  Unlocked {new Date(unlocked).toLocaleDateString()}
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Locked
                </>
              )}
            </span>
          </article>
        );
      })}
    </div>
  );
}
export function GamingStatistics() {
  const [s] = useStorage("statistics", emptyStats, validStats);
  const [favorites] = useStorage<string[]>("favorites", []);
  const [achievements] = useStorage(
    "achievements",
    emptyAchievements,
    validAchievements,
  );
  const t = totals(s);
  const ranked = Object.entries(s.games).sort(
    (a, b) => b[1].launches - a[1].launches,
  );
  return (
    <>
      <div className="feature-grid">
        {[
          ["Total game launches", t.launches],
          ["Unique games played", t.unique],
          ["Active playtime", duration(t.ms)],
          ["Longest active session", duration(s.longest)],
          ["Favorites", favorites.length],
          [
            "Achievements",
            `${Object.keys(achievements.unlocked).length} / ${achievementDefinitions.length}`,
          ],
        ].map(([label, value]) => (
          <section className="panel" key={label}>
            <h2>{value}</h2>
            <p>{label}</p>
          </section>
        ))}
      </div>
      <p className="muted">
        Time counts while a game is playing, this window is focused and visible,
        and there was activity within the last minute. External games without
        pause or input reporting use visible activity estimates; their internal
        pause state cannot be measured.
      </p>
      <h2>Most played</h2>
      {!ranked.length && <p>Play a game to begin your local statistics.</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Launches</th>
              <th>Active time</th>
              <th>High score</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 30).map(([slug, g]) => (
              <tr key={slug}>
                <td>
                  <Link href={"/games/" + slug}>
                    {getGameBySlug(slug)?.metadata.title}
                  </Link>
                </td>
                <td>{g.launches}</td>
                <td>{duration(g.ms)}</td>
                <td>
                  {getGameBySlug(slug)?.metadata.kind === "native"
                    ? g.best
                    : "Not reported"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Saved high scores</h2>
      <div className="feature-actions">
        {allGames
          .filter((g) => g.metadata.kind === "native")
          .map((g) => {
            const value = gameStorage(g.metadata.slug).get<unknown>(
              "highScore",
              0,
            );
            return (
              <Link
                className="button"
                href={"/games/" + g.metadata.slug}
                key={g.metadata.slug}
              >
                {g.metadata.title}:{" "}
                {typeof value === "number" && Number.isFinite(value)
                  ? value
                  : 0}
              </Link>
            );
          })}
      </div>
      <h2>Recently played</h2>
      <div className="feature-actions">
        {Object.entries(s.games)
          .sort((a, b) => b[1].last - a[1].last)
          .slice(0, 10)
          .map(([slug]) => (
            <Link className="button" key={slug} href={"/games/" + slug}>
              {getGameBySlug(slug)?.metadata.title}
            </Link>
          ))}
      </div>
      <h2>Favorite games</h2>
      <div className="feature-actions">
        {allGames
          .filter((g) => favorites.includes(g.metadata.slug))
          .slice(0, 30)
          .map((g) => (
            <Link
              className="button"
              key={g.metadata.slug}
              href={"/games/" + g.metadata.slug}
            >
              {g.metadata.title}
            </Link>
          ))}
      </div>
      <Link className="button" href="/games/achievements">
        Achievement progress
      </Link>
      <button
        onClick={() => {
          if (
            confirm(
              "Reset gaming statistics and achievements? Game saves and favorites will remain.",
            )
          ) {
            write("statistics", emptyStats);
            write("achievements", emptyAchievements);
          }
        }}
      >
        Reset statistics
      </button>
    </>
  );
}
