"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { MediaEntry } from "@/lib/media/catalog";
import { useStorage } from "@/lib/storage/use-storage";
import { officialEpisodes } from "@/lib/media/official-episodes";
import styles from "./media.module.css";

export type Progress = Record<string, number>;
export function MediaLibrary({ entries }: { entries: MediaEntry[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("default");
  const [favorites] = useStorage<string[]>("media-favorites", []);
  const [watchlist] = useStorage<string[]>("media-watchlist", []);
  const [progress] = useStorage<Progress>("media-progress", {});
  const genres = [...new Set(entries.flatMap((entry) => entry.genres))].sort();
  const latest = new Map<string, { key: string; index: number }>();
  Object.keys(progress).forEach((key, index) =>
    latest.set(key.split("/")[0], { key, index }),
  );
  const hasProgress = (entry: MediaEntry) => latest.has(entry.id);
  function detailHref(entry: MediaEntry, resume: boolean) {
    const href = `/movies/${entry.id}`;
    const key =
      resume && entry.kind === "show" ? latest.get(entry.id)?.key : undefined;
    if (!key) return href;
    const [, season, episode] = key.split("/");
    return /^\d+$/.test(season) && /^\d+$/.test(episode)
      ? `${href}?season=${season}&episode=${episode}`
      : href;
  }
  const matches = entries.filter(
    (entry) =>
      (!genre || entry.genres.includes(genre)) &&
      (view === "all" ||
        entry.kind === view ||
        (view === "favorites" && favorites.includes(entry.id)) ||
        (view === "watchlist" && watchlist.includes(entry.id)) ||
        (view === "continue" && hasProgress(entry))) &&
      [entry.title, entry.description, ...entry.genres]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  if (sort === "newest")
    matches.sort((a, b) => b.released.localeCompare(a.released));
  if (sort === "title")
    matches.sort((a, b) => a.title.localeCompare(b.title, "en-US"));
  const episodes =
    (view === "all" || view === "show") &&
    (!genre || ["Animation", "Comedy"].includes(genre))
      ? officialEpisodes.filter((item) =>
          `South Park ${item.title} ${item.description} S${item.season} E${item.episode} Animation Comedy`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
      : [];
  if (sort === "title")
    episodes.sort((a, b) => a.title.localeCompare(b.title, "en-US"));
  const browsing =
    !query.trim() && !genre && view === "all" && sort === "default";
  function section(title: string, items: MediaEntry[], resume = false) {
    if (!items.length) return null;
    const ordered =
      resume && sort === "default"
        ? [...items].sort(
            (a, b) =>
              (latest.get(b.id)?.index ?? -1) - (latest.get(a.id)?.index ?? -1),
          )
        : items;
    return (
      <section className={styles.section}>
        <h2>{title}</h2>
        <div className="cards">
          {ordered.map((entry) => (
            <article
              className={`game-card ${styles.posterCard}`}
              key={entry.id}
            >
              <Link href={detailHref(entry, resume)}>
                <Image
                  className={styles.poster}
                  src={entry.poster}
                  alt=""
                  width={320}
                  height={480}
                  unoptimized
                />
                <div className="card-body">
                  <span className="tag">
                    {entry.released.slice(0, 4)} ·{" "}
                    {entry.kind === "show" ? "TV show" : "Film"}
                  </span>
                  <h3>{entry.title}</h3>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    );
  }
  return (
    <div className="page">
      <h1>Movies &amp; TV</h1>
      <div className={styles.filters}>
        <input
          aria-label="Search movies and TV"
          placeholder="Search titles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Genre"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
        >
          <option value="">All genres</option>
          {genres.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Collection"
          value={view}
          onChange={(event) => setView(event.target.value)}
        >
          <option value="all">All titles</option>
          <option value="movie">Movies</option>
          <option value="show">TV shows</option>
          <option value="continue">Continue watching</option>
          <option value="favorites">Favorites</option>
          <option value="watchlist">Watchlist</option>
        </select>
        <select
          aria-label="Sort movies and TV"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="default">Default order</option>
          <option value="newest">Newest release</option>
          <option value="title">Title A–Z</option>
        </select>
        {!browsing && (
          <button
            onClick={() => {
              setQuery("");
              setGenre("");
              setView("all");
              setSort("default");
            }}
          >
            Reset movie filters
          </button>
        )}
      </div>
      {!matches.length && !episodes.length && (
        <p role="status" className="muted">
          No titles match this view.
        </p>
      )}
      {episodes.length > 0 && (
        <section className={styles.section} aria-labelledby="official-episodes">
          <h2 id="official-episodes">South Park on South Park Studios</h2>
          <p className="muted">
            TV-MA · Mature audiences. Watch on the official site. Availability
            varies by region.
          </p>
          <div className="cards">
            {episodes.map((item) => (
              <article key={item.path} className="game-card">
                <a href={`https://southpark.cc.com/episodes/${item.path}`}>
                  <div className="card-body">
                    <span className="tag">
                      Season {item.season} · Episode {item.episode}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <span className={styles.source}>
                      Watch on South Park Studios ↗
                    </span>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
      {browsing ? (
        <>
          {section("Continue watching", matches.filter(hasProgress), true)}
          {section(
            "Featured",
            matches.filter((entry) => entry.featured),
          )}
          {genres.map((item) => (
            <div key={item}>
              {section(
                item,
                matches.filter((entry) => entry.genres.includes(item)),
              )}
            </div>
          ))}
        </>
      ) : (
        section("Results", matches, view === "continue")
      )}
    </div>
  );
}
