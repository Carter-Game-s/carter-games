import { featuredSounds, parseSounds } from "@/lib/soundboard/catalog";
import { allowRequest } from "@/lib/proxy/security";
import { fetchPublic } from "@/lib/proxy/fetch";

export const runtime = "nodejs";
const cache = new Map<
  string,
  { until: number; value: ReturnType<typeof parseSounds> }
>();
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").trim();
  const page = Number(params.get("page") || 0);
  const category = Number(params.get("category") || 0);
  const mode = params.get("mode") || "all";
  if (
    query.length > 100 ||
    !Number.isInteger(page) ||
    page < 0 ||
    page > 100000 ||
    ![0, 1, 2, 3, 5, 9, 13, 19, 20, 22].includes(category) ||
    !["all", "featured", "trends", "new"].includes(mode)
  )
    return Response.json({ error: "Invalid search." }, { status: 400 });
  if (
    !allowRequest(
      "sounds:" +
        (request.headers.get("x-forwarded-for")?.split(",")[0] || "local"),
      60,
    )
  )
    return Response.json(
      { error: "Too many searches. Try again shortly." },
      { status: 429 },
    );
  if (!query && page === 0 && mode === "featured")
    return Response.json({
      sounds: featuredSounds,
      total: featuredSounds.length,
    });
  const key = `${query}:${page}:${category}:${mode}`;
  const existing = cache.get(key);
  if (existing && existing.until > Date.now())
    return Response.json(existing.value);
  try {
    const url = new URL(
      `https://soundbuttonsworld.com/api/memes/${query ? "search" : mode === "new" || mode === "trends" ? mode : "getall"}`,
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "24");
    if (query) url.searchParams.set("q", query);
    if (category) url.searchParams.set("category", String(category));
    const response = await fetchPublic(url.href);
    if (response.status !== 200 || !response.type.includes("json"))
      throw Error("Unavailable");
    const value = parseSounds(JSON.parse(response.body.toString("utf8")));
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { until: Date.now() + 60000, value });
    return Response.json(value);
  } catch {
    return Response.json(
      { error: "The sound library is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
