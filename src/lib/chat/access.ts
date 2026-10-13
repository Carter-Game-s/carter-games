import { applicationOrigin } from "@/lib/proxy/origin";
import { sameOrigin, verifyToken } from "@/lib/proxy/security";

export function chatAccess(request: Request) {
  if (sameOrigin(request)) return true;
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (
    !process.env.CODESPACE_NAME ||
    (site && site !== "same-origin") ||
    !verifyToken(request.headers.get("x-carter-chat-token"))
  )
    return false;
  const expected = new URL(applicationOrigin(request));
  return (
    expected.protocol === "https:" &&
    request.headers.get("host") === "localhost:3000" &&
    request.headers.get("x-forwarded-host") === expected.host &&
    request.headers.get("x-forwarded-proto") === "https" &&
    (origin === "http://localhost:3000" || origin === "https://localhost:3000")
  );
}
