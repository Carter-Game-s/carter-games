import { test, expect } from "@playwright/test";
let browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => expect(browserErrors).toEqual([]));

test("global commands, Quick Hide configuration and homepage persistence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Where to next?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open command palette" }).click();
  const command = page.getByRole("combobox", {
    name: "Search commands and games",
  });
  await command.fill("Gaming statistics");
  await command.press("Enter");
  await expect(page).toHaveURL(/games\/statistics/);
  await page.goto("/settings");
  await page.getByLabel("Enable Quick Hide").check();
  await page.getByLabel("Quick Hide destination").fill("wikipedia.org");
  await page.getByRole("button", { name: "Save destination" }).click();
  await expect(
    page.getByRole("button", { name: "Quick Hide", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Quick Hide destination")).toHaveValue(
    "https://wikipedia.org/",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Customize homepage" }).click();
  await page.getByLabel("Use personalized homepage").check();
  await page.getByRole("button", { name: "Move Search down" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Favorite games", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Personal statistics", exact: true }),
  ).toBeVisible();
});
test("themes preview, custom theme creation and reload persistence", async ({
  page,
}) => {
  await page.goto("/settings/appearance");
  await expect(page.getByRole("button", { name: /^Apply / })).toHaveCount(18);
  await page.getByRole("button", { name: "Preview Nord", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "nord");
  await page.getByRole("button", { name: "Cancel preview" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Apply Dracula", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dracula");
  await page.getByRole("button", { name: "Create custom theme" }).click();
  await page.getByLabel("Custom theme name").fill("My local palette");
  await page.getByRole("button", { name: "Save and apply theme" }).click();
  await expect(
    page.getByText("My local palette", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^custom-/);
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});
test("roulette uses the registry and gameplay unlocks real statistics", async ({
  page,
}) => {
  await page.goto("/games/roulette");
  await page.getByLabel("Roulette category").selectOption("puzzle");
  await page.getByRole("button", { name: "Spin the wheel" }).click();
  await expect(page.getByRole("link", { name: "Play Now" })).toBeVisible();
  await page.goto("/games/snake");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 60000));
  const game = page.getByRole("region", { name: "Snake", exact: true });
  await game.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(32);
  await expect(game.getByRole("status")).toContainText("playing");
  await page.clock.resume();
  await page.goto("/games/statistics");
  await expect(
    page.getByText("Total game launches", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Snake", exact: true }).first(),
  ).toBeVisible();
  await page.goto("/games/achievements");
  await expect(
    page.getByRole("heading", { name: "First Game Played" }),
  ).toBeVisible();
  await expect(page.getByText(/Unlocked /).first()).toBeVisible();
});
test("tab groups survive reload and deleting a group keeps tabs", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByLabel("Restore previous browser session", { exact: true })
    .check();
  await page.goto("/browser");
  await page.getByText("Tab groups & order", { exact: true }).click();
  await page.getByLabel("New tab group name").fill("Study");
  await page.getByRole("button", { name: "Create group", exact: true }).click();
  await page.getByLabel("Group for tab 1").selectOption({ label: "Study" });
  await page
    .getByRole("button", { name: "New tab", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Group for tab 2")).toBeVisible();
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByText("Tab groups & order", { exact: true }).click();
  await expect(page.getByLabel("Group for tab 2")).toBeVisible();
  await page.getByRole("button", { name: "Delete group Study" }).click();
  await expect(page.getByLabel("Group for tab 2")).toBeVisible();
});
test("settings and game saves imports preview before restoring", async ({
  page,
}) => {
  await page.goto("/settings");
  const settings = {
    format: "carter-settings",
    version: 1,
    preferences: { favorites: ["snake"] },
  };
  await page.getByLabel("Import settings backup").setInputFiles({
    name: "settings.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(settings)),
  });
  await expect(
    page.getByRole("heading", { name: "Preview changes" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("orbit:favorites")),
  ).toBeNull();
  await page.getByRole("button", { name: "Apply imported settings" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("orbit:favorites") || "[]"),
    ),
  ).toEqual(["snake"]);
  await page.goto("/settings/saves");
  const backup = {
    format: "carter-saves",
    version: 1,
    created: 1,
    saves: { snake: { highScore: 42 } },
  };
  await page.getByLabel("Import game saves").setInputFiles({
    name: "saves.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Preview save contents" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore selected saves" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("orbit:game:snake:highScore") || "0"),
    ),
  ).toBe(42);
});
test("chat edit, regenerate, local history and temporary messages", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: { available: true, local: true, token: "public-token" },
      });
    requests++;
    return route.fulfill({
      contentType: "text/plain",
      body:
        "**Generated response " +
        requests +
        "**\n\n```js\nconst score = 42;\n```",
    });
  });
  await page.goto("/chat");
  await page
    .getByLabel("Message Carter AI", { exact: true })
    .fill("First question");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Generated response 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy code block" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Regenerate response" }).click();
  await expect(
    page.getByText("Generated response 2", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit message 1", exact: true })
    .click();
  await page.getByLabel("Edit chat message").fill("Edited question");
  await page.getByRole("button", { name: "Resend edited message" }).click();
  await expect(
    page.getByText("Generated response 3", { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await page.reload();
  await page
    .getByRole("button", { name: "First question", exact: true })
    .click();
  await expect(
    page.getByText("Edited question", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Temporary chat", { exact: true }).check();
  await page
    .getByLabel("Message Carter AI", { exact: true })
    .fill("Temporary secret");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Generated response 4", { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => localStorage.getItem("orbit:conversations")),
  ).not.toContain("Temporary secret");
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test("Quick Hide navigation uses a safe destination and ignores edited text", async ({
  page,
}) => {
  await page.route("https://www.wikipedia.org/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Quick Hide destination</h1>",
    }),
  );
  await page.goto("/settings");
  await page.getByLabel("Enable Quick Hide").check();
  await page.getByLabel("Quick Hide shortcut").selectOption("ctrl-shift-h");
  await page.getByLabel("Quick Hide destination").focus();
  await page.keyboard.press("Control+Shift+H");
  await expect(page).toHaveURL(/settings/);
  await page.getByRole("heading", { name: "Your preferences." }).click();
  await page.keyboard.press("Control+Shift+H");
  await expect(page).toHaveURL("https://www.wikipedia.org/");
  await expect(
    page.getByRole("heading", { name: "Quick Hide destination" }),
  ).toBeVisible();
});

test("legacy Light appearance survives migration and preference edits", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("orbit:settings"))
      localStorage.setItem(
        "orbit:settings",
        JSON.stringify({
          engine: "duckduckgo",
          theme: "light",
          showQuick: false,
          showRecent: false,
          reducedMotion: true,
        }),
      );
  });
  await page.goto("/settings/appearance");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const card = page.locator(".theme-card").filter({
    has: page.getByRole("button", {
      name: "Apply Default Light",
      exact: true,
    }),
  });
  await expect(card).toContainText("Selected");
  await page.getByLabel("Font preference").selectOption("Georgia");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByLabel("Font preference")).toHaveValue("Georgia");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("orbit:settings") || "{}").engine,
    ),
  ).toBe("duckduckgo");
});
