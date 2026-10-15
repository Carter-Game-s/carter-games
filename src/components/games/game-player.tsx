"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Maximize, Minimize, ArrowLeft } from "lucide-react";
import { getGameBySlug } from "@/games/registry";
import { gameStorage, recordRecent } from "@/lib/storage";
import { NativeGameLoader } from "./native-game-loader";
import { ExternalGamePlayer } from "./external-game-player";
import type { GameRuntime } from "@/games/types";
export function GamePlayer({ slug }: { slug: string }) {
  const definition = getGameBySlug(slug);
  const stage = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState("idle");
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const storage = useMemo(() => gameStorage(slug), [slug]);
  useEffect(() => {
    if (!definition) return;
    recordRecent(slug);
    setBest(storage.get("highScore", 0));
  }, [definition, slug, storage]);
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const runtime = useMemo<GameRuntime>(
    () => ({
      storage,
      reportScore: (n) => {
        if (!Number.isFinite(n) || n < 0) return;
        setScore(n);
        const high = storage.get("highScore", 0);
        if (n > high) {
          storage.set("highScore", n);
          setBest(n);
        }
      },
      setStatus,
      requestFullscreen: async () => {
        try {
          if (!stage.current?.requestFullscreen)
            throw new Error("Fullscreen is unavailable in this browser.");
          await stage.current.requestFullscreen();
        } catch (e) {
          setError((e as Error).message);
        }
      },
      exitFullscreen: async () => {
        if (document.fullscreenElement) await document.exitFullscreen();
      },
    }),
    [storage],
  );
  if (!definition)
    return (
      <div className="page">
        <h1>Game not found.</h1>
        <Link className="button" href="/games">
          Back to games
        </Link>
      </div>
    );
  const m = definition.metadata;
  return (
    <div className="page">
      <Link href="/games" className="muted inline-flex items-center gap-2">
        <ArrowLeft size={16} /> Games library
      </Link>
      <div className="player-head">
        <div>
          <h1>{m.title}</h1>
          <p className="muted">{m.description}</p>
        </div>
        <div className="player-stats">
          {m.kind === "native" && (
            <>
              <span>
                Score <strong>{score}</strong>
              </span>
              <span>
                Best <strong>{best}</strong>
              </span>
            </>
          )}
          <button
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => {
              void (fullscreen
                ? runtime.exitFullscreen()
                : runtime.requestFullscreen());
            }}
          >
            {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="game-stage" ref={stage}>
        {m.kind === "native" &&
        definition.metadata.kind === "native" &&
        "load" in definition ? (
          <NativeGameLoader definition={definition} runtime={runtime} />
        ) : m.kind === "external" ? (
          <ExternalGamePlayer metadata={m} />
        ) : null}
        {fullscreen && (
          <button
            className="fixed right-4 top-4 z-10"
            onClick={() => {
              void runtime.exitFullscreen();
            }}
          >
            Exit fullscreen
          </button>
        )}
      </div>
      <div className="instructions">
        <span className="tag">How to play</span>
        {m.controls?.map((c) => (
          <p key={c.label}>
            <strong>{c.label}</strong>
            {c.keys?.length ? " · " + c.keys.join(" / ") : ""} — {c.description}
          </p>
        ))}
        {m.kind === "external" ? (
          <p>
            Isolated HTML5 game. Imported games keep supported saves on this
            device.
          </p>
        ) : (
          <p role="status">
            Game status: {status}. High scores stay on this device.
          </p>
        )}
      </div>
    </div>
  );
}
