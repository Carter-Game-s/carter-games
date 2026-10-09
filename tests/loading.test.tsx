import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NativeGameLoader } from "@/components/games/native-game-loader";
import { ExternalGamePlayer } from "@/components/games/external-game-player";
import type {
  GameRuntime,
  NativeGameDefinition,
  NativeGameComponent,
} from "@/games/types";
import metadata from "@/games/snake/metadata";
import { allGames } from "@/games/registry";
import GamesPage from "@/app/games/page";
import { read, toggleFavorite, recordRecent } from "@/lib/storage";
const runtime: GameRuntime = {
  storage: { get: (_k, f) => f, set: vi.fn(), remove: vi.fn() },
  reportScore: vi.fn(),
  setStatus: vi.fn(),
  requestFullscreen: async () => {},
  exitFullscreen: async () => {},
};
it("index renders cards without loading any game component", () => {
  const spies = allGames
    .filter((g) => "load" in g)
    .map((g) => vi.spyOn(g, "load"));
  render(<GamesPage />);
  expect(screen.getByRole("heading", { name: "Snake" })).toBeInTheDocument();
  spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
});
it("shows loading and loads only the selected module, cached once", async () => {
  let resolve!: (value: { default: NativeGameComponent }) => void;
  const load = vi.fn(
    () =>
      new Promise<{ default: NativeGameComponent }>((r) => {
        resolve = r;
      }),
  );
  const unrelated = vi.fn();
  const definition: NativeGameDefinition = {
    metadata: { ...metadata, slug: "lazy-test" },
    load,
  };
  const { unmount } = render(
    <NativeGameLoader definition={definition} runtime={runtime} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Loading Snake");
  expect(load).toHaveBeenCalledTimes(1);
  resolve({ default: () => <button>Playable Snake</button> });
  await screen.findByRole("button", { name: "Playable Snake" });
  expect(unrelated).not.toHaveBeenCalled();
  unmount();
  render(<NativeGameLoader definition={definition} runtime={runtime} />);
  await screen.findByRole("button", { name: "Playable Snake" });
  expect(load).toHaveBeenCalledTimes(1);
});
it("recovers a failed import with retry", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ default: () => <div>Recovered game</div> });
  render(
    <NativeGameLoader
      definition={{ metadata: { ...metadata, slug: "retry-test" }, load }}
      runtime={runtime}
    />,
  );
  const retry = await screen.findByRole("button", { name: "Retry loading" });
  fireEvent.click(retry);
  await screen.findByText("Recovered game");
  expect(load).toHaveBeenCalledTimes(2);
});
it("external player isolates HTML, times out and reloads", async () => {
  vi.useFakeTimers();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 200 }),
  );
  const g = allGames.find((g) => g.metadata.kind === "external")!;
  if (g.metadata.kind !== "external") throw new Error("fixture");
  render(<ExternalGamePlayer metadata={g.metadata} />);
  const frame = screen.getByTitle(g.metadata.title);
  expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  expect(frame).not.toHaveAttribute("srcdoc");
  expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
  expect(screen.getByRole("status")).toBeInTheDocument();
  const { act } = await import("@testing-library/react");
  act(() => vi.advanceTimersByTime(12001));
  expect(screen.getByRole("alert")).toHaveTextContent("did not load");
  fireEvent.click(screen.getByRole("button", { name: "Reload game" }));
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => {
    fireEvent.load(screen.getByTitle(g.metadata.title));
  });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
it("both definition kinds share favorites, recent history, search and filtering", () => {
  const native = allGames.find((g) => g.metadata.kind === "native")!,
    external = allGames.find((g) => g.metadata.kind === "external")!;
  for (const g of [native, external]) {
    toggleFavorite(g.metadata.slug);
    recordRecent(g.metadata.slug);
  }
  expect(read("favorites", [])).toEqual([
    native.metadata.slug,
    external.metadata.slug,
  ]);
  expect(read("recentGames", [])).toEqual([
    external.metadata.slug,
    native.metadata.slug,
  ]);
  render(<GamesPage />);
  fireEvent.change(screen.getByLabelText("Game collection"), {
    target: { value: "favorites" },
  });
  expect(
    screen.getByRole("heading", { name: native.metadata.title }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: external.metadata.title }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search games"), {
    target: { value: external.metadata.title },
  });
  expect(
    screen.getByRole("heading", { name: external.metadata.title }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: native.metadata.title }),
  ).not.toBeInTheDocument();
});

it("external player reports missing documents rather than accepting a 404 iframe load", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 404 }),
  );
  const g = allGames.find((g) => g.metadata.kind === "external")!;
  if (g.metadata.kind !== "external") throw new Error("fixture");
  render(<ExternalGamePlayer metadata={g.metadata} />);
  fireEvent.load(screen.getByTitle(g.metadata.title));
  expect(await screen.findByRole("alert")).toHaveTextContent("did not load");
});
