"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  Flag,
  MessageCircle,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  agreementVersion,
  type PlayerMessage,
  type RoomControls,
} from "@/lib/player-chat/rules";
import { RulesDialog } from "./agreement";
import styles from "./player.module.css";

const endpoint = "/api/player-chat";
const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
async function act(
  op: string,
  fields: Record<string, unknown> = {},
  signal?: AbortSignal,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, ...fields }),
    signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Chat request failed.");
  return body;
}

export function GlobalChat() {
  const [menu, setMenu] = useState(false);
  const [pending, setPending] = useState(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<PlayerMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [unread, setUnread] = useState(0);
  const [room, setRoom] = useState<RoomControls>({
    locked: false,
    slow: 0,
    pinned: null,
  });
  const [warning, setWarning] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState("Connecting…");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [older, setOlder] = useState(true);
  const [retry, setRetry] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const showing = useRef(false);
  const latest = useRef(0);
  const hiddenThrough = useRef(0);
  const follow = useRef(true);
  const restore = useRef<{ height: number; top: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let stream: EventSource | undefined;
    let timer: ReturnType<typeof setTimeout>;
    async function connect() {
      try {
        const { name } = await act(
          "session",
          { version: agreementVersion },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setName(name);
        stream = new EventSource(endpoint);
        stream.onopen = () => setState("Connected");
        stream.onerror = () => setState("Reconnecting…");
        stream.addEventListener("snapshot", ({ data }) => {
          const snapshot = JSON.parse(data) as {
            room: RoomControls;
            warning: string | null;
            name: string;
            messages: PlayerMessage[];
            online: number;
          };
          if (latest.current && !showing.current) {
            const missed = snapshot.messages.filter(
              (item) => item.id > latest.current,
            ).length;
            setUnread((n) => n + missed);
          }
          latest.current = Math.max(
            latest.current,
            snapshot.messages.at(-1)?.id ?? 0,
          );
          setName(snapshot.name);
          setRoom(snapshot.room);
          setWarning(snapshot.warning);
          setOnline(snapshot.online);
          setMessages(
            snapshot.messages.filter((item) => item.id > hiddenThrough.current),
          );
          setOlder(
            snapshot.messages.length >= 35 && hiddenThrough.current === 0,
          );
        });
        stream.addEventListener("online", ({ data }) =>
          setOnline(JSON.parse(data)),
        );
        stream.addEventListener("name", ({ data }) =>
          setName(JSON.parse(data)),
        );
        stream.addEventListener("renamed", ({ data }) => {
          const change = JSON.parse(data) as { from: string; to: string };
          if (showing.current) setNote(`${change.from} is now ${change.to}.`);
        });
        stream.addEventListener("message", ({ data }) => {
          const item = JSON.parse(data) as PlayerMessage;
          if (item.id <= latest.current) return;
          latest.current = item.id;
          setMessages((items) => [...items, item].slice(-220));
          if (!showing.current) setUnread((n) => n + 1);
          else if (!follow.current) setPending((n) => n + 1);
        });
        stream.addEventListener("site-status", ({ data }) =>
          window.dispatchEvent(
            new CustomEvent("player-site-status", { detail: JSON.parse(data) }),
          ),
        );
        stream.addEventListener("room", ({ data }) =>
          setRoom(JSON.parse(data)),
        );
        stream.addEventListener("warning", ({ data }) =>
          setWarning(JSON.parse(data)),
        );
        stream.addEventListener("purged", ({ data }) => {
          const removed = new Set<number>(JSON.parse(data));
          setMessages((items) => items.filter((item) => !removed.has(item.id)));
        });
        stream.addEventListener("restored", ({ data }) => {
          const item = JSON.parse(data) as PlayerMessage;
          if (item.id <= hiddenThrough.current) return;
          setMessages((items) =>
            items.some((m) => m.id === item.id)
              ? items
              : [...items, item].sort((a, b) => a.id - b.id).slice(-220),
          );
        });
        stream.addEventListener("deleted", ({ data }) =>
          setMessages((items) =>
            items.filter((item) => item.id !== Number(data)),
          ),
        );
        stream.addEventListener("banned", () => {
          stream?.close();
          setState("Disconnected");
          setError("You are banned from Global Chat.");
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const text = (error as Error).message;
        setState("Disconnected");
        setError(text);
        if (!text.includes("banned"))
          timer = setTimeout(() => setRetry((n) => n + 1), 15000);
      }
    }
    const offline = () => {
      controller.abort();
      stream?.close();
      clearTimeout(timer);
      setState("Disconnected");
    };
    const online = () => {
      setState("Reconnecting…");
      setError("");
      setRetry((n) => n + 1);
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if (navigator.onLine) void connect();
    else offline();
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      controller.abort();
      stream?.close();
      clearTimeout(timer);
    };
  }, [retry]);

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const resize = () => {
      panel.current?.style.setProperty(
        "--chat-viewport",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      panel.current?.style.setProperty(
        "--chat-offset",
        `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`,
      );
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    close.current?.focus();
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
    };
  }, [open]);

  useEffect(() => {
    const element = list.current;
    if (!element || !open) return;
    if (restore.current) {
      element.scrollTop =
        restore.current.top + element.scrollHeight - restore.current.height;
      restore.current = null;
    } else if (follow.current) element.scrollTop = element.scrollHeight;
  }, [messages, open]);

  function toggle(next: boolean) {
    showing.current = next;
    if (!next) setMenu(false);
    if (next) setPending(0);
    setOpen(next);
    if (next) {
      setUnread(0);
      follow.current = true;
    } else trigger.current?.focus();
  }

  async function more() {
    const item = messages[0];
    if (!item || !list.current || busy) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint + "?before=" + item.id);
      if (!response.ok) throw new Error("Could not load older messages.");
      const { messages: page } = (await response.json()) as {
        messages: PlayerMessage[];
      };
      if (!list.current) return;
      restore.current = {
        height: list.current.scrollHeight,
        top: list.current.scrollTop,
      };
      setMessages((current) =>
        [...page.filter((m) => m.id < (current[0]?.id ?? 0)), ...current].slice(
          0,
          220,
        ),
      );
      setOlder(page.length === 35 && messages.length + page.length < 220);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setError("");
    setNote("");
    setBusy(true);
    try {
      if (!text.startsWith("/"))
        await act("send", { text, nonce: crypto.randomUUID() });
      else {
        const [command, ...args] = text.split(/\s+/);
        const value = args.join(" ");
        switch (command.toLowerCase()) {
          case "/username": {
            if (!value)
              throw new Error("Use /username NAME or /username reset.");
            const updated = await act("name", { name: value });
            setName(updated.name);
            setNote("Your display name is " + updated.name + ".");
            break;
          }
          case "/help":
            setNote(
              "/username NAME · /username reset · /online · /clear · /rules · /report",
            );
            break;
          case "/online":
            setNote((await act("online")).online + " connected players.");
            break;
          case "/clear":
            hiddenThrough.current = latest.current;
            setMessages([]);
            setOlder(false);
            setNote("Local view cleared.");
            break;
          case "/rules":
            setRules(true);
            break;
          case "/report":
            setReporting(true);
            setSelected(null);
            break;
          default:
            throw new Error("Unknown command. Use /help.");
        }
      }
      setDraft("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    if (!selected || !reason.trim())
      return setError("Choose a message and enter a reason.");
    try {
      await act("report", { id: selected, reason });
      setReporting(false);
      setReason("");
      setError("");
      setNote("Report sent to moderators.");
    } catch (error) {
      setError((error as Error).message);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        className={styles.launch}
        aria-label={unread ? `Global Chat, ${unread} unread` : "Global Chat"}
        aria-expanded={open}
        aria-controls="global-chat-panel"
        onClick={() => toggle(!open)}
      >
        <MessageCircle aria-hidden="true" size={23} />
        {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <section
          id="global-chat-panel"
          ref={panel}
          aria-label="Global Chat"
          className={styles.chat}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !rules) toggle(false);
          }}
        >
          <header className={styles.chatHeader}>
            <div className={styles.chatIdentity}>
              <span className={styles.chatMark}>
                <MessageCircle size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Global Chat</h2>
                <p>
                  {state} · {online} connected{" "}
                  {online === 1 ? "player" : "players"}
                </p>
              </div>
            </div>
            <div className={styles.chatTools}>
              <button
                type="button"
                aria-label="Chat options"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <SlidersHorizontal size={17} />
              </button>
              <button
                ref={close}
                onClick={() => toggle(false)}
                aria-label="Close Global Chat"
              >
                <X size={20} />
              </button>
            </div>
          </header>
          {menu && (
            <div className={styles.options} aria-label="Chat options">
              <button
                onClick={() => {
                  setDraft("/username ");
                  setMenu(false);
                  composer.current?.focus();
                }}
              >
                Change name
              </button>
              <button
                onClick={() => {
                  setRules(true);
                  setMenu(false);
                }}
              >
                Player rules
              </button>
              <button
                onClick={() => {
                  setReporting(true);
                  setSelected(null);
                  setMenu(false);
                }}
              >
                Report a message
              </button>
            </div>
          )}
          {(room.locked || room.slow > 0 || room.pinned || warning) && (
            <aside className={styles.roomNotice} aria-label="Chat notices">
              {room.locked && (
                <p role="status">Posting is paused by moderators.</p>
              )}
              {!room.locked && room.slow > 0 && (
                <p>Slow mode · {room.slow}s between messages</p>
              )}
              {room.pinned && (
                <p>
                  <strong>Pinned · {room.pinned.name}</strong>{" "}
                  {room.pinned.text}
                </p>
              )}
              {warning && (
                <p role="status">
                  <strong>Moderator warning</strong> {warning}
                </p>
              )}
            </aside>
          )}
          <div
            ref={list}
            className={styles.messages}
            aria-label="Recent messages"
            role="log"
            tabIndex={0}
            onScroll={(event) => {
              const e = event.currentTarget;
              follow.current =
                e.scrollHeight - e.scrollTop - e.clientHeight < 45;
              if (follow.current) setPending(0);
            }}
          >
            {older && messages.length > 0 && (
              <button onClick={() => void more()} disabled={busy}>
                Load older messages
              </button>
            )}
            {!messages.length && (
              <div className={styles.empty}>
                <MessageCircle aria-hidden="true" />
                <p>No messages in this view.</p>
              </div>
            )}
            {messages.map((item) => (
              <article
                key={item.id}
                className={item.announcement ? styles.announcement : undefined}
              >
                <div className={styles.messageHead}>
                  <strong>{item.name}</strong>
                  <time dateTime={new Date(item.created).toISOString()}>
                    {time.format(item.created)}
                  </time>
                  {!item.announcement && (
                    <button
                      onClick={() => {
                        setSelected(item.id);
                        setReporting(true);
                      }}
                    >
                      <Flag aria-hidden="true" size={13} />
                      <span className="sr-only">Report</span>
                      <span className="sr-only"> message by {item.name}</span>
                    </button>
                  )}
                </div>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          {pending > 0 && (
            <button
              className={styles.jump}
              onClick={() => {
                if (list.current)
                  list.current.scrollTop = list.current.scrollHeight;
                follow.current = true;
                setPending(0);
              }}
            >
              <ArrowDown size={14} aria-hidden="true" />
              {pending} new {pending === 1 ? "message" : "messages"}
            </button>
          )}
          <div className={styles.chatBottom}>
            {reporting && (
              <div className={styles.report}>
                <label>
                  Message to report
                  <select
                    value={selected ?? ""}
                    onChange={(e) =>
                      setSelected(Number(e.target.value) || null)
                    }
                  >
                    <option value="">Choose a message</option>
                    {messages
                      .filter((m) => !m.announcement)
                      .slice(-35)
                      .reverse()
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}: {m.text.slice(0, 52)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Reason
                  <input
                    value={reason}
                    maxLength={250}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button type="button" onClick={() => void submitReport()}>
                  Submit report
                </button>{" "}
                <button type="button" onClick={() => setReporting(false)}>
                  Cancel report
                </button>
              </div>
            )}
            <div className={styles.chatStatus}>
              <span>{name && `Chatting as ${name}`}</span>
              <button
                type="button"
                onClick={() =>
                  setNote(
                    "/username NAME · /username reset · /online · /clear · /rules · /report",
                  )
                }
              >
                Commands
              </button>
            </div>
            {note && <p role="status">{note}</p>}
            {error && <p role="alert">{error}</p>}
            <form className={styles.compose} onSubmit={send}>
              <textarea
                ref={composer}
                aria-label="Global chat message"
                placeholder="Message or /help"
                value={draft}
                rows={2}
                maxLength={500}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button className="primary" disabled={busy || !draft.trim()}>
                <Send size={16} aria-hidden="true" /> <span>Send</span>
              </button>
            </form>
          </div>
        </section>
      )}
      {rules && <RulesDialog close={() => setRules(false)} />}
    </>
  );
}
