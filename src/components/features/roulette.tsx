"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shuffle } from "lucide-react";
import { allGames } from "@/games/registry";
import type { GameDefinition } from "@/games/types";
import { useStorage } from "@/lib/storage/use-storage";
import { roulettePool } from "@/lib/client/gaming";
import { defaultSettings } from "@/lib/storage/settings";
export function Roulette() {
  const [category, setCategory] = useState("all");
  const [excludeFavorites, setExcludeFavorites] = useState(false);
  const [excludeRecent, setExcludeRecent] = useState(false);
  const [favorites] = useStorage<string[]>("favorites", []);
  const [recent] = useStorage<string[]>("recentGames", []);
  const [settings] = useStorage("settings", defaultSettings);
  const [selected, setSelected] = useState<GameDefinition | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [label, setLabel] = useState("Ready to spin");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const end = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (end.current) clearTimeout(end.current);
    },
    [],
  );
  const pool = roulettePool(
    category,
    favorites,
    recent,
    excludeFavorites,
    excludeRecent,
  );
  function spin() {
    if (!pool.length || spinning) return;
    const choice =
      pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
    setSelected(null);
    const reduced =
      settings.reducedMotion ||
      matchMedia("(prefers-reduced-motion:reduce)").matches;
    const finish = () => {
      setSelected(choice);
      setLabel(choice.metadata.title);
      setSpinning(false);
    };
    if (reduced) {
      finish();
      return;
    }
    setSpinning(true);
    timer.current = setInterval(
      () =>
        setLabel(pool[Math.floor(Math.random() * pool.length)].metadata.title),
      90,
    );
    end.current = setTimeout(() => {
      if (timer.current) clearInterval(timer.current);
      finish();
    }, 1400);
  }
  return (
    <section className="panel">
      <h2>
        <Shuffle size={22} />
        Surprise Me
      </h2>
      <div className="feature-grid">
        <label>
          Roulette category
          <select
            aria-label="Roulette category"
            value={category}
            disabled={spinning}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["all", ...new Set(allGames.map((g) => g.metadata.category))].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={excludeFavorites}
            disabled={spinning}
            onChange={(e) => setExcludeFavorites(e.target.checked)}
          />
          Exclude favorites
        </label>
        <label>
          <input
            type="checkbox"
            checked={excludeRecent}
            disabled={spinning}
            onChange={(e) => setExcludeRecent(e.target.checked)}
          />
          Exclude recently played
        </label>
      </div>
      <div
        className={`roulette-wheel ${spinning ? "spinning" : ""}`}
        aria-hidden="true"
      >
        {pool.slice(0, 8).map((g, i) => (
          <span
            key={g.metadata.slug}
            className="wheel-label"
            style={{ transform: `rotate(${i * 45}deg) translateY(-78px)` }}
          >
            {g.metadata.title.slice(0, 12)}
          </span>
        ))}
        <Shuffle size={42} />
      </div>
      <p role="status">{label}</p>
      <p className="muted">{pool.length} playable games match your filters.</p>
      <button
        className="primary"
        disabled={!pool.length || spinning}
        onClick={spin}
      >
        {spinning ? "Selecting…" : "Spin the wheel"}
      </button>
      {!pool.length && (
        <p>No matching games. Change the filters to try again.</p>
      )}
      {selected && (
        <article className="roulette-result">
          <img
            src={selected.metadata.thumbnail}
            alt=""
            width={160}
            height={100}
          />
          <h3>{selected.metadata.title}</h3>
          <p>{selected.metadata.description}</p>
          <Link
            className="button primary"
            href={"/games/" + selected.metadata.slug}
            onClick={() => {
              try {
                sessionStorage.setItem(
                  "orbit:roulette",
                  selected.metadata.slug,
                );
              } catch {}
            }}
          >
            Play Now
          </Link>
        </article>
      )}
    </section>
  );
}
