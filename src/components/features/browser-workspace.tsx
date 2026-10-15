"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { read, write, remove } from "@/lib/storage";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultPreferences, validPreferences } from "@/lib/client/preferences";
import {
  restoreSession,
  groupColors,
  validSession,
  safeSavedTab,
  type SavedTab,
  type TabGroup,
} from "@/lib/client/browser-session";
import { id, move, object } from "@/lib/client/validation";
export function useBrowserWorkspace<T extends { id: number }>({
  tabs,
  setTabs,
  active,
  setActive,
  initialURL,
  encode,
  decode,
}: {
  tabs: T[];
  setTabs: React.Dispatch<React.SetStateAction<T[]>>;
  active: number;
  setActive: React.Dispatch<React.SetStateAction<number>>;
  initialURL: string;
  encode: (t: T) => SavedTab;
  decode: (t: SavedTab) => T;
}) {
  const [p] = useStorage("preferences", defaultPreferences, validPreferences);
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [assignments, setAssignments] = useState<
    Record<number, string | undefined>
  >({});
  const [ready, setReady] = useState(false);
  const converters = useRef({ encode, decode });
  converters.current = { encode, decode };
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const prefs = read("preferences", defaultPreferences);
    let ephemeral = null;
    try {
      ephemeral = restoreSession(
        JSON.parse(sessionStorage.getItem("orbit:open-tabs") || "null"),
      );
    } catch {}
    const requested = read<number>("browser-command", -1);
    const saved =
      requested >= 0 && ephemeral
        ? ephemeral
        : validPreferences(prefs) && prefs.restoreBrowser
          ? restoreSession(read("browser-session", null))
          : null;
    if (saved) {
      let restored = saved.tabs;
      let selected = saved.active;
      if (
        initialURL &&
        restored.find((t) => t.id === selected)?.entries.at(-1) !== initialURL
      ) {
        const next = Math.max(...restored.map((t) => t.id)) + 1;
        restored = [
          ...restored,
          { id: next, entries: [initialURL], index: 0 },
        ].slice(-50);
        selected = next;
      }
      setTabs(restored.map(converters.current.decode));
      setActive(selected);
      setGroups(saved.groups);
      setAssignments(Object.fromEntries(restored.map((t) => [t.id, t.group])));
    } else {
      const candidate = read<unknown>("browser-groups", null);
      const asSession = {
        version: 1,
        tabs: [{ id: 1, entries: [], index: -1 }],
        active: 1,
        groups:
          object(candidate) && candidate.version === 1 ? candidate.groups : [],
      };
      if (validSession(asSession)) setGroups(asSession.groups);
    }
    setReady(true);
  }, [initialURL, setActive, setTabs]);
  useEffect(() => {
    if (!ready) return;
    write("browser-groups", { version: 1, groups });
    const ephemeral = {
      version: 1,
      active,
      groups,
      tabs: tabs.slice(0, 50).map((t) => ({
        ...safeSavedTab(converters.current.encode(t)),
        group: assignments[t.id],
      })),
    };
    try {
      if (validSession(ephemeral))
        sessionStorage.setItem("orbit:open-tabs", JSON.stringify(ephemeral));
    } catch {}

    if (!p.restoreBrowser) {
      remove("browser-session");
      return;
    }
    const session = {
      version: 1,
      active,
      groups,
      tabs: tabs.slice(0, 50).map((t) => ({
        ...safeSavedTab(converters.current.encode(t)),
        group: assignments[t.id],
      })),
    };
    if (!validSession(session)) return;
    const timer = setTimeout(() => write("browser-session", session), 200);
    return () => clearTimeout(timer);
  }, [tabs, active, groups, assignments, ready, p.restoreBrowser]);
  useEffect(() => {
    const change = (e: Event) => {
      const requested = (e as CustomEvent).detail;
      if (tabs.some((t) => t.id === requested)) setActive(requested);
    };
    window.addEventListener("orbit-browser-tab", change);
    const requested = read<number>("browser-command", -1);
    if (tabs.some((t) => t.id === requested)) {
      setActive(requested);
      remove("browser-command");
    }
    return () => window.removeEventListener("orbit-browser-tab", change);
  }, [tabs, setActive]);
  return { groups, setGroups, assignments, setAssignments, ready };
}
export function TabGroupControls({
  groups,
  setGroups,
  assignments,
  setAssignments,
  tabs,
  setOrder,
  active,
  select,
}: {
  groups: TabGroup[];
  setGroups: React.Dispatch<React.SetStateAction<TabGroup[]>>;
  assignments: Record<number, string | undefined>;
  setAssignments: React.Dispatch<
    React.SetStateAction<Record<number, string | undefined>>
  >;
  tabs: SavedTab[];
  setOrder: (ids: number[]) => void;
  active: number;
  select: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(groupColors[0]);
  function patch(group: string, p: Partial<TabGroup>) {
    setGroups((gs) => gs.map((g) => (g.id === group ? { ...g, ...p } : g)));
  }
  return (
    <details className="tab-group-manager">
      <summary>Tab groups &amp; order</summary>
      <form
        className="feature-actions"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || groups.length >= 30) return;
          setGroups((gs) => [
            ...gs,
            {
              id: id(),
              name: name.trim().slice(0, 60),
              color,
              collapsed: false,
            },
          ]);
          setName("");
        }}
      >
        <input
          aria-label="New tab group name"
          placeholder="Group name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          aria-label="New tab group color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        >
          {groupColors.map((c, i) => (
            <option key={c} value={c}>
              {["Green", "Blue", "Rose", "Gold", "Purple", "Mint"][i]}
            </option>
          ))}
        </select>
        <button disabled={!name.trim() || groups.length >= 30}>
          <FolderPlus size={15} />
          Create group
        </button>
      </form>
      {groups.map((g, i) => (
        <div className="setting-row" key={g.id}>
          <span
            className="group-dot"
            style={{ background: g.color }}
            aria-hidden="true"
          />
          <strong>{g.name}</strong>
          <button
            aria-expanded={!g.collapsed}
            onClick={() => patch(g.id, { collapsed: !g.collapsed })}
          >
            {g.collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            aria-label={`Rename group ${g.name}`}
            onClick={() => {
              const name = prompt("Group name", g.name);
              if (name?.trim()) patch(g.id, { name: name.trim().slice(0, 60) });
            }}
          >
            <Pencil size={14} />
          </button>
          <select
            aria-label={`Color of ${g.name}`}
            value={g.color}
            onChange={(e) => patch(g.id, { color: e.target.value })}
          >
            {groupColors.map((c, j) => (
              <option key={c} value={c}>
                {["Green", "Blue", "Rose", "Gold", "Purple", "Mint"][j]}
              </option>
            ))}
          </select>
          <button
            disabled={i === 0}
            aria-label={`Move group ${g.name} up`}
            onClick={() => setGroups(move(groups, i, i - 1))}
          >
            <ArrowUp size={14} />
          </button>
          <button
            disabled={i === groups.length - 1}
            aria-label={`Move group ${g.name} down`}
            onClick={() => setGroups(move(groups, i, i + 1))}
          >
            <ArrowDown size={14} />
          </button>
          <button
            aria-label={`Delete group ${g.name}`}
            onClick={() => {
              setGroups((gs) => gs.filter((x) => x.id !== g.id));
              setAssignments((a) =>
                Object.fromEntries(
                  Object.entries(a).filter(([, v]) => v !== g.id),
                ),
              );
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {tabs.map((t, i) => (
        <div className="setting-row" key={t.id}>
          <button
            aria-current={active === t.id ? "true" : undefined}
            onClick={() => select(t.id)}
          >
            {t.entries[t.index] || "New tab"}
          </button>
          <select
            aria-label={`Group for tab ${i + 1}`}
            value={assignments[t.id] || ""}
            onChange={(e) =>
              setAssignments((a) => ({
                ...a,
                [t.id]: e.target.value || undefined,
              }))
            }
          >
            <option value="">Ungrouped</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            disabled={i === 0}
            aria-label={`Move tab ${i + 1} left`}
            onClick={() => setOrder(move(tabs, i, i - 1).map((t) => t.id))}
          >
            <ArrowUp size={14} />
          </button>
          <button
            disabled={i === tabs.length - 1}
            aria-label={`Move tab ${i + 1} right`}
            onClick={() => setOrder(move(tabs, i, i + 1).map((t) => t.id))}
          >
            <ArrowDown size={14} />
          </button>
        </div>
      ))}
    </details>
  );
}
