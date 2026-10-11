// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

it("resumes Eggy Car when its offline advertising lifecycle completes", async () => {
  const window = { Blob, addEventListener: vi.fn() } as unknown as {
    GD_OPTIONS: { onEvent?: (event: { name: string }) => void };
    gdsdk: { showBanner(): Promise<void> };
  };
  runInNewContext(readFileSync("public/offline-game-runtime.js", "utf8"), {
    window,
    document: { write: vi.fn() },
    location: { pathname: "/api/offline-games/pack-eggy-car", hash: "" },
    parent: { postMessage: vi.fn() },
    DOMException,
    setTimeout,
  });
  const onEvent = vi.fn();
  window.GD_OPTIONS = { onEvent };
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(onEvent).toHaveBeenCalledWith({ name: "SDK_READY" });
  await window.gdsdk.showBanner();
  expect(onEvent).toHaveBeenCalledWith({ name: "SDK_GAME_START" });
});

it("starts Drive Mad without ads or access to application cookies", async () => {
  const document = { write: vi.fn(), cookie: "" };
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      throw new Error("Opaque sandbox");
    },
  });
  const window = { Blob, addEventListener: vi.fn() } as unknown as Window;
  const navigator = {} as Navigator;
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    get() {
      throw new Error("Opaque sandbox");
    },
  });
  runInNewContext(readFileSync("public/offline-game-runtime.js", "utf8"), {
    window,
    navigator,
    document,
    location: { pathname: "/api/offline-games/pack-drive-mad", hash: "" },
    parent: { postMessage: vi.fn() },
    DOMException,
  });
  const game = window as unknown as {
    PokiSDK: {
      init(): Promise<void>;
      commercialBreak(): Promise<void>;
      rewardedBreak(): Promise<boolean>;
    };
  };
  game.PokiSDK = {} as typeof game.PokiSDK;
  await expect(game.PokiSDK.init()).resolves.toBeUndefined();
  await expect(game.PokiSDK.commercialBreak()).resolves.toBeUndefined();
  await expect(game.PokiSDK.rewardedBreak()).resolves.toBe(false);
  expect(document.cookie).toBe("");
  expect(navigator.serviceWorker).toBeUndefined();
  document.cookie = "session=anything";
  expect(document.cookie).toBe("");
});
