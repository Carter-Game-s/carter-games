"use client";
import { useEffect, useRef, useState } from "react";
import { read, write } from "@/lib/storage";
import { useStorage } from "@/lib/storage/use-storage";
import type { MediaEntry, MediaVideo } from "@/lib/media/catalog";
import type { Progress } from "./library";
import styles from "./media.module.css";

function Video({
  video,
  mediaId,
  title,
}: {
  video: MediaVideo;
  mediaId: string;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const lastWrite = useRef(0);
  const element = useRef<HTMLVideoElement>(null);
  const source = video.sources[index];
  useEffect(() => {
    const player = element.current;
    if (!player || source.kind === "embed") return;
    let cleanup: (() => void) | undefined;
    let canceled = false;
    if (
      source.kind !== "hls" ||
      player.canPlayType("application/vnd.apple.mpegurl")
    ) {
      player.src = source.url;
    } else {
      void import("hls.js")
        .then(({ default: Hls }) => {
          if (canceled) return;
          if (!Hls.isSupported()) {
            setError(true);
            return;
          }
          const hls = new Hls({ maxBufferLength: 20 });
          cleanup = () => hls.destroy();
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) setError(true);
          });
          hls.loadSource(source.url);
          hls.attachMedia(player);
        })
        .catch(() => {
          if (!canceled) setError(true);
        });
    }
    return () => {
      canceled = true;
      cleanup?.();
      player.removeAttribute("src");
      player.load();
    };
  }, [source, attempt]);
  function save(clear = false) {
    const player = element.current;
    if (!player || (!clear && player.currentTime < 1)) return;
    const values = read<Progress>("media-progress", {});
    if (clear || player.ended) delete values[mediaId];
    else {
      delete values[mediaId];
      values[mediaId] = Math.floor(player.currentTime);
    }
    write("media-progress", values);
  }
  return (
    <section className={styles.player} aria-label={`Watch ${title}`}>
      {video.sources.length > 1 && (
        <label>
          Video source{" "}
          <select
            value={index}
            onChange={(event) => {
              save();
              setError(false);
              setIndex(Number(event.target.value));
            }}
          >
            {video.sources.map((item, i) => (
              <option value={i} key={i}>
                {i + 1} · {item.kind.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      )}
      {source.kind === "embed" ? (
        <iframe
          src={source.url}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <>
          <video
            ref={element}
            controls
            playsInline
            preload="metadata"
            aria-label={title}
            crossOrigin={
              video.subtitles?.some((track) => track.url.startsWith("https:"))
                ? "anonymous"
                : undefined
            }
            onError={() => setError(true)}
            onLoadedMetadata={(event) => {
              const position = read<Progress>("media-progress", {})[mediaId];
              const player = event.currentTarget;
              if (position > 0 && position < player.duration - 5)
                player.currentTime = position;
            }}
            onTimeUpdate={() => {
              if (Date.now() - lastWrite.current > 5000) {
                lastWrite.current = Date.now();
                save();
              }
            }}
            onSeeked={() => save()}
            onPause={() => save()}
            onEnded={() => save(true)}
          >
            {video.subtitles?.map((track) => (
              <track
                key={track.url}
                kind="subtitles"
                label={track.label}
                srcLang={track.language}
                src={track.url}
              />
            ))}
          </video>
          <label>
            Playback speed{" "}
            <select
              defaultValue="1"
              onChange={(event) => {
                if (element.current)
                  element.current.playbackRate = Number(event.target.value);
              }}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}×
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {error && (
        <div role="alert" className="error">
          This source could not start. Try again or select another source if
          available.{" "}
          <button
            onClick={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          >
            Retry video
          </button>
        </div>
      )}
    </section>
  );
}

export function MediaDetail({
  entry,
  requestedSeason,
  requestedEpisode,
}: {
  entry: MediaEntry;
  requestedSeason: number;
  requestedEpisode: number;
}) {
  const [favorites, setFavorites] = useStorage<string[]>("media-favorites", []);
  const [watchlist, setWatchlist] = useStorage<string[]>("media-watchlist", []);
  const [seasonIndex, setSeason] = useState(() =>
    entry.kind === "show"
      ? Math.max(
          0,
          entry.seasons.findIndex((item) => item.number === requestedSeason),
        )
      : 0,
  );
  const [episodeIndex, setEpisode] = useState(() =>
    entry.kind === "show"
      ? Math.max(
          0,
          entry.seasons[seasonIndex].episodes.findIndex(
            (item) => item.number === requestedEpisode,
          ),
        )
      : 0,
  );
  const season = entry.kind === "show" ? entry.seasons[seasonIndex] : undefined;
  const episode = season?.episodes[episodeIndex];
  const video = entry.kind === "movie" ? entry.video : episode!;
  const id =
    season && episode
      ? `${entry.id}/${season.number}/${episode.number}`
      : entry.id;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(entry.released)
    ? new Date(`${entry.released}T00:00:00Z`).toLocaleDateString("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      })
    : entry.released;
  const favorite = favorites.includes(entry.id);
  const listed = watchlist.includes(entry.id);
  return (
    <>
      <h1>{entry.title}</h1>
      <p className="muted">
        {date} · {entry.genres.join(" · ")} · {Math.round(video.runtime / 60)}{" "}
        min
      </p>
      <p>{entry.description}</p>
      <div className="feature-actions">
        <button
          aria-pressed={favorite}
          onClick={() =>
            setFavorites(
              favorite
                ? favorites.filter((id) => id !== entry.id)
                : [...favorites, entry.id],
            )
          }
        >
          {favorite ? "Remove from favorites" : "Add to favorites"}
        </button>
        <button
          aria-pressed={listed}
          onClick={() =>
            setWatchlist(
              listed
                ? watchlist.filter((id) => id !== entry.id)
                : [...watchlist, entry.id],
            )
          }
        >
          {listed ? "Remove from watchlist" : "Add to watchlist"}
        </button>
      </div>
      {entry.kind === "show" && season && (
        <div className={styles.filters}>
          <label>
            Season{" "}
            <select
              value={seasonIndex}
              onChange={(event) => {
                setSeason(Number(event.target.value));
                setEpisode(0);
              }}
            >
              {entry.seasons.map((item, i) => (
                <option key={item.number} value={i}>
                  Season {item.number}
                </option>
              ))}
            </select>
          </label>
          <label>
            Episode{" "}
            <select
              value={episodeIndex}
              onChange={(event) => setEpisode(Number(event.target.value))}
            >
              {season.episodes.map((item, i) => (
                <option key={item.number} value={i}>
                  {item.number} · {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <Video
        key={id}
        mediaId={id}
        title={episode?.title ?? entry.title}
        video={video}
      />
      <p className="muted">
        {entry.rights}{" "}
        <a className={styles.source} href={entry.reference}>
          Source and rights
        </a>
      </p>
    </>
  );
}
