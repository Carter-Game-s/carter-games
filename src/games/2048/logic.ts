export function move2048(board: number[], direction: number) {
  const out = Array(16).fill(0) as number[];
  let score = 0;
  for (let row = 0; row < 4; row++) {
    const ids = Array.from({ length: 4 }, (_, i) =>
      direction === 0
        ? row * 4 + i
        : direction === 1
          ? row * 4 + 3 - i
          : direction === 2
            ? i * 4 + row
            : (3 - i) * 4 + row,
    );
    const values = ids.map((i) => board[i]).filter(Boolean);
    const merged: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        merged.push(values[i] * 2);
        score += values[i] * 2;
        i++;
      } else merged.push(values[i]);
    }
    ids.forEach((id, i) => (out[id] = merged[i] ?? 0));
  }
  return { board: out, score, changed: out.some((n, i) => n !== board[i]) };
}
export function addTile(board: number[]) {
  const empty = board.map((n, i) => (n === 0 ? i : -1)).filter((i) => i >= 0);
  if (empty.length) {
    const b = [...board];
    b[empty[Math.floor(Math.random() * empty.length)]] =
      Math.random() < 0.9 ? 2 : 4;
    return b;
  }
  return board;
}
export function initial2048() {
  return addTile(addTile(Array(16).fill(0)));
}
export function hasMoves(board: number[]) {
  return (
    board.includes(0) || [0, 1, 2, 3].some((d) => move2048(board, d).changed)
  );
}
