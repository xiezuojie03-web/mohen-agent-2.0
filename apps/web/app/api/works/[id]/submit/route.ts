import { NextResponse } from "next/server";
import { submitWork } from "../../../../../lib/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await submitWork(id);
  return NextResponse.json({ ok: true });
}
