// @vitest-environment node
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("configures Bun, private forwarded port, install on creation and restart-safe launch", () => {
  const c = JSON.parse(readFileSync(".devcontainer/devcontainer.json", "utf8"));
  expect(c.features["ghcr.io/shyim/devcontainers-features/bun:0"]).toEqual({});
  expect(c.forwardPorts).toContain(3000);
  expect(c.portsAttributes["3000"].onAutoForward).toBe("openBrowser");
  expect(c.portsAttributes["3000"].visibility).toBe("public");
  const setup = readFileSync(".devcontainer/setup.sh", "utf8"),
    start = readFileSync(".devcontainer/start.sh", "utf8");
  expect(setup).toContain("command -v bun");
  expect(setup).toContain("bun install --frozen-lockfile");
  expect(start).toContain("bun run start");
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  expect(scripts.start).toContain("--hostname 0.0.0.0");
  expect(start).toContain("[ ! -d node_modules ]");
  expect(start).not.toContain("bun install");
});
