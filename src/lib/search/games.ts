import type { GameDefinition, GameCategory } from "@/games/types";
export function filterGames(
  games: readonly GameDefinition[],
  query = "",
  category: GameCategory | "all" = "all",
) {
  const q = query.trim().toLowerCase();
  return games.filter(
    ({ metadata: m }) =>
      (category === "all" || m.category === category) &&
      [m.title, m.description, ...(m.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
}
