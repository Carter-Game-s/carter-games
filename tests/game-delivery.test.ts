// @vitest-environment node
import { expect, it, vi } from "vitest";
import { GET } from "@/app/api/offline-games/[slug]/route";
import { loadGame } from "@/lib/offline-games/assets";

vi.mock("@/lib/offline-games/assets", () => ({
  packGames: { sample: { blob: "test-revision" } },
  loadGame: vi.fn(async () => Buffer.from("<title>Crème brûlée</title>")),
}));

it("serves the same verified bytes to concurrent clients and honors weak revalidation", async () => {
  const url = "https://games.test/api/offline-games/sample";
  const params = Promise.resolve({ slug: "sample" });
  const fetchGame = (headers?: HeadersInit) =>
    GET(new Request(url, { headers }), { params });
  const [first, second] = await Promise.all([fetchGame(), fetchGame()]);
  const html = await first.text();
  expect(html.endsWith("<title>Crème brûlée</title>")).toBe(true);
  expect(await second.text()).toBe(html);
  expect(await (await fetchGame()).text()).toBe(html);
  const revalidated = await fetchGame({
    "If-None-Match": "W/" + first.headers.get("ETag"),
  });
  expect(revalidated.status).toBe(304);
  expect(await revalidated.text()).toBe("");
  expect(loadGame).toHaveBeenCalledTimes(1);
});
