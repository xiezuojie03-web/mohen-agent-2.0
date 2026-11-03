import { NextResponse } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createImportedMaterialRepository, getNodePgPool } from "@mohen/data-access";
import { getSession } from "../../../../../lib/session";

import { signDatabaseSessionToken } from "../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const MAX_BYTES = 10 * 1024 * 1024;

// GET /api/studio/materials/import —— 我的导入材料
const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const MATERIAL_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// The existing GET listing stays unchanged without ?material_id=. An explicit
// material_id reads the full text ONLY through the same RLS-checked DB session.
export async function GET(req?: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: PRIVATE_NO_STORE });

  const materialId = req ? new URL(req.url).searchParams.get("material_id") : null;
  if (materialId !== null && !MATERIAL_UUID.test(materialId)) {
    return NextResponse.json({ ok: false, reason: "bad_material_id" }, { status: 400, headers: PRIVATE_NO_STORE });
  }
  try {
    const repository = createImportedMaterialRepository(getNodePgPool());
    const token = signDatabaseSessionToken(session);
    if (materialId !== null) {
      const material = await repository.get(materialId, token);
      if (!material) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404, headers: PRIVATE_NO_STORE });
      return NextResponse.json({ ok: true, material }, { headers: PRIVATE_NO_STORE });
    }
    const materials = await repository.list(token);
    return NextResponse.json({ ok: true, materials }, { headers: PRIVATE_NO_STORE });
  } catch (error) { return materialFailure(error); }
}

type ParsedImport = {
  title: string;
  text: string;
  sourceUrl: string | null;
  license: string | null;
  rightsDeclared: boolean;
  kind: "text" | "pdf" | "image-ocr";
};

/**
 * K4 本地 OCR：Windows 10/11 自带 Windows.Media.Ocr（中文识别器）。
 * 仅本地/Windows 可用；非 Windows 返回 null，由上层明确 415，不冒充成功。
 */
async function ocrImage(file: File): Promise<string | null> {
  if (process.platform !== "win32") return null;
  const script = process.env.MOHEN_OCR_SCRIPT || path.join(process.cwd(), "..", "..", "scripts", "ocr-windows.ps1");
  if (!fs.existsSync(script)) return null;

  const ext = file.type.includes("png") ? "png" : file.type.includes("jpeg") ? "jpg" : "img";
  const tmp = path.join(os.tmpdir(), `mohen-ocr-${crypto.randomUUID()}.${ext}`);
  fs.writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));
  try {
    const { stdout } = await execFileP(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Path", tmp],
      { timeout: 60_000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8", windowsHide: true }
    );
    return String(stdout).trim();
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

async function parseJson(req: Request): Promise<ParsedImport | NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    const value: unknown = await req.json();
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
    }
    body = value as Record<string, unknown>;
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
  const isImage =
    file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(name);
  if (isImage) {
    const text = await ocrImage(file);
    if (text === null) {
      return NextResponse.json({ ok: false, reason: "ocr_unavailable_on_platform" }, { status: 415 });
    }
    if (text.length < 20) {
      return NextResponse.json({ ok: false, reason: "ocr_text_too_short" }, { status: 422 });
    }
    return { title, text, sourceUrl, license, rightsDeclared, kind: "image-ocr" };
  }
  return NextResponse.json({ ok: false, reason: "unsupported_format" }, { status: 415 });
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

  try {
    const saved = await createImportedMaterialRepository(getNodePgPool()).create(parsed, signDatabaseSessionToken(session));
    return NextResponse.json({ ok: true, material_id: saved.material_id, kind: parsed.kind, chars: parsed.text.length }, { headers: PRIVATE_NO_STORE });
  } catch (error) { return materialFailure(error); }
}

function materialFailure(error: unknown) {
  if (error instanceof Error && error.message === "MATERIAL_IDENTITY_REQUIRED") {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401, headers: PRIVATE_NO_STORE });
  }
  // Never return SQL, source text or connection details to the client.
  return NextResponse.json({ ok: false, reason: "materials_unavailable" }, { status: 503, headers: PRIVATE_NO_STORE });
}
