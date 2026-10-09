"use client";
import { useState, useEffect, useRef } from "react";
import type { NativeGameProps } from "../types";
import { winner, computerMove } from "./logic";
import { useKeys } from "../shared/hooks";
export default function Game({
  metadata,
  runtime,
  className,
}: NativeGameProps) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [turn, setTurn] = useState("X");
  const [mode, setMode] = useState("computer");
  const [wins, setWins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const result = winner(board);
  useEffect(() => {
    setWins(runtime.storage.get("wins", 0));
  }, [runtime.storage]);
  useEffect(() => {
    runtime.reportScore(wins);
    runtime.storage.set("wins", wins);
  }, [wins, runtime]);
  useEffect(() => {
    runtime.setStatus(
      paused
        ? "paused"
        : result === "X"
          ? "won"
          : result === "O"
            ? "lost"
            : result === "draw"
              ? "won"
              : board.some(Boolean)
                ? "playing"
                : "idle",
    );
  }, [paused, result, board, runtime]);
  useEffect(() => {
    if (mode !== "computer" || turn !== "O" || result || paused) return;
    const timer = setTimeout(() => {
      const i = computerMove(board);
      if (i >= 0) setBoard((b) => b.map((v, n) => (n === i ? "O" : v)));
      setTurn("X");
    }, 280);
    return () => clearTimeout(timer);
  }, [mode, turn, result, paused, board]);
  function reset() {
    setBoard(Array(9).fill(""));
    setTurn("X");
    setPaused(false);
  }
  function play(i: number) {
    if (board[i] || result || paused || (mode === "computer" && turn === "O"))
      return;
    const next = board.map((v, n) => (n === i ? turn : v));
    setBoard(next);
    if (winner(next) === "X") setWins((w) => w + 1);
    setTurn(turn === "X" ? "O" : "X");
  }
  useKeys((k) => {
    if (k === "r") {
      reset();
      return true;
    }
    if (k === "p") {
      setPaused((p) => !p);
      return true;
    }
    const ds: Record<string, number> = {
      arrowleft: -1,
      arrowright: 1,
      arrowup: -3,
      arrowdown: 3,
    };
    if (k in ds) {
      const next = Math.max(0, Math.min(8, focus + ds[k]));
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
        <button onClick={reset}>New round</button>
        <select
          aria-label="Opponent"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            reset();
          }}
        >
          <option value="computer">Computer</option>
          <option value="friend">Two players</option>
        </select>
        <button onClick={() => setPaused((p) => !p)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <p role="status">
          {paused
            ? "Paused"
            : result === "draw"
              ? "Draw"
              : result
                ? `${result} wins`
                : turn + " to play"}{" "}
          · Wins {wins}
        </p>
      </div>
      <div
        className="tile-grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
        aria-label="Tic-Tac-Toe board"
      >
        {board.map((v, i) => (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="tile"
            onFocus={() => setFocus(i)}
            onClick={() => play(i)}
            aria-label={`Row ${Math.floor(i / 3) + 1} column ${(i % 3) + 1}: ${v || "empty"}`}
          >
            {v}
          </button>
        ))}
      </div>
    </section>
  );
}
