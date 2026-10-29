import { NextResponse } from "next/server";
import { queryRows, queryValue, run } from "@mohen/data-access";
import { getSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

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

type ParsedImport = {
  title: string;
  text: string;
  sourceUrl: string | null;
  license: string | null;
  rightsDeclared: boolean;
  kind: "text" | "pdf";
};

async function parseJson(req: Request): Promise<ParsedImport | NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  return {
    title: typeof body.title === "string" ? body.title.trim() : "",
    text: typeof body.text === "string" ? body.text.trim() : "",
    sourceUrl: typeof body.source_url === "string" ? body.source_url.slice(0, 1000) : null,
    license: typeof body.license === "string" ? body.license.slice(0, 200) : null,
    rightsDeclared: body.rights_declared === true,
    kind: "text",
  };
}

async function parseMultipart(req: Request): Promise<ParsedImport | NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "file_required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "file_too_large" }, { status: 413 });
  }

  const name = file.name || "import";
  const title = String(form.get("title") || name).trim().slice(0, 200);
  const sourceUrl = String(form.get("source_url") || "").slice(0, 1000) || null;
  const license = String(form.get("license") || "").slice(0, 200) || null;
  const rightsDeclared = String(form.get("rights_declared") || "") === "true";

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(name);
  const isText = file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(name);

  if (isPdf) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buf);
      return { title, text: parsed.text.trim(), sourceUrl, license, rightsDeclared, kind: "pdf" };
    } catch {
      return NextResponse.json({ ok: false, reason: "pdf_parse_failed" }, { status: 422 });
    }
  }
  if (isText) {
    return { title, text: (await file.text()).trim(), sourceUrl, license, rightsDeclared, kind: "text" };
  }
  // 图片/扫描件 OCR：V1 未接 OCR 引擎，明确拒绝，不冒充成功。
  return NextResponse.json({ ok: false, reason: "ocr_not_enabled" }, { status: 415 });
}

// POST /api/studio/materials/import —— 文本粘贴 / .txt / .md / PDF 文本抽取（K4）
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const parsed = contentType.includes("multipart/form-data") ? await parseMultipart(req) : await parseJson(req);
  if (parsed instanceof NextResponse) return parsed;

  if (!parsed.title) return NextResponse.json({ ok: false, reason: "title_required" }, { status: 400 });
  if (parsed.text.length < 20) return NextResponse.json({ ok: false, reason: "text_too_short" }, { status: 400 });
  if (parsed.text.length > 200_000) return NextResponse.json({ ok: false, reason: "text_too_long" }, { status: 400 });
  if (!parsed.rightsDeclared) {
    return NextResponse.json({ ok: false, reason: "rights_declaration_required" }, { status: 400 });
  }

  const id = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.imported_materials (material_id, owner_user_id, title, text_content, source_url, license, rights_declared) values (:'id', :'owner', :'title', :'text', :'url', :'license', true)",
    {
      id: id!,
      owner: session.uid,
      title: parsed.title,
      text: parsed.text,
      url: parsed.sourceUrl,
      license: parsed.license,
    }
  );
  return NextResponse.json({ ok: true, material_id: id, kind: parsed.kind, chars: parsed.text.length });
}
