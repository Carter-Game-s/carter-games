import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  cacheGame,
  loadGame,
  packGames,
  preloadProgress,
} from "../src/lib/offline-games/assets";
const source = process.argv[2];
let completed = 0;
const entries = Object.entries(packGames);
const failed: string[] = [];
await preloadProgress(0, []);
async function worker() {
  for (let next = entries.shift(); next; next = entries.shift()) {
    const [slug, game] = next;
    let ready = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (source)
          await cacheGame(
            slug,
            await readFile(path.join(source, game.filename)),
          );
        else await loadGame(slug);
        ready = true;
        break;
      } catch (error) {
        console.error(
          `${slug}: attempt ${attempt}/3 failed: ${error instanceof Error ? error.message : "load error"}`,
        );
        if (attempt < 3)
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
    if (ready)
      console.log(
        `${++completed}/${Object.keys(packGames).length} cached ${slug}`,
      );
    else failed.push(slug);
    await preloadProgress(completed, failed);
  }
}
// One worker keeps memory and CPU available for gameplay and production builds.
await worker();
console.log(`Preload finished: ${completed} ready, ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
