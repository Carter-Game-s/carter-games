import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/components/games/native-game-loader", () => ({
  NativeGameLoader: () => <div>Native player selected</div>,
}));
vi.mock("@/components/games/external-game-player", () => ({
  ExternalGamePlayer: () => <div>External player selected</div>,
}));
import { GamePlayer } from "@/components/games/game-player";
it("selects native loader for native metadata", () => {
  render(<GamePlayer slug="snake" />);
  expect(screen.getByText("Native player selected")).toBeInTheDocument();
});
it("selects external iframe for external metadata", () => {
  render(<GamePlayer slug="color-tap" />);
  expect(screen.getByText("External player selected")).toBeInTheDocument();
});
it("unknown slugs show not-found and are not recorded as recently played", () => {
  render(<GamePlayer slug="missing-game" />);
  expect(screen.getByText("Game not found.")).toBeInTheDocument();
  expect(window.localStorage.getItem("orbit:recentGames")).toBeNull();
});
