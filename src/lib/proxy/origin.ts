/** Recover the visible origin when Next.js or Codespaces normalizes the internal URL. */
export function applicationOrigin(request: Request): string {
  const internal = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    internal.protocol.slice(0, -1);
  if (
    host &&
    /^[a-zA-Z0-9.[\]:-]+$/.test(host) &&
    ["http", "https"].includes(protocol)
  ) {
    try {
      const visible = new URL(`${protocol}://${host}`);
      if (!visible.username && !visible.password) return visible.origin;
    } catch {
      /* Fall back to the internal, valid request URL. */
    }
  }
  return internal.origin;
}
