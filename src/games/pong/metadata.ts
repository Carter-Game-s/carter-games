import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "pong",
  title: "Pong",
  description:
    "Move your paddle up and down with the arrow keys or drag it on the court. Return the ball past the computer’s paddle. The first side to seven points wins.",
  category: "sports",
  thumbnail: "/games/pong/thumbnail.webp",
  featured: false,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["\u2191 \u2193", "W S"],
      description: "Move your paddle, or drag it on the court.",
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
