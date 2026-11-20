import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "tic-tac-toe",
  title: "Tic-Tac-Toe",
  description:
    "Place three matching marks in a row, column, or diagonal. Play against the computer or share the board with a friend using the keyboard or touch.",
  category: "board",
  thumbnail: "/games/tic-tac-toe/thumbnail.webp",
  featured: false,
  tags: ["classic", "high-score"],
  controls: [
    {
      label: "Play",
      keys: ["Arrow keys", "Enter"],
      description: "Move focus and place a mark.",
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
  scoreLabel: "Wins",
  version: "1.0.0",
} satisfies GameMetadata;
export default metadata;
