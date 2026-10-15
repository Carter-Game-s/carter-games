import { Browser } from "@/components/browser/browser";
import { FullBrowser } from "@/components/browser/full-browser";
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
  const engineURL = process.env.CODESPACE_NAME
    ? `https://${process.env.CODESPACE_NAME}-3001.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev"}`
    : process.env.BROWSER_ENGINE_URL;
  if (!engineURL) return <Browser key={safe} initialURL={safe} />;
  return <FullBrowser key={safe} initialURL={safe} engineURL={engineURL} />;
}
