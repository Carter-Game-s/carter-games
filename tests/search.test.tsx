import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Browser } from "@/components/browser/browser";
import { defaultSettings } from "@/lib/storage/settings";
import { searchQuery, searchTarget, searchURL } from "@/lib/search";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "test-capability" }),
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

it("uses the working provider by default and the non-JavaScript DuckDuckGo endpoint", () => {
  expect(defaultSettings.engine).toBe("bing");
  expect(searchTarget("cats", "duckduckgo").url).toBe(
    "https://html.duckduckgo.com/html/?q=cats",
  );
});

it("recovers search text only from supported search pages", () => {
  expect(
    searchQuery("https://duckduckgo.com/?q=example.com%20%26%20cats"),
  ).toBe("example.com & cats");
  expect(searchQuery("https://html.duckduckgo.com/html/?q=cats")).toBe("cats");
  for (const url of [
    "https://evil.example/?q=cats",
    "https://www.google.com/maps?q=cats",
    "https://user:password@www.google.com/search?q=cats",
    "https://www.bing.com/search",
    "invalid",
  ])
    expect(searchQuery(url)).toBeNull();
  expect(searchURL("example.com & cats", "bing")).toBe(
    "https://www.bing.com/search?q=example.com%20%26%20cats",
  );
});

it("lets an existing blocked search switch to Bing without losing its query", async () => {
  render(
    <Browser initialURL="https://duckduckgo.com/?q=example.com%20%26%20cats" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Search with Bing" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Browser address")).toHaveValue(
      "https://www.bing.com/search?q=example.com%20%26%20cats",
    ),
  );
  expect(screen.queryByRole("button", { name: "Search with Bing" })).toBeNull();
});

it("does not suggest a search provider for ordinary web pages", () => {
  render(<Browser initialURL="https://example.com/" />);
  expect(screen.queryByRole("button", { name: "Search with Bing" })).toBeNull();
});
