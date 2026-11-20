import type { NativeGameDefinition } from "./types";
export const nativeGameDefinitions: NativeGameDefinition[] = [
  { metadata: {
  "kind": "native",
  "slug": "2048",
  "title": "2048",
  "description": "Slide every tile with the arrow keys or on-screen controls. Equal tiles merge, adding their value to your score. Build the 2048 tile before the grid fills.",
  "category": "puzzle",
  "thumbnail": "/games/2048/thumbnail.webp",
  "featured": true,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "↑ ↓ ← →",
        "WASD"
      ],
      "description": "Slide all tiles in a direction; equal tiles merge."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Score",
  "version": "1.0.0"
}, load: () => import("./2048/game") },
  { metadata: {
  "kind": "native",
  "slug": "breakout",
  "title": "Breakout",
  "description": "Bounce the ball off your paddle to clear the brick wall. Steer with the arrow keys or drag on the court. Missing the ball costs a life.",
  "category": "arcade",
  "thumbnail": "/games/breakout/thumbnail.webp",
  "featured": true,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "← →",
        "A D"
      ],
      "description": "Move the paddle, or drag it on the court."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Score",
  "version": "1.0.0"
}, load: () => import("./breakout/game") },
  { metadata: {
  "kind": "native",
  "slug": "flappy",
  "title": "Sky Hop",
  "description": "Press Space or tap to flap. Guide the bird through the gaps between pipes and score for each pair you pass. A collision ends the run.",
  "category": "action",
  "thumbnail": "/games/flappy/thumbnail.webp",
  "featured": true,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "Space",
        "↑"
      ],
      "description": "Flap, or tap the flight area."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Score",
  "version": "1.0.0"
}, load: () => import("./flappy/game") },
  { metadata: {
  "kind": "native",
  "slug": "minesweeper",
  "title": "Minesweeper",
  "description": "Reveal all 71 safe cells on a board with ten mines. Use the numbers to count neighboring mines and flag suspected cells before opening them.",
  "category": "puzzle",
  "thumbnail": "/games/minesweeper/thumbnail.webp",
  "featured": false,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "Arrow keys",
        "Enter",
        "F"
      ],
      "description": "Move focus, reveal a cell, or flag a suspected mine."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Score",
  "version": "1.0.0"
}, load: () => import("./minesweeper/game") },
  { metadata: {
  "kind": "native",
  "slug": "pong",
  "title": "Pong",
  "description": "Move your paddle with the arrow keys or drag it across the court. Return the ball past the computer’s paddle to score and keep it from passing yours.",
  "category": "sports",
  "thumbnail": "/games/pong/thumbnail.webp",
  "featured": false,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "↑ ↓",
        "W S"
      ],
      "description": "Move your paddle, or drag it on the court."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Score",
  "version": "1.0.0"
}, load: () => import("./pong/game") },
  { metadata: {
  "kind": "native",
  "slug": "snake",
  "title": "Snake",
  "description": "Steer with the arrow keys or touch directions. Collect food to grow and score, while avoiding the walls and your own body.",
  "category": "arcade",
  "thumbnail": "/games/snake/thumbnail.webp",
  "featured": true,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "↑ ↓ ← →",
        "WASD"
      ],
      "description": "Turn the snake; touch the direction controls."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Score",
  "version": "1.0.0"
}, load: () => import("./snake/game") },
  { metadata: {
  "kind": "native",
  "slug": "tic-tac-toe",
  "title": "Tic-Tac-Toe",
  "description": "Place three matching marks in a row, column, or diagonal. Play against the computer or share the board with a friend using the keyboard or touch.",
  "category": "board",
  "thumbnail": "/games/tic-tac-toe/thumbnail.webp",
  "featured": false,
  "tags": [
    "classic",
    "high-score"
  ],
  "controls": [
    {
      "label": "Play",
      "keys": [
        "Arrow keys",
        "Enter"
      ],
      "description": "Move focus and place a mark."
    },
    {
      "label": "Pause / restart",
      "keys": [
        "P",
        "R"
      ],
      "description": "Pause or resume with P; start a new round with R."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "scoreLabel": "Wins",
  "version": "1.0.0"
}, load: () => import("./tic-tac-toe/game") }
];
