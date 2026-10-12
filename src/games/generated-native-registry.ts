import type { NativeGameDefinition } from "./types";
export const nativeGameDefinitions: NativeGameDefinition[] = [
  { metadata: {
  "kind": "native",
  "slug": "2048",
  "title": "2048",
  "description": "Slide, combine, and chase the elusive 2048 tile.",
  "category": "puzzle",
  "thumbnail": "/games/2048/thumbnail.svg",
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
  "description": "Keep the ball alive and clear every brick.",
  "category": "arcade",
  "thumbnail": "/games/breakout/thumbnail.svg",
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
  "description": "Find your rhythm and fly through the gaps.",
  "category": "action",
  "thumbnail": "/games/flappy/thumbnail.svg",
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
  "description": "Read the numbers and clear the board without a mine.",
  "category": "puzzle",
  "thumbnail": "/games/minesweeper/thumbnail.svg",
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
  "description": "Take on the computer in the original paddle duel.",
  "category": "sports",
  "thumbnail": "/games/pong/thumbnail.svg",
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
  "description": "Guide the snake, collect food, and avoid collisions.",
  "category": "arcade",
  "thumbnail": "/games/snake/thumbnail.svg",
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
  "description": "Outthink the computer, or challenge a friend.",
  "category": "board",
  "thumbnail": "/games/tic-tac-toe/thumbnail.svg",
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
