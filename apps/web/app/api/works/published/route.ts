import { NextResponse } from "next/server";
import { listWatchEligible } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const works = await listWatchEligible();
  return NextResponse.json({ works }, { headers: { "cache-control": "no-store" } });
}
