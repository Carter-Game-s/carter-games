"use client";
import Link from "next/link";
import { Shuffle, Trophy, ChartNoAxesColumn } from "lucide-react";
import { useState } from "react";
import { Search } from "lucide-react";
import { allGames } from "@/games/registry";
import { GameCard } from "@/components/games/game-card";
import { useStorage } from "@/lib/storage/use-storage";
import { filterGames } from "@/lib/search/games";
import type { GameCategory } from "@/games/types";
export default function GamesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GameCategory | "all">("all");
  const [view, setView] = useState("all");
  const [visible, setVisible] = useState(24);
  const [favorites] = useStorage<string[]>("favorites", []);
  const [recent] = useStorage<string[]>("recentGames", []);
  const games = filterGames(allGames, query, category).filter((g) =>
    view === "favorites"
      ? favorites.includes(g.metadata.slug)
      : view === "recent"
        ? recent.includes(g.metadata.slug)
        : view === "featured"
          ? g.metadata.featured
          : true,
  );
  if (view === "recent")
    games.sort(
      (a, b) =>
        recent.indexOf(a.metadata.slug) - recent.indexOf(b.metadata.slug),
    );
  return (
    <div className="page">
      <div className="eyebrow">Press play</div>
      <h1>A little friendly competition.</h1>
      <p className="muted">
        Classics you know. High scores to beat. All right here.
      </p>
      <div className="feature-actions">
        <Link className="button" href="/games/roulette">
          <Shuffle size={18} />
          Surprise Me
        </Link>
        <Link className="button" href="/games/achievements">
          <Trophy size={18} />
          Achievements
        </Link>
        <Link className="button" href="/games/statistics">
          <ChartNoAxesColumn size={18} />
          My statistics
        </Link>
      </div>
      <div className="library-search mt-8">
        <Search size={20} />
        <input
          aria-label="Search games"
          placeholder="Find a game…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(24);
          }}
        />
        <select
          aria-label="Game collection"
          value={view}
          onChange={(e) => {
            setView(e.target.value);
            setVisible(24);
          }}
        >
          <option value="all">All games</option>
          <option value="featured">Featured</option>
          <option value="favorites">Favorites</option>
          <option value="recent">Recently played</option>
        </select>
      </div>
      <div className="filters">
        {["all", ...new Set(allGames.map((g) => g.metadata.category))].map(
          (c) => (
            <button
              className={category === c ? "selected" : ""}
              key={c}
              onClick={() => {
                setCategory(c as GameCategory | "all");
                setVisible(24);
              }}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ),
        )}
      </div>
      <div className="cards">
        {games.slice(0, visible).map((g) => (
          <GameCard
            key={g.metadata.slug}
            game={g}
            favorite={favorites.includes(g.metadata.slug)}
          />
        ))}
      </div>
      <p className="muted mt-4">
        Showing {Math.min(visible, games.length)} of {games.length} games
      </p>
      {games.length > visible && (
        <button
          className="mt-4"
          onClick={() => setVisible((count) => count + 24)}
        >
          Show more games
        </button>
      )}
      {games.length === 0 && (
        <p className="empty">No games in this collection yet.</p>
      )}
    </div>
  );
}
