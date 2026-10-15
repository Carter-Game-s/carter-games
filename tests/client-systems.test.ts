import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  quickHideKey,
  defaultPreferences,
  defaultHome,
  validHome,
  validPreferences,
} from "@/lib/client/preferences";
import { safeURL, parseFile, move } from "@/lib/client/validation";
import {
  themes,
  defaultAppearance,
  validAppearance,
  validTheme,
  contrast,
  applyTheme,
} from "@/lib/client/themes";
import {
  launchGame,
  beginGame,
  recordScore,
  recordTime,
  getStats,
  emptyStats,
  activeDelta,
  roulettePool,
  checkAchievements,
  achievementDefinitions,
} from "@/lib/client/gaming";
import { write, read, gameStorage, toggleFavorite } from "@/lib/storage";
import {
  validateSettingsBackup,
  settingsBackup,
  importSettings,
  exportSaves,
  validateSaveBackup,
  restoreSaves,
  resetSave,
} from "@/lib/client/backups";
import {
  restoreSession,
  deleteGroup,
  groupColors,
} from "@/lib/client/browser-session";
import {
  validConversations,
  conversationTitle,
  regenerationHistory,
  requestHistory,
} from "@/lib/client/conversations";
import { allGames } from "@/games/registry";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());
const key = (k: string, timeStamp: number, extra = {}) => ({
  key: k,
  timeStamp,
  repeat: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...extra,
});
describe("Quick Hide", () => {
  it("normalizes websites and rejects executable schemes and credentials", () => {
    expect(safeURL("wikipedia.org")).toBe("https://wikipedia.org/");
    for (const v of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///etc/passwd",
      "https://user:pass@example.com",
    ])
      expect(() => safeURL(v)).toThrow();
  });
  it("requires two distinct presses within 600ms and ignores repeats/modifiers", () => {
    const first = quickHideKey(key("Escape", 100), "double-escape", null);
    expect(first.fire).toBe(false);
    expect(
      quickHideKey(key("Escape", 600), "double-escape", first.last).fire,
    ).toBe(true);
    expect(quickHideKey(key("Escape", 701), "double-escape", 100).fire).toBe(
      false,
    );
    expect(quickHideKey(key("Escape", 100), "double-escape", 100).fire).toBe(
      false,
    );
    expect(
      quickHideKey(key("Escape", 200, { repeat: true }), "double-escape", 100)
        .fire,
    ).toBe(false);
    expect(
      quickHideKey(
        key("h", 1, { ctrlKey: true, shiftKey: true }),
        "ctrl-shift-h",
        null,
      ).fire,
    ).toBe(true);
    expect(
      quickHideKey(key("q", 1, { altKey: true }), "alt-q", null).fire,
    ).toBe(true);
  });
});
describe("themes and preferences", () => {
  it("defines all 18 recognizable themes and preserves default palette", () => {
    expect(themes).toHaveLength(18);
    expect(new Set(themes.map((t) => t.id)).size).toBe(18);
    expect(themes[0].colors.bg).toBe("#111313");
    for (const t of themes) {
      expect(contrast(t.colors.text, t.colors.bg)).toBeGreaterThan(4.5);
      expect(
        Object.values(t.colors).every((c) => /^#[a-f\d]{6}$/i.test(c)),
      ).toBe(true);
      applyTheme(t, defaultAppearance, false);
      expect(document.documentElement.dataset.theme).toBe(t.id);
      expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
        t.colors.accent,
      );
    }
  });
  it("validates custom themes, bounds, fonts and imported CSS", () => {
    const custom = { ...themes[0], id: "custom-fixture", name: "My theme" };
    expect(validTheme(custom)).toBe(true);
    expect(
      validAppearance({
        ...defaultAppearance,
        selected: custom.id,
        custom: [custom],
      }),
    ).toBe(true);
    for (const bad of [
      { ...custom, colors: { ...custom.colors, bg: "url(javascript:evil)" } },
      { ...custom, font: "evil()" },
      { ...custom, radius: 900 },
    ])
      expect(validTheme(bad)).toBe(false);
    expect(validAppearance({ ...defaultAppearance, selected: "missing" })).toBe(
      false,
    );
  });
  it("persists and restores widget layout without accepting duplicate or unknown widgets", () => {
    const home = {
      ...defaultHome,
      enabled: true,
      order: move(defaultHome.order, 0, 2),
    };
    write("home", home);
    expect(read("home", defaultHome)).toEqual(home);
    expect(validHome(home)).toBe(true);
    expect(validHome({ ...home, order: home.order.map(() => "search") })).toBe(
      false,
    );
    expect(validPreferences(defaultPreferences)).toBe(true);
    expect(
      validPreferences({
        ...defaultPreferences,
        quickHide: { ...defaultPreferences.quickHide, url: "javascript:evil" },
      }),
    ).toBe(false);
  });
});
describe("gaming events and achievements", () => {
  it("filters the real registry without mutating or duplicating metadata", () => {
    const excluded = allGames[0].metadata.slug;
    const result = roulettePool("all", [excluded], [], true, false);
    expect(result.some((g) => g.metadata.slug === excluded)).toBe(false);
    expect(result[0]).toBe(allGames.find((g) => g.metadata.slug !== excluded));
    expect(
      roulettePool("puzzle", [], [], false, false).every(
        (g) => g.metadata.category === "puzzle",
      ),
    ).toBe(true);
    expect(
      roulettePool(
        "all",
        [],
        allGames.map((g) => g.metadata.slug),
        false,
        true,
      ),
    ).toHaveLength(0);
  });
  it("counts real launches once and records scores and active time", () => {
    launchGame("snake", "one");
    launchGame("snake", "one");
    expect(getStats().games.snake.launches).toBe(1);
    recordScore("snake", 10);
    recordScore("snake", 5);
    recordTime("snake", 10000, 10000);
    expect(getStats().games.snake).toMatchObject({
      launches: 1,
      best: 10,
      ms: 10000,
    });
    expect(getStats().longest).toBe(10000);
    expect(
      read<{ unlocked: Record<string, number> }>("achievements", {
        unlocked: {},
      }).unlocked,
    ).toHaveProperty("first");
    expect(
      read<{ unlocked: Record<string, number> }>("achievements", {
        unlocked: {},
      }).unlocked,
    ).toHaveProperty("score");
  });
  it("does not count hidden, paused or idle time and caps suspended timer gaps", () => {
    expect(activeDelta(0, 1000, true, true, 0)).toBe(1000);
    expect(activeDelta(0, 1000, false, true, 0)).toBe(0);
    expect(activeDelta(0, 1000, true, false, 0)).toBe(0);
    expect(activeDelta(0, 61000, true, true, 0)).toBe(0);
    expect(activeDelta(0, 10000, true, true, 9000)).toBe(2000);
  });
  it("unlocks favorites and roulette from user actions, preserving unlock dates", () => {
    for (const g of allGames.slice(0, 5)) toggleFavorite(g.metadata.slug);
    checkAchievements();
    sessionStorage.setItem("orbit:roulette", "pong");
    beginGame("pong", "roulette-session");
    const a = read<{ unlocked: Record<string, number> }>("achievements", {
      unlocked: {},
    });
    expect(a.unlocked.favorites).toBeGreaterThan(0);
    expect(a.unlocked.roulette).toBeGreaterThan(0);
    checkAchievements();
    expect(read("achievements", {})).toEqual(a);
    expect(achievementDefinitions).toHaveLength(9);
  });
  it("falls back safely from corrupted statistics", () => {
    write("statistics", { version: 1, games: { bad: { launches: "oops" } } });
    expect(getStats()).toEqual(emptyStats);
  });
});
describe("conversation history and regeneration", () => {
  const messages = [
    { role: "user" as const, content: "Hello" },
    { role: "assistant" as const, content: "Hi" },
    { role: "user" as const, content: "More" },
  ];
  it("validates timestamped conversations and excludes executable message roles", () => {
    const conversation = {
      version: 1,
      items: [
        { id: "stable", title: "Hello", created: 1, updated: 2, messages },
      ],
    };
    expect(validConversations(conversation)).toBe(true);
    write("conversations", conversation);
    expect(read("conversations", {})).toEqual(conversation);
    expect(
      validConversations({
        ...conversation,
        items: [
          {
            ...conversation.items[0],
            messages: [{ role: "system", content: "bad" }],
          },
        ],
      }),
    ).toBe(false);
    expect(conversationTitle(messages)).toBe("Hello");
  });
  it("regenerates only the selected response and bounds API context", () => {
    expect(regenerationHistory(messages, 1)).toEqual([messages[0]]);
    expect(() => regenerationHistory([])).toThrow();
    const long = Array.from({ length: 40 }, () => ({
      role: "user" as const,
      content: "a".repeat(4000),
    }));
    const context = requestHistory(long);
    expect(
      context.reduce((n, m) => n + m.content.length, 0),
    ).toBeLessThanOrEqual(16000);
    expect(context.length).toBeLessThanOrEqual(24);
  });
});
describe("browser groups and session restoration", () => {
  const session = {
    version: 1 as const,
    tabs: [
      { id: 1, entries: ["https://example.com/"], index: 0, group: "work" },
      { id: 2, entries: [], index: -1 },
    ],
    active: 1,
    groups: [
      { id: "work", name: "Work", color: groupColors[0], collapsed: false },
    ],
  };
  it("restores navigation state and keeps tabs when deleting groups", () => {
    write("browser-session", session);
    expect(restoreSession(read("browser-session", null))).toEqual(session);
    const next = deleteGroup(session, "work");
    expect(next.tabs).toHaveLength(2);
    expect(next.tabs[0].group).toBeUndefined();
    expect(next.groups).toHaveLength(0);
  });
  it("rejects invalid URLs, credentials, missing active tabs and duplicated identities", () => {
    expect(restoreSession({ ...session, active: 999 })).toBeNull();
    expect(
      restoreSession({ ...session, tabs: [session.tabs[0], session.tabs[0]] }),
    ).toBeNull();
    for (const url of ["javascript:alert(1)", "https://u:p@example.com/"])
      expect(
        restoreSession({
          ...session,
          tabs: [{ ...session.tabs[0], entries: [url] }],
        }),
      ).toBeNull();
  });
});
describe("versioned backup import boundaries", () => {
  it("exports only allowlisted preferences and previews without mutating storage", () => {
    write("secret-token", "private");
    const backup = settingsBackup();
    expect(JSON.stringify(backup)).not.toContain("private");
    const changes = validateSettingsBackup(backup);
    expect(localStorage.getItem("orbit:appearance")).toBeNull();
    importSettings(changes);
    expect(localStorage.getItem("orbit:appearance")).not.toBeNull();
    expect(read("secret-token", "")).toBe("private");
    expect(() => validateSettingsBackup({ ...backup, version: 9 })).toThrow();
    expect(() =>
      validateSettingsBackup({
        ...backup,
        preferences: { "secret-token": "x" },
      }),
    ).toThrow();
    expect(() => parseFile('{"x":1}', 2)).toThrow();
  });
  it("backs up supported GameStorage values with explicit conflict handling", () => {
    gameStorage("snake").set("highScore", 12);
    const backup = exportSaves();
    expect(validateSaveBackup(backup)).toEqual(backup);
    gameStorage("snake").set("highScore", 20);
    restoreSaves(backup, ["snake"], false);
    expect(gameStorage("snake").get("highScore", 0)).toBe(20);
    restoreSaves(backup, ["snake"], true);
    expect(gameStorage("snake").get("highScore", 0)).toBe(12);
    resetSave("snake");
    expect(gameStorage("snake").get("highScore", 0)).toBe(0);
  });
  it("rejects malformed native saves and prototype pollution", () => {
    for (const saves of [
      { snake: { highScore: "bad" } },
      { "not-a-game": { highScore: 1 } },
      { "2048": { save: { board: [1], score: 0 } } },
      JSON.parse('{"snake":{"__proto__":{"evil":true}}}'),
    ])
      expect(() =>
        validateSaveBackup({
          format: "carter-saves",
          version: 1,
          created: 1,
          saves,
        }),
      ).toThrow();
    expect(({} as Record<string, unknown>).evil).toBeUndefined();
  });
  it("handles quota failure without crashing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(write("example", { a: 1 })).toBe(false);
  });
});
it("advances every achievement only after its real criteria are satisfied", () => {
  const categories = new Set<string>();
  const chosen = allGames.filter((g) => {
    if (categories.size < 4 && !categories.has(g.metadata.category)) {
      categories.add(g.metadata.category);
      return true;
    }
    return false;
  });
  const slugs = [
    ...new Set([
      ...chosen.map((g) => g.metadata.slug),
      ...allGames.slice(0, 20).map((g) => g.metadata.slug),
    ]),
  ].slice(0, 10);
  slugs.forEach((slug, i) => launchGame(slug, "criteria-" + i));
  recordScore(slugs[0], 1);
  for (let i = 0; i < 30; i++) recordTime(slugs[0], 120000, (i + 1) * 120000);
  const stats = getStats();
  write("statistics", {
    ...stats,
    days: ["2026-01-01", "2026-01-02"],
    roulette: [slugs[0]],
  });
  for (const g of allGames.slice(0, 5)) toggleFavorite(g.metadata.slug);
  checkAchievements();
  const state = read<{ unlocked: Record<string, number> }>("achievements", {
    unlocked: {},
  });
  for (const a of achievementDefinitions)
    expect(state.unlocked[a.id], a.name).toBeGreaterThan(0);
});
it("rejects credential-shaped extras in preferences rather than exporting them", () => {
  const poisoned = { ...defaultPreferences, internalToken: "do-not-export" };
  expect(validPreferences(poisoned)).toBe(false);
  write("preferences", poisoned);
  expect(JSON.stringify(settingsBackup())).not.toContain("do-not-export");
});
it("never persists credential-bearing browser URLs", async () => {
  const { safeSavedTab } = await import("@/lib/client/browser-session");
  expect(
    safeSavedTab({
      id: 1,
      entries: ["https://example.com/?token=private"],
      index: 0,
    }).entries,
  ).toEqual([]);
});
it("restores validated palettes before paint and rejects invalid custom CSS", async () => {
  const { themeBootScript } = await import("@/lib/client/themes");
  const bootstrap = () =>
    new Function("document", "localStorage", "matchMedia", themeBootScript)(
      document,
      localStorage,
      () => ({ matches: false }),
    );
  for (const t of themes) {
    write("appearance", { ...defaultAppearance, selected: t.id });
    bootstrap();
    expect(document.documentElement.dataset.theme).toBe(t.id);
  }
  write("appearance", {
    ...defaultAppearance,
    selected: "evil",
    custom: [{ id: "evil", colors: { bg: "url(javascript:evil)" } }],
  });
  bootstrap();
  expect(document.documentElement.dataset.theme).toBe("dark");
});
it("round trips custom appearance through the main versioned settings backup", () => {
  const custom = { ...themes[0], id: "custom-roundtrip", name: "Round trip" };
  const appearance = {
    ...defaultAppearance,
    selected: custom.id,
    custom: [custom],
  };
  write("appearance", appearance);
  const backup = JSON.parse(JSON.stringify(settingsBackup()));
  localStorage.clear();
  const preview = validateSettingsBackup(backup);
  expect(read("appearance", null)).toBeNull();
  importSettings(preview);
  expect(read("appearance", null)).toEqual(appearance);
});
it("migrates the legacy light preference without resetting other settings", () => {
  write("settings", {
    engine: "duckduckgo",
    theme: "light",
    showQuick: false,
    showRecent: false,
    reducedMotion: true,
  });
  expect(read("appearance", defaultAppearance).selected).toBe("light");
  expect(read<{ engine: string }>("settings", { engine: "bing" }).engine).toBe(
    "duckduckgo",
  );
});
