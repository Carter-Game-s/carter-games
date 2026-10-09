import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { allGames } from "@/games/registry";
import type { GameRuntime } from "@/games/types";
import { move2048, hasMoves } from "@/games/2048/logic";
import { computerMove, winner } from "@/games/tic-tac-toe/logic";
import { mineBoard, reveal } from "@/games/minesweeper/logic";
import { fresh, tick, arcadeInput } from "@/games/shared/arcade-engine";
for (const game of allGames)
  if ("load" in game)
    it(`${game.metadata.title} obeys runtime and removes effects on unmount`, async () => {
      vi.useFakeTimers();
      const ctx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        setLineDash: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
      };
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const add = vi.spyOn(window, "addEventListener"),
        remove = vi.spyOn(window, "removeEventListener");
      const runtime: GameRuntime = {
        storage: { get: (_k, f) => f, set: vi.fn(), remove: vi.fn() },
        reportScore: vi.fn(),
        setStatus: vi.fn(),
        requestFullscreen: async () => {},
        exitFullscreen: async () => {},
      };
      const { default: Game } = await game.load();
      const { unmount } = render(
        <Game metadata={game.metadata} runtime={runtime} />,
      );
      expect(
        screen.getByRole("region", { name: game.metadata.title }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
      const start =
        screen.queryByRole("button", { name: "Start" }) ??
        screen.queryByRole("button", { name: "New game" }) ??
        screen.queryByRole("button", { name: "New board" }) ??
        screen.queryByRole("button", { name: "New round" });
      if (start) fireEvent.click(start);
      if (game.metadata.slug === "minesweeper")
        fireEvent.click(screen.getAllByRole("button", { name: /Row / })[40]);
      if (game.metadata.slug === "tic-tac-toe")
        fireEvent.click(screen.getAllByRole("button", { name: /Row / })[0]);
      act(() => vi.advanceTimersByTime(180));
      expect(runtime.reportScore).toHaveBeenCalled();
      expect(runtime.setStatus).toHaveBeenCalledWith("playing");
      expect(game.metadata.supportsTouch).toBe(true);
      expect(game.metadata.supportsKeyboard).toBe(true);
      const handlers = add.mock.calls.filter((c) =>
        ["keydown", "keyup", "blur"].includes(c[0]),
      );
      expect(handlers.some((c) => c[0] === "keydown")).toBe(true);
      unmount();
      for (const [name, handler] of handlers)
        expect(
          remove.mock.calls.some((c) => c[0] === name && c[1] === handler),
        ).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      const source = readFileSync(
        `src/games/${game.metadata.slug}/game.tsx`,
        "utf8",
      );
      expect(source).toContain("NativeGameProps");
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("@/app");
    });
it("2048 merges once per turn and detects no legal moves", () => {
  const board = [2, 2, 2, 2, ...Array(12).fill(0)];
  expect(move2048(board, 0)).toMatchObject({
    board: [4, 4, 0, 0, ...Array(12).fill(0)],
    score: 8,
    changed: true,
  });
  expect(hasMoves([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2])).toBe(
    false,
  );
});
it("Minesweeper first move is safe and flood reveal finds empty regions", () => {
  const b = mineBoard(40);
  expect(b.filter((c) => c.mine)).toHaveLength(10);
  expect(b[40].mine).toBe(false);
  expect(b[40].count).toBe(0);
  const next = reveal(b, 40);
  expect(next[40].open).toBe(true);
  expect(next.filter((c) => c.open && c.mine)).toHaveLength(0);
});
it("Tic-Tac-Toe computer completes a winning line", () => {
  const b = ["O", "O", "", "X", "X", "", "", "", ""];
  expect(computerMove(b)).toBe(2);
  b[2] = "O";
  expect(winner(b)).toBe("O");
});
it("Snake grows, scores and rejects reversal", () => {
  const s = fresh("snake");
  s.status = "playing";
  s.food = [9, 10];
  arcadeInput(s, "arrowleft");
  expect(s.queued).toEqual([1, 0]);
  for (let i = 0; i < 5; i++) tick(s, 0.035);
  expect(s.score).toBe(10);
  expect(s.snake).toHaveLength(4);
  s.snake[0] = [19, 10];
  for (let i = 0; i < 5; i++) tick(s, 0.035);
  expect(s.status).toBe("lost");
});
it("Pong scores, Breakout clears bricks, Sky Hop responds to flap and collision", () => {
  const pong = fresh("pong");
  pong.status = "playing";
  pong.ball = [419, 10];
  pong.velocity = [200, 0];
  tick(pong, 0.03);
  expect(pong.score).toBe(1);
  const breakout = fresh("breakout");
  breakout.status = "playing";
  breakout.ball = [25, 35];
  breakout.velocity = [0, 100];
  tick(breakout, 0.02);
  expect(breakout.score).toBe(10);
  const bird = fresh("flappy");
  bird.status = "playing";
  arcadeInput(bird, "tap");
  expect(bird.vy).toBeLessThan(0);
  bird.bird = 1;
  tick(bird, 0.03);
  expect(bird.status).toBe("lost");
});
