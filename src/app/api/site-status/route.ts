import { siteStatus } from "@/lib/player-chat/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(siteStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
