import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GlobalChat } from "@/components/player/chat";

afterEach(() => vi.unstubAllGlobals());

it("retries an unacknowledged send with its original ID and keeps newer typing", async () => {
  const ids: string[] = [];
  let acknowledge!: () => void;
  vi.stubGlobal(
    "EventSource",
    class {
      addEventListener() {}
      close() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.op !== "send") return Response.json({ name: "Test" });
      ids.push(body.nonce);
      if (ids.length === 1) throw new Error("Connection interrupted");
      await new Promise<void>((resolve) => {
        acknowledge = resolve;
      });
      return Response.json({ ok: true });
    }),
  );
  render(<GlobalChat />);
  fireEvent.click(screen.getByRole("button", { name: "Global Chat" }));
  const field = screen.getByLabelText("Global chat message");
  const send = screen.getByRole("button", { name: "Send" });
  fireEvent.change(field, { target: { value: "first" } });
  fireEvent.click(send);
  await screen.findByText("Connection interrupted");
  expect(field).toHaveValue("first");
  fireEvent.click(send);
  await waitFor(() => expect(ids).toHaveLength(2));
  expect(ids[1]).toBe(ids[0]);
  fireEvent.change(field, { target: { value: "next draft" } });
  acknowledge();
  await waitFor(() => expect(send).toBeEnabled());
  expect(field).toHaveValue("next draft");
});
