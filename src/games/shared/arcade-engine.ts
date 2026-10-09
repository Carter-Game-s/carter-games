export type ArcadeKind = "snake" | "pong" | "breakout" | "flappy";
export type ArcadeState = {
  kind: ArcadeKind;
  score: number;
  status: "idle" | "playing" | "paused" | "won" | "lost";
  t: number;
  snake: number[][];
  dir: number[];
  queued: number[];
  food: number[];
  ball: number[];
  velocity: number[];
  paddle: number;
  ai: number;
  opponent: number;
  bricks: boolean[];
  bird: number;
  vy: number;
  pipes: number[][];
  held: Set<string>;
  accumulator: number;
};
export function fresh(kind: ArcadeKind): ArcadeState {
  return {
    kind,
    score: 0,
    status: "idle",
    t: 0,
    snake: [
      [8, 10],
      [7, 10],
      [6, 10],
    ],
    dir: [1, 0],
    queued: [1, 0],
    food: [14, 10],
    ball: [210, 180],
    velocity: [140, -155],
    paddle: 180,
    ai: 150,
    opponent: 0,
    bricks: Array(40).fill(true),
    bird: 170,
    vy: 0,
    pipes: [
      [470, 180],
      [700, 220],
    ],
    held: new Set(),
    accumulator: 0,
  };
}
export function arcadeInput(s: ArcadeState, key: string, down = true) {
  if (down) s.held.add(key);
  else s.held.delete(key);
  if (!down) return;
  if (s.kind === "snake") {
    const dirs: Record<string, number[]> = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
    };
    const d = dirs[key];
    if ((d && d[0] !== -s.dir[0]) || (d && d[1] !== -s.dir[1])) {
      if (d) s.queued = d;
    }
  }
  if (
    s.kind === "flappy" &&
    [" ", "arrowup", "w", "tap"].includes(key) &&
    s.status === "playing"
  )
    s.vy = -260;
}
export function tick(s: ArcadeState, dt: number) {
  if (s.status !== "playing") return;
  dt = Math.min(dt, 0.035);
  s.t += dt;
  if (s.kind === "snake") {
    s.accumulator += dt;
    if (s.accumulator < Math.max(0.065, 0.14 - s.score * 0.001)) return;
    s.accumulator = 0;
    s.dir = s.queued;
    const head = [s.snake[0][0] + s.dir[0], s.snake[0][1] + s.dir[1]];
    const eat = head[0] === s.food[0] && head[1] === s.food[1];
    if (
      head.some((n) => n < 0 || n >= 20) ||
      s.snake
        .slice(0, eat ? undefined : -1)
        .some((p) => p[0] === head[0] && p[1] === head[1])
    ) {
      s.status = "lost";
      return;
    }
    s.snake.unshift(head);
    if (eat) {
      s.score += 10;
      if (s.snake.length === 400) {
        s.status = "won";
        return;
      }
      do {
        s.food = [
          Math.floor(Math.random() * 20),
          Math.floor(Math.random() * 20),
        ];
      } while (s.snake.some((p) => p[0] === s.food[0] && p[1] === s.food[1]));
    } else s.snake.pop();
    return;
  }
  if (s.kind === "flappy") {
    s.vy += 720 * dt;
    s.bird += s.vy * dt;
    for (const pipe of s.pipes) {
      pipe[0] -= 145 * dt;
      if (pipe[0] < -55) {
        pipe[0] = Math.max(...s.pipes.map((p) => p[0])) + 230;
        pipe[1] = 105 + Math.random() * 150;
        pipe[2] = 0;
      }
      if (pipe[0] + 50 < 95 && !pipe[2]) {
        s.score++;
        pipe[2] = 1;
      }
      if (
        pipe[0] < 112 &&
        pipe[0] + 50 > 78 &&
        (s.bird - 13 < pipe[1] - 65 || s.bird + 13 > pipe[1] + 65)
      )
        s.status = "lost";
    }
    if (s.bird < 13 || s.bird > 347) s.status = "lost";
    return;
  }
  const horizontal = s.kind === "breakout";
  const neg = horizontal ? ["arrowleft", "a"] : ["arrowup", "w"],
    pos = horizontal ? ["arrowright", "d"] : ["arrowdown", "s"];
  s.paddle +=
    ((pos.some((k) => s.held.has(k)) ? 1 : 0) -
      (neg.some((k) => s.held.has(k)) ? 1 : 0)) *
    330 *
    dt;
  s.paddle = Math.max(
    horizontal ? 45 : 40,
    Math.min(horizontal ? 375 : 320, s.paddle),
  );
  const [oldX, oldY] = s.ball;
  s.ball[0] += s.velocity[0] * dt;
  s.ball[1] += s.velocity[1] * dt;
  const [x, y] = s.ball;
  if (s.kind === "pong") {
    s.ai += Math.sign(y - s.ai) * Math.min(Math.abs(y - s.ai), 205 * dt);
    s.ai = Math.max(40, Math.min(320, s.ai));
    if (y < 8 || y > 352) {
      s.velocity[1] *= -1;
      s.ball[1] = Math.max(8, Math.min(352, y));
    }
    if (x < 28 && oldX >= 28 && Math.abs(y - s.paddle) < 49) {
      s.velocity[0] = Math.abs(s.velocity[0]) * 1.04;
      s.velocity[1] = (y - s.paddle) * 6;
      s.ball[0] = 28;
    }
    if (x > 392 && oldX <= 392 && Math.abs(y - s.ai) < 49) {
      s.velocity[0] = -Math.abs(s.velocity[0]) * 1.04;
      s.velocity[1] = (y - s.ai) * 6;
      s.ball[0] = 392;
    }
    if (x < 0 || x > 420) {
      if (x > 420) s.score++;
      else s.opponent++;
      s.ball = [210, 180];
      s.velocity = [x < 0 ? 150 : -150, 140];
      if (s.score === 7) s.status = "won";
      if (s.opponent === 7) s.status = "lost";
    }
    return;
  }
  if (x < 8 || x > 412) {
    s.velocity[0] *= -1;
    s.ball[0] = Math.max(8, Math.min(412, x));
  }
  if (y < 8) {
    s.velocity[1] = Math.abs(s.velocity[1]);
    s.ball[1] = 8;
  }
  if (
    y >= 321 &&
    oldY < 321 &&
    Math.abs(x - s.paddle) < 53 &&
    s.velocity[1] > 0
  ) {
    s.velocity[1] = -Math.abs(s.velocity[1]);
    s.velocity[0] = (x - s.paddle) * 5;
    s.ball[1] = 320;
  }
  for (let i = 0; i < 40; i++) {
    if (!s.bricks[i]) continue;
    const bx = 11 + (i % 8) * 50,
      by = 30 + Math.floor(i / 8) * 25;
    if (x > bx - 7 && x < bx + 46 && y > by - 7 && y < by + 25) {
      s.bricks[i] = false;
      s.score += 10;
      s.velocity[1] *= -1;
      break;
    }
  }
  if (s.bricks.every((b) => !b)) s.status = "won";
  if (y > 370) s.status = "lost";
}
export function draw(ctx: CanvasRenderingContext2D, s: ArcadeState) {
  ctx.clearRect(0, 0, 420, 360);
  ctx.fillStyle = "#111917";
  ctx.fillRect(0, 0, 420, 360);
  ctx.fillStyle = "#b9f573";
  if (s.kind === "snake") {
    for (const [x, y] of s.snake) ctx.fillRect(x * 21 + 1, y * 18 + 1, 19, 16);
    ctx.fillStyle = "#f18b73";
    ctx.beginPath();
    ctx.arc(s.food[0] * 21 + 10, s.food[1] * 18 + 9, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (s.kind === "flappy") {
    for (const [x, gap] of s.pipes) {
      ctx.fillStyle = "#608745";
      ctx.fillRect(x, 0, 50, gap - 65);
      ctx.fillRect(x, gap + 65, 50, 360 - gap - 65);
    }
    ctx.fillStyle = "#b9f573";
    ctx.beginPath();
    ctx.arc(95, s.bird, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17261c";
    ctx.fillRect(98, s.bird - 5, 4, 4);
  } else {
    if (s.kind === "pong") {
      ctx.strokeStyle = "#384b40";
      ctx.setLineDash([6, 9]);
      ctx.beginPath();
      ctx.moveTo(210, 0);
      ctx.lineTo(210, 360);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillRect(14, s.paddle - 40, 10, 80);
      ctx.fillRect(396, s.ai - 40, 10, 80);
    } else {
      for (let i = 0; i < 40; i++)
        if (s.bricks[i]) {
          ctx.fillStyle = [
            "#b9f573",
            "#8bbc67",
            "#709653",
            "#efb277",
            "#dd8e72",
          ][Math.floor(i / 8)];
          ctx.fillRect(11 + (i % 8) * 50, 30 + Math.floor(i / 8) * 25, 46, 19);
        }
      ctx.fillStyle = "#b9f573";
      ctx.fillRect(s.paddle - 45, 330, 90, 10);
    }
    ctx.fillStyle = "#f6f8f3";
    ctx.beginPath();
    ctx.arc(s.ball[0], s.ball[1], 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (s.status !== "playing") {
    ctx.fillStyle = "#111917ba";
    ctx.fillRect(0, 130, 420, 90);
    ctx.fillStyle = "#f6f8f3";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      s.status === "idle"
        ? "Ready when you are"
        : s.status === "paused"
          ? "Paused"
          : s.status === "won"
            ? "You win!"
            : "Round over",
      210,
      175,
    );
  }
}
