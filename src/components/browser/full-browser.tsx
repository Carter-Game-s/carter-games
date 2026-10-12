"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Plus,
  X,
  ExternalLink,
  Globe,
} from "lucide-react";
import { searchTarget } from "@/lib/search";
import { defaultSettings } from "@/lib/storage/settings";
import { useStorage } from "@/lib/storage/use-storage";
import styles from "./full-browser.module.css";

type Tab = {
  id: number;
  url: string;
  first: string;
  history: string[];
  index: number;
  loading: boolean;
  error: string;
};
const makeTab = (id: number, url = ""): Tab => ({
  id,
  url,
  first: url,
  history: url ? [url] : [],
  index: url ? 0 : -1,
  loading: !!url,
  error: "",
});
export function FullBrowser({
  initialURL = "",
  engineURL,
}: {
  initialURL?: string;
  engineURL: string;
}) {
  const [tabs, setTabs] = useState<Tab[]>([makeTab(1, initialURL)]);
  const [active, setActive] = useState(1);
  const [address, setAddress] = useState(initialURL);
  const [settings] = useStorage("settings", defaultSettings);
  const [history, saveHistory] = useStorage<string[]>("browsing", []);
  const frames = useRef(new Map<number, HTMLIFrameElement>());
  const input = useRef<HTMLInputElement>(null);
  const nextId = useRef(2);
  const origin = new URL(engineURL).origin;
  const tab = tabs.find((t) => t.id === active) || tabs[0];
  function command(id: number, action: string, url?: string) {
    frames.current
      .get(id)
      ?.contentWindow?.postMessage(
        { type: "carter-browser:command", command: action, url },
        origin,
      );
  }
  function newTab(url = "") {
    const id = nextId.current++;
    setTabs((previous) => [...previous, makeTab(id, url)]);
    setActive(id);
    setAddress(url);
  }
  function navigate(raw: string) {
    try {
      const url = searchTarget(raw, settings.engine).url;
      setAddress(url);
      setTabs((previous) =>
        previous.map((t) =>
          t.id === active
            ? {
                ...t,
                url,
                first: t.first || url,
                history: [...t.history.slice(0, t.index + 1), url],
                index: t.index + 1,
                loading: true,
                error: "",
              }
            : t,
        ),
      );
      if (tab.first) command(active, "navigate", url);
      saveHistory(
        [url, ...history.filter((item) => item !== url)].slice(0, 60),
      );
    } catch (error) {
      setTabs((previous) =>
        previous.map((t) =>
          t.id === active ? { ...t, error: (error as Error).message } : t,
        ),
      );
    }
  }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== origin ||
        !event.data ||
        typeof event.data.type !== "string"
      )
        return;
      const id = [...frames.current].find(
        ([, frame]) => frame.contentWindow === event.source,
      )?.[0];
      if (!id) return;
      const data = event.data;
      if (
        data.type === "carter-browser:newtab" &&
        typeof data.url === "string"
      ) {
        try {
          newTab(searchTarget(data.url, settings.engine).url);
        } catch {}
        return;
      }
      if (data.type === "carter-browser:url" && typeof data.url === "string") {
        let url: string;
        try {
          url = searchTarget(data.url, settings.engine).url;
        } catch {
          return;
        }
        setTabs((previous) =>
          previous.map((t) => {
            if (t.id !== id) return t;
            if (url === t.history[t.index]) return { ...t, url };
            return {
              ...t,
              url,
              history: [...t.history.slice(0, t.index + 1), url],
              index: t.index + 1,
            };
          }),
        );
        if (id === active && document.activeElement !== input.current)
          setAddress(url);
      }
      if (data.type === "carter-browser:ready")
        setTabs((previous) =>
          previous.map((t) =>
            t.id === id ? { ...t, loading: false, error: "" } : t,
          ),
        );
      if (data.type === "carter-browser:error")
        setTabs((previous) =>
          previous.map((t) =>
            t.id === id
              ? {
                  ...t,
                  loading: false,
                  error:
                    typeof data.message === "string"
                      ? data.message.slice(0, 300)
                      : "Page unavailable. Try Refresh.",
                }
              : t,
          ),
        );
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [origin, active, settings.engine]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["l", "k"].includes(event.key)) {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function step(delta: number) {
    const index = tab.index + delta;
    if (index < 0 || index >= tab.history.length) return;
    const url = tab.history[index];
    setAddress(url);
    setTabs((previous) =>
      previous.map((t) =>
        t.id === active ? { ...t, index, url, loading: true, error: "" } : t,
      ),
    );
    command(active, delta < 0 ? "back" : "forward");
  }
  function close(id: number) {
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest.length ? rest : [makeTab(id)]);
    if (id === active) {
      const next = rest[0] || makeTab(id);
      setActive(next.id);
      setAddress(next.url);
    }
  }
  return (
    <div className="browser-page">
      <div className="browser-window">
        <div className="tabs">
          {tabs.map((t) => (
            <div
              key={t.id}
              className={`tab ${t.id === active ? "active" : ""}`}
            >
              <button
                className="tab-title"
                onClick={() => {
                  setActive(t.id);
                  setAddress(t.url);
                }}
              >
                {t.url ? new URL(t.url).hostname : "New tab"}
              </button>
              <button aria-label="Close tab" onClick={() => close(t.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            className="icon-button"
            aria-label="New tab"
            onClick={() => newTab()}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="addressbar">
          <button
            className="icon-button"
            aria-label="Back"
            disabled={tab.index <= 0}
            onClick={() => step(-1)}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Forward"
            disabled={tab.index >= tab.history.length - 1}
            onClick={() => step(1)}
          >
            <ArrowRight size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Refresh"
            onClick={() => {
              command(active, "reload");
              setTabs((previous) =>
                previous.map((t) =>
                  t.id === active ? { ...t, error: "", loading: !!t.url } : t,
                ),
              );
            }}
          >
            <RotateCw size={17} />
          </button>
          <Link className="button icon-button" href="/" aria-label="Homepage">
            <Home size={17} />
          </Link>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              navigate(address);
            }}
          >
            <input
              ref={input}
              aria-label="Browser address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Search or enter a URL"
            />
            <button className="primary">Go</button>
          </form>
          {tab.url && (
            <a
              className="button icon-button"
              aria-label="Open directly"
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={17} />
            </a>
          )}
        </div>
        <div
          className={`progress ${tab.loading ? "loading" : ""}`}
          role="progressbar"
          aria-label={tab.loading ? "Page loading" : "Page loaded"}
        />
        <div className={styles.stage}>
          {tabs.map((t) =>
            t.first ? (
              <iframe
                key={t.id}
                ref={(node) => {
                  if (node) frames.current.set(t.id, node);
                  else frames.current.delete(t.id);
                }}
                title={`Browser tab ${t.id}`}
                className={`${styles.frame} ${t.id === active ? styles.active : ""}`}
                src={`${engineURL}/#url=${encodeURIComponent(t.first)}`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-pointer-lock"
                allow="fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
              />
            ) : t.id === active ? (
              <div className="browser-empty" key={t.id}>
                <Globe size={46} />
                <h2>A fresh start.</h2>
                <p className="muted">
                  Search or enter a website. Pages support scripts, forms,
                  audio, and video.
                </p>
              </div>
            ) : null,
          )}
        </div>
      </div>
      {tab.error && (
        <p className="error" role="alert">
          {tab.error}{" "}
          <button onClick={() => command(active, "reload")}>Retry</button>
        </p>
      )}
      {history.length > 0 && (
        <div className="history">
          {history.slice(0, 8).map((url) => (
            <button key={url} onClick={() => navigate(url)}>
              {url}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
