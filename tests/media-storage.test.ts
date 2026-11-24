import { expect, it } from "vitest";
import { read } from "@/lib/storage";

it("recovers from malformed saved media without losing valid episode progress", () => {
  for (const key of ["media-favorites", "media-watchlist"]) {
    localStorage.setItem("orbit:" + key, "{}");
    expect(read(key, [])).toEqual([]);
  }
  localStorage.setItem("orbit:media-progress", "null");
  expect(read("media-progress", {})).toEqual({});
  localStorage.setItem(
    "orbit:media-progress",
    JSON.stringify({
      "caminandes/1/2": 93,
      "the-general": 230,
      missing: -1,
      broken: "NaN",
    }),
  );
  expect(read("media-progress", {})).toEqual({
    "caminandes/1/2": 93,
    "the-general": 230,
  });
});
