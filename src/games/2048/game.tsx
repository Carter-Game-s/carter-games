"use client";
import { useState, useEffect, useCallback } from "react";
import type { NativeGameProps } from "../types";
import { useKeys } from "../shared/hooks";
import { move2048, addTile, initial2048, hasMoves } from "./logic";
export default function Game({
  metadata,
  runtime,
  className,
}: NativeGameProps) {
  const [board, setBoard] = useState<number[]>(Array(16).fill(0));
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "paused" | "won" | "lost">(
    "playing",
  );
  const [ready, setReady] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [touch, setTouch] = useState<[number, number] | null>(null);
  useEffect(() => {
    const saved = runtime.storage.get<{
      board: number[];
      score: number;
    } | null>("save", null);
    if (
      saved &&
      saved.board.length === 16 &&
      saved.board.every((n) => Number.isInteger(n) && n >= 0) &&
      Number.isFinite(saved.score)
    ) {
      setBoard(saved.board);
      setScore(saved.score);
      setHasWon(saved.board.some((n) => n >= 2048));
      setStatus(hasMoves(saved.board) ? "playing" : "lost");
    } else setBoard(initial2048());
    setReady(true);
  }, [runtime.storage]);
  useEffect(() => {
    if (!ready) return;
    runtime.reportScore(score);
    runtime.setStatus(status);
    runtime.storage.set("save", { board, score });
  }, [board, score, status, ready, runtime]);
  const move = useCallback(
    (direction: number) => {
      if (status !== "playing" || !ready) return;
      const next = move2048(board, direction);
      if (!next.changed) return;
      const b = addTile(next.board);
      setBoard(b);
      setScore(score + next.score);
      const firstWin = !hasWon && b.some((n) => n >= 2048);
      if (firstWin) setHasWon(true);
      setStatus(firstWin ? "won" : hasMoves(b) ? "playing" : "lost");
    },
    [board, score, status, ready, hasWon],
  );
  function restart() {
    setBoard(initial2048());
    setScore(0);
    setHasWon(false);
    setStatus("playing");
  }
  useKeys((k) => {
    const d: Record<string, number> = {
      arrowleft: 0,
      a: 0,
      arrowright: 1,
      d: 1,
      arrowup: 2,
      w: 2,
      arrowdown: 3,
      s: 3,
    };
    if (k in d) {
      move(d[k]);
      return true;
    }
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
  });
  return (
    <section
      className={`native-game ${className ?? ""}`}
      aria-label={metadata.title}
    >
      <div className="game-toolbar">
        <button onClick={restart}>New game</button>
        <button
          onClick={() =>
            setStatus((s) =>
              s === "playing" ? "paused" : s === "paused" ? "playing" : s,
            )
          }
          disabled={status === "won" || status === "lost"}
        >
          {status === "paused" ? "Resume" : "Pause"}
        </button>
        <p role="status">
          {status} · Score {score}
        </p>
        {status === "won" && (
          <button onClick={() => setStatus("playing")}>Keep playing</button>
        )}
      </div>
      <div
        className="tile-grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", touchAction: "none" }}
        aria-label="2048 board"
        onPointerDown={(e) => {
          setTouch([e.clientX, e.clientY]);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          if (!touch) return;
          const dx = e.clientX - touch[0],
            dy = e.clientY - touch[1];
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 20)
            move(
              Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : dy > 0 ? 3 : 2,
            );
          setTouch(null);
        }}
      >
        {board.map((n, i) => (
          <div
            className={`tile ${n ? "value" : ""}`}
            key={i}
            style={
              n
                ? {
                    background: `hsl(${85 - Math.log2(n) * 5} 35% ${Math.max(25, 65 - Math.log2(n) * 3)}%)`,
                  }
                : undefined
            }
            aria-label={`Cell ${i + 1}: ${n || "empty"}`}
          >
            {n || ""}
          </div>
        ))}
      </div>
      <div className="dpad">
        {[2, 0, 3, 1].map((d) => (
          <button
            key={d}
            aria-label={["Move left", "Move right", "Move up", "Move down"][d]}
            onClick={() => move(d)}
          >
            {["←", "→", "↑", "↓"][d]}
          </button>
        ))}
      </div>
    </section>
  );
}
