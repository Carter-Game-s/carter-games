"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { searchQuery, searchTarget, searchURL } from "@/lib/search";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultSettings } from "@/lib/storage/settings";
import { read, write } from "@/lib/storage";
type Tab = { id: number; entries: string[]; index: number };
export function Browser({ initialURL = "" }: { initialURL?: string }) {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 1,
      entries: initialURL ? [initialURL] : [],
      index: initialURL ? 0 : -1,
    },
  ]);
  const [active, setActive] = useState(1);
  const [address, setAddress] = useState(initialURL);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [settings] = useStorage("settings", defaultSettings);
  const [history] = useStorage<string[]>("browsing", []);
  const frame = useRef<HTMLIFrameElement>(null);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishLoading = useCallback(() => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    setLoading(false);
  }, []);
  const input = useRef<HTMLInputElement>(null);
  const nextId = useRef(2);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  const url = tab.entries[tab.index] ?? "";
  const query = searchQuery(url);
  const bingSearch = query ? searchURL(query, "bing") : "";
  const session = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void session();
    const timer = setInterval(
      () => {
        void session();
      },
      14 * 60 * 1000,
    );
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    setAddress(url);
    setLoading(!!url);
    setError("");
    if (!url) return;
    write(
      "browsing",
      [url, ...read<string[]>("browsing", []).filter((u) => u !== url)].slice(
        0,
        60,
      ),
    );
    const timer = setTimeout(() => {
      setLoading(false);
      setError("This page is taking too long. Refresh or open it directly.");
    }, 15000);
    loadingTimer.current = timer;
    return () => clearTimeout(timer);
  }, [url, revision, token]);
  function navigate(raw: string) {
    try {
      const target = searchTarget(raw, settings.engine);
      if (target.search)
        write(
          "searches",
          [
            raw,
            ...read<string[]>("searches", []).filter((s) => s !== raw),
          ].slice(0, 20),
        );
      setTabs((ts) =>
        ts.map((t) =>
          t.id === active
            ? {
                ...t,
                entries: [...t.entries.slice(0, t.index + 1), target.url],
                index: t.index + 1,
              }
            : t,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const message = (e: MessageEvent) => {
      if (
        e.source !== frame.current?.contentWindow ||
        e.origin !== "null" ||
        !e.data ||
        typeof e.data.url !== "string"
      )
        return;
      if (e.data.type === "orbit-navigate") navigate(e.data.url);
      if (e.data.type === "orbit-ready") {
        finishLoading();
        setAddress(e.data.url);
      }
    };
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["l", "k"].includes(e.key)) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function step(delta: number) {
    setTabs((ts) =>
      ts.map((t) =>
        t.id === active
          ? {
              ...t,
              index: Math.max(
                0,
                Math.min(t.entries.length - 1, t.index + delta),
              ),
            }
          : t,
      ),
    );
  }
  function close(id: number) {
    if (tabs.length === 1) {
      setTabs([{ id, entries: [], index: -1 }]);
      return;
    }
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    if (id === active) setActive(rest[0].id);
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
              <button className="tab-title" onClick={() => setActive(t.id)}>
                {t.entries[t.index]
                  ? (() => {
                      try {
                        return new URL(t.entries[t.index]).hostname;
                      } catch {
                        return "Invalid URL";
                      }
                    })()
                  : "New tab"}
              </button>
              <button aria-label="Close tab" onClick={() => close(t.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            className="icon-button"
            aria-label="New tab"
            onClick={() => {
              const id = nextId.current++;
              setTabs((ts) => [...ts, { id, entries: [], index: -1 }]);
              setActive(id);
            }}
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
            disabled={tab.index >= tab.entries.length - 1}
            onClick={() => step(1)}
          >
            <ArrowRight size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Refresh"
            onClick={() => {
              setRevision((v) => v + 1);
              void session();
            }}
          >
            <RotateCw size={17} />
          </button>
          <Link className="button icon-button" href="/" aria-label="Homepage">
            <Home size={17} />
          </Link>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(address);
            }}
          >
            <input
              ref={input}
              aria-label="Browser address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Search or enter a URL"
            />
            <button className="primary">Go</button>
          </form>
          {bingSearch && bingSearch !== url && (
            <button onClick={() => navigate(bingSearch)}>
              Search with Bing
            </button>
          )}
          {url && (
            <a
              className="button icon-button"
              aria-label="Open directly"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={17} />
            </a>
          )}
        </div>
        <div
          className={`progress ${loading ? "loading" : ""}`}
          role="progressbar"
          aria-label={loading ? "Page loading" : "Page loaded"}
        />
        {url && token ? (
          <iframe
            key={`${active}:${url}:${revision}:${token}`}
            ref={frame}
            className="browser-view"
            title="Proxied webpage"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            src={`/api/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token)}`}
            onLoad={finishLoading}
            onError={() => {
              finishLoading();
              setError("Page could not load. Open it directly.");
            }}
          />
        ) : (
          <div className="browser-empty">
            <Globe size={46} className="muted mb-6" />
            <h2>{url ? "Connecting…" : "A fresh start."}</h2>
            <p className="muted">Enter a public URL or search above.</p>
          </div>
        )}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              void session();
              setRevision((v) => v + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      <p className="browser-note">
        Read-only browsing. Sites with logins, interactive scripts, or anti-bot
        checks may need to open directly. Only configured public hosts are
        available.
      </p>
      {history.length > 0 && (
        <>
          <span className="tag">Recent pages</span>
          <div className="history">
            {history.slice(0, 8).map((u) => (
              <button key={u} onClick={() => navigate(u)}>
                {u}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
