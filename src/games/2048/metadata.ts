import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "2048",
  title: "2048",
  description:
    "Slide every tile with the arrow keys or on-screen controls. Equal tiles merge, adding their value to your score. Build the 2048 tile before the grid fills.",
  category: "puzzle",
  thumbnail: "/games/2048/thumbnail.webp",
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
