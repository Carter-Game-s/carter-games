import { test, expect, type Locator } from "@playwright/test";
let browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match/i.test(message.text())
    )
      browserErrors.push(message.text());
  });
});
test.afterEach(() => expect(browserErrors).toEqual([]));
async function activate(locator: Locator) {
  if (test.info().project.name === "mobile") await locator.tap();
  else await locator.click();
}

test("homepage, search and direct URL navigation", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Where to next?" }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/orbit-home-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Search the web or enter a URL").fill("hello world");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/browser\?url=/);
  await expect(page.getByLabel("Browser address")).toHaveValue(/bing.com/);
  await page.getByLabel("Browser address").fill("https://example.com");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.getByLabel("Browser address")).toHaveValue(
    "https://example.com/",
  );
  await expect(page.getByLabel("Open directly")).toHaveAttribute(
    "href",
    "https://example.com/",
  );
  await page.getByLabel("New tab", { exact: true }).click();
  await expect(page.getByText("A fresh start.")).toBeVisible();
  await page.getByRole("button", { name: "example.com", exact: true }).click();
  await expect(page.getByLabel("Browser address")).toHaveValue(
    "https://example.com/",
  );
});
test("proxy rejects private destinations", async ({ page }) => {
  await page.goto("/browser?url=" + encodeURIComponent("http://127.0.0.1"));
  await expect(
    page
      .frameLocator('iframe[title="Proxied webpage"]')
      .getByText(/Private, loopback/),
  ).toBeVisible();
});
test("all seven games load and respond on desktop and mobile", async ({
  page,
}) => {
  for (const [slug, title] of [
    ["snake", "Snake"],
    ["2048", "2048"],
    ["pong", "Pong"],
    ["breakout", "Breakout"],
    ["minesweeper", "Minesweeper"],
    ["tic-tac-toe", "Tic-Tac-Toe"],
    ["flappy", "Sky Hop"],
  ]) {
    await page.goto("/games/" + slug);
    const region = page.getByRole("region", { name: title, exact: true });
    await expect(region).toBeVisible();
    if (["snake", "pong", "breakout", "flappy"].includes(slug)) {
      await activate(
        region.getByRole("button", { name: "Start", exact: true }),
      );
      await expect(region.getByRole("status")).toContainText("playing");
      await activate(
        region.getByRole("button", {
          name:
            slug === "flappy"
              ? "Flap"
              : slug === "pong"
                ? "Move up"
                : slug === "breakout"
                  ? "Move left"
                  : "Move down",
          exact: true,
        }),
      );
      await region.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(region.getByRole("status")).toContainText("paused");
    } else if (slug === "2048") {
      await activate(region.getByLabel("Move left", { exact: true }));
      await expect(region.getByRole("status")).toContainText("playing");
    } else {
      await activate(region.getByRole("button", { name: /Row 1 column 1:/ }));
      if (slug === "tic-tac-toe")
        await expect(region.getByRole("status")).toContainText(/[XO] to play/);
      else await expect(region.getByRole("status")).toContainText("playing");
    }
    await expect(page.locator("body")).toHaveJSProperty(
      "scrollWidth",
      await page.locator("body").evaluate((e) => e.clientWidth),
    );
  }
});
test("external game stays sandboxed and is playable", async ({ page }) => {
  await page.goto("/games/color-tap");
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  const game = page.frameLocator('iframe[title="Color Tap"]');
  await activate(game.getByRole("button", { name: "Start 20-second round" }));
  await activate(game.locator(".target"));
  await expect(game.getByRole("status")).toContainText("Score 1");
});
test("favorites, themes and missing game", async ({ page }) => {
  await page.goto("/games");
  await page.getByRole("button", { name: "Add Snake to favorites" }).click();
  await page.getByLabel("Game collection").selectOption("favorites");
  await expect(
    page.getByRole("heading", { name: "Snake", exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByLabel("Appearance").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/games/not-real");
  await expect(
    page.getByRole("heading", { name: "Game not found." }),
  ).toBeVisible();
});

test("live public-site proxy (requires unrestricted outbound network)", async ({
  page,
}) => {
  test.skip(
    process.env.LIVE_PROXY_TEST !== "1",
    "Enable LIVE_PROXY_TEST=1 on a machine with public outbound access.",
  );
  await page.goto("/browser?url=" + encodeURIComponent("https://example.com"));
  await expect(
    page
      .frameLocator('iframe[title="Proxied webpage"]')
      .getByRole("heading", { name: "Example Domain" }),
  ).toBeVisible({ timeout: 20000 });
});
