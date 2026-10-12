// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  packGames,
  loadGame,
  verifyGame,
  loadVPSGame,
} from "../src/lib/offline-games/assets";
import manifest from "../src/lib/offline-games/manifest.json";
import { readPublishedSource } from "../src/lib/offline-games/published";
import { GET } from "../src/app/api/offline-games/[slug]/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("imports all 352 original files once and pins their immutable Git hashes", async () => {
  const originals = Object.entries(packGames).filter(([, game]) => !game.path);
  expect(originals).toHaveLength(352);
  expect(manifest.commit).toMatch(/^[a-f0-9]{40}$/);
  const inventory = (await readFile("tools/offline-games-tree.txt", "utf8"))
    .trim()
    .split("\n");
  expect(new Set(originals.map(([, game]) => game.filename)).size).toBe(352);
  await Promise.all(
    Object.entries(packGames).map(async ([slug, game]) => {
      if (game.path) {
        expect(game.path).toBe(`game-assets/${slug}.html`);
        verifyGame(slug, await readPublishedSource(slug, game));
      } else
        expect(inventory).toContain(
          `100644 blob ${game.blob}\toffline/${game.filename}`,
        );
      expect(game.filename).toMatch(/^[a-zA-Z0-9_.-]+\.html?$/);
      const metadata = JSON.parse(
        await readFile(`public/external-games/${slug}/metadata.json`, "utf8"),
      );
      expect(metadata.slug).toBe(slug);
      const logo = await readFile(
        `public/external-games/${slug}/thumbnail.svg`,
        "utf8",
      );
      expect(logo).toContain("<svg");
      expect(logo).not.toMatch(/<script|(?:src|href)=["']https?:\/\//g);
    }),
  );
});

it("authenticates only the configured VPS service, rejects redirects, and verifies game bytes", async () => {
  vi.stubEnv("GAME_ASSET_BASE_URL", "http://127.0.0.1:18080");
  vi.stubEnv("GAME_ASSET_TOKEN", "fixture-token");
  const game = packGames["pack-2048"];
  const previous = game.blob;
  const body = Buffer.from("<!doctype html><title>Fixture</title>");
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(body));
  try {
    game.blob = createHash("sha1")
      .update(`blob ${body.length}\0`)
      .update(body)
      .digest("hex");
    expect(await loadVPSGame("pack-2048")).toEqual(body);
    expect(request).toHaveBeenCalledWith(
      new URL(`http://127.0.0.1:18080/games/pack-2048?blob=${game.blob}`),
      expect.objectContaining({
        redirect: "error",
        headers: { Authorization: "Bearer fixture-token" },
      }),
    );
    request.mockResolvedValueOnce(new Response("changed file"));
    await expect(loadVPSGame("pack-2048")).rejects.toThrow("integrity");
    request.mockClear();
    vi.stubEnv("GAME_ASSET_BASE_URL", "http://evil.example/");
    await expect(loadVPSGame("pack-2048")).rejects.toThrow("configuration");
    await expect(loadVPSGame("constructor")).rejects.toThrow("Unknown game");
    expect(request).not.toHaveBeenCalled();
  } finally {
    game.blob = previous;
  }
});
it("rejects arbitrary file paths and corrupted game bytes before execution", async () => {
  await expect(loadGame("../../etc/passwd")).rejects.toThrow("Unknown game");
  await expect(loadGame("constructor")).rejects.toThrow("Unknown game");
  expect(() => verifyGame("pack-2048", Buffer.from("changed source"))).toThrow(
    "integrity",
  );
  const game = packGames["pack-2048"];
  const previous = game.blob;
  const source = Buffer.from("<!doctype html><title>Fixture</title>");
  try {
    game.blob = createHash("sha1")
      .update(`blob ${source.length}\0`)
      .update(source)
      .digest("hex");
    expect(() => verifyGame("pack-2048", source)).not.toThrow();
    expect(() =>
      verifyGame("pack-2048", Buffer.concat([source, Buffer.from("x")])),
    ).toThrow("integrity");
  } finally {
    game.blob = previous;
  }
});
it("rejects unknown routes while preserving opaque sandbox and blocked network access", async () => {
  const response = await GET(
    new Request("https://app.test/api/offline-games/constructor"),
    { params: Promise.resolve({ slug: "constructor" }) },
  );
  expect(response.status).toBe(404);
  const csp = response.headers.get("content-security-policy")!;
  expect(csp).toContain("sandbox allow-scripts allow-pointer-lock");
  expect(csp).not.toContain("allow-same-origin");
  expect(csp).toContain("connect-src blob: data:");
  expect(csp).toContain("form-action 'none'");
});
