// @vitest-environment node
import { expect, it, vi } from "vitest";
import { allowRequest } from "@/lib/proxy/security";

it("retains active limits at capacity and reuses only expired slots", () => {
  vi.useFakeTimers();
  for (let i = 0; i < 4000; i++)
    expect(allowRequest("window-" + i, 2)).toBe(true);
  expect(allowRequest("new", 2)).toBe(false);
  expect(allowRequest("window-0", 2)).toBe(true);
  expect(allowRequest("window-0", 2)).toBe(false);
  vi.advanceTimersByTime(60001);
  expect(allowRequest("window-0", 2)).toBe(true);
  expect(allowRequest("new", 2)).toBe(true);
  expect(allowRequest("window-0", 2)).toBe(true);
  expect(allowRequest("window-0", 2)).toBe(false);
});
