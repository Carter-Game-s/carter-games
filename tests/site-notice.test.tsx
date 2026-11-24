import { afterEach, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SiteNotice } from "@/components/player/site-notice";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("skips background requests and keeps live notices newer than an outstanding poll", async () => {
  let reply!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        reply = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  render(<SiteNotice />);
  expect(fetcher).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  const notice = { text: "Live update", tone: "info" };
  act(() => {
    window.dispatchEvent(
      new CustomEvent("player-site-status", { detail: { notice, pauses: {} } }),
    );
  });
  await act(async () => {
    reply(Response.json({ notice: null, pauses: {} }));
  });
  expect(screen.getByText("Live update")).toBeVisible();
});
