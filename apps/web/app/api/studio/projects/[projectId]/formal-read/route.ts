import { NextResponse } from "next/server";
import { getSession } from "../../../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../../../lib/auth";
import { consumerContext } from "../../../../../../lib/kad1-policy.mjs";
import { retrieveMaterials } from "../../../../../../lib/mohen-agent/retrieve";
import { retrieveQualifiedFormalProject } from "../../../../../../lib/mohen-agent/retrieve-formal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/**
 * Read-only, zero-model diagnostic for the existing Studio knowledge adapters.
 * Returns counts/status only; never returns source text, identifiers, tokens or secrets.
 * The formal repository still enforces the signed Creator Owner/Project contract.
 */
export async function GET(req:Request,{params}:{params:Promise<{projectId:string}>}) {
  const session=await getSession();
  if(!session)return NextResponse.json({ok:false,reason:"login_required"},{status:401});
  if(!session.r.includes("creator")&&!session.r.includes("operator"))
    return NextResponse.json({ok:false,reason:"creator_required"},{status:403});

  const {projectId}=await params;
  if(!UUID.test(projectId))
    return NextResponse.json({ok:false,reason:"invalid_project_id"},{status:400});
  const url=new URL(req.url);
  const terms=url.searchParams.getAll("term").map(x=>x.trim()).filter(x=>x.length>1&&x.length<=90);
  if(!terms.length||terms.length>8)
    return NextResponse.json({ok:false,reason:"one_to_eight_terms_required"},{status:400});

  const context=consumerContext("agent");
  if(!context||context.scope.requested_action!=="read")
    return NextResponse.json({ok:false,reason:"agent_read_context_unavailable"},{status:503});

  try {
    const qualification={consumer:"agent" as const,...context};
    const sessionToken=signDatabaseSessionToken(session);
    const [formal,l5]=await Promise.all([
      retrieveQualifiedFormalProject(projectId,terms,qualification,sessionToken),
      retrieveMaterials(terms,24,{qualification}),
    ]);
    const byLayer:Record<string,number>={L0:0,L1:0,L2:0,L3:0,L4:0};
    for(const ref of formal.refs)byLayer[ref.layer]=(byLayer[ref.layer]??0)+1;
    return NextResponse.json({
      ok:!formal.degraded&&!l5.degraded,
      mode:"read_only_zero_model",
      identity:{authenticated:true,dbSessionSigned:true},
      project:{ownerCheck:formal.failureCode==="STUDIO_PROJECT_NOT_FOUND"?"rejected":"evaluated"},
      formal:{coverage:formal.projectQualifiedCoverage,degraded:formal.degraded,
        failureCode:formal.failureCode??null,truncated:formal.truncated,count:formal.refs.length,byLayer},
      l5:{degraded:l5.degraded,count:l5.materials.length},
    },{headers:{"cache-control":"no-store"}});
  } catch(error) {
    const reason=error instanceof Error&&/^[A-Z0-9_]{3,80}$/.test(error.message)
      ?error.message:"FORMAL_READ_DIAGNOSTIC_FAILED";
    console.warn("[mohen/studio-formal-read-diagnostic]",{reason});
    return NextResponse.json({ok:false,reason},{status:503,headers:{"cache-control":"no-store"}});
  }
}
