"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import type { NativeGameProps } from "../types";
import {
  fresh,
  tick,
  draw,
  arcadeInput,
  type ArcadeKind,
} from "./arcade-engine";
export function Arcade({
  metadata,
  runtime,
  className,
  kind,
}: NativeGameProps & { kind: ArcadeKind }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef(fresh(kind));
  const runtimeRef = useRef(runtime);
  const [hud, setHud] = useState({ score: 0, status: "idle", opponent: 0 });
  const start = useCallback(() => {
    state.current = fresh(kind);
    state.current.status = "playing";
    if (kind === "flappy") state.current.vy = -220;
  }, [kind]);
  const pause = useCallback(() => {
    const s = state.current;
    if (s.status === "playing") s.status = "paused";
    else if (s.status === "paused") s.status = "playing";
  }, []);
  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);
  useEffect(() => {
    const s = state.current;
    runtimeRef.current.setStatus("idle");
    runtimeRef.current.reportScore(0);
    let frame = 0,
      last = 0,
      previous = "";
    const ctx = canvas.current?.getContext("2d");
    const loop = (now: number) => {
      tick(state.current, last ? (now - last) / 1000 : 0);
      last = now;
      if (ctx) draw(ctx, state.current);
      const current = state.current;
      const signature = `${current.score}:${current.status}:${current.opponent}`;
      if (signature !== previous) {
        previous = signature;
        setHud({
          score: current.score,
          status: current.status,
          opponent: current.opponent,
        });
        runtimeRef.current.reportScore(current.score);
        runtimeRef.current.setStatus(current.status);
        runtimeRef.current.storage.set("lastScore", current.score);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const key = (e: KeyboardEvent) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(
          (e.target as HTMLElement).tagName,
        ) ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
          " ",
          "p",
          "r",
        ].includes(k)
      ) {
        e.preventDefault();
        if (e.type === "keydown" && !e.repeat && k === "r") start();
        else if (e.type === "keydown" && !e.repeat && k === "p") pause();
        else arcadeInput(state.current, k, e.type === "keydown");
      }
    };
    const blur = () => {
      state.current.held.clear();
      if (state.current.status === "playing") state.current.status = "paused";
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
      s.held.clear();
    };
  }, [kind, start, pause]);

  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = state.current;
    if (kind === "flappy") {
      if (e.type === "pointerdown") arcadeInput(s, "tap");
      return;
    }
    if (kind === "snake") return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (kind === "pong")
      s.paddle = ((e.clientY - rect.top) / rect.height) * 360;
    else s.paddle = ((e.clientX - rect.left) / rect.width) * 420;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  return (
    <section
      className={`native-game ${className ?? ""}`}
      aria-label={metadata.title}
    >
      <div className="game-toolbar">
        <button className="primary" onClick={start}>
          {hud.status === "idle" ? "Start" : "New round"}
        </button>
        <button
          onClick={pause}
          disabled={!["playing", "paused"].includes(hud.status)}
        >
          {hud.status === "paused" ? "Resume" : "Pause"}
        </button>
        <p role="status" aria-live="polite">
          {hud.status} ·{" "}
          {kind === "pong"
            ? `${hud.score} : ${hud.opponent}`
            : `Score ${hud.score}`}
        </p>
      </div>
      <div className="game-board">
        <canvas
          ref={canvas}
          width={420}
          height={360}
          aria-label={`${metadata.title} play area. Use keyboard or controls below.`}
          onPointerDown={pointer}
          onPointerMove={(e) => {
            if (e.buttons) pointer(e);
          }}
        />
      </div>
      <div className="dpad">
        {(kind === "snake"
          ? ["arrowup", "arrowleft", "arrowdown", "arrowright"]
          : kind === "pong"
            ? ["arrowup", "arrowdown"]
            : kind === "breakout"
              ? ["arrowleft", "arrowright"]
              : ["tap"]
        ).map((k) => (
          <button
            key={k}
            aria-label={k === "tap" ? "Flap" : "Move " + k.replace("arrow", "")}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              arcadeInput(state.current, k);
            }}
            onPointerUp={() => arcadeInput(state.current, k, false)}
            onPointerCancel={() => arcadeInput(state.current, k, false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                arcadeInput(state.current, k);
            }}
            onKeyUp={() => arcadeInput(state.current, k, false)}
          >
            {
              (
                {
                  arrowup: "↑",
                  arrowleft: "←",
                  arrowdown: "↓",
                  arrowright: "→",
                  tap: "Flap",
                } as Record<string, string>
              )[k]
            }
          </button>
        ))}
      </div>
    </section>
  );
}
