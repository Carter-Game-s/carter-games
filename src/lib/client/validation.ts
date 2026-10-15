export const object = (v: unknown): v is Record<string, unknown> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;
export const text = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.length <= max;
export const finite = (
  v: unknown,
  max = Number.MAX_SAFE_INTEGER,
): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export function safeURL(raw: string) {
  const url = new URL(
    /^[a-z][a-z\d+.-]*:/i.test(raw.trim())
      ? raw.trim()
      : "https://" + raw.trim(),
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    raw.length > 2048
  )
    throw Error(
      "Enter a public HTTP or HTTPS website URL without credentials.",
    );
  return url.href;
}
export function parseFile(raw: string, max = 2 * 1024 * 1024): unknown {
  if (new TextEncoder().encode(raw).length > max)
    throw Error("Backup exceeds the size limit.");
  const value: unknown = JSON.parse(raw);
  if (!object(value)) throw Error("Invalid backup object.");
  return value;
}
export async function readBackupFile(file: File, max = 2 * 1024 * 1024) {
  if (file.size > max) throw Error("Backup exceeds the size limit.");
  return parseFile(await file.text(), max);
}
export function downloadJSON(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function id() {
  return crypto.randomUUID();
}
export function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  if (from < 0 || to < 0 || from >= items.length || to >= items.length)
    return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function editable(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      'input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]',
    )
  );
}
export function onlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  return Object.keys(value).every((key) => keys.includes(key));
}
