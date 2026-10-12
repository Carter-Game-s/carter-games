import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { generate } from "./generate-game-registry";

export type PublishedGame = {
  filename: string;
  blob: string;
  path?: string;
  parts?: { path: string; blob: string; size: number }[];
};
const categories = ["arcade", "puzzle", "board", "sports", "action", "other"];
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
export async function publishGame(
  file: string,
  options: {
    title: string;
    slug?: string;
    category?: string;
    description?: string;
    version?: string;
    replace?: boolean;
  },
  root = process.cwd(),
) {
  const title = options.title.trim();
  const slug =
    options.slug ??
    "pack-" +
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
  const category = options.category ?? "arcade";
  const version = options.version ?? "1.0.0";
  const description =
    options.description ??
    `Play ${title} in Carter Game’s isolated browser player.`;
  if (
    !/^pack-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !title ||
    title.length > 80 ||
    !categories.includes(category) ||
    !description.trim() ||
    description.length > 300 ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
  )
    throw new Error(
      "Invalid game title, slug, category, description, or version",
    );
  const info = await stat(file);
  if (
    !info.isFile() ||
    info.size > 150 * 1024 * 1024 ||
    !/\.html?$/i.test(file)
  )
    throw new Error("Provide a single HTML game of at most 150 MiB");
  const body = await readFile(file);
  if (
    body.length > 150 * 1024 * 1024 ||
    !/<(?:!doctype\s+html|html|head|body)(?:\s|>)/i.test(
      body.subarray(0, 4096).toString("utf8"),
    )
  )
    throw new Error("Game must be an HTML document");
  const manifestFile = path.join(root, "src/lib/offline-games/manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as {
    repository: string;
    commit: string;
    games: Record<string, PublishedGame>;
  };
  const directory = path.join(root, "public/external-games", slug);
  const exists = await access(directory).then(
    () => true,
    () => false,
  );
  if (exists || manifest.games[slug]) {
    if (!options.replace)
      throw new Error(
        "Game already exists; use --replace to publish an update",
      );
    if (manifest.games[slug]?.path !== `game-assets/${slug}.html`)
      throw new Error("Cannot overwrite an original imported game");
  }
  const blob = createHash("sha1")
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest("hex");
  const game: PublishedGame = {
    filename: `${slug}.html`,
    blob,
    path: `game-assets/${slug}.html`,
  };
  const metadata = {
    slug,
    title,
    description,
    category,
    thumbnail: `/external-games/${slug}/thumbnail.svg`,
    tags: ["published", category],
    supportsTouch: false,
    supportsKeyboard: true,
    supportsFullscreen: true,
    sourcePath: `/external-games/${slug}/`,
    version,
    sandbox: "allow-scripts",
    controls: [
      {
        label: "Controls",
        description: "Use the game's on-screen instructions.",
      },
    ],
  };
  const rows = title.match(/.{1,20}(?:\s|$)|.{1,20}/g) ?? [title];
  const hue = parseInt(blob.slice(0, 6), 16) % 360;
  const thumbnail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${escape(title)}"><rect width="320" height="320" rx="24" fill="#121b24"/><circle cx="160" cy="133" r="65" fill="hsl(${hue} 55% 28%)"/><path d="m143 104 46 29-46 29z" fill="hsl(${hue} 85% 75%)"/>${rows
    .slice(0, 4)
    .map(
      (row, index) =>
        `<text x="160" y="${231 + index * 21}" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="18" font-weight="700">${escape(row.trim())}</text>`,
    )
    .join(
      "",
    )}<text x="24" y="27" fill="#ffffff88" font-family="Arial,sans-serif" font-size="10" letter-spacing="3">CARTER GAME’S / PLAY</text></svg>\n`;
  await mkdir(directory, { recursive: true });
  await mkdir(path.join(root, "game-assets"), { recursive: true });
  if (body.length > 90 * 1024 * 1024) {
    const parts: NonNullable<PublishedGame["parts"]> = [];
    await mkdir(path.join(root, "game-assets", slug), { recursive: true });
    for (let offset = 0; offset < body.length; offset += 48 * 1024 * 1024) {
      const bytes = body.subarray(offset, offset + 48 * 1024 * 1024);
      const file = `game-assets/${slug}/part-${String(parts.length).padStart(3, "0")}`;
      await writeFile(path.join(root, file), bytes);
      parts.push({
        path: file,
        size: bytes.length,
        blob: createHash("sha1")
          .update(`blob ${bytes.length}\0`)
          .update(bytes)
          .digest("hex"),
      });
    }
    game.parts = parts;
  } else await writeFile(path.join(root, game.path!), body);
  await writeFile(
    path.join(directory, "metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  await writeFile(path.join(directory, "thumbnail.svg"), thumbnail);
  await writeFile(
    path.join(directory, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><p>Loading ${escape(title)}…</p><script>location.replace('/api/offline-games/${slug}'+location.hash)</script></html>\n`,
  );
  manifest.games[slug] = game;
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  return { slug, blob };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        title: { type: "string" },
        slug: { type: "string" },
        category: { type: "string" },
        description: { type: "string" },
        version: { type: "string" },
        replace: { type: "boolean", default: false },
      },
    });
    if (positionals.length !== 1 || !values.title)
      throw new Error(
        'Usage: bun run games:publish ./game.html --title "Game title" [--slug pack-name] [--category arcade] [--replace]',
      );
    const result = await publishGame(positionals[0], {
      ...values,
      title: values.title,
    });
    await generate();
    console.log(
      `Prepared ${result.slug}. Commit and push the game assets, metadata, manifest, and generated registry to publish it; the VPS loader synchronizes automatically.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Publishing failed");
    process.exitCode = 1;
  }
}
