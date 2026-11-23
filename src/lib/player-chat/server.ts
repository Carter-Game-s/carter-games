import {
  createHash,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  siteFeatures,
  type PlayerMessage,
  type RoomControls,
  type SiteStatus,
  type SiteFeature,
} from "./rules";

type User = { id: string; name: string; mute: number; ban: number };
type Listener = {
  user: string;
  send: (event: string, value: unknown) => void;
  close: () => void;
};
const listeners = new Set<Listener>();
const day = 86_400_000;
const permanent = 8_640_000_000_000_000;
let database: DatabaseSync | undefined;
let nextCleanup = 0;

export function db() {
  if (database) return database;
  if (!process.env.PLAYER_CHAT_DB)
    throw new Error("Player chat is unavailable.");
  database = new DatabaseSync(process.env.PLAYER_CHAT_DB);
  database.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=2000;
    CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, name TEXT UNIQUE COLLATE NOCASE NOT NULL,
      seen INTEGER NOT NULL, mute INTEGER NOT NULL DEFAULT 0, ban INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT NOT NULL,
      nonce TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL,
      announcement INTEGER NOT NULL DEFAULT 0, UNIQUE(user, nonce));
    CREATE INDEX IF NOT EXISTS messages_user ON messages(user,id DESC);
    CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT, reporter TEXT NOT NULL, user TEXT NOT NULL,
      message INTEGER NOT NULL, text TEXT NOT NULL, reason TEXT NOT NULL, created INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0, UNIQUE(reporter,message));
    CREATE TABLE IF NOT EXISTS hidden_messages(id INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS room_controls(singleton INTEGER PRIMARY KEY CHECK(singleton=1),
      locked INTEGER NOT NULL DEFAULT 0, slow INTEGER NOT NULL DEFAULT 0, pinned INTEGER);
    INSERT OR IGNORE INTO room_controls(singleton) VALUES(1);
    CREATE TABLE IF NOT EXISTS player_warnings(user TEXT PRIMARY KEY, text TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS player_notes(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT NOT NULL,
      text TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS site_policy(key TEXT PRIMARY KEY, text TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT 'info', until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS report_priority(id INTEGER PRIMARY KEY, level INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS moderation(id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL, target TEXT NOT NULL, created INTEGER NOT NULL);
  `);
  return database;
}

export function getUser(id: string) {
  return db()
    .prepare("SELECT id,name,mute,ban FROM players WHERE id=?")
    .get(id) as User | undefined;
}

function anonymousName(exclude = "") {
  const query = db().prepare(
    "SELECT 1 FROM players WHERE name=? COLLATE NOCASE",
  );
  for (let i = 0; i < 35; i++) {
    const candidate = "Anonymous" + randomInt(1000, i < 20 ? 10000 : 10000000);
    if (candidate !== exclude && !query.get(candidate)) return candidate;
  }
  throw new Error("Could not assign a name. Try again.");
}

export function session(id: string) {
  const now = Date.now();
  if (now >= nextCleanup) {
    nextCleanup = now + day;
    db()
      .prepare(
        `DELETE FROM players WHERE seen<? AND mute<? AND ban<?
      AND id NOT IN (SELECT user FROM reports WHERE resolved=0)`,
      )
      .run(now - day * 180, now, now);
  }
  const user = getUser(id);
  if (user) {
    db().prepare("UPDATE players SET seen=? WHERE id=?").run(now, id);
    return user;
  }
  if (
    Number(
      db().prepare("SELECT COUNT(*) AS count FROM players").get()?.count,
    ) >= 30000
  )
    throw new Error("Chat is at capacity. Try again later.");
  const created = { id: randomUUID(), name: anonymousName(), mute: 0, ban: 0 };
  db()
    .prepare("INSERT INTO players(id,name,seen) VALUES(?,?,?)")
    .run(created.id, created.name, now);
  return created;
}

export const connected = () =>
  new Set([...listeners].map((item) => item.user)).size;
function broadcast(event: string, data: unknown) {
  for (const listener of listeners) listener.send(event, data);
}

function roomControls(): RoomControls {
  const config = db()
    .prepare("SELECT locked,slow,pinned FROM room_controls WHERE singleton=1")
    .get()!;
  return {
    locked: Boolean(config.locked),
    slow: Number(config.slow),
    pinned:
      config.pinned === null
        ? null
        : ((db()
            .prepare(
              "SELECT id,name,text,created,announcement FROM messages WHERE id=? AND id NOT IN (SELECT id FROM hidden_messages)",
            )
            .get(config.pinned) as PlayerMessage | undefined) ?? null),
  };
}

export function history(before = Number.MAX_SAFE_INTEGER, limit = 35) {
  return (
    db()
      .prepare(
        "SELECT id,name,text,created,announcement FROM messages WHERE id<? AND id NOT IN (SELECT id FROM hidden_messages) ORDER BY id DESC LIMIT ?",
      )
      .all(before, limit) as PlayerMessage[]
  ).reverse();
}

export function subscribe(user: User, request: Request) {
  if (
    listeners.size >= 280 ||
    [...listeners].filter((item) => item.user === user.id).length >= 4
  )
    return new Response("Chat is at capacity.", { status: 429 });
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let ended = false;
      const listener: Listener = {
        user: user.id,
        send(event, data) {
          if (ended) return;
          try {
            if (controller.desiredSize !== null && controller.desiredSize < -20)
              return listener.close();
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch {
            listener.close();
          }
        },
        close() {
          if (ended) return;
          ended = true;
          clearInterval(heartbeat);
          clearTimeout(lifetime);
          request.signal.removeEventListener("abort", listener.close);
          listeners.delete(listener);
          try {
            controller.close();
          } catch {}
          broadcast("online", connected());
        },
      };
      cleanup = listener.close;
      const heartbeat = setInterval(
        () => listener.send("heartbeat", null),
        15000,
      );
      const lifetime = setTimeout(listener.close, 240000);
      listeners.add(listener);
      request.signal.addEventListener("abort", listener.close, { once: true });
      listener.send("snapshot", {
        name: user.name,
        messages: history(),
        room: roomControls(),
        warning:
          db()
            .prepare("SELECT text FROM player_warnings WHERE user=?")
            .get(user.id)?.text ?? null,
        online: connected(),
      });
      broadcast("online", connected());
      if (request.signal.aborted) listener.close();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const profanity =
  /\b(?:fuck(?:er|ing)?|shit(?:ty)?|bitch(?:es)?|cunt|nigg(?:er|a)s?)\b/i;
const unsafeName =
  /(?:admin|moderator|system|staff|owner|official|support|getmoremath|nigg|fuck|shit|bitch|cunt)/i;
export function rename(user: User, requested: unknown) {
  if (typeof requested !== "string") throw new Error("Enter a display name.");
  const reset = requested.toLowerCase() === "reset";
  const name = reset ? anonymousName(user.name) : requested;
  if (!/^[a-z0-9_-]{1,20}$/i.test(name))
    throw new Error("Use up to 20 letters, numbers, underscores or hyphens.");
  if (
    !reset &&
    (unsafeName.test(name.replace(/[_-]/g, "")) || /^anonymous/i.test(name))
  )
    throw new Error("That name is reserved or inappropriate.");
  if (
    name.toLowerCase() !== user.name.toLowerCase() &&
    db().prepare("SELECT 1 FROM players WHERE name=?").get(name)
  )
    throw new Error("That display name is already in use.");
  db().prepare("UPDATE players SET name=? WHERE id=?").run(name, user.id);
  for (const listener of listeners)
    if (listener.user === user.id) listener.send("name", name);
  if (name !== user.name) broadcast("renamed", { from: user.name, to: name });
  return name;
}

function clean(input: unknown, limit = 500) {
  if (typeof input !== "string") throw new Error("Enter text.");
  const text = input
    .replace(/[\x00-\x08\x0b-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
  if (!text || text.length > limit)
    throw new Error(`Enter 1 to ${limit} characters.`);
  return text;
}

export function post(
  user: User,
  input: unknown,
  nonce: unknown,
  announcement = false,
) {
  const now = Date.now();
  if (user.mute > now) throw new Error("You are muted.");
  if (typeof nonce !== "string" || !/^[a-f0-9-]{36}$/i.test(nonce))
    throw new Error("Invalid message ID.");
  if (
    db()
      .prepare("SELECT 1 FROM messages WHERE user=? AND nonce=?")
      .get(user.id, nonce)
  )
    return;
  if (
    !announcement &&
    Number(
      db()
        .prepare(
          "SELECT count(*) AS count FROM (SELECT created FROM messages WHERE user=? ORDER BY id DESC LIMIT 5) WHERE created>?",
        )
        .get(user.id, now - 8000)?.count,
    ) >= 5
  )
    throw new Error("You are sending messages too quickly.");
  if (!announcement) {
    const settings = roomControls();
    if (settings.locked) throw new Error("Global Chat is temporarily paused.");
    if (
      settings.slow &&
      db()
        .prepare("SELECT 1 FROM messages WHERE user=? AND created>? LIMIT 1")
        .get(user.id, now - settings.slow * 1000)
    )
      throw new Error(
        `Slow mode is on. Wait ${settings.slow} seconds between messages.`,
      );
  }
  const text = clean(input);
  if (!announcement && profanity.test(text))
    throw new Error("Please use appropriate language.");
  if (
    /(?:javascript:|data:|\b(?:discord\.gg|bit\.ly|tinyurl\.com)\/|https?:\/\/[^\s]*(?:xn--|\.(?:exe|msi|apk|scr|zip)(?:[/?#\s]|$)))/i.test(
      text,
    )
  )
    throw new Error("That link is blocked.");
  if (
    !announcement &&
    db()
      .prepare(
        `SELECT 1 FROM (SELECT lower(text) AS body,created FROM messages
    WHERE user=? ORDER BY id DESC LIMIT 10) WHERE body=lower(?) AND created>?`,
      )
      .get(user.id, text, now - 30000)
  )
    throw new Error("You recently sent that message.");
  const result = db()
    .prepare(
      "INSERT INTO messages(user,nonce,name,text,created,announcement) VALUES(?,?,?,?,?,?)",
    )
    .run(user.id, nonce, user.name, text, now, Number(announcement));
  const id = Number(result.lastInsertRowid);
  db()
    .prepare("DELETE FROM messages WHERE id <= ?")
    .run(id - 1500);
  db()
    .prepare("DELETE FROM hidden_messages WHERE id<=?")
    .run(id - 1500);
  if (
    db()
      .prepare("UPDATE room_controls SET pinned=NULL WHERE pinned<=?")
      .run(id - 1500).changes
  )
    broadcast("room", roomControls());
  broadcast("message", {
    id,
    name: user.name,
    text,
    created: now,
    announcement: Number(announcement),
  });
}

export function report(user: User, message: number, reason: unknown) {
  const row = db()
    .prepare("SELECT user,text FROM messages WHERE id=? AND announcement=0")
    .get(message);
  if (!row) throw new Error("Select a recent player message.");
  if (row.user === user.id)
    throw new Error("Choose a message from another player.");
  if (
    Number(
      db()
        .prepare("SELECT COUNT(*) AS count FROM reports WHERE resolved=0")
        .get()?.count,
    ) >= 3000
  )
    throw new Error("Report queue is full. Try again later.");
  db()
    .prepare(
      "INSERT OR IGNORE INTO reports(reporter,user,message,text,reason,created) VALUES(?,?,?,?,?,?)",
    )
    .run(
      user.id,
      String(row.user),
      message,
      String(row.text),
      clean(reason, 250),
      Date.now(),
    );
}

export function isAdmin(request: Request) {
  const expected = process.env.PLAYER_CHAT_ADMIN_HASH;
  const supplied = request.headers.get("x-player-moderator-key");
  return (
    !!expected &&
    /^[a-f0-9]{64}$/.test(expected) &&
    !!supplied &&
    /^[a-f0-9]{64}$/.test(supplied) &&
    timingSafeEqual(
      Buffer.from(expected, "hex"),
      createHash("sha256").update(supplied).digest(),
    )
  );
}

export function siteStatus(): SiteStatus {
  const result: SiteStatus = { notice: null, pauses: {} };
  if (!process.env.PLAYER_CHAT_DB) return result;
  const rows = db()
    .prepare("SELECT key,text,tone,until FROM site_policy WHERE until>?")
    .all(Date.now());
  for (const row of rows) {
    if (row.key === "notice")
      result.notice = {
        text: String(row.text),
        tone: row.tone === "warning" ? "warning" : "info",
        until: Number(row.until),
      };
    else if (
      typeof row.key === "string" &&
      Object.hasOwn(siteFeatures, row.key)
    )
      result.pauses[row.key as SiteFeature] = Number(row.until);
  }
  return result;
}

export function featurePause(feature: SiteFeature) {
  if (!process.env.PLAYER_CHAT_DB) return null;
  const row = db()
    .prepare("SELECT until FROM site_policy WHERE key=? AND until>?")
    .get(feature, Date.now());
  if (!row) return null;
  return Response.json(
    { error: `${siteFeatures[feature]} is temporarily paused by moderators.` },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(
          Math.max(1, Math.ceil((Number(row.until) - Date.now()) / 1000)),
        ),
      },
    },
  );
}

function applySitePolicy(
  action: string,
  target: unknown,
  value: unknown,
  now: number,
) {
  if (action === "site-clear") {
    db().exec("DELETE FROM site_policy WHERE key='notice'");
    return "Site notice";
  }
  if (action === "site-notice") {
    if (!value || typeof value !== "object")
      throw new Error("Enter a valid notice.");
    const { text, tone, minutes } = value as Record<string, unknown>;
    if (
      (tone !== "info" && tone !== "warning") ||
      typeof minutes !== "number" ||
      ![15, 60, 360, 1440].includes(minutes)
    )
      throw new Error("Select a notice style and duration.");
    db()
      .prepare(
        "INSERT OR REPLACE INTO site_policy(key,text,tone,until) VALUES('notice',?,?,?)",
      )
      .run(clean(text, 240), tone, now + minutes * 60000);
    return "Site notice";
  }
  if (typeof target !== "string" || !Object.hasOwn(siteFeatures, target))
    throw new Error("Select a site feature.");
  if (action === "site-resume")
    db().prepare("DELETE FROM site_policy WHERE key=?").run(target);
  else {
    if (typeof value !== "number" || ![5, 15, 60, 360].includes(value))
      throw new Error("Select a pause duration.");
    db()
      .prepare("INSERT OR REPLACE INTO site_policy(key,until) VALUES(?,?)")
      .run(target, now + value * 60000);
  }
  return siteFeatures[target as SiteFeature];
}

export function review() {
  const asOf = Date.now();
  return {
    asOf,
    online: connected(),
    site: siteStatus(),
    room: roomControls(),
    players: db()
      .prepare(
        "SELECT id,name,seen,mute,ban FROM players ORDER BY seen DESC LIMIT 100",
      )
      .all(),
    notes: db()
      .prepare(
        "SELECT id,user,text,created FROM player_notes ORDER BY id DESC LIMIT 100",
      )
      .all(),
    messages: db()
      .prepare(
        "SELECT id,user,name,text,created,announcement, EXISTS(SELECT 1 FROM hidden_messages WHERE id=messages.id) AS hidden FROM messages ORDER BY id DESC LIMIT 70",
      )
      .all(),
    reports: db()
      .prepare(
        "SELECT reports.id,user,message,text,reason,created,resolved, coalesce(report_priority.level,0) AS priority FROM reports LEFT JOIN report_priority USING(id) ORDER BY resolved,priority DESC,id DESC LIMIT 65",
      )
      .all(),
    audit: db()
      .prepare(
        "SELECT action,target,created FROM moderation ORDER BY id DESC LIMIT 60",
      )
      .all(),
    restricted: db()
      .prepare(
        "SELECT id,name,mute,ban FROM players WHERE mute>? OR ban>? LIMIT 100",
      )
      .all(asOf, asOf),
  };
}

export function moderate(action: string, target: unknown, value: unknown) {
  const now = Date.now();
  let auditTarget = String(target ?? "").slice(0, 36);
  if (
    ["site-notice", "site-clear", "site-pause", "site-resume"].includes(action)
  ) {
    auditTarget = applySitePolicy(action, target, value, now);
    broadcast("site-status", siteStatus());
  } else if (action === "priority") {
    if (
      !Number.isSafeInteger(target) ||
      !db().prepare("SELECT 1 FROM reports WHERE id=?").get(Number(target)) ||
      (value !== 0 && value !== 1)
    )
      throw new Error("Select a report and priority.");
    db()
      .prepare("INSERT OR REPLACE INTO report_priority(id,level) VALUES(?,?)")
      .run(Number(target), value);
  } else if (action === "note-delete") {
    if (
      !Number.isSafeInteger(target) ||
      !db().prepare("DELETE FROM player_notes WHERE id=?").run(Number(target))
        .changes
    )
      throw new Error("Note not found.");
  } else if (action === "announce") {
    post(
      { id: "system", name: "System", mute: 0, ban: 0 },
      value,
      randomUUID(),
      true,
    );
    auditTarget = "Global Chat";
  } else if (["lock", "unlock", "slow", "unpin"].includes(action)) {
    if (action === "slow" && ![0, 5, 10, 30, 60].includes(value as number))
      throw new Error("Select a valid slow mode interval.");
    if (action === "unpin") db().exec("UPDATE room_controls SET pinned=NULL");
    else if (action === "slow")
      db()
        .prepare("UPDATE room_controls SET slow=?")
        .run(value as number);
    else
      db()
        .prepare("UPDATE room_controls SET locked=?")
        .run(Number(action === "lock"));
    auditTarget = action === "slow" ? `Global Chat · ${value}s` : "Global Chat";
    broadcast("room", roomControls());
  } else if (
    [
      "delete",
      "hide",
      "restore",
      "pin",
      "resolve",
      "reopen",
      "dismiss",
    ].includes(action)
  ) {
    const id = Number(target);
    if (!Number.isSafeInteger(id) || id < 1)
      throw new Error("Invalid selection.");
    if (["resolve", "reopen", "dismiss"].includes(action)) {
      const status = action === "resolve" ? 1 : action === "dismiss" ? 2 : 0;
      if (
        !db()
          .prepare("UPDATE reports SET resolved=? WHERE id=?")
          .run(status, id).changes
      )
        throw new Error("Report not found.");
    } else {
      const message = db()
        .prepare(
          "SELECT id,name,text,created,announcement FROM messages WHERE id=?",
        )
        .get(id);
      if (!message) throw new Error("Message not found.");
      if (action === "delete" || action === "hide") {
        if (action === "delete") {
          db().prepare("DELETE FROM messages WHERE id=?").run(id);
          db().prepare("DELETE FROM hidden_messages WHERE id=?").run(id);
        } else
          db()
            .prepare("INSERT OR IGNORE INTO hidden_messages(id) VALUES(?)")
            .run(id);
        db()
          .prepare("UPDATE room_controls SET pinned=NULL WHERE pinned=?")
          .run(id);
        broadcast("deleted", id);
        broadcast("room", roomControls());
      } else if (action === "restore") {
        if (
          db().prepare("DELETE FROM hidden_messages WHERE id=?").run(id).changes
        )
          broadcast("restored", message);
      } else {
        if (db().prepare("SELECT 1 FROM hidden_messages WHERE id=?").get(id))
          throw new Error("Restore that message before pinning.");
        db().prepare("UPDATE room_controls SET pinned=?").run(id);
        broadcast("room", roomControls());
      }
    }
  } else {
    const player = typeof target === "string" ? getUser(target) : undefined;
    if (!player) throw new Error("Player not found.");
    if (action === "reset-name") rename(player, "reset");
    else if (action === "warn") {
      const warning = clean(value, 250);
      db()
        .prepare(
          "INSERT INTO player_warnings(user,text,created) VALUES(?,?,?) ON CONFLICT(user) DO UPDATE SET text=excluded.text,created=excluded.created",
        )
        .run(player.id, warning, now);
      for (const listener of listeners)
        if (listener.user === player.id) listener.send("warning", warning);
    } else if (action === "clear-warning") {
      db().prepare("DELETE FROM player_warnings WHERE user=?").run(player.id);
      for (const listener of listeners)
        if (listener.user === player.id) listener.send("warning", null);
    } else if (action === "note") {
      const row = db()
        .prepare("INSERT INTO player_notes(user,text,created) VALUES(?,?,?)")
        .run(player.id, clean(value, 250), now);
      db()
        .prepare("DELETE FROM player_notes WHERE id<=?")
        .run(Number(row.lastInsertRowid) - 1500);
    } else if (action === "hide-player") {
      const rows = db()
        .prepare(
          "SELECT id FROM messages WHERE user=? AND id NOT IN (SELECT id FROM hidden_messages)",
        )
        .all(player.id);
      db()
        .prepare(
          "INSERT OR IGNORE INTO hidden_messages SELECT id FROM messages WHERE user=?",
        )
        .run(player.id);
      db().exec(
        "UPDATE room_controls SET pinned=NULL WHERE pinned IN (SELECT id FROM hidden_messages)",
      );
      broadcast(
        "purged",
        rows.map((row) => row.id),
      );
      broadcast("room", roomControls());
    } else {
      if (!["mute", "ban", "unmute", "unban"].includes(action))
        throw new Error("Unknown moderation action.");
      const column = action.endsWith("mute") ? "mute" : "ban";
      if (
        !action.startsWith("un") &&
        ![5, 15, 60, 360, 1440, 10080, "permanent"].includes(
          value as number | string,
        )
      )
        throw new Error("Select a restriction duration.");
      const until = action.startsWith("un")
        ? 0
        : value === "permanent"
          ? permanent
          : now + Number(value) * 60000;
      db()
        .prepare(`UPDATE players SET ${column}=? WHERE id=?`)
        .run(until, player.id);
      if (action === "ban")
        for (const listener of listeners)
          if (listener.user === player.id) {
            listener.send("banned", true);
            listener.close();
          }
    }
  }
  const row = db()
    .prepare("INSERT INTO moderation(action,target,created) VALUES(?,?,?)")
    .run(action, auditTarget, now);
  db()
    .prepare("DELETE FROM moderation WHERE id<=?")
    .run(Number(row.lastInsertRowid) - 1500);
  db()
    .prepare("DELETE FROM reports WHERE resolved<>0 AND created<?")
    .run(now - day * 90);
  db().exec(
    "DELETE FROM report_priority WHERE id NOT IN (SELECT id FROM reports)",
  );
}
