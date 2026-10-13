import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  gateway: vi.fn(() => ({})),
  streamText: vi.fn(() => ({
    text: Promise.resolve("Hello from Carter AI"),
    textStream: (async function* () {
      yield "Hello ";
      yield "from Carter AI";
    })(),
  })),
}));
vi.mock("@/lib/proxy/security", () => ({
  sameOrigin: (request: Request) =>
    request.headers.get("origin") === "https://games.example",
  allowRequest: () => true,
  createToken: () => "test-token",
  verifyToken: (token: string) => token === "test-token",
}));
import { POST } from "@/app/api/chat/route";
import { chatAccess } from "@/lib/chat/access";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-only");
});
describe("chat response compatibility", () => {
  const request = (stream: boolean, origin = "https://games.example") =>
    new Request("https://games.example/api/chat", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        stream,
      }),
    });
  it("returns a complete JSON response for Safari compatibility mode", async () => {
    const response = await POST(request(false));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Hello from Carter AI" });
  });
  it("keeps desktop text streaming", async () => {
    const response = await POST(request(true));
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("Hello from Carter AI");
  });
  it("requires the same origin for buffered replies too", async () => {
    expect((await POST(request(false, "https://other.example"))).status).toBe(
      403,
    );
  });
  it("allows missing Safari fetch metadata only with a signed token and exact Codespaces forwarding", () => {
    vi.stubEnv("CODESPACE_NAME", "carter-test");
    vi.stubEnv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev");
    const headers = {
      origin: "https://localhost:3000",
      host: "localhost:3000",
      "x-forwarded-host": "carter-test-3000.app.github.dev",
      "x-forwarded-proto": "https",
      "x-carter-chat-token": "test-token",
    };
    const make = (changes: Record<string, string> = {}) =>
      new Request("http://localhost:3000/api/chat", {
        headers: { ...headers, ...changes },
      });
    expect(chatAccess(make())).toBe(true);
    expect(chatAccess(make({ "x-carter-chat-token": "invalid" }))).toBe(false);
    expect(chatAccess(make({ origin: "https://other.example" }))).toBe(false);
    expect(chatAccess(make({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(chatAccess(make({ "x-forwarded-host": "other.example" }))).toBe(
      false,
    );
  });
});
