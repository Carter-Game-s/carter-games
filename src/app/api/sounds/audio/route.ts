import { fetchPublic } from "@/lib/proxy/fetch";
import { allowRequest } from "@/lib/proxy/security";
import { audioRange } from "@/lib/soundboard/audio";

export const runtime = "nodejs";
const cache = new Map<
  string,
  { bytes: Buffer; type: string; expires: number }
>();
const pending = new Map<
  string,
  Promise<{ bytes: Buffer; type: string; expires: number }>
>();
const maximumCacheBytes = 16 * 1024 * 1024;

async function load(file: string) {
  const cached = cache.get(file);
  if (cached && cached.expires > Date.now()) return cached;
  if (pending.has(file)) return pending.get(file)!;
  if (pending.size >= 8) throw Error("Busy");
  const task = (async () => {
    const upstream = await fetchPublic(
      `https://soundbuttonsworld.com/uploads/${file}`,
    );
    if (
      upstream.status !== 200 ||
      !upstream.body.length ||
      !/^(audio\/|application\/octet-stream)/i.test(upstream.type)
    )
      throw Error("Invalid audio");
    const type = /\.mp3$/i.test(file)
      ? "audio/mpeg"
      : /\.wav$/i.test(file)
        ? "audio/wav"
        : "audio/ogg";
    const value = { bytes: upstream.body, type, expires: Date.now() + 300000 };
    cache.delete(file);
    let used = [...cache.values()].reduce(
      (sum, item) => sum + item.bytes.length,
      0,
    );
    while (cache.size && used + value.bytes.length > maximumCacheBytes) {
      const key = cache.keys().next().value!;
      used -= cache.get(key)!.bytes.length;
      cache.delete(key);
    }
    if (value.bytes.length <= maximumCacheBytes) cache.set(file, value);
    return value;
  })();
  pending.set(file, task);
  try {
    return await task;
  } finally {
    pending.delete(file);
  }
}

async function respond(request: Request, head = false) {
  const file = new URL(request.url).searchParams.get("file") || "";
  if (!/^[a-zA-Z0-9_-]{1,250}\.(mp3|wav|ogg)$/i.test(file))
    return Response.json({ error: "Invalid sound." }, { status: 400 });
  if (
    !allowRequest(
      "sound-audio:" +
        (request.headers.get("x-forwarded-for")?.split(",")[0] || "local"),
      120,
    )
  )
    return Response.json(
      { error: "Too many sound requests." },
      { status: 429 },
    );
  try {
    const { bytes, type } = await load(file);
    let range;
    try {
      range = audioRange(request.headers.get("range"), bytes.length);
    } catch {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${bytes.length}` },
      });
    }
    const body = range ? bytes.subarray(range.start, range.end + 1) : bytes;
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Content-Length": String(body.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    };
    if (range)
      headers["Content-Range"] =
        `bytes ${range.start}-${range.end}/${bytes.length}`;
    return new Response(head ? null : new Uint8Array(body), {
      status: range ? 206 : 200,
      headers,
    });
  } catch {
    return Response.json(
      { error: "This sound is unavailable. Please retry." },
      { status: 502 },
    );
  }
}
export const GET = (request: Request) => respond(request);
export const HEAD = (request: Request) => respond(request, true);
