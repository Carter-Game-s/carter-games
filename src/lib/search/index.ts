export type SearchEngine = "google" | "bing" | "duckduckgo";
export const engines: Record<SearchEngine, { label: string; url: string }> = {
  google: { label: "Google", url: "https://www.google.com/search?q=" },
  bing: { label: "Bing", url: "https://www.bing.com/search?q=" },
  duckduckgo: {
    label: "DuckDuckGo",
    url: "https://html.duckduckgo.com/html/?q=",
  },
};

export function searchURL(query: string, engine: SearchEngine): string {
  return engines[engine].url + encodeURIComponent(query.trim());
}

export function searchQuery(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const searchPage =
      (["www.google.com", "www.bing.com"].includes(url.hostname) &&
        url.pathname === "/search") ||
      (["duckduckgo.com", "html.duckduckgo.com"].includes(url.hostname) &&
        ["/", "/html", "/html/"].includes(url.pathname));
    return searchPage ? url.searchParams.get("q")?.trim() || null : null;
  } catch {
    return null;
  }
}
export function searchTarget(
  input: string,
  engine: SearchEngine,
): { url: string; search: boolean } {
  const q = input.trim();
  if (!q) throw new Error("Enter a URL or a search.");
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(q) ||
    /^[^\s/]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(q)
  ) {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(q) ? q : "https://" + q);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      throw new Error("Use a public http or https URL without credentials.");
    return { url: u.href, search: false };
  }
  return { url: searchURL(q, engine), search: true };
}
