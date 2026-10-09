"use client";
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
      <div className="library-search mt-8">
        <Search size={20} />
        <input
          aria-label="Search games"
          placeholder="Find a game…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Game collection"
          value={view}
          onChange={(e) => setView(e.target.value)}
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
              onClick={() => setCategory(c as GameCategory | "all")}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ),
        )}
      </div>
      <div className="cards">
        {games.map((g) => (
          <GameCard
            key={g.metadata.slug}
            game={g}
            favorite={favorites.includes(g.metadata.slug)}
          />
        ))}
      </div>
      {games.length === 0 && (
        <p className="empty">No games in this collection yet.</p>
      )}
    </div>
  );
}
