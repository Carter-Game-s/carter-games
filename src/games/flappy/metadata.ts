import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "flappy",
  title: "Sky Hop",
  description: "Find your rhythm and fly through the gaps.",
  category: "action",
  thumbnail: "/games/flappy/thumbnail.svg",
  featured: true,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["Space", "\u2191"],
      description: "Flap, or tap the flight area.",
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
