import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "2048",
  title: "2048",
  description: "Slide, combine, and chase the elusive 2048 tile.",
  category: "puzzle",
  thumbnail: "/games/2048/thumbnail.svg",
  featured: true,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["\u2191 \u2193 \u2190 \u2192", "WASD"],
      description: "Slide all tiles in a direction; equal tiles merge.",
    },
    {
      label: "Pause / restart",
      keys: ["P", "R"],
      description: "Pause or resume with P; start a new round with R.",
    },
  ],
  supportsTouch: true,
  supportsKeyboard: true,
  supportsFullscreen: true,
  scoreLabel: "Score",
  version: "1.0.0",
} satisfies GameMetadata;
export default metadata;
