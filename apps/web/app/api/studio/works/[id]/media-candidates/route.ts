import { NextResponse } from "next/server";
import { selectMediaCandidates } from "../../../../../../lib/studio-director";
import { guardRoute } from "../../../../../../lib/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRoute(params, "publication.works");
  if (denied) { denied.headers.set("cache-control", "no-store"); return denied; }
  try {
    return NextResponse.json({ok:true,...await selectMediaCandidates(),state:"REGISTERED_CANDIDATES",selection_state:"HOLD",
      reason:"media_selection_requires_current_rights_and_revision_binding"},{headers:{"cache-control":"no-store"}});
  } catch {
    return NextResponse.json({ok:false,reason:"media_candidates_unavailable"},{status:503,headers:{"cache-control":"no-store"}});
  }
}
