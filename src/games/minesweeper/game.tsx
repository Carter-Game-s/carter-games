"use client";
import { useState, useEffect, useRef } from "react";
import type { NativeGameProps } from "../types";
import { mineBoard, reveal, type MineCell } from "./logic";
import { useKeys } from "../shared/hooks";
const blank = () =>
  Array.from({ length: 81 }, () => ({
    mine: false,
    open: false,
    flag: false,
    count: 0,
  }));
export default function Game({
  metadata,
  runtime,
  className,
}: NativeGameProps) {
  const [cells, setCells] = useState<MineCell[]>(blank);
  const [begun, setBegun] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "playing" | "paused" | "won" | "lost"
  >("idle");
  const [flag, setFlag] = useState(false);
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const score = cells.filter((c) => c.open && !c.mine).length;
  useEffect(() => {
    runtime.setStatus(status);
    runtime.reportScore(score);
    runtime.storage.set("lastCleared", score);
  }, [status, score, runtime]);
  function restart() {
    setCells(blank());
    setBegun(false);
    setStatus("idle");
  }
  function play(i: number, mark = flag) {
    if (["won", "lost", "paused"].includes(status)) return;
    if (mark) {
      setCells((cs) =>
        cs.map((c, n) => (n === i && !c.open ? { ...c, flag: !c.flag } : c)),
      );
      return;
    }
    if (cells[i].flag || cells[i].open) return;
    const board = begun ? cells : mineBoard(i);
    if (!begun) {
      board.forEach((c, n) => (c.flag = cells[n].flag));
      setBegun(true);
    }
    const next = reveal(board, i);
    if (next[i].mine) {
      setStatus("lost");
      next.forEach((c) => {
        if (c.mine) c.open = true;
      });
    } else
      setStatus(
        next.filter((c) => c.open && !c.mine).length === 71 ? "won" : "playing",
      );
    setCells(next);
  }
  useKeys((k) => {
    if (k === "r") {
      restart();
      return true;
    }
    if (k === "p") {
      setStatus((s) =>
        s === "playing" ? "paused" : s === "paused" ? "playing" : s,
      );
      return true;
    }
    if (k === "f") {
      play(focus, true);
      return true;
    }
    const ds: Record<string, number> = {
      arrowleft: -1,
      arrowright: 1,
      arrowup: -9,
      arrowdown: 9,
    };
    if (k in ds) {
      const next = Math.max(0, Math.min(80, focus + ds[k]));
      setFocus(next);
      refs.current[next]?.focus();
      return true;
    }
  });
  return (
    <section
      className={`native-game ${className ?? ""}`}
      aria-label={metadata.title}
    >
      <div className="game-toolbar">
        <button onClick={restart}>New board</button>
        <button onClick={() => setFlag((f) => !f)} aria-pressed={flag}>
          {flag ? "Flag mode" : "Reveal mode"}
        </button>
        <button
          disabled={!["playing", "paused"].includes(status)}
          onClick={() =>
            setStatus((s) => (s === "paused" ? "playing" : "paused"))
          }
        >
          {status === "paused" ? "Resume" : "Pause"}
        </button>
        <p role="status">
          {status} · {score}/71 safe · {10 - cells.filter((c) => c.flag).length}{" "}
          mines
        </p>
      </div>
      <div
        className="tile-grid mine-grid"
        style={{ gridTemplateColumns: "repeat(9,1fr)" }}
        aria-label="Mine field"
      >
        {cells.map((c, i) => (
          <button
            ref={(el) => {
              refs.current[i] = el;
            }}
            key={i}
            className={`tile ${c.open ? "revealed" : ""}`}
            aria-label={`Row ${Math.floor(i / 9) + 1} column ${(i % 9) + 1}: ${c.open ? (c.mine ? "mine" : c.count + " adjacent mines") : c.flag ? "flagged" : "hidden"}`}
            onFocus={() => setFocus(i)}
            onClick={() => play(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              play(i, true);
            }}
          >
            {c.open ? (c.mine ? "✹" : c.count || "") : c.flag ? "⚑" : "·"}
          </button>
        ))}
      </div>
    </section>
  );
}
