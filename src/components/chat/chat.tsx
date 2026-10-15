"use client";
import { useEffect, useRef, useState, useDeferredValue, useMemo } from "react";
import {
  MessageCircle,
  Send,
  Square,
  Trash2,
  Plus,
  Copy,
  RefreshCw,
  Pencil,
  Download,
} from "lucide-react";
import type { ChatMessage } from "@/lib/chat/messages";
import { useStorage } from "@/lib/storage/use-storage";
import { read, write } from "@/lib/storage";
import {
  emptyConversations,
  validConversations,
  conversationTitle,
  regenerationHistory,
  requestHistory,
} from "@/lib/client/conversations";
import { id, downloadJSON } from "@/lib/client/validation";
import { Markdown } from "@/components/features/markdown";
import styles from "./chat.module.css";
export function Chat() {
  const [store, saveStore] = useStorage(
    "conversations",
    emptyConversations,
    validConversations,
  );
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [temporary, setTemporary] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [rename, setRename] = useState("");
  const [edit, setEdit] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const current = useRef({ selected, messages, temporary });
  current.current = { selected, messages, temporary };
  const requestId = useRef(0);
  function persist(snapshot = current.current) {
    if (snapshot.temporary || !snapshot.selected || !snapshot.messages.length)
      return;
    const raw = read("conversations", emptyConversations);
    const existing = validConversations(raw) ? raw : emptyConversations;
    const old = existing.items.find((c) => c.id === snapshot.selected);
    if (!old && existing.items.length >= 100) {
      setError(
        "Saved conversation limit reached. Export or delete a conversation, or use temporary chat.",
      );
      return;
    }
    const conversation = {
      id: snapshot.selected,
      title: old?.title || conversationTitle(snapshot.messages),
      created: old?.created || Date.now(),
      updated: Date.now(),
      messages: snapshot.messages,
    };
    write("conversations", {
      version: 1,
      items: [
        conversation,
        ...existing.items.filter((c) => c.id !== snapshot.selected),
      ],
    });
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/chat", { signal: controller.signal })
      .then((r) => r.json())
      .then((s) => setAvailable(s.available))
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    return () => {
      controller.abort();
      abort.current?.abort();
      persist();
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => persist(), 500);
    return () => clearTimeout(timer);
  }, [messages, selected, temporary]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  function stop() {
    abort.current?.abort();
  }
  function open(conversationId: string) {
    stop();
    requestId.current++;
    persist();
    const c = store.items.find((c) => c.id === conversationId);
    if (!c) return;
    setTemporary(false);
    setSelected(c.id);
    setMessages(c.messages);
    setError("");
    setEdit(null);
    setBusy(false);
  }
  function fresh(temp = temporary) {
    stop();
    requestId.current++;
    persist();
    setSelected("");
    setMessages([]);
    setInput("");
    setError("");
    setEdit(null);
    setBusy(false);
    setTemporary(temp);
  }
  async function generate(history: ChatMessage[]) {
    if (busy || history.at(-1)?.role !== "user") return;
    if (history.length > 198) {
      setError(
        "This conversation has reached its 200-message limit. Export it and start a new conversation to continue.",
      );
      return;
    }
    if (!temporary && !selected && store.items.length >= 100) {
      setError(
        "Saved conversation limit reached. Export or delete a conversation, or use temporary chat.",
      );
      return;
    }
    const serial = ++requestId.current;
    const controller = new AbortController();
    abort.current = controller;
    const conversationId = selected || id();
    if (!selected && !temporary)
      persist({
        selected: conversationId,
        messages: history,
        temporary: false,
      });
    setSelected(conversationId);
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setError("");
    let reply = "";
    try {
      const connection = await fetch("/api/chat", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!connection.ok)
        throw Error("Could not check the AI connection. Retry shortly.");
      const status = await connection.json();
      if (!status.available)
        throw Error(
          "The configured AI model is currently unavailable. Your message is saved; retry when connected.",
        );
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Carter-Chat-Token":
            typeof status.token === "string" ? status.token : "",
        },
        body: JSON.stringify({
          messages: requestHistory(history),
          stream: !(
            navigator.maxTouchPoints > 0 &&
            (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
              /Mac/.test(navigator.platform))
          ),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        let message = `AI request failed (HTTP ${response.status}).`;
        try {
          const body = await response.json();
          if (typeof body.error === "string") message = body.error;
        } catch {}
        throw Error(message);
      }
      if (response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        if (typeof data.text !== "string")
          throw Error("The AI returned an invalid response.");
        reply = data.text;
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            reply += decoder.decode();
            break;
          }
          reply += decoder.decode(value, { stream: true });
          if (serial === requestId.current)
            setMessages([...history, { role: "assistant", content: reply }]);
        }
      } else reply = await response.text();
      if (!reply.trim()) throw Error("No response received. Try regenerating.");
      if (serial === requestId.current)
        setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      if (serial === requestId.current) {
        if (!controller.signal.aborted) setError((e as Error).message);
        setMessages(
          reply ? [...history, { role: "assistant", content: reply }] : history,
        );
      }
    } finally {
      if (serial === requestId.current) {
        setBusy(false);
        abort.current = null;
      }
    }
  }
  const conversation = store.items.find((c) => c.id === selected);
  const title = temporary
    ? "Temporary chat"
    : conversation?.title || conversationTitle(messages);
  const filtered = useMemo(
    () =>
      store.items
        .filter((c) =>
          `${c.title} ${c.messages.map((m) => m.content).join(" ")}`
            .toLowerCase()
            .includes(deferredSearch.toLowerCase()),
        )
        .slice(0, 100),
    [store.items, deferredSearch],
  );
  return (
    <div className="page">
      <div className="eyebrow">A little help, a little curiosity</div>
      <h1>Carter AI.</h1>
      <p className="muted">Ask a question, get game ideas, or just chat.</p>
      <div className="chat-layout">
        <aside className="panel conversation-sidebar">
          <h2>Conversations</h2>
          <button onClick={() => fresh(false)}>
            <Plus size={16} />
            New conversation
          </button>
          <label>
            <input
              type="checkbox"
              checked={temporary}
              onChange={(e) => fresh(e.target.checked)}
              disabled={busy}
            />
            Temporary chat
          </label>
          <p className="muted">
            Temporary chats are not saved. Conversations stay only on this
            device.
          </p>
          <input
            aria-label="Search conversations"
            placeholder="Search history"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="conversation-list">
            {filtered.map((c) => (
              <div key={c.id}>
                <button
                  aria-current={selected === c.id ? "true" : undefined}
                  onClick={() => open(c.id)}
                >
                  {c.title}
                </button>
                <small>{new Date(c.updated).toLocaleDateString()}</small>
                <button
                  aria-label={`Delete ${c.title}`}
                  onClick={() => {
                    if (confirm(`Delete ${c.title}?`)) {
                      if (selected === c.id) {
                        stop();
                        requestId.current++;
                        current.current = {
                          selected: "",
                          messages: [],
                          temporary,
                        };
                        setSelected("");
                        setMessages([]);
                        setBusy(false);
                      }
                      saveStore({
                        ...store,
                        items: store.items.filter((x) => x.id !== c.id),
                      });
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {!filtered.length && <p>No saved conversations.</p>}
          <button
            disabled={!store.items.length}
            onClick={() => {
              if (
                confirm("Clear all saved conversations? This cannot be undone.")
              ) {
                stop();
                requestId.current++;
                current.current = { selected: "", messages: [], temporary };
                setMessages([]);
                setSelected("");
                setBusy(false);
                saveStore(emptyConversations);
              }
            }}
          >
            Clear history
          </button>
        </aside>
        <div className="chat-main">
          <div className={styles.heading}>
            <span className="tag">
              {available === null
                ? "Checking connection…"
                : available
                  ? "AI connected"
                  : "Awaiting model connection"}
            </span>
            <button disabled={busy || !messages.length} onClick={() => fresh()}>
              <MessageCircle size={15} />
              New chat
            </button>
          </div>
          <h2>{title}</h2>
          <div className="feature-actions">
            <button
              disabled={!selected || temporary || busy}
              onClick={() => setRename(title)}
            >
              Rename conversation
            </button>
            <button
              disabled={!messages.length}
              onClick={() =>
                downloadJSON("carter-conversation.json", {
                  format: "carter-conversation",
                  version: 1,
                  conversation: {
                    id: selected,
                    title,
                    created: conversation?.created || Date.now(),
                    updated: Date.now(),
                    messages,
                  },
                })
              }
            >
              <Download size={14} />
              Export conversation
            </button>
          </div>
          {rename && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                persist();
                const raw = read("conversations", emptyConversations);
                if (validConversations(raw))
                  saveStore({
                    ...raw,
                    items: raw.items.map((c) =>
                      c.id === selected
                        ? {
                            ...c,
                            title: rename.trim().slice(0, 100) || c.title,
                            updated: Date.now(),
                          }
                        : c,
                    ),
                  });
                setRename("");
              }}
            >
              <input
                aria-label="Conversation title"
                maxLength={100}
                value={rename}
                onChange={(e) => setRename(e.target.value)}
              />
              <button>Save title</button>
              <button type="button" onClick={() => setRename("")}>
                Cancel rename
              </button>
            </form>
          )}
          <section
            className={styles.conversation}
            aria-label="Chat conversation"
            aria-busy={busy}
          >
            {!messages.length && (
              <div className={styles.empty}>
                <MessageCircle size={38} />
                <h2>What’s on your mind?</h2>
                <p>Start with a question below.</p>
                <div className={styles.suggestions}>
                  {[
                    "Explain fractions with a simple example",
                    "Help me solve a math problem step by step",
                    "Help me understand my homework",
                    "Quiz me on what I’m studying",
                    "Help me outline an essay",
                    "Explain a science topic in simple terms",
                  ].map((text) => (
                    <button
                      key={text}
                      disabled={busy}
                      onClick={() =>
                        void generate([{ role: "user", content: text }])
                      }
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <article
                key={index}
                className={`${styles.message} ${message.role === "user" ? styles.user : ""}`}
              >
                <span>{message.role === "user" ? "You" : "Carter AI"}</span>
                {edit === index ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const history = [
                        ...messages.slice(0, index),
                        { role: "user" as const, content: editText.trim() },
                      ];
                      setEdit(null);
                      void generate(history);
                    }}
                  >
                    <textarea
                      aria-label="Edit chat message"
                      maxLength={4000}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <button disabled={!editText.trim()}>
                      Resend edited message
                    </button>
                    <button type="button" onClick={() => setEdit(null)}>
                      Cancel edit
                    </button>
                  </form>
                ) : message.content ? (
                  <Markdown content={message.content} />
                ) : (
                  <p role="status">
                    {busy ? "Generating response…" : "No response"}
                  </p>
                )}
                <div className="message-actions">
                  <button
                    aria-label={`Copy message ${index + 1}`}
                    disabled={!message.content}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(message.content);
                        setCopied(index);
                      } catch {
                        setError(
                          "Clipboard access is unavailable. Select the message text to copy it.",
                        );
                      }
                    }}
                  >
                    <Copy size={13} />
                    {copied === index ? "Copied" : "Copy"}
                  </button>
                  {message.role === "user" ? (
                    <button
                      disabled={busy}
                      aria-label={`Edit message ${index + 1}`}
                      onClick={() => {
                        setEdit(index);
                        setEditText(message.content);
                      }}
                    >
                      <Pencil size={13} />
                      Edit and resend
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void generate(regenerationHistory(messages, index))
                      }
                    >
                      <RefreshCw size={13} />
                      Regenerate response
                    </button>
                  )}
                </div>
              </article>
            ))}
            <div ref={end} />
          </section>
          {error && (
            <p className="error" role="alert">
              {error}
              <button
                disabled={busy}
                onClick={() => {
                  const history =
                    messages.at(-1)?.role === "assistant"
                      ? regenerationHistory(messages)
                      : messages;
                  void generate(history);
                }}
              >
                Retry message
              </button>
            </p>
          )}
          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim())
                void generate([
                  ...messages.filter((m) => m.content.trim()),
                  { role: "user", content: input.trim() },
                ]);
            }}
          >
            <textarea
              aria-label="Message Carter AI"
              placeholder="Message Carter AI…"
              maxLength={4000}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (input.trim())
                    void generate([
                      ...messages.filter((m) => m.content.trim()),
                      { role: "user", content: input.trim() },
                    ]);
                }
              }}
            />
            {busy ? (
              <button type="button" aria-label="Stop response" onClick={stop}>
                <Square size={18} />
              </button>
            ) : (
              <button
                className="primary"
                aria-label="Send message"
                disabled={!input.trim()}
              >
                <Send size={18} />
              </button>
            )}
          </form>
          {busy && <p role="status">Streaming response…</p>}
          <p className="muted">
            Recent context is sent within the existing model’s limits. Earlier
            messages remain in your local conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
