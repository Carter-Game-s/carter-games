"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { MediaEntry } from "@/lib/media/catalog";
import { useStorage } from "@/lib/storage/use-storage";
import styles from "./media.module.css";

export type Progress = Record<string, number>;
export function MediaLibrary({ entries }: { entries: MediaEntry[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [view, setView] = useState("all");
  const [favorites] = useStorage<string[]>("media-favorites", []);
  const [watchlist] = useStorage<string[]>("media-watchlist", []);
  const [progress] = useStorage<Progress>("media-progress", {});
  const genres = [...new Set(entries.flatMap((entry) => entry.genres))].sort();
  const resumeKey = (entry: MediaEntry) =>
    Object.keys(progress).findLast(
      (key) => key === entry.id || key.startsWith(entry.id + "/"),
    );
  const hasProgress = (entry: MediaEntry) => !!resumeKey(entry);
  function detailHref(entry: MediaEntry, resume: boolean) {
    const href = `/movies/${entry.id}`;
    const key = resume && entry.kind === "show" ? resumeKey(entry) : undefined;
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
  const browsing = !query.trim() && !genre && view === "all";
  function section(title: string, items: MediaEntry[], resume = false) {
    if (!items.length) return null;
    return (
      <section className={styles.section}>
        <h2>{title}</h2>
        <div className="cards">
          {items.map((entry) => (
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
      </div>
      {!matches.length && (
        <p role="status" className="muted">
          No titles match this view.
        </p>
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
