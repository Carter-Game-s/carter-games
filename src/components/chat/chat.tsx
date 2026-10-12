"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Square, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/lib/chat/messages";
import styles from "./chat.module.css";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void fetch("/api/chat")
      .then((r) => r.json())
      .then((s) => setAvailable(s.available))
      .catch(() => setAvailable(false));
    return () => abort.current?.abort();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function send(text = input) {
    if (busy || !text.trim()) return;
    const user: ChatMessage = { role: "user", content: text.trim() };
    const history = [...messages.filter((m) => m.content.trim()), user].slice(
      -24,
    );
    const controller = new AbortController();
    abort.current = controller;
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setError("");
    let reply = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw Error(data.error || "Chat unavailable.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw Error("No response received.");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          reply += decoder.decode();
          break;
        }
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
      if (!reply.trim()) throw Error("No response received. Try again.");
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
      if (!reply) setMessages(history);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  return (
    <div className="page">
      <div className="eyebrow">A little help, a little curiosity</div>
      <h1>Carter AI.</h1>
      <p className="muted">Ask a question, get game ideas, or just chat.</p>
      <div className={styles.heading}>
        <span className="tag">
          {available === null
            ? "Checking connection…"
            : available
              ? "AI connected"
              : "Awaiting model connection"}
        </span>
        <button
          disabled={busy || !messages.length}
          onClick={() => {
            setMessages([]);
            setError("");
          }}
        >
          <Trash2 size={15} /> New chat
        </button>
      </div>
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
                "Suggest a fun browser game",
                "Explain how a soundboard works",
                "Give me a quick coding tip",
              ].map((text) => (
                <button
                  key={text}
                  disabled={busy}
                  onClick={() => void send(text)}
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
            <p>{message.content || "Thinking…"}</p>
          </article>
        ))}
        <div ref={end} />
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          aria-label="Message Carter AI"
          placeholder="Message Carter AI…"
          value={input}
          maxLength={4000}
          rows={2}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            aria-label="Stop response"
            onClick={() => abort.current?.abort()}
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            className="primary"
            aria-label="Send message"
            disabled={!input.trim()}
          >
            <Send size={19} />
          </button>
        )}
      </form>
      <p className="muted">
        AI can make mistakes. Chats stay in this tab and clear when you reload.
        Messages are sent to the connected model.
      </p>
    </div>
  );
}
