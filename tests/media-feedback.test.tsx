import { fireEvent, render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { MediaDetail } from "@/components/media/detail";
import { initialCatalog } from "@/lib/media/catalog";

it("shows buffering only during playback and clears the actionable error on retry", () => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  const entry = initialCatalog[0];
  render(
    <MediaDetail entry={entry} requestedSeason={1} requestedEpisode={1} />,
  );
  const video = screen.getByLabelText(entry.title, { selector: "video" });
  fireEvent.waiting(video);
  expect(screen.queryByRole("status")).toBeNull();
  Object.defineProperty(video, "paused", { value: false });
  fireEvent.waiting(video);
  expect(screen.getByRole("status")).toHaveTextContent("Buffering");
  fireEvent.playing(video);
  expect(screen.queryByRole("status")).toBeNull();
  Object.defineProperty(video, "error", { value: { code: 2 } });
  fireEvent.error(video);
  expect(screen.getByRole("alert")).toHaveTextContent("connection");
  fireEvent.click(screen.getByText("Retry video"));
  expect(screen.queryByRole("alert")).toBeNull();
});
