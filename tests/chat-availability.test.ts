import { afterEach, expect, it, vi } from "vitest";
import { chatAvailability } from "@/lib/chat/provider";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("only advertises the configured local model when discovered", async () => {
  vi.stubEnv("CHAT_BASE_URL", "http://127.0.0.1:11434/v1");
  vi.stubEnv("CHAT_MODEL", "qwen2.5:0.5b");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ data: [{ id: "other" }] })),
  );
  expect(await chatAvailability()).toEqual({ available: false, local: true });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(Response.json({ data: [{ id: "qwen2.5:0.5b" }] })),
  );
  expect(await chatAvailability()).toEqual({ available: true, local: true });
});
it("reports a failed local service as unavailable without leaking errors", async () => {
  vi.stubEnv("CHAT_BASE_URL", "http://127.0.0.1:11434/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("private provider error")),
  );
  expect(await chatAvailability()).toEqual({ available: false, local: true });
});
