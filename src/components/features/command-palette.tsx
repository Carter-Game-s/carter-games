"use client";
import { useMemo, useState, useDeferredValue, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { allGames } from "@/games/registry";
import { Modal } from "./modal";
import { read, write } from "@/lib/storage";
import { restoreSession } from "@/lib/client/browser-session";
import { defaultAppearance, validAppearance } from "@/lib/client/themes";
import { defaultSettings } from "@/lib/storage/settings";
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query);
  useEffect(() => {
    document
      .getElementById("command-" + active)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const entries = useMemo(() => {
    const pages = [
      ["Home", "/"],
      ["Games", "/games"],
      ["AI Chat", "/chat"],
      ["Browser", "/browser"],
      ["Settings", "/settings"],
      ["Game Roulette", "/games/roulette"],
      ["Achievements", "/games/achievements"],
      ["Gaming statistics", "/games/statistics"],
      ["Themes & Appearance", "/settings/appearance"],
    ].map(([name, href]) => ({ id: href, name, run: () => router.push(href) }));
    let currentSession = restoreSession(read("browser-session", null));
    try {
      currentSession =
        restoreSession(
          JSON.parse(sessionStorage.getItem("orbit:open-tabs") || "null"),
        ) || currentSession;
    } catch {}
    const tabs =
      currentSession?.tabs.map((t) => ({
        id: "tab-" + t.id,
        name: `Browser tab: ${t.entries[t.index] || "New tab"}`,
        run: () => {
          write("browser-command", t.id);
          window.dispatchEvent(
            new CustomEvent("orbit-browser-tab", { detail: t.id }),
          );
          router.push("/browser");
        },
      })) || [];
    const toggle = {
      id: "theme",
      name: "Toggle theme",
      run: () => {
        const saved = read("appearance", defaultAppearance);
        const a = validAppearance(saved) ? saved : defaultAppearance;
        const selected = a.selected === "light" ? "dark" : "light";
        write("appearance", { ...a, selected });
        write("settings", {
          ...read("settings", defaultSettings),
          theme: selected,
        });
      },
    };
    const games = allGames
      .filter(
        (g) =>
          !deferred ||
          `${g.metadata.title} ${g.metadata.tags?.join(" ")}`
            .toLowerCase()
            .includes(deferred.toLowerCase()),
      )
      .slice(0, 20)
      .map((g) => ({
        id: g.metadata.slug,
        name: `Play ${g.metadata.title}`,
        run: () => router.push("/games/" + g.metadata.slug),
      }));
    return [...pages, ...tabs, toggle, ...games]
      .filter(
        (e) =>
          !deferred || e.name.toLowerCase().includes(deferred.toLowerCase()),
      )
      .slice(0, 30);
  }, [deferred, router]);
  function execute(index: number) {
    entries[index]?.run();
    onClose();
  }
  return (
    <Modal title="Command palette" onClose={onClose}>
      <div className="library-search">
        <Search size={18} />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={
            entries[active] ? "command-" + active : undefined
          }
          aria-label="Search commands and games"
          placeholder="Search games, pages and browser tabs"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % Math.max(entries.length, 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(
                (i) => (i - 1 + entries.length) % Math.max(entries.length, 1),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              execute(active);
            }
          }}
        />
      </div>
      <div
        role="listbox"
        id="command-results"
        aria-label="Commands"
        className="command-results"
      >
        {entries.map((e, i) => (
          <button
            role="option"
            aria-selected={active === i}
            id={"command-" + i}
            key={e.id}
            onMouseMove={() => setActive(i)}
            onClick={() => execute(i)}
          >
            {e.name}
          </button>
        ))}
        {!entries.length && <p>No matching commands or games.</p>}
      </div>
    </Modal>
  );
}
