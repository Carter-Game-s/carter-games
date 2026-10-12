import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

export function isPublicIP(address) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && ip.isIPv4MappedAddress())
      ip = ip.toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export async function resolveDestination(hostname, lookup = dns.lookup) {
  const host = String(hostname)
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (
    !host ||
    host.length > 253 ||
    host.endsWith(".") ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  )
    throw Error("Private destination");
  if (ipaddr.isValid(host)) {
    if (!isPublicIP(host)) throw Error("Private destination");
    return host;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicIP(address))
  )
    throw Error("Unsafe DNS destination");
  return (addresses.find(({ family }) => family === 4) || addresses[0]).address;
}
