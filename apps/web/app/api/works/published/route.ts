import { NextResponse } from "next/server";
import { listPublished } from "../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const works = await listPublished();
  return NextResponse.json({ works });
}
