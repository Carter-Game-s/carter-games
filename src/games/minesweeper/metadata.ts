import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "minesweeper",
  title: "Minesweeper",
  description: "Read the numbers and clear the board without a mine.",
  category: "puzzle",
  thumbnail: "/games/minesweeper/thumbnail.svg",
  featured: false,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["Arrow keys", "Enter", "F"],
      description: "Move focus, reveal a cell, or flag a suspected mine.",
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
