// @vitest-environment node
import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

it("reimports a pack without replacing an editor's thumbnail or metadata", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "game-import-"));
  const script = path.resolve("tools/import-offline-games.ts");
  const importGame = () => execFileSync("bun", [script], { cwd: root });
  try {
    await mkdir(path.join(root, "tools"));
    await mkdir(path.join(root, "src/lib/offline-games"), { recursive: true });
    await writeFile(
      path.join(root, "tools/offline-games-tree.txt"),
      `100644 blob ${"a".repeat(40)}\toffline/2048.html\n`,
    );
    importGame();
    const dir = path.join(root, "public/external-games/pack-2048");
    const meta = path.join(dir, "metadata.json");
    const curated = JSON.parse(await readFile(meta, "utf8"));
    curated.description = "Join matching tiles.";
    curated.thumbnail = "/external-games/pack-2048/thumbnail.webp";
    await writeFile(meta, JSON.stringify(curated));
    await rm(path.join(dir, "thumbnail.svg"));
    await writeFile(path.join(dir, "thumbnail.webp"), "fixture");
    importGame();
    expect(JSON.parse(await readFile(meta, "utf8"))).toEqual(curated);
    expect(await readFile(path.join(dir, "thumbnail.webp"), "utf8")).toBe(
      "fixture",
    );
    expect(await readdir(dir)).not.toContain("thumbnail.svg");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
