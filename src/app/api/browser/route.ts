import { sameOrigin, verifyToken, allowRequest } from "@/lib/proxy/security";
import {
  browserRequest,
  browserServiceConfigured,
} from "@/lib/browser/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
async function relay(payload: Record<string, unknown>) {
  try {
    const response = await browserRequest(payload);
    const forwarded = new Headers(headers);
    for (const key of [
      "content-type",
      "x-browser-url",
      "x-browser-sequence",
      "x-browser-dialog",
    ]) {
      const value = response.headers.get(key);
      if (value) forwarded.set(key, value);
    }
    return new Response(
      response.status === 204
        ? null
        : new Uint8Array(await response.arrayBuffer()),
      { status: response.status, headers: forwarded },
    );
  } catch {
    return Response.json(
      { error: "Interactive browser is unavailable. Retry shortly." },
      { status: 503, headers },
    );
  }
}
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if (query.has("status")) {
    if (!allowRequest("browser-status", 30))
      return Response.json({ available: false }, { headers });
    if (!browserServiceConfigured())
      return Response.json({ available: false }, { headers });
    try {
      const response = await browserRequest({ op: "health" });
      return Response.json({ available: response.ok }, { headers });
    } catch {
      return Response.json({ available: false }, { headers });
    }
  }
  const token = query.get("token");
  if (!verifyToken(token))
    return Response.json(
      { error: "Browser session expired." },
      { status: 403, headers },
    );
  if (!allowRequest("interactive:" + token, 600))
    return Response.json(
      { error: "Slow down and retry." },
      { status: 429, headers },
    );
  return relay({
    op: "snapshot",
    id: query.get("id"),
    tab: query.get("tab"),
    sequence: Number(query.get("sequence") ?? -1),
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin access required." },
      { status: 403, headers },
    );
  try {
    const reader = request.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (!reader) throw Error("Missing action.");
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 32768) throw Error("Action is too large.");
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !verifyToken(body.token)
    )
      return Response.json(
        { error: "Browser session expired." },
        { status: 403, headers },
      );
    if (!allowRequest("interactive:" + body.token, 600))
      return Response.json(
        { error: "Slow down and retry." },
        { status: 429, headers },
      );
    if (
      ![
        "create",
        "close",
        "navigate",
        "reload",
        "text",
        "key",
        "click",
        "down",
        "up",
        "move",
        "scroll",
        "dialog",
        "closeTab",
      ].includes(body.op)
    )
      throw Error("Unknown action.");
    delete body.token;
    return relay(body);
  } catch {
    return Response.json(
      { error: "Invalid browser action." },
      { status: 400, headers },
    );
  }
}
