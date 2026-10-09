export type SearchEngine = "google" | "bing" | "duckduckgo";
export const engines: Record<SearchEngine, { label: string; url: string }> = {
  google: { label: "Google", url: "https://www.google.com/search?q=" },
  bing: { label: "Bing", url: "https://www.bing.com/search?q=" },
  duckduckgo: { label: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
};
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
  return { url: engines[engine].url + encodeURIComponent(q), search: true };
}
