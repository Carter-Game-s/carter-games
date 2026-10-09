import { applicationOrigin } from "@/lib/proxy/origin";
import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const dir = request.nextUrl.pathname.split("/")[2];
  if (dir && /^[a-zA-Z0-9_-]+$/.test(dir)) {
    const scope = `${applicationOrigin(request)}/external-games/${dir}/`;
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'none'; script-src 'unsafe-inline' ${scope}; style-src 'unsafe-inline' ${scope}; img-src ${scope} data:; font-src ${scope}; media-src ${scope}; connect-src ${scope}; frame-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts`,
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  return response;
}
export const config = { matcher: "/external-games/:path*" };
