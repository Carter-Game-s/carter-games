// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import https from "node:https";
import dns from "node:dns/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync, deflateSync, brotliCompressSync } from "node:zlib";
import { fetchPublic, createPinnedLookup } from "@/lib/proxy/fetch";
afterEach(() => vi.unstubAllEnvs());
function network(
  status: number,
  headers: Record<string, string>,
  body: string | Buffer = "safe page",
  neverEnd = false,
) {
  vi.spyOn(dns, "lookup").mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
  ] as never);
  let options: Record<string, unknown> = {};
  vi.spyOn(https, "request").mockImplementation(((
    _url: unknown,
    opts: Record<string, unknown>,
    cb: (res: unknown) => void,
  ) => {
    options = opts;
    const req = new EventEmitter() as EventEmitter & {
      end: () => void;
      destroy: (error?: Error) => void;
    };
    req.destroy = (error) => {
      if (error) req.emit("error", error);
      req.emit("close");
    };
    req.end = () => {
      const res = new EventEmitter() as EventEmitter & {
        statusCode: number;
        headers: unknown;
        destroy: () => void;
      };
      res.statusCode = status;
      res.headers = headers;
      res.destroy = () => {};
      cb(res);
      if (!neverEnd)
        queueMicrotask(() => {
          res.emit("data", Buffer.from(body));
          res.emit("end");
          req.emit("close");
        });
    };
    return req;
  }) as never);
  return () => options;
}
it("pins validated DNS and forwards no cookies or credentials", async () => {
  const opts = network(200, { "content-type": "text/html" });
  const result = await fetchPublic("https://example.com");
  expect(result.body.toString()).toBe("safe page");
  const headers = opts().headers as Record<string, string>;
  expect(headers).not.toHaveProperty("Cookie");
  expect(headers).not.toHaveProperty("Authorization");
  const lookup = opts().lookup as (
    _host: string,
    _opts: object,
    callback: (e: unknown, address: string, family: number) => void,
  ) => void;
  const callback = vi.fn();
  lookup("example.com", {}, callback);
  expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
  callback.mockClear();
  lookup("example.com", { all: true }, callback);
  expect(callback).toHaveBeenCalledWith(null, [
    { address: "93.184.216.34", family: 4 },
  ]);
});
it("validates each redirect before fetching its destination", async () => {
  network(302, { location: "http://169.254.169.254/latest/meta-data" });
  await expect(fetchPublic("https://example.com")).rejects.toThrow(
    /Private, loopback/,
  );
  expect(https.request).toHaveBeenCalledTimes(1);
});
it("caps redirects to allowed hosts", async () => {
  network(302, { location: "https://example.com/again" });
  await expect(fetchPublic("https://example.com")).rejects.toThrow(
    "Too many redirects",
  );
  expect(https.request).toHaveBeenCalledTimes(6);
});
it("limits announced and streaming response sizes", async () => {
  vi.stubEnv("PROXY_MAX_BYTES", "4");
  network(200, { "content-length": "100" });
  await expect(fetchPublic("https://example.com")).rejects.toThrow(
    "size limit",
  );
  vi.restoreAllMocks();
  network(200, { "content-type": "text/html" }, "too many bytes");
  await expect(fetchPublic("https://example.com")).rejects.toThrow(
    "size limit",
  );
});
it("times out stalled requests", async () => {
  vi.stubEnv("PROXY_TIMEOUT_MS", "20");
  network(200, { "content-type": "text/html" }, "", true);
  await expect(fetchPublic("https://example.com")).rejects.toThrow("timed out");
});
it("does not bypass HTTP errors or invalid compressed responses", async () => {
  network(403, {});
  await expect(fetchPublic("https://example.com")).rejects.toThrow("HTTP 403");
  vi.restoreAllMocks();
  network(200, { "content-encoding": "gzip" });
  await expect(fetchPublic("https://example.com")).rejects.toThrow(
    "compressed response",
  );
});
it.each([
  ["gzip", gzipSync],
  ["deflate", deflateSync],
  ["br", brotliCompressSync],
] as const)(
  "decodes %s while limiting decompressed size",
  async (encoding, compress) => {
    network(
      200,
      { "content-encoding": encoding },
      compress(Buffer.from("public page")),
    );
    expect((await fetchPublic("https://example.com")).body.toString()).toBe(
      "public page",
    );
    vi.restoreAllMocks();
    vi.stubEnv("PROXY_MAX_BYTES", "100");
    network(
      200,
      { "content-encoding": encoding },
      compress(Buffer.from("a".repeat(2000))),
    );
    await expect(fetchPublic("https://example.com")).rejects.toThrow(
      "size limit",
    );
  },
);

it("pinned lookup works with a real Node HTTP socket and automatic family selection", async () => {
  // Only the low-level lookup adapter is exercised against a local fixture.
  // Production fetchPublic still rejects loopback before creating its adapter.
  const server = http.createServer((_req, res) => res.end("real socket works"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const response = await new Promise<string>((resolve, reject) => {
      const req = http.get(
        {
          hostname: "fixture.invalid",
          port,
          agent: false,
          lookup: createPinnedLookup({ address: "127.0.0.1", family: 4 }),
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve(body));
          res.on("error", reject);
        },
      );
      req.on("error", reject);
    });
    expect(response).toBe("real socket works");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
