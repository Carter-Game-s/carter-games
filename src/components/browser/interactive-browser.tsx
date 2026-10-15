"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
type Dialog = { type: string; message: string; value: string };
export function InteractiveBrowser({
  url,
  token,
  tab,
  tabs,
  onNavigate,
  onReady,
  revision,
}: {
  url: string;
  token: string;
  tab: number;
  tabs: string;
  onNavigate: (url: string) => void;
  onReady: () => void;
  revision: number;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [prompt, setPrompt] = useState("");
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const id = useRef("");
  const auth = useRef(token);
  const view = useRef<HTMLDivElement>(null);
  const sequence = useRef(-1);
  const urls = useRef(new Map<number, string>());
  const callbacks = useRef({ onNavigate, onReady });
  const objectURL = useRef("");
  const pressed = useRef(false);
  const previousRevision = useRef(revision);
  const pending = useRef(new Map<number, string>());
  const inputQueue = useRef(Promise.resolve());
  const lastMove = useRef(0);
  useEffect(() => {
    auth.current = token;
    callbacks.current = { onNavigate, onReady };
  }, [token, onNavigate, onReady]);
  const action = useCallback(
    async (op: string, payload: Record<string, unknown> = {}) => {
      const response = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op,
          id: id.current,
          token: auth.current,
          ...payload,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Browser action failed.");
      return data;
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
    const trackedURLs = urls.current;
    setReady(false);
    setError("");
    void action("create")
      .then(async (data) => {
        if (cancelled) {
          await action("close", { id: data.id });
          return;
        }
        id.current = data.id;
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
      const previous = id.current;
      id.current = "";
      trackedURLs.clear();
      if (previous) void action("close", { id: previous }).catch(() => {});
    };
  }, [action, retry]);
  useEffect(() => {
    if (!ready) return;
    sequence.current = -1;
    if (urls.current.get(tab) === url) return;
    urls.current.set(tab, url);
    pending.current.set(tab, url);
    setError("");
    void action("navigate", { tab: String(tab), url })
      .catch((e) => {
        urls.current.delete(tab);
        setError(e.message);
      })
      .finally(() => {
        if (pending.current.get(tab) === url) pending.current.delete(tab);
      });
  }, [action, ready, tab, url]);
  useEffect(() => {
    if (!ready || previousRevision.current === revision) return;
    previousRevision.current = revision;
    void action("reload", { tab: String(tab) }).catch((e) =>
      setError(e.message),
    );
  }, [action, ready, revision, tab]);
  useEffect(() => {
    const element = view.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      void action("scroll", {
        tab: String(tab),
        x: Math.max(-3000, Math.min(3000, event.deltaX)),
        y: Math.max(-3000, Math.min(3000, event.deltaY)),
      }).catch((e) => setError(e.message));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [action, tab]);
  useEffect(() => {
    if (!ready) return;
    const live = new Set(tabs.split(",").map(Number));
    for (const previous of urls.current.keys())
      if (!live.has(previous)) {
        urls.current.delete(previous);
        void action("closeTab", { tab: String(previous) }).catch(() => {});
      }
  }, [action, ready, tabs]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function poll() {
      try {
        if (!document.hidden) {
          const query = new URLSearchParams({
            id: id.current,
            tab: String(tab),
            token: auth.current,
            sequence: String(sequence.current),
          });
          const response = await fetch("/api/browser?" + query, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) {
            const data = await response.json();
            throw Error(data.error || "Browser disconnected.");
          }
          if (cancelled) return;
          const next = decodeURIComponent(
            response.headers.get("x-browser-url") || "",
          );
          if (
            !pending.current.has(tab) &&
            /^https?:\/\//.test(next) &&
            urls.current.get(tab) !== next
          ) {
            urls.current.set(tab, next);
            callbacks.current.onNavigate(next);
          }
          const nextDialog = JSON.parse(
            decodeURIComponent(
              response.headers.get("x-browser-dialog") || "null",
            ),
          ) as Dialog | null;
          setDialog((previous) =>
            JSON.stringify(previous) === JSON.stringify(nextDialog)
              ? previous
              : nextDialog,
          );
          if (response.status !== 204) {
            const blob = await response.blob();
            if (cancelled) return;
            const nextImage = URL.createObjectURL(blob);
            if (objectURL.current) URL.revokeObjectURL(objectURL.current);
            objectURL.current = nextImage;
            setImage(nextImage);
            if (!pending.current.has(tab)) callbacks.current.onReady();
          }
          if (!pending.current.has(tab)) callbacks.current.onReady();
          sequence.current = Number(
            response.headers.get("x-browser-sequence") || -1,
          );
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Browser disconnected.");
      }
      if (!cancelled)
        timer = setTimeout(() => {
          void poll();
        }, 500);
    }
    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [ready, tab, url]);
  useEffect(
    () => () => {
      if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    },
    [],
  );
  function send(op: string, payload: Record<string, unknown> = {}) {
    const session = id.current;
    inputQueue.current = inputQueue.current
      .then(() => action(op, { id: session, tab: String(tab), ...payload }))
      .then(() => {})
      .catch((e) => setError(e.message));
  }
  function position(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(1280, ((event.clientX - box.left) * 1280) / box.width),
      ),
      y: Math.max(
        0,
        Math.min(720, ((event.clientY - box.top) * 720) / box.height),
      ),
    };
  }
  return (
    <div className="interactive-browser">
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button onClick={() => setRetry((v) => v + 1)}>
            Reconnect browser
          </button>
        </p>
      )}
      <div
        ref={view}
        className="interactive-screen"
        role="application"
        aria-label="Interactive webpage. Click to focus, then type or scroll."
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          pressed.current = true;
          send("down", position(event));
        }}
        onPointerUp={(event) => {
          if (!pressed.current) return;
          pressed.current = false;
          send("up", position(event));
        }}
        onPointerCancel={() => {
          if (pressed.current) {
            pressed.current = false;
            send("up", { x: 0, y: 0 });
          }
        }}
        onPointerMove={(event) => {
          if (Date.now() - lastMove.current > 100) {
            lastMove.current = Date.now();
            send("move", position(event));
          }
        }}
        onKeyDown={(event) => {
          if (
            [
              "Control",
              "Shift",
              "Alt",
              "Meta",
              "Dead",
              "Process",
              "Unidentified",
            ].includes(event.key)
          )
            return;
          if (
            (event.ctrlKey || event.metaKey) &&
            ["l", "k"].includes(event.key.toLowerCase())
          )
            return;
          event.preventDefault();
          if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          )
            send("text", { text: event.key });
          else {
            const modifiers = [
              event.ctrlKey ? "Control" : "",
              event.metaKey ? "Meta" : "",
              event.altKey ? "Alt" : "",
              event.shiftKey ? "Shift" : "",
            ].filter(Boolean);
            send("key", {
              key: [...modifiers, event.key === " " ? "Space" : event.key].join(
                "+",
              ),
            });
          }
        }}
      >
        {image ? (
          <Image
            src={image}
            alt="Live interactive webpage"
            width={1280}
            height={720}
            unoptimized
            draggable={false}
          />
        ) : (
          <p role="status">Connecting to the interactive browser…</p>
        )}
      </div>
      <form
        className="interactive-text"
        onSubmit={(event) => {
          event.preventDefault();
          send("text", { text });
          setText("");
          view.current?.focus();
        }}
      >
        <input
          aria-label="Type into webpage"
          placeholder="Type or paste into the focused webpage field"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={10000}
        />
        <button>Send text</button>
      </form>
      {dialog && (
        <section
          className="interactive-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Webpage dialog"
        >
          <p>{dialog.message}</p>
          {dialog.type === "prompt" && (
            <input
              aria-label="Webpage prompt"
              value={prompt || dialog.value}
              onChange={(event) => setPrompt(event.target.value)}
            />
          )}
          <button
            onClick={() => {
              send("dialog", { accept: false });
              setDialog(null);
              setPrompt("");
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              send("dialog", { accept: true, text: prompt || dialog.value });
              setDialog(null);
              setPrompt("");
            }}
          >
            OK
          </button>
        </section>
      )}
    </div>
  );
}
