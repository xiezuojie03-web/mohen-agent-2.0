import { NextResponse } from "next/server";
import { guardRoute } from "../../../../../../lib/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Catalogue registration is not current action rights or a canonical selection.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) { denied.headers.set("cache-control", "no-store"); return denied; }
  return NextResponse.json({ok:false,state:"HOLD",reason:"media_selection_requires_current_rights_and_revision_binding"},
    {status:503,headers:{"cache-control":"no-store"}});
}
