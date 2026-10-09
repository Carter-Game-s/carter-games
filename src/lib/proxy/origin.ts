/** Recover the visible origin when Next.js or Codespaces normalizes the internal URL. */
export function applicationOrigin(request: Request): string {
  // Codespaces terminates HTTPS before forwarding to this HTTP server.
  // Use trusted deployment metadata rather than forwarded request headers.
  if (process.env.CODESPACE_NAME) {
    const domain =
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev";
    return new URL(`https://${process.env.CODESPACE_NAME}-3000.${domain}`)
      .origin;
  }
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
