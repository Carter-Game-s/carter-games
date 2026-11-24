import { afterEach, expect, it, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import ModerationPage from "@/app/settings/moderation/page";

afterEach(() => vi.unstubAllGlobals());

it("prevents a warning or permanent restriction carrying over to another player", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        asOf: Date.now(),
        online: 0,
        restricted: [],
        messages: [],
        reports: [],
        notes: [],
        audit: [],
        room: { locked: false, slow: 0, pinned: null },
        site: {},
        players: ["First", "Second"].map((name) => ({
          id: name,
          name,
          mute: 0,
          ban: 0,
        })),
      }),
    ),
  );
  render(<ModerationPage />);
  fireEvent.change(screen.getByLabelText("Moderator key"), {
    target: { value: "fixture" },
  });
  fireEvent.click(screen.getByText("Sign in"));
  fireEvent.click(await screen.findByRole("button", { name: "Players" }));
  fireEvent.click(screen.getByRole("button", { name: /First Active/ }));
  fireEvent.change(screen.getByLabelText("Warning or note"), {
    target: { value: "First player's note" },
  });
  fireEvent.change(screen.getByLabelText("Restriction length"), {
    target: { value: "permanent" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Second Active/ }));
  expect(screen.getByLabelText("Warning or note")).toHaveValue("");
  expect(screen.getByLabelText("Restriction length")).toHaveValue("60");
  expect(screen.getByText("Send private warning")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(screen.getByLabelText("Moderator key")).toHaveValue("");
});
