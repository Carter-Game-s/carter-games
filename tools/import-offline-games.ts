import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// This inventory contains Git blob hashes, not executable source code.
const commit = "d52fe447483251e486a2de49132c8240f8369706";
const root = process.cwd();
const lines = (
  await readFile(path.join(root, "tools/offline-games-tree.txt"), "utf8")
)
  .trim()
  .split("\n");
const titles: Record<string, string> = {
  "1.12": "Minecraft 1.12",
  "1.12_WASM": "Minecraft 1.12 WASM",
  "1.5": "Minecraft 1.5",
  "1.8": "Minecraft 1.8",
  "1.8_WASM": "Minecraft 1.8 WASM",
  "Alpha_1.2.6": "Minecraft Alpha 1.2.6",
  "Beta_1.3": "Minecraft Beta 1.3",
  Indev: "Minecraft Indev",
  "1v1.lol": "1v1.LOL",
  circloO: "circloO",
  "circloO-2": "circloO 2",
};
const icons: Record<string, string> = {
  arcade:
    '<path d="M96 110h128l22 56q7 28-16 29l-34-28h-72l-34 28q-23-1-16-29z"/><path d="M105 133v28m-14-14h28m80-9h1m19 18h1"/>',
  puzzle:
    '<rect x="106" y="93" width="108" height="108" rx="14"/><path d="M106 147h108m-54-54v108"/><circle cx="137" cy="120" r="6"/><circle cx="184" cy="176" r="6"/>',
  board:
    '<path d="M126 194h68l-9-16-12-11v-28l15-15-19-30-27 21-10 30 20-7v29l-14 11z"/><path d="M119 207h82"/>',
  sports:
    '<circle cx="160" cy="147" r="55"/><path d="M160 92v110m-55-55h110m-90-43q68 44 70 85m-70 0q68-44 70-85"/>',
  action: '<path d="m175 86-64 76h45l-11 52 65-80h-45z"/>',
  other:
    '<path d="M108 120q52-61 104 0l-52 89z"/><circle cx="160" cy="125" r="15"/>',
};
const manifest: Record<string, { filename: string; blob: string }> = {};
for (const line of lines) {
  const match = /^100644 blob ([a-f0-9]{40})\toffline\/(.+\.html?)$/.exec(line);
  if (!match) throw new Error(`Unsafe game inventory entry: ${line}`);
  const [, blob, filename] = match;
  const base = filename.replace(/\.html?$/, "");
  const slug =
    "pack-" +
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  if (manifest[slug]) throw new Error(`Duplicate slug ${slug}`);
  manifest[slug] = { filename, blob };
  const title =
    titles[base] ??
    base
      .replace(/[-_]/g, " ")
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      .replace(/\bIo\b/g, "IO")
      .replace(/\bTd\b/g, "TD");
  const category = /chess|solitaire|checkers/.test(slug)
    ? "board"
    : /soccer|tennis|basket|baseball|ball|golf|boxing|wrestle|kick/.test(slug)
      ? "sports"
      : /2048|wordle|puzzle|bloxorz|cut-the-rope|sudoku|tetris|candy|connect|draw|circloo/.test(
            slug,
          )
        ? "puzzle"
        : /war|tank|gun|zombie|combat|fight|robbery|strike|doom|faction/.test(
              slug,
            )
          ? "action"
          : "arcade";
  const hue = parseInt(blob.slice(0, 6), 16) % 360;
  const safe = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  const words = safe.split(" ");
  const rows: string[] = [];
  let row = "";
  for (const word of words) {
    if (row && (row + word).length > 22) {
      rows.push(row);
      row = "";
    }
    row += (row ? " " : "") + word;
  }
  if (row) rows.push(row);
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${safe}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue} 50% 25%)"/><stop offset="1" stop-color="#121b24"/></linearGradient></defs><rect width="320" height="320" rx="24" fill="url(#g)"/><circle cx="280" cy="30" r="100" fill="hsl(${hue} 80% 65%)" opacity=".13"/><path d="M24 45h32m-16-16v32M264 233h32" stroke="hsl(${hue} 80% 72%)" stroke-width="3"/><g stroke="hsl(${hue} 90% 78%)" fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${icons[category]}</g>${rows.map((text, i) => `<text x="160" y="${250 + i * 25}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${rows.length > 2 ? 16 : 20}" font-weight="700">${text}</text>`).join("")}<text x="24" y="27" fill="#ffffff88" font-family="Arial,sans-serif" font-size="10" letter-spacing="3">ORBIT / PLAY</text></svg>`;
  const dir = path.join(root, "public/external-games", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "thumbnail.svg"), logo + "\n");
  await writeFile(
    path.join(dir, "metadata.json"),
    JSON.stringify(
      {
        slug,
        title,
        description: `Play ${title} from the Offline HTML Games Pack. The original single-file game runs in an isolated player.`,
        category,
        thumbnail: `/external-games/${slug}/thumbnail.svg`,
        tags: ["offline-pack", category],
        supportsTouch: false,
        supportsKeyboard: true,
        supportsFullscreen: true,
        sourcePath: `/external-games/${slug}/`,
        version: "1.0.0",
        sandbox: "allow-scripts",
        controls: [
          {
            label: "Controls",
            description:
              "Use the game's on-screen instructions. Most games use the keyboard and mouse.",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    path.join(dir, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${safe}</title><p>Loading ${safe}…</p><script>location.replace('/api/offline-games/${slug}'+location.hash)</script></html>\n`,
  );
}
await writeFile(
  path.join(root, "src/lib/offline-games/manifest.json"),
  JSON.stringify(
    {
      repository: "carteraccs/Offline-HTML-Games-Pack",
      commit,
      games: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Imported ${Object.keys(manifest).length} games and SVG logos from ${commit}.`,
);
