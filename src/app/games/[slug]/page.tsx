import { notFound } from "next/navigation";
import { getGameBySlug } from "@/games/registry";
import { GamePlayer } from "@/components/games/game-player";
export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getGameBySlug(slug)) notFound();
  return <GamePlayer key={slug} slug={slug} />;
}
