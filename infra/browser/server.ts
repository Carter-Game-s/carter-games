import { createServer } from "node:http";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ipaddr from "ipaddr.js";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Dialog,
} from "playwright";

export function publicAddress(address: string) {
  try {
    let parsed = ipaddr.parse(address);
    if (
      parsed.kind() === "ipv6" &&
      (parsed as ipaddr.IPv6).isIPv4MappedAddress()
    )
      parsed = (parsed as ipaddr.IPv6).toIPv4Address();
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export async function publicURL(raw: string, resolve = lookup) {
  const url = new URL(raw);
  if (
    !["http:", "https:", "ws:", "wss:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("A public web URL is required.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  )
    throw new Error("Private network destinations are unavailable.");
  const addresses = ipaddr.isValid(host)
    ? [{ address: host }]
    : await resolve(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("Private network destinations are unavailable.");
  return url;
}

type Tab = {
  page: Page;
  pages: Page[];
  image?: Buffer;
  sequence: number;
  dialog?: Dialog;
};
type Session = {
  context: BrowserContext;
  tabs: Map<string, Tab>;
  used: number;
  queue: Promise<unknown>;
};
export class BrowserService {
  readonly sessions = new Map<string, Session>();
  private browser?: Promise<Browser>;
  private creating = 0;
  async browserInstance() {
    if (!this.browser) {
      this.browser = chromium
        .launch({
          chromiumSandbox: true,
          env: {
            PATH: process.env.PATH || "/usr/bin:/bin",
            HOME: "/tmp",
            LANG: "C.UTF-8",
            PLAYWRIGHT_BROWSERS_PATH:
              process.env.PLAYWRIGHT_BROWSERS_PATH || "/ms-playwright",
          },
          args: [
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
          ],
        })
        .catch((error) => {
          this.browser = undefined;
          throw error;
        });
      void this.browser
        .then((browser) =>
          browser.once("disconnected", () => {
            this.browser = undefined;
            this.sessions.clear();
          }),
        )
        .catch(() => {});
    }
    return this.browser;
  }
  async create() {
    await this.expire();
    if (this.sessions.size + this.creating >= 2)
      throw new Error(
        "Browser capacity is full. Close an existing session or retry shortly.",
      );
    this.creating++;
    try {
      const browser = await this.browserInstance();
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        acceptDownloads: false,
        serviceWorkers: "block",
      });
      await context.route("**/*", async (route) => {
        try {
          if (!/^(?:data|blob):/.test(route.request().url()))
            await publicURL(route.request().url());
          await route.continue();
        } catch {
          await route.abort().catch(() => {});
        }
      });
      await context.routeWebSocket("**/*", async (socket) => {
        try {
          await publicURL(socket.url());
          socket.connectToServer();
        } catch {
          await socket.close({ code: 1008, reason: "Private destination" });
        }
      });
      const id = randomBytes(24).toString("hex");
      this.sessions.set(id, {
        context,
        tabs: new Map(),
        used: Date.now(),
        queue: Promise.resolve(),
      });
      return id;
    } finally {
      this.creating--;
    }
  }
  async expire() {
    for (const [id, session] of this.sessions)
      if (Date.now() - session.used > 5 * 60 * 1000) await this.close(id);
  }
  async close(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.delete(id);
      await session.context.close();
    }
  }
  async attach(tab: Tab, page: Page) {
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    page.on("dialog", (dialog) => {
      tab.dialog = dialog;
    });
    page.on("popup", async (popup) => {
      if (tab.pages.length >= 3) {
        await popup.close();
        return;
      }
      tab.pages.push(popup);
      await this.attach(tab, popup);
    });
    page.on("close", () => {
      tab.pages = tab.pages.filter((p) => p !== page);
      if (tab.page === page && tab.pages.length) tab.page = tab.pages.at(-1)!;
    });
    tab.page = page;
    const cdp = await page.context().newCDPSession(page);
    cdp.on("Page.screencastFrame", (event) => {
      if (tab.page === page) {
        tab.image = Buffer.from(event.data, "base64");
        tab.sequence++;
      }
      void cdp
        .send("Page.screencastFrameAck", { sessionId: event.sessionId })
        .catch(() => {});
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 70,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 2,
    });
  }
  async action(body: Record<string, unknown>): Promise<Response> {
    const op = body.op;
    if (op === "health") {
      await this.browserInstance();
      return Response.json({ ready: true, sessions: this.sessions.size });
    }
    if (op === "create") return Response.json({ id: await this.create() });
    if (typeof body.id !== "string" || !/^[a-f0-9]{48}$/.test(body.id))
      return Response.json(
        { error: "Invalid browser session." },
        { status: 400 },
      );
    const session = this.sessions.get(body.id);
    if (!session)
      return Response.json(
        { error: "Browser session expired. Retry to reconnect." },
        { status: 404 },
      );
    session.used = Date.now();
    if (op === "close") {
      await this.close(body.id);
      return Response.json({ ok: true });
    }
    const execute = async () => {
      const key = String(body.tab ?? "1");
      if (!/^\d{1,5}$/.test(key)) throw new Error("Invalid tab.");
      let tab = session.tabs.get(key);
      if (!tab) {
        if (session.tabs.size >= 5)
          throw new Error("Close a tab before opening another.");
        const page = await session.context.newPage();
        tab = { page, pages: [page], sequence: 0 };
        session.tabs.set(key, tab);
        await this.attach(tab, page);
      }
      const page = tab.page;
      if (op === "navigate") {
        if (typeof body.url !== "string" || body.url.length > 8000)
          throw new Error("Invalid URL.");
        const url = body.url ? await publicURL(body.url) : null;
        if (url && !["http:", "https:"].includes(url.protocol))
          throw new Error("Use an HTTP(S) URL.");
        const target = url?.href || "about:blank";
        const cdp = await page.context().newCDPSession(page);
        const history = await cdp.send("Page.getNavigationHistory");
        await cdp.detach();
        if (history.entries[history.currentIndex - 1]?.url === target)
          await page.goBack({ waitUntil: "commit" });
        else if (history.entries[history.currentIndex + 1]?.url === target)
          await page.goForward({ waitUntil: "commit" });
        else if (page.url() !== target)
          await page.goto(target, { waitUntil: "commit" });
      } else if (op === "reload") await page.reload({ waitUntil: "commit" });
      else if (op === "text") {
        if (typeof body.text !== "string" || body.text.length > 10000)
          throw new Error("Text is too long.");
        await page.keyboard.insertText(body.text);
      } else if (op === "key") {
        if (
          typeof body.key !== "string" ||
          !/^(?:(?:Control|Meta|Alt|Shift)\+)*(?:[A-Za-z0-9]|Enter|Tab|Backspace|Delete|Escape|Arrow(?:Left|Right|Up|Down)|Home|End|PageUp|PageDown|Space)$/.test(
            body.key,
          )
        )
          throw new Error("Unsupported key.");
        await page.keyboard.press(body.key);
      } else if (["down", "up", "move", "click"].includes(String(op))) {
        const x = Number(body.x),
          y = Number(body.y);
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          x < 0 ||
          x > 1280 ||
          y < 0 ||
          y > 720
        )
          throw new Error("Invalid pointer position.");
        await page.mouse.move(x, y);
        if (op === "down") await page.mouse.down();
        if (op === "up") await page.mouse.up();
        if (op === "click") await page.mouse.click(x, y);
      } else if (op === "scroll") {
        const x = Number(body.x),
          y = Number(body.y);
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          Math.abs(x) > 3000 ||
          Math.abs(y) > 3000
        )
          throw new Error("Invalid scroll.");
        await page.mouse.wheel(x, y);
      } else if (op === "dialog") {
        const dialog = tab.dialog;
        tab.dialog = undefined;
        if (dialog) {
          if (body.accept === true)
            await dialog.accept(
              typeof body.text === "string" ? body.text.slice(0, 10000) : "",
            );
          else await dialog.dismiss();
        }
      } else if (op === "closeTab") {
        session.tabs.delete(key);
        await Promise.all(tab.pages.map((p) => p.close()));
      } else if (op === "state") {
        return Response.json({
          url: page.url(),
          frames: await Promise.all(
            page
              .frames()
              .slice(0, 20)
              .map(async (frame) => ({
                name: frame.name(),
                url: frame.url(),
                text: await frame
                  .locator("body")
                  .innerText({ timeout: 2000 })
                  .then((text) => text.slice(0, 20000))
                  .catch(() => ""),
              })),
          ),
        });
      } else if (op !== "snapshot") throw new Error("Unknown browser action.");
      if (op !== "snapshot") return Response.json({ ok: true });
      if (!tab.image && !tab.dialog) {
        tab.image = await page.screenshot({ type: "jpeg", quality: 70 });
        tab.sequence++;
      }
      const headers = {
        "Cache-Control": "no-store",
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "X-Browser-URL": encodeURIComponent(page.url().slice(0, 8000)),
        "X-Browser-Sequence": String(tab.sequence),
        "X-Browser-Dialog": encodeURIComponent(
          JSON.stringify(
            tab.dialog
              ? {
                  type: tab.dialog.type(),
                  message: tab.dialog.message().slice(0, 2000),
                  value: tab.dialog.defaultValue().slice(0, 1000),
                }
              : null,
          ),
        ),
      };
      return new Response(
        body.sequence === tab.sequence || !tab.image
          ? null
          : new Uint8Array(tab.image),
        {
          status: body.sequence === tab.sequence || !tab.image ? 204 : 200,
          headers,
        },
      );
    };
    if (
      (op === "snapshot" || op === "dialog") &&
      session.tabs.get(String(body.tab ?? "1"))?.dialog
    )
      return execute();
    const result = session.queue.then(execute);
    session.queue = result.catch(() => {});
    return result;
  }
}

export function authenticated(header: string | undefined, token: string) {
  if (!header?.startsWith("Bearer ") || header.length > 200) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(token));
}

export function serveBrowser(
  service: BrowserService,
  token: string,
  port = 8081,
) {
  if (token.length < 32)
    throw new Error("Configure a private browser service credential.");
  const server = createServer(async (req, res) => {
    if (!authenticated(req.headers.authorization, token)) {
      res.writeHead(401);
      res.end();
      return;
    }
    if (req.method !== "POST" || req.url !== "/action") {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32768) throw new Error("Request is too large.");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("Invalid action.");
      const response = await service.action(body);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Browser action failed.",
        }),
      );
    }
  });
  const timer = setInterval(() => {
    void service.expire();
  }, 30000);
  timer.unref();
  server.on("close", () => clearInterval(timer));
  server.listen(port, "0.0.0.0");
  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  serveBrowser(
    new BrowserService(),
    process.env.BROWSER_TOKEN || "",
    Number(process.env.PORT || 8081),
  );
