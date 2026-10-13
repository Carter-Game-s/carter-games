// @vitest-environment node
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import dns from "node:dns/promises";
import {
  isPublicAddress,
  validateURL,
  resolvePublic,
  createToken,
  verifyToken,
  allowRequest,
  sameOrigin,
} from "../src/lib/proxy/security";
import { rewriteHTML, rewriteCSS } from "../src/lib/proxy/rewrite";
import { searchTarget } from "../src/lib/search";
import { GET, POST } from "../src/app/api/proxy/route";
beforeEach(() => vi.stubEnv("CODESPACE_NAME", ""));
afterEach(() => vi.unstubAllEnvs());
it.each([
  "127.0.0.1",
  "0.0.0.0",
  "10.0.0.1",
  "172.16.0.1",
  "192.168.1.1",
  "169.254.169.254",
  "100.64.0.1",
  "::1",
  "::",
  "fc00::1",
  "fe80::1",
  "::ffff:127.0.0.1",
  "192.0.0.8",
  "224.0.0.1",
])("blocks non-public IP %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
it("rejects unsafe URLs even if explicitly allowlisted", () => {
  vi.stubEnv("PROXY_ALLOWED_HOSTS", "127.0.0.1,localhost,169.254.169.254");
  for (const url of [
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://localhost",
    "http://169.254.169.254",
    "file:///etc/passwd",
    "https://user:pass@example.com",
    "https://example.com:444",
    "http://[::1]",
  ])
    expect(() => validateURL(url)).toThrow();
});
it("rejects every DNS answer when any answer is private", async () => {
  vi.spyOn(dns, "lookup").mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ] as never);
  await expect(resolvePublic(new URL("https://example.com"))).rejects.toThrow(
    "unsafe network",
  );
});
it("restricts hosts and protects session issuance", async () => {
  vi.stubEnv("PROXY_ALLOWED_HOSTS", "example.com");
  expect(() => validateURL("https://arbitrary.example")).toThrow("not enabled");
  expect(
    sameOrigin(
      new Request("https://app.test/api/proxy", {
        method: "POST",
        headers: { Origin: "https://evil.test" },
      }),
    ),
  ).toBe(false);
  expect(
    (
      await POST(
        new Request("https://app.test/api/proxy", {
          method: "POST",
          headers: { Origin: "https://evil.test" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await GET(
        new Request("https://app.test/api/proxy?url=https://example.com"),
      )
    ).status,
  ).toBe(403);
});
it("allows public website hosts by default without allowing private destinations", () => {
  vi.stubEnv("PROXY_ALLOWED_HOSTS", "");
  expect(validateURL("https://www.nasa.gov/news/").hostname).toBe(
    "www.nasa.gov",
  );
  expect(validateURL("https://www.youtube.com/").hostname).toBe(
    "www.youtube.com",
  );
  for (const url of [
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://localhost",
    "http://[::1]",
  ])
    expect(() => validateURL(url)).toThrow();
});
it("signs expiring capabilities and rejects tampering", () => {
  const t = createToken();
  expect(verifyToken(t)).toBe(true);
  expect(verifyToken(t + "a")).toBe(false);
  expect(verifyToken(null)).toBe(false);
  vi.useFakeTimers();
  vi.advanceTimersByTime(16 * 60 * 1000);
  expect(verifyToken(t)).toBe(false);
  vi.useRealTimers();
});
it("applies bounded rate limits", () => {
  const key = "test-" + Math.random();
  expect(allowRequest(key, 2)).toBe(true);
  expect(allowRequest(key, 2)).toBe(true);
  expect(allowRequest(key, 2)).toBe(false);
});
it("rewrites safe assets, strips remote scripts, forms and navigation permissions", () => {
  const out = rewriteHTML(
    '<base href="http://localhost"><script>steal()</script><a href="/page" target="_top">Link</a><img src="/image.png" onerror="evil()"><iframe src="evil"></iframe><form action="https://evil.test"><input></form><style>x{background:url(/asset.png)}</style>',
    new URL("https://example.com"),
    "token",
    "nonce",
  );
  expect(out).not.toContain("steal()");
  expect(out).not.toContain("onerror");
  expect(out).not.toContain('target="');
  expect(out).not.toContain("<iframe");
  expect(out).toContain("disabled");
  expect(out).toContain("/api/proxy?url=");
  expect(out).toContain('nonce="nonce"');
  expect(
    rewriteCSS(
      'a{background:url("http://127.0.0.1/a")}',
      new URL("https://example.com"),
      "token",
    ),
  ).toContain("about:blank");
});
it("builds API-free searches and validates direct addresses", () => {
  for (const engine of ["google", "bing", "duckduckgo"] as const)
    expect(searchTarget("hello world", engine)).toMatchObject({
      search: true,
      url: expect.stringContaining("hello%20world"),
    });
  expect(searchTarget("example.com", "bing")).toEqual({
    search: false,
    url: "https://example.com/",
  });
  expect(() => searchTarget("javascript:alert(1)", "bing")).toThrow();
});

it("accepts the visible forwarded origin and rejects a different browser origin", () => {
  const good = new Request("http://localhost:3000/api/proxy", {
    method: "POST",
    headers: {
      "x-forwarded-host": "my-space-3000.app.github.dev",
      "x-forwarded-proto": "https",
      origin: "https://my-space-3000.app.github.dev",
      "sec-fetch-site": "same-origin",
    },
  });
  expect(sameOrigin(good)).toBe(true);
  const bad = new Request(good, {
    headers: {
      ...Object.fromEntries(good.headers),
      origin: "https://other.example",
    },
  });
  expect(sameOrigin(bad)).toBe(false);
});

it("uses the configured Codespace HTTPS origin despite internal HTTP headers", async () => {
  vi.stubEnv("CODESPACE_NAME", "my-space");
  vi.stubEnv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev");
  const headers = {
    host: "localhost:3000",
    "x-forwarded-host": "localhost:3000",
    "x-forwarded-proto": "http",
    origin: "https://my-space-3000.app.github.dev",
    "sec-fetch-site": "same-origin",
  };
  const request = (overrides: Record<string, string> = {}) =>
    new Request("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { ...headers, ...overrides },
    });
  expect((await POST(request())).status).toBe(200);
  expect(
    (await POST(request({ origin: "https://other.example" }))).status,
  ).toBe(403);
  expect(sameOrigin(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
  expect(
    sameOrigin(
      request({
        origin: "https://evil.example",
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      }),
    ),
  ).toBe(false);
});

it("accepts only GitHub's matching-origin rewrite with complete forwarding metadata", async () => {
  vi.stubEnv("CODESPACE_NAME", "my-space");
  vi.stubEnv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev");
  const headers = {
    host: "localhost:3000",
    origin: "http://localhost:3000",
    "x-forwarded-host": "my-space-3000.app.github.dev",
    "x-forwarded-proto": "https",
    "sec-fetch-site": "same-origin",
  };
  const request = (overrides: Record<string, string> = {}) =>
    new Request("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { ...headers, ...overrides },
    });
  expect((await POST(request())).status).toBe(200);

  expect(
    (await POST(request({ origin: "https://localhost:3000" }))).status,
  ).toBe(200);
  const invalidHeaders: Record<string, string>[] = [
    { origin: "https://evil.example" },
    { origin: "http://127.0.0.1:3000" },
    { origin: "http://localhost:3001" },
    { host: "evil.example" },
    { "x-forwarded-host": "other-space-3000.app.github.dev" },
    { "x-forwarded-proto": "http" },
    { "x-forwarded-host": "" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "" },
    { origin: "" },
  ];
  for (const overrides of invalidHeaders) {
    expect((await POST(request(overrides))).status).toBe(403);
  }
});
