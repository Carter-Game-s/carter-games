"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { GameDefinition } from "@/games/types";
import { toggleFavorite } from "@/lib/storage";
export function GameCard({
  game,
  favorite = false,
}: {
  game: GameDefinition;
  favorite?: boolean;
}) {
  const m = game.metadata;
  return (
    <article className="game-card">
      <Link href={`/games/${m.slug}`}>
        <img src={m.thumbnail} alt="" loading="lazy" width="320" height="320" />
        <div className="card-body">
          <span className="tag">
            {m.category} · {m.kind === "external" ? "HTML5" : "Original"}
          </span>
          <h3 className="mt-2">{m.title}</h3>
          <p>{m.description}</p>
        </div>
      </Link>
      <button
        className={`favorite ${favorite ? "selected" : ""}`}
        aria-label={`${favorite ? "Remove" : "Add"} ${m.title} ${favorite ? "from" : "to"} favorites`}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(m.slug)}
      >
        <Heart size={16} fill={favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}
