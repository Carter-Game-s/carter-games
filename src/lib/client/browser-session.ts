import { object, text, finite, safeURL, onlyKeys } from "./validation";
export type SavedTab = {
  id: number;
  entries: string[];
  index: number;
  group?: string;
};
export type TabGroup = {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
};
export const groupColors = [
  "#b9f573",
  "#7aa2f7",
  "#f7768e",
  "#e0af68",
  "#bb9af7",
  "#73daca",
];
export type BrowserSession = {
  version: 1;
  tabs: SavedTab[];
  active: number;
  groups: TabGroup[];
};
export function validSession(v: unknown): v is BrowserSession {
  if (
    !object(v) ||
    !onlyKeys(v, ["version", "tabs", "active", "groups"]) ||
    v.version !== 1 ||
    !Array.isArray(v.tabs) ||
    v.tabs.length < 1 ||
    v.tabs.length > 50 ||
    !Array.isArray(v.groups) ||
    v.groups.length > 30 ||
    !finite(v.active)
  )
    return false;
  const groups = v.groups;
  if (
    !groups.every(
      (g) =>
        object(g) &&
        onlyKeys(g, ["id", "name", "color", "collapsed"]) &&
        text(g.id, 80) &&
        text(g.name, 60) &&
        g.name.trim() &&
        groupColors.includes(String(g.color)) &&
        typeof g.collapsed === "boolean",
    ) ||
    new Set(groups.map((g) => g.id)).size !== groups.length
  )
    return false;
  if (
    !v.tabs.every(
      (t) =>
        object(t) &&
        onlyKeys(t, ["id", "entries", "index", "group"]) &&
        finite(t.id) &&
        Array.isArray(t.entries) &&
        t.entries.length <= 50 &&
        t.entries.every((u) => {
          try {
            return typeof u === "string" && sessionURL(u) === u;
          } catch {
            return false;
          }
        }) &&
        Number.isInteger(t.index) &&
        Number(t.index) >= -1 &&
        Number(t.index) < t.entries.length &&
        (t.entries.length > 0 ? Number(t.index) >= 0 : t.index === -1) &&
        (t.group === undefined || groups.some((g) => g.id === t.group)),
    )
  )
    return false;
  return (
    new Set(v.tabs.map((t) => t.id)).size === v.tabs.length &&
    v.tabs.some((t) => t.id === v.active)
  );
}
export function restoreSession(value: unknown): BrowserSession | null {
  return validSession(value) ? value : null;
}
export function deleteGroup(
  session: BrowserSession,
  id: string,
): BrowserSession {
  return {
    ...session,
    groups: session.groups.filter((g) => g.id !== id),
    tabs: session.tabs.map((t) =>
      t.group === id ? { ...t, group: undefined } : t,
    ),
  };
}

export function sessionURL(raw: string) {
  const normalized = safeURL(raw);
  const url = new URL(normalized);
  if (
    [...url.searchParams.keys()].some((k) =>
      /^(?:access_token|refresh_token|token|api[_-]?key|password|passwd|authorization|auth|session|sessionid|code)$/i.test(
        k,
      ),
    ) ||
    /(?:access_token|token|password|auth|session|api_key)=/i.test(url.hash)
  )
    throw Error("Sensitive URLs are not stored in browser sessions.");
  return normalized;
}
export function safeSavedTab(tab: SavedTab): SavedTab {
  let index = -1;
  const entries: string[] = [];
  tab.entries.slice(-50).forEach((url, i) => {
    try {
      entries.push(sessionURL(url));
      if (i === tab.index) index = entries.length - 1;
    } catch {}
  });
  if (index < 0) return { ...tab, entries: [], index: -1 };
  return { ...tab, entries, index };
}
export function validGroups(
  value: unknown,
): value is { version: 1; groups: TabGroup[] } {
  return (
    object(value) &&
    value.version === 1 &&
    Object.keys(value).every((k) => ["version", "groups"].includes(k)) &&
    validSession({
      version: 1,
      active: 1,
      tabs: [{ id: 1, entries: [], index: -1 }],
      groups: value.groups,
    })
  );
}
