// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { publishGame } from "../tools/publish-game";
import { generate } from "../tools/generate-game-registry";
const directories: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "carter-publish-test-"));
  directories.push(root);
  await mkdir(path.join(root, "src/lib/offline-games"), { recursive: true });
  await mkdir(path.join(root, "src/games"), { recursive: true });
  await mkdir(path.join(root, "public/external-games"), { recursive: true });
  await writeFile(
    path.join(root, "src/lib/offline-games/manifest.json"),
    JSON.stringify({
      repository: "carteraccs/Offline-HTML-Games-Pack",
      commit: "1".repeat(40),
      games: {},
    }),
  );
  const file = path.join(root, "fixture.html");
  await writeFile(
    file,
    "<!doctype html><html><title>Fixture</title><button>Play</button></html>",
  );
  return { root, file };
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
it("publishes an isolated game, generates its logo and catalog, and pins its source automatically", async () => {
  const { root, file } = await fixture();
  const result = await publishGame(
    file,
    { title: "Carter & Friends", category: "puzzle" },
    root,
  );
  const body = await readFile(file);
  const hash = createHash("sha1")
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest("hex");
  expect(result.blob).toBe(hash);
  const manifest = JSON.parse(
    await readFile(
      path.join(root, "src/lib/offline-games/manifest.json"),
      "utf8",
    ),
  );
  expect(manifest.games[result.slug]).toEqual({
    filename: result.slug + ".html",
    blob: hash,
    path: `game-assets/${result.slug}.html`,
  });
  expect(
    await readFile(path.join(root, manifest.games[result.slug].path)),
  ).toEqual(body);
  const metadata = JSON.parse(
    await readFile(
      path.join(root, "public/external-games", result.slug, "metadata.json"),
      "utf8",
    ),
  );
  expect(metadata.sandbox).toBe("allow-scripts");
  expect(
    await readFile(
      path.join(root, "public/external-games", result.slug, "thumbnail.svg"),
      "utf8",
    ),
  ).toContain("Carter &amp; Friends");
  const generated = await generate(root);
  expect(generated.external).toHaveLength(1);
  await expect(
    publishGame(file, { title: "Carter & Friends" }, root),
  ).rejects.toThrow("already exists");
  await writeFile(file, "<!doctype html><html><title>Updated</title></html>");
  const updated = await publishGame(
    file,
    { title: "Carter & Friends", replace: true, version: "1.0.1" },
    root,
  );
  expect(updated.blob).not.toBe(hash);
});
it("rejects unsafe slugs and non-HTML input without changing the catalog", async () => {
  const { root, file } = await fixture();
  await expect(
    publishGame(file, { title: "Fixture", slug: "../../secret" }, root),
  ).rejects.toThrow("Invalid");
  await writeFile(file, "This is not a game document");
  await expect(publishGame(file, { title: "Fixture" }, root)).rejects.toThrow(
    "HTML document",
  );
  const manifest = JSON.parse(
    await readFile(
      path.join(root, "src/lib/offline-games/manifest.json"),
      "utf8",
    ),
  );
  expect(manifest.games).toEqual({});
});
