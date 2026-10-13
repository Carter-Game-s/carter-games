import net from "node:net";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const host = process.env.GAME_ASSET_VPS_HOST;
const assetPort = Number(process.env.GAME_ASSET_VPS_PORT || 8080);
if (!Number.isInteger(assetPort) || assetPort < 1 || assetPort > 65535)
  throw new Error("Invalid asset VPS port");
if (!host || process.env.GAME_ASSET_BASE_URL !== "http://127.0.0.1:18080")
  process.exit(0);
if (!/^[a-zA-Z0-9.-]+$/.test(host))
  throw new Error("Invalid asset VPS hostname");
const connected = await new Promise<boolean>((resolve) => {
  const socket = net.connect(18080, "127.0.0.1");
  socket.setTimeout(2000);
  socket.on("connect", () => {
    socket.destroy();
    resolve(true);
  });
  socket.on("error", () => {
    socket.destroy();
    resolve(false);
  });
  socket.on("timeout", () => {
    socket.destroy();
    resolve(false);
  });
});
if (connected) process.exit(0);
const sshDir = path.join(os.homedir(), ".ssh");
let active: ChildProcess | undefined;
process.once("SIGTERM", () => {
  active?.kill();
  process.exit(0);
});
while (true) {
  const child = spawn(
    "ssh",
    [
      "-N",
      "-T",
      "-o",
      "BatchMode=yes",
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3",
      "-o",
      "StrictHostKeyChecking=yes",
      "-o",
      "IdentitiesOnly=yes",
      "-o",
      `UserKnownHostsFile=${path.join(sshDir, "orbit-vps-known-hosts")}`,
      "-i",
      path.join(sshDir, "orbit-vps-assets"),
      "-L",
      `127.0.0.1:18080:127.0.0.1:${assetPort}`,
      `orbit-assets-tunnel@${host}`,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  active = child;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", resolve);
  });
  await sleep(10000);
}
