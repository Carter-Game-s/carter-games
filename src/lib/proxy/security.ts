import { applicationOrigin } from "./origin";
import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const secret =
  process.env.PROXY_SIGNING_SECRET || randomBytes(32).toString("hex");
export const defaultHosts = [
  "example.com",
  "www.example.com",
  "en.wikipedia.org",
  "www.wikipedia.org",
  "www.google.com",
  "www.bing.com",
  "duckduckgo.com",
  "html.duckduckgo.com",
];
export function allowedHosts() {
  return (process.env.PROXY_ALLOWED_HOSTS ?? defaultHosts.join(","))
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}
export function isPublicAddress(address: string) {
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
export function validateURL(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port &&
      !(
        (u.protocol === "https:" && u.port === "443") ||
        (u.protocol === "http:" && u.port === "80")
      ))
  )
    throw new Error("Only public HTTP(S) on standard ports is supported.");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host.endsWith(".") ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.includes("metadata") ||
    (ipaddr.isValid(host) && !isPublicAddress(host))
  )
    throw new Error(
      "Private, loopback, and metadata destinations are blocked.",
    );
  if (!allowedHosts().includes(host))
    throw new Error(
      "This host is not enabled. Open it directly, or add the exact host to PROXY_ALLOWED_HOSTS.",
    );
  return u;
}
export async function resolvePublic(u: URL) {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addresses = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === "ipv4" ? 4 : 6 }]
    : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("DNS resolved to an unsafe network address.");
  return addresses[0];
}
export function createToken() {
  const payload = `${Date.now() + 15 * 60 * 1000}.${randomBytes(12).toString("hex")}`;
  return (
    payload + "." + createHmac("sha256", secret).update(payload).digest("hex")
  );
}
export function verifyToken(token: string | null) {
  if (!token || token.length > 200) return false;
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    !/^[a-f0-9]{64}$/.test(parts[2])
  )
    return false;
  const expire = Number(parts[0]);
  if (expire < Date.now() || expire > Date.now() + 16 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret)
    .update(parts[0] + "." + parts[1])
    .digest();
  const actual = Buffer.from(parts[2], "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const budgets = new Map<string, { start: number; count: number }>();
export function allowRequest(
  key: string,
  limit = Number(process.env.PROXY_REQUESTS_PER_MINUTE || 120),
) {
  limit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), 600)
      : 120;
  const now = Date.now();
  if (budgets.size > 2000)
    for (const [k, v] of budgets) if (now - v.start > 60000) budgets.delete(k);
  if (budgets.size > 4000) return false;
  let b = budgets.get(key);
  if (!b || now - b.start > 60000) {
    b = { start: now, count: 0 };
    budgets.set(key, b);
  }
  b.count++;
  return b.count <= limit;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const own = applicationOrigin(request);
  return origin === own && (!site || site === "same-origin");
}
