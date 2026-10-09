import { applicationOrigin } from "@/lib/proxy/origin";
import { randomBytes } from "node:crypto";
import {
  allowRequest,
  createToken,
  verifyToken,
  sameOrigin,
} from "@/lib/proxy/security";
import { fetchPublic } from "@/lib/proxy/fetch";
import { rewriteHTML, rewriteCSS } from "@/lib/proxy/rewrite";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const baseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin access required." },
      { status: 403 },
    );
  if (!allowRequest("issuance", 30))
    return Response.json(
      { error: "Too many browser sessions. Try again in a minute." },
      { status: 429 },
    );
  return Response.json({ token: createToken() }, { headers: baseHeaders });
}
function errorHTML(message: string) {
  const safe = message.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
  return `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Page unavailable</title><body style="font:16px Arial;background:#18201b;color:#edf4e9;padding:40px"><h1>Page unavailable</h1><p>${safe}</p><p>Use “Open directly” in the browser toolbar.</p></body></html>`;
}
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token");
  if (!verifyToken(token))
    return new Response(
      errorHTML(
        "This browser session expired. Refresh the browser to reconnect.",
      ),
      {
        status: 403,
        headers: {
          ...baseHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
      },
    );
  if (
    !allowRequest("global", 600) ||
    !allowRequest(token!, Number(process.env.PROXY_REQUESTS_PER_MINUTE || 120))
  )
    return new Response(
      errorHTML("Rate limit reached. Try again in a minute."),
      {
        status: 429,
        headers: {
          ...baseHeaders,
          "Content-Type": "text/html",
          "Retry-After": "60",
        },
      },
    );
  try {
    const upstream = await fetchPublic(params.get("url") || "");
    const type = upstream.type.split(";")[0].toLowerCase();
    const origin = applicationOrigin(request);
    const nonce = randomBytes(18).toString("base64");
    const csp = `default-src 'none'; img-src ${origin} data:; style-src 'unsafe-inline' ${origin}; font-src ${origin}; script-src 'nonce-${nonce}'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; sandbox allow-scripts`;
    let body: BodyInit;
    let contentType = upstream.type;
    if (type === "text/html" || type === "application/xhtml+xml") {
      body = rewriteHTML(
        upstream.body.toString("utf8"),
        upstream.url,
        token!,
        nonce,
      );
      contentType = "text/html; charset=utf-8";
    } else if (type === "text/css") {
      body = rewriteCSS(upstream.body.toString("utf8"), upstream.url, token!);
      contentType = "text/css; charset=utf-8";
    } else if (
      type.startsWith("image/") ||
      type.startsWith("font/") ||
      ["application/font-woff", "application/vnd.ms-fontobject"].includes(type)
    ) {
      body = new Uint8Array(upstream.body);
    } else
      throw new Error(
        "This content type is not supported by the read-only proxy.",
      );
    return new Response(body, {
      headers: {
        ...baseHeaders,
        "Content-Type": contentType,
        "Content-Security-Policy": csp,
      },
    });
  } catch (e) {
    return new Response(errorHTML((e as Error).message), {
      status: 502,
      headers: {
        ...baseHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  }
}
