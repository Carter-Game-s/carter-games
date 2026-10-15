"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowDown, Settings2 } from "lucide-react";
import { allGames, getGameBySlug } from "@/games/registry";
import { GameCard } from "@/components/games/game-card";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultHome, validHome, type Widget } from "@/lib/client/preferences";
import {
  emptyStats,
  validStats,
  totals,
  duration,
  emptyAchievements,
  validAchievements,
  achievementDefinitions,
} from "@/lib/client/gaming";
import { move } from "@/lib/client/validation";
const names: Record<Widget, string> = {
  search: "Search",
  favorites: "Favorite games",
  recent: "Recently played",
  continue: "Continue Playing",
  quick: "Quick links",
  random: "Random Game",
  statistics: "Personal statistics",
  achievements: "Achievement progress",
  chat: "AI Chat shortcut",
};
export function HomeCustomizer({
  children,
  search,
}: {
  children: React.ReactNode;
  search: React.ReactNode;
}) {
  const router = useRouter();
  const [layout, save] = useStorage("home", defaultHome, validHome);
  const [editing, setEditing] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [favorites] = useStorage<string[]>("favorites", []);
  const [recent] = useStorage<string[]>("recentGames", []);
  const [stats] = useStorage("statistics", emptyStats, validStats);
  const [a] = useStorage("achievements", emptyAchievements, validAchievements);
  const t = totals(stats);
  function reorder(from: number, to: number) {
    save({ ...layout, order: move(layout.order, from, to) });
  }
  function widget(k: Widget) {
    if (k === "search") return search;
    if (k === "favorites" || k === "recent") {
      const slugs = k === "favorites" ? favorites : recent;
      return (
        <section>
          <h2>{names[k]}</h2>
          <div className="cards">
            {slugs.slice(0, 4).flatMap((slug) => {
              const game = getGameBySlug(slug);
              return game
                ? [
                    <GameCard
                      key={slug}
                      game={game}
                      favorite={favorites.includes(slug)}
                    />,
                  ]
                : [];
            })}
          </div>
          {!slugs.length && (
            <p className="muted">
              {k === "favorites"
                ? "Save games with the heart button."
                : "Your played games will appear here."}
            </p>
          )}
        </section>
      );
    }
    if (k === "continue") {
      const game = recent.map(getGameBySlug).find(Boolean);
      return (
        <section className="panel">
          <h2>Continue Playing</h2>
          {game ? (
            <Link className="button" href={"/games/" + game.metadata.slug}>
              {game.metadata.title}
            </Link>
          ) : (
            <Link href="/games">Find your first game</Link>
          )}
          <p className="muted">
            Reopens the game with its supported local saves.
          </p>
        </section>
      );
    }
    if (k === "quick")
      return (
        <section className="panel">
          <h2>Quick links</h2>
          <div className="feature-actions">
            {[
              ["Games", "/games"],
              ["Soundboard", "/soundboard"],
              ["Browser", "/browser"],
              ["Settings", "/settings"],
            ].map(([name, url]) => (
              <Link className="button" key={url} href={url}>
                {name}
              </Link>
            ))}
          </div>
        </section>
      );
    if (k === "random")
      return (
        <section className="panel">
          <h2>Random Game</h2>
          <Link href="/games/roulette" className="button">
            Surprise Me
          </Link>
          <button
            onClick={() => {
              const g =
                allGames[
                  crypto.getRandomValues(new Uint32Array(1))[0] %
                    allGames.length
                ];
              router.push("/games/" + g.metadata.slug);
            }}
          >
            Play a random game now
          </button>
        </section>
      );
    if (k === "statistics")
      return (
        <section className="panel">
          <h2>Personal statistics</h2>
          <p>
            {t.launches} launches · {t.unique} games · {duration(t.ms)} active
          </p>
          <Link href="/games/statistics">View statistics →</Link>
        </section>
      );
    if (k === "achievements")
      return (
        <section className="panel">
          <h2>Achievement progress</h2>
          <progress
            value={Object.keys(a.unlocked).length}
            max={achievementDefinitions.length}
            aria-label="Achievement progress"
          />
          <p>
            {Object.keys(a.unlocked).length} / {achievementDefinitions.length}{" "}
            unlocked
          </p>
          <Link href="/games/achievements">View achievements →</Link>
        </section>
      );
    return (
      <section className="panel">
        <h2>AI Chat</h2>
        <p>Continue a conversation or start a new question.</p>
        <Link className="button" href="/chat">
          Open Carter AI
        </Link>
      </section>
    );
  }
  return (
    <>
      <div className="home-customize">
        <button onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          <Settings2 size={16} />
          Customize homepage
        </button>
      </div>
      {editing && (
        <section className="panel">
          <h2>Homepage layout</h2>
          <label>
            <input
              type="checkbox"
              checked={layout.enabled}
              onChange={(e) => save({ ...layout, enabled: e.target.checked })}
            />
            Use personalized homepage
          </label>
          <label>
            Homepage density
            <select
              value={layout.density}
              onChange={(e) =>
                save({
                  ...layout,
                  density: e.target.value as typeof layout.density,
                })
              }
            >
              <option>comfortable</option>
              <option>compact</option>
            </select>
          </label>
          {layout.order.map((key, i) => (
            <div
              className="setting-row"
              key={key}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null) reorder(drag, i);
                setDrag(null);
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={!layout.hidden.includes(key)}
                  onChange={(e) =>
                    save({
                      ...layout,
                      hidden: e.target.checked
                        ? layout.hidden.filter((k) => k !== key)
                        : [...layout.hidden, key],
                    })
                  }
                />
                {names[key]}
              </label>
              <div className="feature-actions">
                <button
                  disabled={i === 0}
                  aria-label={`Move ${names[key]} up`}
                  onClick={() => reorder(i, i - 1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  disabled={i === layout.order.length - 1}
                  aria-label={`Move ${names[key]} down`}
                  onClick={() => reorder(i, i + 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              if (confirm("Reset your homepage layout?")) save(defaultHome);
            }}
          >
            Reset homepage layout
          </button>
        </section>
      )}
      {layout.enabled ? (
        <div className="home-widgets" data-density={layout.density}>
          {layout.order
            .filter((k) => !layout.hidden.includes(k))
            .map((k) => (
              <div key={k}>{widget(k)}</div>
            ))}
        </div>
      ) : (
        children
      )}
    </>
  );
}
