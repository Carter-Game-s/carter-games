import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "minesweeper",
  title: "Minesweeper",
  description:
    "Reveal all 71 safe cells on a board with ten mines. Use the numbers to count neighboring mines and flag suspected cells before opening them.",
  category: "puzzle",
  thumbnail: "/games/minesweeper/thumbnail.webp",
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
