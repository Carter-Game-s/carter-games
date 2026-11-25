import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MediaLibrary } from "@/components/media/library";

it("shows four provider links, filters episodes by title and excludes them from movies", () => {
  render(<MediaLibrary entries={[]} />);
  expect(
    screen.getByText(/Embedded playback is unavailable here/),
  ).toBeVisible();
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(4);
  for (const link of links)
    expect(link.getAttribute("href")).toMatch(
      /^https:\/\/southpark\.cc\.com\/episodes\//,
    );
  fireEvent.change(screen.getByLabelText("Search movies and TV"), {
    target: { value: "rehash" },
  });
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link")).toHaveTextContent("Season 18 · Episode 9");
  fireEvent.change(screen.getByLabelText("Collection"), {
    target: { value: "movie" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("No titles match");
});
