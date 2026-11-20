import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "flappy",
  title: "Sky Hop",
  description:
    "Press Space or tap to flap. Guide the bird through the gaps between pipes and score for each pair you pass. A collision ends the run.",
  category: "action",
  thumbnail: "/games/flappy/thumbnail.webp",
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
