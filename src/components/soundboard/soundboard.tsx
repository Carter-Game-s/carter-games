"use client";
import { useEffect, useRef, useState } from "react";
import { Heart, Play, Search, Square, Volume2 } from "lucide-react";
import {
  featuredSounds,
  soundAudioURL,
  soundSourceURL,
  type Sound,
} from "@/lib/soundboard/catalog";
import { useStorage } from "@/lib/storage/use-storage";
import styles from "./soundboard.module.css";

export function Soundboard() {
  const [sounds, setSounds] = useState(featuredSounds);
  const [favorites, saveFavorites] = useStorage<Sound[]>("sound-favorites", []);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(featuredSounds.length);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [playing, setPlaying] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const search = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      audio.current?.pause();
      search.current?.abort();
    },
    [],
  );
  function stop() {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }
  async function play(sound: Sound) {
    stop();
    setMessage("");
    const next = new Audio(soundAudioURL(sound));
    next.volume = volume;
    next.preload = "none";
    audio.current = next;
    setPlaying(sound.id);
    next.onended = () => {
      if (audio.current === next) setPlaying(null);
    };
    next.onerror = () => {
      if (audio.current === next) {
        setPlaying(null);
        setMessage("This sound could not load. Try another sound.");
      }
    };
    try {
      await next.play();
    } catch (e) {
      if (audio.current === next && (e as Error).name !== "AbortError") {
        setPlaying(null);
        setMessage("Playback failed. Please try again.");
      }
    }
  }
  async function load(text: string, nextPage = 0) {
    search.current?.abort();
    const controller = new AbortController();
    search.current = controller;
    setBusy(true);
    setMessage("");
    setFavoriteOnly(false);
    try {
      const response = await fetch(
        `/api/sounds?q=${encodeURIComponent(text)}&page=${nextPage}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setSounds(data.sounds);
      setTotal(data.total);
      setPage(nextPage);
      setSubmitted(text);
    } catch (e) {
      if (!controller.signal.aborted) setMessage((e as Error).message);
    } finally {
      if (search.current === controller) setBusy(false);
    }
  }
  const visible = favoriteOnly
    ? favorites.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()),
      )
    : sounds;
  return (
    <div className="page">
      <div className="eyebrow">Press play. Set the mood.</div>
      <h1>Soundboard.</h1>
      <p className="muted">
        Your favorite reactions, sound effects, and meme buttons.
      </p>
      <form
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          void load(query.trim());
        }}
      >
        <Search size={19} />
        <input
          aria-label="Search sounds"
          placeholder="Find a sound…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
        />
        <button className="primary" disabled={busy}>
          Search sounds
        </button>
      </form>
      <div className={styles.toolbar}>
        <button
          aria-pressed={!favoriteOnly}
          onClick={() => {
            setQuery("");
            void load("");
          }}
        >
          Featured
        </button>
        <button
          aria-pressed={favoriteOnly}
          onClick={() => {
            setFavoriteOnly((v) => !v);
            setQuery("");
          }}
        >
          Favorites ({favorites.length})
        </button>
        <button onClick={stop}>
          <Square size={15} /> Stop sound
        </button>
        <label className={styles.volume}>
          <Volume2 size={18} /> Volume{" "}
          <input
            aria-label="Sound volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const value = Number(e.target.value);
              setVolume(value);
              if (audio.current) audio.current.volume = value;
            }}
          />
        </label>
      </div>
      <p role="status" className="muted">
        {busy
          ? "Finding sounds…"
          : `${visible.length} sounds${submitted && !favoriteOnly ? ` · ${total} results for “${submitted}”` : ""}`}
        {playing !== null ? " · Playing" : ""}
      </p>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      <div className={styles.grid}>
        {visible.map((sound) => {
          const saved = favorites.some((s) => s.id === sound.id);
          return (
            <article className={styles.card} key={sound.id}>
              <button
                className={`${styles.pad} ${playing === sound.id ? styles.playing : ""}`}
                aria-label={`Play ${sound.name}`}
                onClick={() => void play(sound)}
              >
                <Play size={25} fill="currentColor" />
              </button>
              <h2>{sound.name}</h2>
              <span className="muted">{sound.category}</span>
              <div className={styles.actions}>
                <button
                  aria-label={`${saved ? "Remove" : "Save"} ${sound.name} ${saved ? "from" : "to"} favorites`}
                  aria-pressed={saved}
                  onClick={() =>
                    saveFavorites(
                      saved
                        ? favorites.filter((s) => s.id !== sound.id)
                        : [...favorites, sound].slice(-200),
                    )
                  }
                >
                  <Heart size={16} fill={saved ? "currentColor" : "none"} />
                </button>
                <a
                  href={soundSourceURL(sound)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sound source ↗
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && !busy && (
        <p className="muted">
          {favoriteOnly
            ? "Save sounds with the heart button to build your board."
            : "No sounds found. Try a different search."}
        </p>
      )}
      {submitted && !favoriteOnly && (
        <div className={styles.toolbar}>
          <button
            disabled={page === 0 || busy}
            onClick={() => void load(submitted, page - 1)}
          >
            Previous sounds
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={busy || (page + 1) * 24 >= total}
            onClick={() => void load(submitted, page + 1)}
          >
            Next sounds
          </button>
        </div>
      )}
      <p className="muted">
        Sounds play from{" "}
        <a
          href="https://soundbuttonsworld.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          SoundButtonsWorld
        </a>
        . Credits and ownership remain with the original creators. Favorites
        stay on this device.
      </p>
    </div>
  );
}
