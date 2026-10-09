export const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function winner(b: string[]) {
  for (const [a, c, d] of lines)
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? "draw" : null;
}
export function computerMove(board: string[]): number {
  function search(b: string[], turn: string): number {
    const win = winner(b);
    if (win) return win === "O" ? 10 : win === "X" ? -10 : 0;
    const scores = b
      .map((v, i) => {
        if (v) return null;
        const n = [...b];
        n[i] = turn;
        return search(n, turn === "O" ? "X" : "O");
      })
      .filter((v): v is number => v !== null);
    return turn === "O" ? Math.max(...scores) : Math.min(...scores);
  }
  let best = -Infinity,
    index = -1;
  for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7])
    if (!board[i]) {
      const b = [...board];
      b[i] = "O";
      const score = search(b, "X");
      if (score > best) {
        best = score;
        index = i;
      }
    }
  return index;
}
