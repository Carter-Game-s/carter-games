import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
export type GamePart = { path: string; blob: string; size: number };
export type PublishedSource = { path?: string; parts?: GamePart[] };
export async function readPublishedSource(
  slug: string,
  game: PublishedSource,
  root = process.cwd(),
) {
  if (
    game.path !== `game-assets/${slug}.html` ||
    !/^pack-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
    throw new Error("Invalid published game path.");
  if (!game.parts) {
    const file = path.join(root, "game-assets", `${slug}.html`);
    if ((await stat(file)).size > 150 * 1024 * 1024)
      throw new Error("Oversized published game.");
    return readFile(file);
  }
  if (
    !Array.isArray(game.parts) ||
    !game.parts.length ||
    game.parts.length > 4 ||
    game.parts.reduce((sum, part) => sum + part.size, 0) > 150 * 1024 * 1024
  )
    throw new Error("Invalid published game parts.");
  const chunks: Buffer[] = [];
  for (const [index, part] of game.parts.entries()) {
    if (
      part.path !==
        `game-assets/${slug}/part-${String(index).padStart(3, "0")}` ||
      !/^[a-f0-9]{40}$/.test(part.blob) ||
      !Number.isInteger(part.size) ||
      part.size < 1 ||
      part.size > 48 * 1024 * 1024
    )
      throw new Error("Invalid published game part.");
    const file = path.join(
      root,
      "game-assets",
      slug,
      `part-${String(index).padStart(3, "0")}`,
    );
    if ((await stat(file)).size !== part.size)
      throw new Error("Published game part size mismatch.");
    const bytes = await readFile(file);
    if (
      createHash("sha1")
        .update(`blob ${bytes.length}\0`)
        .update(bytes)
        .digest("hex") !== part.blob
    )
      throw new Error("Published game part integrity mismatch.");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}
