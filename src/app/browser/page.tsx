import { Browser } from "@/components/browser/browser";
export default async function BrowserPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  let safe = "";
  try {
    if (url) {
      const u = new URL(url);
      if (
        ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password
      )
        safe = u.href;
    }
  } catch {}
  return <Browser key={safe} initialURL={safe} />;
}
