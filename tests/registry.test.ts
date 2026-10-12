// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  stat,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import manifest from "../src/lib/offline-games/manifest.json";
import { generate, parseMetadata } from "../tools/generate-game-registry";
import { toggleFavorite, recordRecent, read } from "../src/lib/storage";
import { filterGames } from "../src/lib/search/games";
import type {
  GameDefinition,
  GameMetadata,
  ExternalGameMetadata,
} from "../src/games/types";
let root: string;
const metadata = (slug: string) => ({
  kind: "native",
  slug,
  title: slug,
  description: "A complete fixture game",
  category: "arcade",
  thumbnail: "/test.svg",
  supportsTouch: true,
  supportsKeyboard: true,
  supportsFullscreen: true,
  version: "1.0.0",
});
async function put(p: string, s: string) {
  await mkdir(path.dirname(path.join(root, p)), { recursive: true });
  await writeFile(path.join(root, p), s);
}
async function native(
  dir: string,
  slug = dir,
  patch: Record<string, unknown> = {},
) {
  await put(
    `src/games/${dir}/metadata.ts`,
    `const metadata=${JSON.stringify({ ...metadata(slug), ...patch })}; export default metadata;`,
  );
  await put(
    `src/games/${dir}/game.tsx`,
    "throw new Error('Game code must never execute during generation'); export default function Game(){return null}",
  );
}
async function external(
  dir: string,
  slug = dir,
  patch: Record<string, unknown> = {},
) {
  await put(
    `public/external-games/${dir}/index.html`,
    "<script>throw new Error('external code executed')</script>",
  );
  await put(`public/external-games/${dir}/thumbnail.png`, "fixture");
  const m = {
    ...metadata(slug),
    kind: "external",
    thumbnail: `/external-games/${dir}/thumbnail.png`,
    sourcePath: `/external-games/${dir}/`,
    sandbox: "allow-scripts",
    ...patch,
  };
  await put(`public/external-games/${dir}/metadata.json`, JSON.stringify(m));
}
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "orbit-registry-"));
  await mkdir(path.join(root, "src/games"), { recursive: true });
  await put("public/test.svg", "<svg/>");
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
describe("automatic registry generation", () => {
  it("discovers native modules recursively without executing code, sorts and avoids rewriting unchanged output", async () => {
    await native("test-native");
    await native("nested/aaa", "aaa");
    await generate(root);
    const file = path.join(root, "src/games/generated-native-registry.ts");
    const text = await readFile(file, "utf8");
    expect(text).toContain('import("./test-native/game")');
    expect(text).toContain('"title": "test-native"');
    expect(text.indexOf('"slug": "aaa"')).toBeLessThan(
      text.indexOf('"slug": "test-native"'),
    );
    expect(text).not.toMatch(/^import .*game"/m);
    const before = (await stat(file)).mtimeMs;
    await generate(root);
    expect((await stat(file)).mtimeMs).toBe(before);
  });
  it("discovers external metadata without executing HTML and sorts output", async () => {
    await external("test-external");
    await external("aaa");
    await generate(root);
    const text = await readFile(
      path.join(root, "src/games/generated-external-registry.ts"),
      "utf8",
    );
    expect(text).toContain('"kind": "external"');
    expect(text).toContain('"sourcePath": "/external-games/test-external/"');
    expect(text.indexOf('"slug": "aaa"')).toBeLessThan(
      text.indexOf('"slug": "test-external"'),
    );
    expect(text).not.toContain("throw new Error");
  });
  it("new games enter the actual unified registry and search without editing the library", async () => {
    await native("test-native");
    await external("test-external");
    await copyFile(
      path.resolve("src/games/registry.ts"),
      path.join(root, "src/games/registry.ts"),
    );
    await generate(root);
    const imported = (await import(
      /* @vite-ignore */ path.join(root, "src/games/registry.ts")
    )) as {
      allGames: readonly GameDefinition[];
      getGameBySlug: (slug: string) => GameDefinition | undefined;
    };
    expect(imported.allGames).toHaveLength(2);
    expect(imported.getGameBySlug("test-native")?.metadata.kind).toBe("native");
    expect(imported.getGameBySlug("test-external")?.metadata.kind).toBe(
      "external",
    );
    expect(filterGames(imported.allGames, "test-", "arcade")).toHaveLength(2);
    expect(filterGames(imported.allGames, "", "puzzle")).toHaveLength(0);
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      dispatchEvent: () => {},
    });
    for (const game of imported.allGames) {
      toggleFavorite(game.metadata.slug);
      recordRecent(game.metadata.slug);
    }
    expect(read<string[]>("favorites", [])).toEqual(
      expect.arrayContaining(["test-native", "test-external"]),
    );
    expect(read<string[]>("recentGames", [])).toEqual(
      expect.arrayContaining(["test-native", "test-external"]),
    );
    vi.unstubAllGlobals();
  });
  for (const pair of ["native-native", "external-external", "native-external"])
    it(`rejects duplicates across ${pair}`, async () => {
      const [a, b] = pair.split("-");
      await (a === "native"
        ? native("first", "duplicate")
        : external("first", "duplicate"));
      await (b === "native"
        ? native("second", "duplicate")
        : external("second", "duplicate"));
      await expect(generate(root)).rejects.toThrow(
        /duplicate slug.*also declared/,
      );
      try {
        await generate(root);
      } catch (e) {
        expect(String(e)).toContain("first");
        expect(String(e)).toContain("second");
      }
    });
  const invalid: Record<string, Record<string, unknown>> = {
    "missing title": { title: undefined },
    "empty description": { description: "" },
    "invalid slug": { slug: "Bad slug" },
    "unsupported category": { category: "mystery" },
    "missing thumbnail": { thumbnail: "/missing.png" },
    "relative thumbnail": { thumbnail: "relative.png" },
    "invalid version": { version: "1.0" },
    "non-semver prerelease": { version: "1.0.0-01" },
    "missing touch": { supportsTouch: undefined },
    "missing keyboard": { supportsKeyboard: undefined },
    "missing fullscreen": { supportsFullscreen: undefined },
    "invalid controls": { controls: [{ label: "", description: "" }] },
  };
  for (const [label, patch] of Object.entries(invalid))
    it(`rejects ${label}`, async () => {
      await native("invalid", "invalid", patch);
      await expect(generate(root)).rejects.toThrow(/invalid.*metadata.ts:/);
    });
  const unsafe = {
    "unknown field": { dangerous: true },
    "mismatched path": { sourcePath: "/external-games/other/" },
    traversal: { sourcePath: "/external-games/../" },
    "outside prefix": { sourcePath: "https://evil.example/" },
    "unsafe sandbox": { sandbox: "allow-scripts allow-same-origin" },
    "unsafe thumbnail": { thumbnail: "/test.svg" },
  };
  for (const [label, patch] of Object.entries(unsafe))
    it(`rejects external ${label}`, async () => {
      await external("bad", "bad", patch);
      await expect(generate(root)).rejects.toThrow(/metadata.json:/);
    });
  for (const file of ["metadata.ts", "game.tsx"])
    it(`rejects partial native ${file}`, async () => {
      await put(`src/games/partial/${file}`, "export default {}");
      await expect(generate(root)).rejects.toThrow(
        `missing ${file === "metadata.ts" ? "game.tsx" : "metadata.ts"}`,
      );
    });
  for (const file of ["index.html", "metadata.json"])
    it(`rejects partial external ${file}`, async () => {
      await put(`public/external-games/partial/${file}`, "{}");
      await expect(generate(root)).rejects.toThrow(
        `missing ${file === "index.html" ? "metadata.json" : "index.html"}`,
      );
    });
  it("rejects executable metadata expressions and requires a default export", () => {
    expect(() =>
      parseMetadata("export default runGame()", "metadata.ts"),
    ).toThrow("static literal");
    expect(() => parseMetadata("const metadata={};", "metadata.ts")).toThrow(
      "default export",
    );
  });
  it("validates every real native and external game", async () => {
    const result = await generate(process.cwd());
    expect(result.native).toHaveLength(7);
    expect(result.external.length).toBeGreaterThanOrEqual(353);
    expect(result.external.map((game) => game.metadata.slug)).toEqual(
      expect.arrayContaining([...Object.keys(manifest.games), "color-tap"]),
    );
    expect(result.native.map((g) => g.metadata.slug)).toEqual([
      "2048",
      "breakout",
      "flappy",
      "minesweeper",
      "pong",
      "snake",
      "tic-tac-toe",
    ]);
    const metadata = result.native[0].metadata as GameMetadata;
    expect(metadata.supportsTouch).toBe(true);
    expect((result.external[0].metadata as ExternalGameMetadata).sandbox).toBe(
      "allow-scripts",
    );
  });
});
