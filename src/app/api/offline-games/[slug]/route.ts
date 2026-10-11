import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadGame, packGames } from "@/lib/offline-games/assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-cache",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: data:; style-src 'unsafe-inline' blob: data:; img-src blob: data:; font-src blob: data:; media-src blob: data:; connect-src blob: data:; worker-src blob: data:; frame-src blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-pointer-lock",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
let bootstrap: Promise<string> | undefined;
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!Object.hasOwn(packGames, slug))
    return new Response("Game not found.", { status: 404, headers });
  try {
    const [body, script] = await Promise.all([
      loadGame(slug),
      (bootstrap ??= readFile(
        path.join(process.cwd(), "public/offline-game-runtime.js"),
        "utf8",
      )),
    ]);
    return new Response(
      `<script>${script}</script>\n${body.toString("utf8")}`,
      { headers },
    );
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
