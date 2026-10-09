export type MineCell = {
  mine: boolean;
  open: boolean;
  flag: boolean;
  count: number;
};
export function mineBoard(first: number, random = Math.random): MineCell[] {
  const cells: Array<MineCell> = Array.from({ length: 81 }, () => ({
    mine: false,
    open: false,
    flag: false,
    count: 0,
  }));
  let mines = 0;
  while (mines < 10) {
    const i = Math.floor(random() * 81);
    if (i === first || cells[i].mine || neighbors(first).includes(i)) continue;
    cells[i].mine = true;
    mines++;
  }
  cells.forEach(
    (c, i) => (c.count = neighbors(i).filter((n) => cells[n].mine).length),
  );
  return cells;
}
export function neighbors(i: number) {
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = (i % 9) + dx,
        y = Math.floor(i / 9) + dy;
      if ((dx || dy) && x >= 0 && x < 9 && y >= 0 && y < 9) out.push(y * 9 + x);
    }
  return out;
}
export function reveal(cells: MineCell[], i: number) {
  const next = cells.map((c) => ({ ...c }));
  const queue = [i];
  while (queue.length) {
    const n = queue.pop()!;
    if (next[n].open || next[n].flag) continue;
    next[n].open = true;
    if (!next[n].mine && next[n].count === 0)
      queue.push(...neighbors(n).filter((k) => !next[k].open));
  }
  return next;
}
