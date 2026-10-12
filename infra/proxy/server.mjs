import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import { NodeTCPSocket } from "./node_modules/@mercuryworkshop/wisp-js/src/server/net.mjs";
import { resolveDestination } from "./policy.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.CODESPACE_NAME) {
  try {
    const metadata = JSON.parse(await readFile("/workspaces/.codespaces/shared/environment-variables.json", "utf8"));
    if (typeof metadata.CODESPACE_NAME === "string" && /^[a-z0-9-]+$/.test(metadata.CODESPACE_NAME)) {
      process.env.CODESPACE_NAME = metadata.CODESPACE_NAME;
    }
  } catch {}
}
const port = Number(process.env.BROWSER_ENGINE_PORT || 3001);
const appOrigin = process.env.CODESPACE_NAME
  ? `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev"}`
  : process.env.BROWSER_APP_ORIGIN || "http://localhost:3000";
const ownOrigin = process.env.CODESPACE_NAME
  ? `https://${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev"}`
  : `http://localhost:${port}`;
const vendors = {
  "/vendor/core.js": [
    "@mercuryworkshop/scramjet/dist/scramjet.js",
    "text/javascript",
  ],
  "/vendor/core.wasm": [
    "@mercuryworkshop/scramjet/dist/scramjet.wasm",
    "application/wasm",
  ],
  "/vendor/controller.js": [
    "@mercuryworkshop/scramjet-controller/dist/controller.api.js",
    "text/javascript",
  ],
  "/vendor/inject.js": [
    "@mercuryworkshop/scramjet-controller/dist/controller.inject.js",
    "text/javascript",
  ],
  "/vendor/worker.js": [
    "@mercuryworkshop/scramjet-controller/dist/controller.sw.js",
    "text/javascript",
  ],
  "/vendor/utils.js": [
    "@mercuryworkshop/scramjet-utils/dist/scramjet-utils.js",
    "text/javascript",
  ],
  "/vendor/transport.js": [
    "@mercuryworkshop/epoxy-transport/dist/index.js",
    "text/javascript",
  ],
};
class PublicSocket extends NodeTCPSocket {
  async connect() {
    if (![80, 443].includes(this.port)) throw Error("Unsupported port");
    this.hostname = await resolveDestination(this.hostname);
    await super.connect();
    this.socket?.setTimeout(120000, () => this.socket?.destroy());
  }
}
logging.set_level(logging.ERROR);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  allow_private_ips: false,
  allow_loopback_ips: false,
  port_whitelist: [80, 443],
  stream_limit_total: 128,
  stream_limit_per_host: 48,
  dns_method: resolveDestination,
});
const sockets = new Set();
const clients = new Map();
const sourceFiles = [
  "server.mjs",
  "policy.mjs",
  "package.json",
  "bun.lock",
  "LICENSE",
  "README.md",
  "policy.test.mjs",
  "public/index.html",
  "public/embed.js",
  "public/sw.js",
  "public/style.css",
];
const server = createServer(async (request, response) => {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": `frame-ancestors ${appOrigin}; base-uri 'self'`,
    "Cache-Control": "no-store",
  };
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, headers);
      response.end();
      return;
    }
    const name = new URL(request.url, "http://localhost").pathname;
    let body;
    let type = "text/plain; charset=utf-8";
    if (name === "/health") {
      body = JSON.stringify({
        available: true,
        engine: "Scramjet",
        connections: sockets.size,
      });
      type = "application/json";
    } else if (name === "/config.js") {
      body = `window.CARTER_APP_ORIGIN=${JSON.stringify(appOrigin)};`;
      type = "text/javascript";
    } else if (name === "/source") {
      body = `<!doctype html><title>Carter browser engine source</title><h1>Browser engine source</h1><p>This independent browser engine is licensed under AGPL-3.0-only. Created by Carter using unmodified MercuryWorkshop Scramjet, its controller and utilities, Epoxy Transport, and Wisp.</p><ul>${sourceFiles.map((file) => `<li><a href="/source/${file}">${file}</a></li>`).join("")}</ul><p>Corresponding upstream source: <a href="https://github.com/MercuryWorkshop/scramjet">Scramjet 2.0.67-alpha.2, Controller 0.0.14, Utils 0.0.3</a> · <a href="https://github.com/MercuryWorkshop/epoxy-transport">Epoxy Transport 3.0.1</a> · <a href="https://github.com/MercuryWorkshop/wisp-client-js">Wisp 0.5.0</a>.</p>`;
      type = "text/html";
    } else if (
      name.startsWith("/source/") &&
      sourceFiles.includes(name.slice(8))
    ) {
      body = await readFile(path.join(root, name.slice(8)));
    } else if (vendors[name]) {
      const [file, mime] = vendors[name];
      body = await readFile(path.join(root, "node_modules", file));
      type = mime;
    } else if (["/", "/embed.js", "/sw.js", "/style.css"].includes(name)) {
      const file = name === "/" ? "index.html" : name.slice(1);
      body = await readFile(path.join(root, "public", file));
      type = file.endsWith("html")
        ? "text/html"
        : file.endsWith("css")
          ? "text/css"
          : "text/javascript";
      if (name === "/sw.js") headers["Service-Worker-Allowed"] = "/";
    } else {
      response.writeHead(404, headers);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { ...headers, "Content-Type": type });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(503, headers);
    response.end("Browser engine unavailable");
  }
});
server.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;
  const forwardedOwn =
    process.env.CODESPACE_NAME &&
    ["http://localhost:" + port, "https://localhost:" + port].includes(
      origin,
    ) &&
    request.headers["x-forwarded-host"] === new URL(ownOrigin).host &&
    request.headers["x-forwarded-proto"] === "https";
  const localOwn = !process.env.CODESPACE_NAME && origin === ownOrigin;
  const ip =
    request.headers["x-forwarded-for"]?.split(",")[0] || socket.remoteAddress;
  if (
    request.url !== "/wisp/" ||
    !(origin === ownOrigin || forwardedOwn || localOwn) ||
    sockets.size >= 32 ||
    (clients.get(ip) || 0) >= 4
  ) {
    socket.destroy();
    return;
  }
  sockets.add(socket);
  clients.set(ip, (clients.get(ip) || 0) + 1);
  socket.on("close", () => {
    sockets.delete(socket);
    const count = (clients.get(ip) || 1) - 1;
    if (count) clients.set(ip, count);
    else clients.delete(ip);
  });
  wisp.routeRequest(request, socket, head, { TCPSocket: PublicSocket });
});
server.headersTimeout = 10000;
server.requestTimeout = 10000;
server.listen(port, "0.0.0.0", () =>
  console.log(`Carter browser engine listening on ${port}`),
);
