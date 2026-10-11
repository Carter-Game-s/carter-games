import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  cacheGame,
  loadGame,
  packGames,
} from "../src/lib/offline-games/assets";
const source = process.argv[2];
let completed = 0;
const entries = Object.entries(packGames);
async function worker() {
  for (let next = entries.shift(); next; next = entries.shift()) {
    const [slug, game] = next;
    if (source)
      await cacheGame(slug, await readFile(path.join(source, game.filename)));
    else await loadGame(slug);
    console.log(`${++completed}/352 cached ${slug}`);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
