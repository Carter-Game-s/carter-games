import featured from "./featured.json";

export type Sound = {
  id: number;
  name: string;
  filename: string;
  slug: string;
  category: string;
};
export const featuredSounds: Sound[] = featured;
export function parseSounds(value: unknown): {
  sounds: Sound[];
  total: number;
} {
  if (!value || typeof value !== "object") throw Error("Invalid sound catalog");
  const data = value as { data?: unknown; total?: unknown };
  if (!Array.isArray(data.data)) throw Error("Invalid sound catalog");
  const sounds: Sound[] = [];
  for (const item of data.data.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    if (
      typeof s.id !== "number" ||
      !Number.isSafeInteger(s.id) ||
      s.id < 1 ||
      typeof s.name !== "string" ||
      !s.name.trim() ||
      s.name.length > 200 ||
      typeof s.fileName !== "string" ||
      !/^[a-zA-Z0-9_-]+\.(mp3|wav|ogg)$/i.test(s.fileName) ||
      typeof s.url !== "string" ||
      !/^[a-zA-Z0-9_-]{1,250}$/.test(s.url)
    )
      continue;
    sounds.push({
      id: s.id,
      name: s.name.trim(),
      filename: s.fileName,
      slug: s.url,
      category:
        typeof s.categoryName === "string"
          ? s.categoryName.slice(0, 80)
          : "Sounds",
    });
  }
  return {
    sounds,
    total:
      typeof data.total === "number" &&
      Number.isSafeInteger(data.total) &&
      data.total >= sounds.length
        ? data.total
        : sounds.length,
  };
}
export const soundAudioURL = (sound: Sound) =>
  `https://soundbuttonsworld.com/uploads/${sound.filename}`;
export const soundSourceURL = (sound: Sound) =>
  `https://soundbuttonsworld.com/sound-button/${sound.slug}`;
