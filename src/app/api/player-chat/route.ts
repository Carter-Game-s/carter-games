import { allowRequest, sameOrigin } from "@/lib/proxy/security";
import {
  connected,
  getUser,
  history,
  isAdmin,
  moderate,
  post,
  rename,
  report,
  review,
  session,
  subscribe,
} from "@/lib/player-chat/server";
import { agreementVersion } from "@/lib/player-chat/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = "player-chat-id";

function identity(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)player-chat-id=([a-f0-9-]{36})(?:;|$)/)?.[1] ?? ""
  );
}

function json(
  value: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

export async function GET(request: Request) {
  if (!process.env.PLAYER_CHAT_DB)
    return json({ error: "Chat is unavailable." }, 503);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin")
    return json({ error: "Same-origin access required." }, 403);
  const user = getUser(identity(request));
  if (!user || user.ban > Date.now())
    return json({ error: "Player access is unavailable." }, 403);
  const before = new URL(request.url).searchParams.get("before");
  if (before !== null) {
    if (!allowRequest("player-chat-history:" + user.id, 20))
      return json({ error: "Slow down." }, 429);
    const id = Number(before);
    if (!Number.isSafeInteger(id) || id < 1)
      return json({ error: "Invalid history cursor." }, 400);
    return json({ messages: history(id) });
  }
  return subscribe(user, request);
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "Same-origin access required." }, 403);
  if (!process.env.PLAYER_CHAT_DB)
    return json({ error: "Chat is unavailable." }, 503);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allowRequest("player-chat-request:" + ip, 120))
    return json({ error: "Chat is busy. Try again shortly." }, 429);
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Missing request." }, 400);
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        return json({ error: "Request is too large." }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(text + decoder.decode()) as Record<
      string,
      unknown
    > | null;
    if (!data || typeof data !== "object")
      return json({ error: "Invalid request." }, 400);
    if (data.op === "admin") {
      if (!isAdmin(request)) {
        if (!allowRequest("player-chat-admin-denied:" + ip, 12))
          return json({ error: "Slow down." }, 429);
        return json({ error: "Moderator authorization required." }, 403);
      }
      if (typeof data.action === "string")
        moderate(data.action, data.target, data.value);
      return json(review());
    }
    const id = identity(request);
    const user = id ? getUser(id) : undefined;
    if (user && user.ban > Date.now())
      return json({ error: "You are banned from Global Chat." }, 403);
    if (data.op === "session") {
      if (data.version !== agreementVersion)
        return json({ error: "Accept the player agreement to use chat." }, 403);
      if (!user && !allowRequest("player-chat-signup:" + ip, 18))
        return json(
          { error: "Too many sessions. Try again in a minute." },
          429,
        );
      const active = session(id);
      const secure =
        request.headers.get("x-forwarded-proto") === "https" ||
        new URL(request.url).protocol === "https:";
      return json({ name: active.name }, 200, {
        "Set-Cookie": `${cookie}=${active.id}; Path=/api/player-chat; HttpOnly; SameSite=Strict; Max-Age=15552000${secure ? "; Secure" : ""}`,
      });
    }
    if (!user) return json({ error: "Reconnect to Global Chat." }, 403);
    if (!allowRequest("player-chat:" + user.id, 24))
      return json({ error: "Slow down. Try again in a minute." }, 429);
    if (data.op === "send") post(user, data.text, data.nonce);
    else if (data.op === "name") {
      if (!allowRequest("player-chat-name:" + user.id, 5))
        return json({ error: "Too many name changes." }, 429);
      return json({ name: rename(user, data.name) });
    } else if (data.op === "report") {
      if (!allowRequest("player-chat-report:" + user.id, 4))
        return json({ error: "Too many reports." }, 429);
      report(user, Number(data.id), data.reason);
    } else if (data.op === "online") return json({ online: connected() });
    else return json({ error: "Unknown chat action." }, 400);
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof SyntaxError)
      return json({ error: "Invalid request." }, 400);
    if (/SQLite|SQLITE|database|constraint|column/i.test(message))
      return json({ error: "Chat storage is unavailable." }, 503);
    return json({ error: message || "Unable to complete the request." }, 400);
  }
}
