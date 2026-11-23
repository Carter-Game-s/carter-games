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
const compareTitles = new Intl.Collator("en-US", {
  numeric: true,
  sensitivity: "base",
}).compare;

export default function GamesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GameCategory | "all">("all");
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("default");
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
  if (sort !== "default")
    games.sort(
      (a, b) =>
        (sort === "az" ? 1 : -1) *
        compareTitles(a.metadata.title, b.metadata.title),
    );
  else if (view === "recent")
    games.sort(
      (a, b) =>
        recent.indexOf(a.metadata.slug) - recent.indexOf(b.metadata.slug),
    );
  const filtered =
    !!query.trim() ||
    category !== "all" ||
    view !== "all" ||
    sort !== "default";
  function reset() {
    setQuery("");
    setCategory("all");
    setView("all");
    setSort("default");
    setVisible(24);
  }
  return (
    <div className="page">
      <h1>Game library</h1>
      <p className="muted">Find a game by title, category, or collection.</p>
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
      <div className="library-search game-library-controls mt-8">
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
        <select
          aria-label="Sort games"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setVisible(24);
          }}
        >
          <option value="default">Default order</option>
          <option value="az">Title A–Z</option>
          <option value="za">Title Z–A</option>
        </select>
      </div>
      <div className="filters">
        {["all", ...new Set(allGames.map((g) => g.metadata.category))].map(
          (c) => (
            <button
              className={category === c ? "selected" : ""}
              aria-pressed={category === c}
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
      {filtered && (
        <button className="mt-4" onClick={reset}>
          Reset game filters
        </button>
      )}
      <p className="muted mt-4" role="status">
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
      {games.length === 0 && <p className="empty">No games match this view.</p>}
    </div>
  );
}
