import classicFilms from "./classic-films.json";

export type MediaSource = {
  kind: "mp4" | "webm" | "hls" | "embed";
  url: string;
};
export type MediaVideo = {
  runtime: number;
  sources: MediaSource[];
  subtitles?: { label: string; language: string; url: string }[];
};
export type Episode = MediaVideo & { number: number; title: string };
type Entry = {
  id: string;
  title: string;
  description: string;
  released: string;
  genres: string[];
  poster: string;
  rights: string;
  reference: string;
  featured?: boolean;
};
export type MediaEntry = Entry &
  (
    | { kind: "movie"; video: MediaVideo }
    | { kind: "show"; seasons: { number: number; episodes: Episode[] }[] }
  );

const reviewedClassics: unknown = classicFilms;
if (!validateCatalog(reviewedClassics)) {
  throw new Error("Invalid bundled classic film catalog");
}

export const initialCatalog: MediaEntry[] = [
  {
    id: "sita-sings-the-blues",
    kind: "movie",
    title: "Sita Sings the Blues",
    description:
      "Nina Paley interweaves the story of Sita and Rama with her own breakup and the jazz recordings of Annette Hanshaw.",
    released: "2008-02-11",
    genres: ["Animation", "Music"],
    poster: "/media/sita-sings-the-blues.webp",
    rights:
      "Nina Paley’s CC0 dedication applies to the film where she holds rights. Soundtrack restrictions apply separately. The original film streams from the filmmaker’s linked Internet Archive copy.",
    reference: "https://www.sitasingstheblues.com/license.html",
    featured: true,
    video: {
      runtime: 4891,
      sources: [
        {
          kind: "mp4",
          url: "https://archive.org/download/Sita_Sings_the_Blues/Sita_Sings_the_Blues_480p_2150kbps.mp4",
        },
      ],
    },
  },
  {
    id: "the-general",
    kind: "movie",
    title: "The General",
    description:
      "When Union raiders steal his locomotive during the Civil War, railway engineer Johnnie Gray chases them and sets out to rescue his sweetheart.",
    released: "1926",
    genres: ["Comedy", "Silent"],
    poster: "/media/the-general.webp",
    rights:
      "Buster Keaton and Clyde Bruckman’s original silent film. This print is listed as public domain in the United States by Wikimedia Commons.",
    reference:
      "https://commons.wikimedia.org/wiki/File:The_General_(1926).webm",
    featured: true,
    video: {
      runtime: 4552,
      sources: [
        {
          kind: "webm",
          url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/e/ee/The_General_%281926%29.webm/The_General_%281926%29.webm.480p.vp9.webm",
        },
      ],
    },
  },
  {
    id: "caminandes",
    kind: "show",
    title: "Caminandes",
    description:
      "Koro the llama runs into trouble on the roads, fences, and frozen trails of Patagonia in this Blender animated short series.",
    released: "2013",
    genres: ["Animation", "Comedy"],
    poster: "/media/caminandes.webp",
    rights:
      "Animation and artwork © Blender Foundation, made available under Creative Commons Attribution.",
    reference: "https://studio.blender.org/remixing/",
    seasons: [
      {
        number: 1,
        episodes: [
          {
            number: 1,
            title: "Llama Drama",
            runtime: 90,
            sources: [
              {
                kind: "mp4",
                url: "https://archive.org/download/Caminandes1LlamaDrama/01_llama_drama_1080p.mp4",
              },
            ],
          },
          {
            number: 2,
            title: "Gran Dillama",
            runtime: 146,
            sources: [
              {
                kind: "mp4",
                url: "https://video.blender.org/object-storage/web_videos/fb70d459-48d2-4db5-adba-813c84f9200a-480.mp4",
              },
            ],
          },
          {
            number: 3,
            title: "Llamigos",
            runtime: 150,
            sources: [
              {
                kind: "mp4",
                url: "https://video.blender.org/object-storage/web_videos/23f3ef79-15dc-44c5-aa45-cf92e78a4509-480.mp4",
              },
            ],
          },
        ],
      },
    ],
  },
  ...reviewedClassics,
];

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, limit = 400): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= limit
  );
}
function secureUrl(value: unknown) {
  if (!text(value, 1500)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && !url.username && !url.password && !url.port
    );
  } catch {
    return false;
  }
}
function numbered(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 10000
  );
}
function video(value: unknown): value is MediaVideo {
  if (
    !record(value) ||
    !numbered(value.runtime) ||
    !Array.isArray(value.sources) ||
    !value.sources.length ||
    value.sources.length > 8
  )
    return false;
  return (
    value.sources.every((source) => {
      if (
        !record(source) ||
        !secureUrl(source.url) ||
        typeof source.url !== "string"
      )
        return false;
      if (["mp4", "webm", "hls"].includes(String(source.kind))) return true;
      const url = new URL(source.url);
      return (
        source.kind === "embed" &&
        ((url.hostname === "www.youtube-nocookie.com" &&
          /^\/embed\/[\w-]{11}$/.test(url.pathname)) ||
          (url.hostname === "player.vimeo.com" &&
            /^\/video\/\d+$/.test(url.pathname)))
      );
    }) &&
    (value.subtitles === undefined ||
      (Array.isArray(value.subtitles) &&
        value.subtitles.length <= 16 &&
        value.subtitles.every(
          (track) =>
            record(track) &&
            text(track.label, 80) &&
            text(track.language, 15) &&
            (secureUrl(track.url) ||
              (typeof track.url === "string" &&
                /^\/media\/[\w-]+\.vtt$/.test(track.url))),
        )))
  );
}
export function validateCatalog(value: unknown): value is MediaEntry[] {
  if (!Array.isArray(value) || value.length > 500) return false;
  const ids = new Set<string>();
  return value.every((entry) => {
    if (
      !record(entry) ||
      typeof entry.id !== "string" ||
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(entry.id) ||
      ids.has(entry.id) ||
      !text(entry.title) ||
      !text(entry.description, 2000) ||
      typeof entry.released !== "string" ||
      !/^\d{4}(?:-\d{2}-\d{2})?$/.test(entry.released) ||
      !Array.isArray(entry.genres) ||
      !entry.genres.length ||
      entry.genres.length > 12 ||
      !entry.genres.every((genre: unknown) => text(genre, 80)) ||
      !text(entry.rights, 2000) ||
      !secureUrl(entry.reference) ||
      (entry.featured !== undefined && typeof entry.featured !== "boolean") ||
      !(
        secureUrl(entry.poster) ||
        (typeof entry.poster === "string" &&
          /^\/media\/[\w-]+\.webp$/.test(entry.poster))
      )
    )
      return false;
    ids.add(entry.id);
    if (entry.kind === "movie") return video(entry.video);
    return (
      entry.kind === "show" &&
      Array.isArray(entry.seasons) &&
      entry.seasons.length > 0 &&
      entry.seasons.length <= 80 &&
      new Set(entry.seasons.map((season) => season?.number)).size ===
        entry.seasons.length &&
      entry.seasons.every(
        (season) =>
          record(season) &&
          numbered(season.number) &&
          Array.isArray(season.episodes) &&
          season.episodes.length > 0 &&
          season.episodes.length <= 150 &&
          new Set(season.episodes.map((episode) => episode?.number)).size ===
            season.episodes.length &&
          season.episodes.every(
            (episode) =>
              record(episode) &&
              numbered(episode.number) &&
              text(episode.title) &&
              video(episode),
          ),
      )
    );
  });
}
