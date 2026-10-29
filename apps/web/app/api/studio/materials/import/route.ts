import { NextResponse } from "next/server";
import { queryRows, queryValue, run } from "@mohen/data-access";
import { getSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/studio/materials/import —— 我的导入材料
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });

  const rows = await queryRows(
    "select material_id::text as material_id, title, source_url, license, rights_declared, left(text_content, 240) as excerpt, created_at::text as created_at from public.imported_materials where owner_user_id = :'owner' order by created_at desc limit 50",
    { owner: session.uid }
  );
  return NextResponse.json({ ok: true, materials: rows });
}

// POST /api/studio/materials/import —— 文本粘贴导入（K4 第一版；PDF/OCR 见 P2）
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });

  let title: unknown;
  let text: unknown;
  let sourceUrl: unknown;
  let license: unknown;
  let rightsDeclared: unknown;
  try {
    const body = (await req.json()) as {
      title?: unknown;
      text?: unknown;
      source_url?: unknown;
      license?: unknown;
      rights_declared?: unknown;
    };
    title = body.title;
    text = body.text;
    sourceUrl = body.source_url;
    license = body.license;
    rightsDeclared = body.rights_declared;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const t = typeof title === "string" ? title.trim() : "";
  const bodyText = typeof text === "string" ? text.trim() : "";
  if (!t) return NextResponse.json({ ok: false, reason: "title_required" }, { status: 400 });
  if (bodyText.length < 20) return NextResponse.json({ ok: false, reason: "text_too_short" }, { status: 400 });
  if (bodyText.length > 200_000) return NextResponse.json({ ok: false, reason: "text_too_long" }, { status: 400 });
  if (rightsDeclared !== true) {
    return NextResponse.json({ ok: false, reason: "rights_declaration_required" }, { status: 400 });
  }

  const id = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.imported_materials (material_id, owner_user_id, title, text_content, source_url, license, rights_declared) values (:'id', :'owner', :'title', :'text', :'url', :'license', true)",
    {
      id: id!,
      owner: session.uid,
      title: t.slice(0, 200),
      text: bodyText,
      url: typeof sourceUrl === "string" ? sourceUrl.slice(0, 1000) : null,
      license: typeof license === "string" ? license.slice(0, 200) : null,
    }
  );
  return NextResponse.json({ ok: true, material_id: id });
}
