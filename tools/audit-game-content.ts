import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { allGames } from "../src/games/registry";

const exact = new Map<string, string[]>();
const templateShapes = new Map<string, string[]>();
const missing: string[] = [];
const generic: string[] = [];
const genericDescriptions: string[] = [];

function group(map: Map<string, string[]>, key: string, slug: string) {
  const existing = map.get(key) ?? [];
  existing.push(slug);
  map.set(key, existing);
}

for (const { metadata } of allGames) {
  if (metadata.description.includes("from the Offline HTML Games Pack."))
    genericDescriptions.push(metadata.slug);
  if (
    !metadata.thumbnail.startsWith("/") ||
    metadata.thumbnail.startsWith("//")
  ) {
    missing.push(metadata.slug);
    continue;
  }
  try {
    const file = await readFile(
      path.join("public", metadata.thumbnail.slice(1)),
    );
    if (!file.length) {
      missing.push(metadata.slug);
      continue;
    }
    group(
      exact,
      createHash("sha256").update(file).digest("hex"),
      metadata.slug,
    );
    if (metadata.thumbnail.endsWith(".svg")) {
      const svg = file.toString();
      const shape = svg.match(/<g stroke="hsl[^>]*?>(.*?)<\/g>/)?.[1];
      if (shape && svg.includes("CARTER GAME’S / PLAY")) {
        generic.push(metadata.slug);
        group(templateShapes, shape, metadata.slug);
      }
    }
  } catch {
    missing.push(metadata.slug);
  }
}
console.log(
  JSON.stringify(
    {
      total: allGames.length,
      missing,
      generic,
      genericDescriptions,
      exactDuplicateGroups: [...exact.values()].filter(
        (values) => values.length > 1,
      ),
      sharedTemplateGroups: [...templateShapes.values()].filter(
        (values) => values.length > 1,
      ),
    },
    null,
    2,
  ),
);
