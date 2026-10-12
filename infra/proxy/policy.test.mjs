import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublicIP, resolveDestination } from "./policy.mjs";
test("private and mapped addresses never reach a socket", async () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "0.0.0.0", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1"]) {
    assert.equal(isPublicIP(ip), false); await assert.rejects(resolveDestination(ip));
  }
  assert.equal(isPublicIP("1.1.1.1"), true);
});
test("all DNS answers are validated and the public address is pinned", async () => {
  assert.equal(await resolveDestination("example.com", async () => [{address:"93.184.215.14",family:4}]), "93.184.215.14");
  await assert.rejects(resolveDestination("example.com", async () => [{address:"1.1.1.1",family:4},{address:"127.0.0.1",family:4}]));
  await assert.rejects(resolveDestination("localhost"));
  await assert.rejects(resolveDestination("metadata.local"));
});
