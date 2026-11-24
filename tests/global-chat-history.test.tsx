import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { GlobalChat } from "@/components/player/chat";

afterEach(() => vi.unstubAllGlobals());

it("keeps the newest message and the selected report target when paging to the limit", async () => {
  const stream = Object.assign(new EventTarget(), { close: vi.fn() });
  vi.stubGlobal(
    "EventSource",
    vi.fn(function () {
      return stream;
    }),
  );
  const messages = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => ({
      id: start + i,
      name: "Player",
      text: "Message " + (start + i),
      created: 1700000000000,
      announcement: 0,
    }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const before = Number(
        new URL(url, "https://example.test").searchParams.get("before"),
      );
      return Response.json(
        before
          ? { messages: messages(before - 35, before - 1) }
          : { name: "Test" },
      );
    }),
  );
  render(<GlobalChat />);
  fireEvent.click(screen.getByRole("button", { name: "Global Chat" }));
  await screen.findByText("Chatting as Test");
  act(() =>
    stream.dispatchEvent(
      new MessageEvent("snapshot", {
        data: JSON.stringify({
          messages: messages(91, 125),
          name: "Test",
          online: 1,
          warning: null,
          room: { pinned: null, locked: false, slow: 0 },
        }),
      }),
    ),
  );
  act(() => {
    for (const message of messages(126, 300))
      stream.dispatchEvent(
        new MessageEvent("message", { data: JSON.stringify(message) }),
      );
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Load older messages"));
  });
  expect(screen.queryByText("Load older messages")).toBeNull();
  expect(screen.getByText("Message 300")).toBeVisible();
  const oldest = screen.getByText("Message 81").closest("article")!;
  fireEvent.click(within(oldest).getByRole("button", { name: /Report/ }));
  expect(screen.getByLabelText("Message to report")).toHaveValue("81");
}, 20000);
