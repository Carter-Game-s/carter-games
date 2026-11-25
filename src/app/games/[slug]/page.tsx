import { notFound } from "next/navigation";
import manifest from "@/lib/offline-games/manifest.json";
import { allGames, getGameBySlug } from "@/games/registry";
import { GamePlayer } from "@/components/games/game-player";
export function generateStaticParams() {
  return allGames
    .filter((game) => game.metadata.featured)
    .map(({ metadata }) => ({ slug: metadata.slug }));
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getGameBySlug(slug)) notFound();
  return (
    <GamePlayer
      key={slug}
      slug={slug}
      packed={Object.hasOwn(manifest.games, slug)}
    />
  );
}
