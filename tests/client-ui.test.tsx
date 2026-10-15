import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CommandPalette } from "@/components/features/command-palette";
import { HomeCustomizer } from "@/components/features/home-customizer";
import { Markdown } from "@/components/features/markdown";
import { Chat } from "@/components/chat/chat";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  push.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) =>
      options?.method === "POST"
        ? new Response("Generated **reply**", {
            headers: { "Content-Type": "text/plain" },
          })
        : Response.json({ available: true, token: "public-test-token" }),
    ),
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.open = false;
    },
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("navigates command results with keyboard selection", () => {
  render(<CommandPalette onClose={() => {}} />);
  const input = screen.getByLabelText("Search commands and games");
  fireEvent.change(input, { target: { value: "Gaming statistics" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(push).toHaveBeenCalledWith("/games/statistics");
});
it("persists accessible homepage ordering and visibility", async () => {
  render(
    <HomeCustomizer search={<p>Search widget</p>}>
      <p>Default homepage</p>
    </HomeCustomizer>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Customize homepage" }));
  fireEvent.click(screen.getByLabelText("Use personalized homepage"));
  fireEvent.click(screen.getByRole("button", { name: "Move Search down" }));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("orbit:home")!).order[1]).toBe(
      "search",
    ),
  );
  expect(screen.queryByText("Default homepage")).toBeNull();
  expect(screen.getByText("Search widget")).toBeTruthy();
});
it("renders Markdown without executable HTML or unsafe links", () => {
  const { container } = render(
    <Markdown
      content={
        "# Title\n\n<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n```js\nconst x = 2;\n```"
      }
    />,
  );
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("a")).toBeNull();
  expect(screen.getByRole("button", { name: "Copy code block" })).toBeTruthy();
  expect(container.querySelector(".syntax-keyword")).toBeTruthy();
});
it("persists real responses, regenerates and keeps temporary chats out of history", async () => {
  render(<Chat />);
  await screen.findByText("AI connected");
  const input = screen.getByLabelText("Message Carter AI");
  fireEvent.change(input, { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("reply");
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("orbit:conversations") || '{"items":[]}')
        .items,
    ).toHaveLength(1),
  );
  fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
  await waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter((c) => (c[1] as RequestInit)?.method === "POST"),
    ).toHaveLength(2),
  );
  fireEvent.click(screen.getByLabelText("Temporary chat"));
  fireEvent.change(input, { target: { value: "Private temporary message" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Private temporary message");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy(),
  );
  expect(localStorage.getItem("orbit:conversations")).not.toContain(
    "Private temporary message",
  );
});
it("stops the active chat request through its AbortSignal", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method !== "POST") return Response.json({ available: true });
      signal = options.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal!.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }),
  );
  render(<Chat />);
  await screen.findByText("AI connected");
  fireEvent.change(screen.getByLabelText("Message Carter AI"), {
    target: { value: "Please explain" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(signal).toBeDefined());
  fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
  expect(signal!.aborted).toBe(true);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy(),
  );
});
