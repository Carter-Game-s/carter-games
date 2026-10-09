import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "snake",
  title: "Snake",
  description: "Guide the snake, collect food, and avoid collisions.",
  category: "arcade",
  thumbnail: "/games/snake/thumbnail.svg",
  featured: true,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["\u2191 \u2193 \u2190 \u2192", "WASD"],
      description: "Turn the snake; touch the direction controls.",
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
