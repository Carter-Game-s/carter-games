import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaDetail } from "@/components/media/detail";
import { loadCatalog } from "@/lib/media/server";
export const dynamic = "force-dynamic";
export default async function MoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string; episode?: string }>;
}) {
  const { slug } = await params;
  const entry = (await loadCatalog()).find((item) => item.id === slug);
  if (!entry) notFound();
  const { season, episode } = await searchParams;
  return (
    <div className="page">
      <Link href="/movies">← Movies &amp; TV</Link>
      <MediaDetail
        key={`${entry.id}/${season}/${episode}`}
        entry={entry}
        requestedSeason={Number(season)}
        requestedEpisode={Number(episode)}
      />
    </div>
  );
}
