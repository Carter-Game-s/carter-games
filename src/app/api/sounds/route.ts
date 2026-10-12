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
  if (query.length > 100 || !Number.isInteger(page) || page < 0 || page > 100)
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
  if (!query && page === 0)
    return Response.json({
      sounds: featuredSounds,
      total: featuredSounds.length,
    });
  const key = `${query}:${page}`;
  const existing = cache.get(key);
  if (existing && existing.until > Date.now())
    return Response.json(existing.value);
  try {
    const url = new URL(
      `https://soundbuttonsworld.com/api/memes/${query ? "search" : "trends"}`,
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "24");
    if (query) url.searchParams.set("q", query);
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
