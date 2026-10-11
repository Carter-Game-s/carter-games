import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import manifest from "./manifest.json";

export const packGames = manifest.games as Record<
  string,
  { filename: string; blob: string }
>;
const maxBytes = 150 * 1024 * 1024;
const cache = path.join(process.cwd(), ".game-cache", manifest.commit);
const pending = new Map<string, Promise<Buffer>>();
const zip = promisify(gzip);
const unzip = promisify(gunzip);
export function verifyGame(slug: string, body: Buffer) {
  const game = packGames[slug];
  if (!game || body.length > maxBytes)
    throw new Error("Unknown or oversized game.");
  const hash = createHash("sha1")
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest("hex");
  if (hash !== game.blob)
    throw new Error("Game file failed its pinned Git integrity check.");
}
export async function cacheGame(slug: string, body: Buffer) {
  verifyGame(slug, body);
  await mkdir(cache, { recursive: true });
  const file = path.join(cache, packGames[slug].blob + ".gz");
  const temp = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await writeFile(temp, await zip(body));
    await rename(temp, file);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export async function loadVPSGame(slug: string): Promise<Buffer> {
  if (!Object.hasOwn(packGames, slug)) throw new Error("Unknown game.");
  const base = new URL(process.env.GAME_ASSET_BASE_URL || "");
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !(
      base.protocol === "https:" ||
      (base.protocol === "http:" &&
        base.hostname === "127.0.0.1" &&
        base.port === "18080")
    )
  )
    throw new Error("Invalid game asset service configuration.");
  const token = process.env.GAME_ASSET_TOKEN;
  if (!token) throw new Error("Missing game asset service credential.");
  const response = await fetch(
    new URL(
      `games/${slug}`,
      base.href.endsWith("/") ? base.href : base.href + "/",
    ),
    {
      redirect: "error",
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok || !response.body)
    throw new Error(`Asset service returned HTTP ${response.status}.`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new Error("Game exceeds the download size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const body = Buffer.concat(chunks);
  verifyGame(slug, body);
  return body;
}
async function load(slug: string): Promise<Buffer> {
  const game = packGames[slug];
  if (process.env.GAME_ASSET_BASE_URL) {
    try {
      return await loadVPSGame(slug);
    } catch {
      console.warn(
        "VPS game asset unavailable; using the existing game fallback.",
      );
    }
  }
  try {
    const body = await unzip(
      await readFile(path.join(cache, game.blob + ".gz")),
      { maxOutputLength: maxBytes },
    );
    verifyGame(slug, body);
    return body;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  // Only the immutable, inventoried GitHub files can be requested. This endpoint
  // never accepts a URL, forwards credentials, follows redirects, or evaluates code.
  const url = `https://raw.githubusercontent.com/${manifest.repository}/${manifest.commit}/offline/${encodeURIComponent(game.filename)}`;
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });
  if (!response.ok || !response.body)
    throw new Error(
      `Game download returned HTTP ${response.status}. Reload to try again.`,
    );
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new Error("Game exceeds the download size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const body = Buffer.concat(chunks);
  await cacheGame(slug, body);
  return body;
}
export function loadGame(slug: string): Promise<Buffer> {
  if (!Object.hasOwn(packGames, slug))
    return Promise.reject(new Error("Unknown game."));
  const existing = pending.get(slug);
  if (existing) return existing;
  if (pending.size >= 4)
    return Promise.reject(
      new Error("Other games are downloading. Please reload in a moment."),
    );
  const promise = load(slug).finally(() => pending.delete(slug));
  pending.set(slug, promise);
  return promise;
}
