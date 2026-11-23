import { MediaLibrary } from "@/components/media/library";
import { loadCatalog } from "@/lib/media/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Movies & TV" };
export default async function MoviesPage() {
  return <MediaLibrary entries={await loadCatalog()} />;
}
