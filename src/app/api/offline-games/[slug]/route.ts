import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { hotGame, rememberGame } from "@/lib/offline-games/hot-cache";
import { loadGame, packGames } from "@/lib/offline-games/assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  Vary: "Accept-Encoding",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: data:; style-src 'unsafe-inline' blob: data:; img-src blob: data:; font-src blob: data:; media-src blob: data:; connect-src blob: data:; worker-src blob: data:; frame-src blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-pointer-lock",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
let bootstrap: Promise<{ prefix: string; revision: string }> | undefined;
const compress = promisify(gzip);
const inFlight = new Map<string, Promise<Uint8Array<ArrayBuffer>>>();

function acceptsGzip(request: Request) {
  return (request.headers.get("accept-encoding") ?? "")
    .split(",")
    .some((value) => {
      const [name, quality] = value.trim().toLowerCase().split(/;\s*/, 2);
      return name === "gzip" && (!quality || Number(quality.split("=")[1]) > 0);
    });
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!Object.hasOwn(packGames, slug))
    return new Response("Game not found.", { status: 404, headers });
  try {
    const { prefix, revision } = await (bootstrap ??= readFile(
      path.join(process.cwd(), "public/offline-game-runtime.js"),
      "utf8",
    )
      .then((script) => ({
        prefix: `<script>${script}</script>\n`,
        revision: createHash("sha256").update(script).digest("hex"),
      }))
      .catch((error) => {
        bootstrap = undefined;
        throw error;
      }));
    const encoding = acceptsGzip(request) ? "gzip" : "identity";
    const key = `${packGames[slug].blob}-${revision}-${encoding}`;
    const etag = `"${key}"`;
    const responseHeaders = {
      ...headers,
      ETag: etag,
      "Cache-Control": "private, max-age=300",
      ...(encoding === "gzip" ? { "Content-Encoding": "gzip" } : {}),
    };
    if (request.headers.get("if-none-match")?.split(/,\s*/).includes(etag))
      return new Response(null, { status: 304, headers: responseHeaders });
    let body = hotGame(key);
    if (!body) {
      let pending = inFlight.get(key);
      if (!pending) {
        if (inFlight.size >= 3) throw new Error("Game delivery is busy");
        pending = loadGame(slug)
          .then(async (data) => {
            const raw = Buffer.from(prefix + data.toString("utf8"));
            const encoded = new Uint8Array(
              encoding === "gzip" ? await compress(raw, { level: 3 }) : raw,
            );
            rememberGame(key, encoded);
            return encoded;
          })
          .finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
      }
      body = await pending;
    }
    return new Response(body, { headers: responseHeaders });
  } catch (error) {
    console.error(
      "Offline game unavailable:",
      slug,
      error instanceof Error ? error.message : "download error",
    );
    return new Response(
      '<!doctype html><html><title>Game unavailable</title><p>The game could not download or load. Use Reload game to try again.</p><script>parent.postMessage({type:"orbit-game-error"},"*")</script></html>',
      { status: 503, headers },
    );
  }
}
