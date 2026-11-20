import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "breakout",
  title: "Breakout",
  description:
    "Bounce the ball off your paddle to clear the brick wall. Steer with the arrow keys or drag on the court. Missing the ball costs a life.",
  category: "arcade",
  thumbnail: "/games/breakout/thumbnail.webp",
  featured: true,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["\u2190 \u2192", "A D"],
      description: "Move the paddle, or drag it on the court.",
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
