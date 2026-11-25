import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
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
const inFlight = new Map<string, Promise<Blob>>();

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
    const key = `html-${packGames[slug].blob}-${revision}`;
    const etag = `"${key}"`;
    const responseHeaders = {
      ...headers,
      ETag: etag,
      "Cache-Control": "private, max-age=300",
    };
    if (
      request.headers
        .get("if-none-match")
        ?.split(/,\s*/)
        .some((tag) => tag === "*" || tag.replace(/^W\//, "") === etag)
    )
      return new Response(null, { status: 304, headers: responseHeaders });
    let body = hotGame(key);
    if (!body) {
      let pending = inFlight.get(key);
      if (!pending) {
        if (inFlight.size >= 3)
          return new Response(
            '<!doctype html><title>Game service busy</title><p>Other games are loading. Please try again shortly.</p><script>parent.postMessage({type:"orbit-game-busy"},"*")</script>',
            { status: 503, headers: { ...headers, "Retry-After": "2" } },
          );
        pending = loadGame(slug)
          .then((data) => {
            const html = new Blob([prefix, data as Uint8Array<ArrayBuffer>]);
            rememberGame(key, html);
            return html;
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
