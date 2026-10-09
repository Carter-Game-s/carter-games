import type { NextConfig } from "next";
const forwardedHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev"}`
  : undefined;
const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", ...(forwardedHost ? [forwardedHost] : [])],
};
export default config;
