// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import {
  publicURL,
  publicAddress,
  authenticated,
  BrowserService,
} from "../infra/browser/server";
import { browserRequest } from "../src/lib/browser/service";
import { POST, GET } from "../src/app/api/browser/route";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it("allows public sites, ports and metadata-named domains without accepting private DNS or protocols", async () => {
  const resolve = vi
    .fn()
    .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  expect(
    (await publicURL("https://metadata.example:8443/", resolve as never))
      .hostname,
  ).toBe("metadata.example");
  expect(
    (await publicURL("wss://example.com/socket", resolve as never)).protocol,
  ).toBe("wss:");
  resolve.mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "169.254.169.254", family: 4 },
  ]);
  await expect(
    publicURL("https://example.com", resolve as never),
  ).rejects.toThrow("Private");
  for (const url of [
    "http://127.0.0.1",
    "http://2130706433",
    "http://10.0.0.1",
    "http://[::1]",
    "http://localhost",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://user:password@example.com",
  ])
    await expect(publicURL(url, resolve as never)).rejects.toThrow();
  expect(publicAddress("::ffff:127.0.0.1")).toBe(false);
});
it("authenticates the private browser service without accepting missing or wrong credentials", () => {
  const secret = "a".repeat(64);
  expect(authenticated("Bearer " + secret, secret)).toBe(true);
  expect(authenticated("Bearer " + "b".repeat(64), secret)).toBe(false);
  expect(authenticated(undefined, secret)).toBe(false);
});
it("contacts only the configured service and never follows credential-bearing redirects", async () => {
  vi.stubEnv("BROWSER_SERVICE_URL", "http://127.0.0.1:18081");
  vi.stubEnv("BROWSER_SERVICE_TOKEN", "a".repeat(64));
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}"));
  await browserRequest({ op: "health" });
  expect(request).toHaveBeenCalledWith(
    new URL("http://127.0.0.1:18081/action"),
    expect.objectContaining({
      redirect: "error",
      headers: expect.objectContaining({
        Authorization: "Bearer " + "a".repeat(64),
      }),
    }),
  );
  request.mockClear();
  vi.stubEnv("BROWSER_SERVICE_URL", "http://attacker.example");
  await expect(browserRequest({ op: "health" })).rejects.toThrow(
    "configuration",
  );
  expect(request).not.toHaveBeenCalled();
});
it("rejects cross-origin actions and screenshot requests without a capability", async () => {
  vi.stubEnv("CODESPACE_NAME", "");
  const request = vi.spyOn(globalThis, "fetch");
  expect(
    (
      await POST(
        new Request("https://app.test/api/browser", {
          method: "POST",
          headers: { Origin: "https://evil.test" },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await GET(
        new Request("https://app.test/api/browser?id=" + "a".repeat(48)),
      )
    ).status,
  ).toBe(403);
  expect(request).not.toHaveBeenCalled();
});
it("rejects unknown sessions before allocating a browser or accepting input", async () => {
  const service = new BrowserService();
  const launch = vi.spyOn(service, "browserInstance");
  expect(
    (await service.action({ op: "text", id: "../secret", text: "ignored" }))
      .status,
  ).toBe(400);
  expect(
    (await service.action({ op: "text", id: "a".repeat(48), text: "ignored" }))
      .status,
  ).toBe(404);
  expect(launch).not.toHaveBeenCalled();
});
