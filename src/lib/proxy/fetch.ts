import type { LookupFunction } from "node:net";
import type { LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { gunzip, inflate, brotliDecompress } from "node:zlib";
import { validateURL, resolvePublic } from "./security";
export type Upstream = { url: URL; status: number; type: string; body: Buffer };
function boundedNumber(
  value: string | undefined,
  fallback: number,
  max: number,
) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}
/** Node 22+ may request all addresses for automatic family selection. */
export function createPinnedLookup(address: LookupAddress): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [address]);
    else callback(null, address.address, address.family);
  };
}
export async function fetchPublic(raw: string): Promise<Upstream> {
  const timeout = boundedNumber(process.env.PROXY_TIMEOUT_MS, 10000, 20000);
  const max = boundedNumber(process.env.PROXY_MAX_BYTES, 5000000, 10000000);
  const deadline = Date.now() + timeout;
  let u = validateURL(raw);
  for (let hop = 0; hop <= 5; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Upstream request timed out.");
    const address = await Promise.race([
      resolvePublic(u),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error("DNS lookup timed out.")),
          remaining,
        );
        timer.unref();
      }),
    ]);
    const result = await new Promise<{
      status: number;
      headers: http.IncomingHttpHeaders;
      body: Buffer;
    }>((resolve, reject) => {
      const transport = u.protocol === "https:" ? https : http;
      // Pin the validated address in lookup. The hostname is retained for Host and TLS SNI.
      const req = transport.request(
        u,
        {
          method: "GET",
          agent: false,
          lookup: createPinnedLookup(address),
          headers: {
            "User-Agent": "OrbitReadOnlyProxy/1.0",
            Accept: "text/html,text/css,image/*,font/*;q=0.8,*/*;q=0.1",
            "Accept-Encoding": "gzip, deflate, br",
          },
        },
        (res) => {
          const status = res.statusCode || 502;
          if (status >= 300 && status < 400) {
            res.destroy();
            resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
            return;
          }
          if (Number(res.headers["content-length"]) > max) {
            res.destroy();
            reject(new Error("Page exceeds the response size limit."));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk) => {
            size += chunk.length;
            if (size > max) {
              req.destroy(new Error("Response size limit exceeded."));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () =>
            resolve({
              status,
              headers: res.headers,
              body: Buffer.concat(chunks),
            }),
          );
          res.on("error", reject);
        },
      );
      const timer = setTimeout(
        () => req.destroy(new Error("Upstream request timed out.")),
        Math.max(1, deadline - Date.now()),
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", reject);
      req.end();
    });
    if (result.status >= 300 && result.status < 400) {
      if (!result.headers.location)
        throw new Error("Redirect has no destination.");
      if (hop === 5) throw new Error("Too many redirects.");
      u = validateURL(new URL(result.headers.location, u).href);
      continue;
    }
    if (result.status < 200 || result.status >= 300)
      throw new Error(
        `Website returned HTTP ${result.status}. It may block proxies; open directly.`,
      );
    let body = result.body;
    const encoding = result.headers["content-encoding"]?.trim().toLowerCase();
    if (encoding && encoding !== "identity") {
      const decoder = { gzip: gunzip, deflate: inflate, br: brotliDecompress }[
        encoding
      ] as typeof gunzip | undefined;
      if (!decoder) throw new Error("Unsupported upstream compression.");
      try {
        body = await new Promise<Buffer>((resolve, reject) =>
          decoder(body, { maxOutputLength: max }, (error, output) =>
            error ? reject(error) : resolve(output),
          ),
        );
      } catch {
        throw new Error(
          "Invalid compressed response or decompressed size limit exceeded.",
        );
      }
    }
    return {
      url: u,
      status: result.status,
      type: result.headers["content-type"] || "application/octet-stream",
      body,
    };
  }
  throw new Error("Too many redirects.");
}
