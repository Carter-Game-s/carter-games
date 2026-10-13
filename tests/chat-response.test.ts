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
}));
import { POST } from "@/app/api/chat/route";

beforeEach(() => {
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
});
