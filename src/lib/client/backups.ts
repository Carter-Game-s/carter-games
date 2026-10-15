import { validGroups } from "./browser-session";
import { read, write, PREFIX, gameStorage } from "@/lib/storage";
import { defaultSettings } from "@/lib/storage/settings";
import { validAppearance, defaultAppearance } from "./themes";
import {
  validPreferences,
  defaultPreferences,
  validHome,
  defaultHome,
} from "./preferences";
import { allGames, getGameBySlug } from "@/games/registry";
import { object, text, finite, onlyKeys } from "./validation";
export function validSettings(v: unknown) {
  return (
    object(v) &&
    onlyKeys(v, [
      "engine",
      "theme",
      "showRecent",
      "showQuick",
      "reducedMotion",
    ]) &&
    ["google", "bing", "duckduckgo"].includes(String(v.engine)) &&
    ["dark", "light", "system"].includes(String(v.theme)) &&
    ["showRecent", "showQuick", "reducedMotion"].every(
      (k) => typeof v[k] === "boolean",
    )
  );
}
const validators: Record<string, (v: unknown) => boolean> = {
  "browser-groups": validGroups,
  settings: validSettings,
  appearance: validAppearance,
  preferences: validPreferences,
  home: validHome,
  favorites: (v) =>
    Array.isArray(v) &&
    v.length <= 1000 &&
    v.every((s) => typeof s === "string" && !!getGameBySlug(s)),
};
export function settingsBackup() {
  const defaults: Record<string, unknown> = {
    settings: defaultSettings,
    appearance: defaultAppearance,
    preferences: defaultPreferences,
    home: defaultHome,
    favorites: [],
    "browser-groups": { version: 1, groups: [] },
  };
  const preferences: Record<string, unknown> = {};
  for (const key of Object.keys(validators)) {
    const v = read(key, defaults[key]);
    preferences[key] = validators[key](v) ? v : defaults[key];
  }
  return { format: "carter-settings", version: 1, preferences };
}
export function validateSettingsBackup(v: unknown): Record<string, unknown> {
  if (
    !object(v) ||
    v.format !== "carter-settings" ||
    v.version !== 1 ||
    !object(v.preferences) ||
    !Object.keys(v.preferences).length
  )
    throw Error("Unsupported settings backup.");
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(v.preferences)) {
    if (!validators[key] || !validators[key](value))
      throw Error(`Invalid preference: ${key}`);
    result[key] = value;
  }
  return result;
}
export function importSettings(data: Record<string, unknown>) {
  validateSettingsBackup({
    format: "carter-settings",
    version: 1,
    preferences: data,
  });
  const previous = Object.fromEntries(
    Object.keys(data).map((k) => [k, read(k, null)]),
  );
  for (const [key, value] of Object.entries(data))
    if (!write(key, value)) {
      for (const [k, v] of Object.entries(previous)) write(k, v);
      throw Error("Import failed: local storage is unavailable.");
    }
}
export type SaveBackup = {
  format: "carter-saves";
  version: 1;
  created: number;
  saves: Record<string, Record<string, unknown>>;
};
export function supportsSaves(slug: string) {
  const game = getGameBySlug(slug);
  return (
    !!game &&
    (game.metadata.kind === "native" || game.metadata.slug.startsWith("pack-"))
  );
}
export function exportSaves(slug?: string): SaveBackup {
  const saves: SaveBackup["saves"] = {};
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(PREFIX + "game:")) continue;
    const [, game, ...parts] = key.slice(PREFIX.length).split(":");
    if (!supportsSaves(game) || (slug && slug !== game)) continue;
    const name = parts.join(":");
    if (!name) continue;
    (saves[game] ??= {})[name] = gameStorage(game).get(name, null);
  }
  const backup: SaveBackup = {
    format: "carter-saves",
    version: 1,
    created: Date.now(),
    saves,
  };
  if (new TextEncoder().encode(JSON.stringify(backup)).length > 8 * 1024 * 1024)
    throw Error("Save backup exceeds 8 MB. Export individual games instead.");
  return backup;
}
export function validJSON(v: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (v === null || typeof v === "boolean" || typeof v === "string")
    return typeof v !== "string" || v.length <= 256000;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v))
    return v.length <= 10000 && v.every((x) => validJSON(x, depth + 1));
  return (
    object(v) &&
    Object.keys(v).length <= 1000 &&
    Object.entries(v).every(
      ([k, x]) =>
        !["__proto__", "constructor", "prototype"].includes(k) &&
        k.length <= 1000 &&
        validJSON(x, depth + 1),
    )
  );
}
export function validateSaveBackup(v: unknown): SaveBackup {
  if (
    !object(v) ||
    v.format !== "carter-saves" ||
    v.version !== 1 ||
    !finite(v.created) ||
    !object(v.saves) ||
    Object.keys(v.saves).length > allGames.length
  )
    throw Error("Unsupported save backup.");
  for (const [slug, save] of Object.entries(v.saves)) {
    if (
      !supportsSaves(slug) ||
      !object(save) ||
      Object.keys(save).length > 1000 ||
      !Object.entries(save).every(
        ([key, value]) =>
          text(key, 1000) &&
          key.length > 0 &&
          !["__proto__", "constructor", "prototype"].includes(key) &&
          validJSON(value) &&
          validGameEntry(slug, key, value),
      )
    )
      throw Error("Invalid or unsupported game save.");
  }
  return v as SaveBackup;
}
export function restoreSaves(
  backup: SaveBackup,
  selected: string[],
  overwrite: boolean,
) {
  validateSaveBackup(backup);
  for (const slug of selected) {
    const saves = backup.saves[slug];
    if (!saves) continue;
    for (const [key, value] of Object.entries(saves)) {
      if (
        !overwrite &&
        localStorage.getItem(PREFIX + `game:${slug}:${key}`) !== null
      )
        continue;
      gameStorage(slug).set(key, value);
      if (
        JSON.stringify(gameStorage(slug).get(key, null)) !==
        JSON.stringify(value)
      )
        throw Error(
          "Restore stopped because local storage is full. Some selected saves may already have been restored.",
        );
    }
  }
}
export function resetSave(slug: string) {
  if (!supportsSaves(slug)) return;
  for (const key of Object.keys(localStorage))
    if (key.startsWith(PREFIX + `game:${slug}:`))
      gameStorage(slug).remove(key.slice((PREFIX + `game:${slug}:`).length));
}

export function validGameEntry(slug: string, key: string, value: unknown) {
  if (slug.startsWith("pack-"))
    return (
      key === "html-save" &&
      object(value) &&
      Object.keys(value).length <= 1000 &&
      Object.entries(value).every(
        ([k, v]) => k.length <= 1000 && text(v, 128 * 1024),
      ) &&
      JSON.stringify(value).length <= 128 * 1024
    );
  if (["highScore", "lastScore", "wins", "lastCleared"].includes(key))
    return finite(value);
  if (slug === "2048" && key === "save")
    return (
      object(value) &&
      Array.isArray(value.board) &&
      value.board.length === 16 &&
      value.board.every(
        (n) =>
          finite(n, 2 ** 30) &&
          Number.isInteger(n) &&
          (n === 0 || Math.log2(n) % 1 === 0),
      ) &&
      finite(value.score)
    );
  return false;
}
