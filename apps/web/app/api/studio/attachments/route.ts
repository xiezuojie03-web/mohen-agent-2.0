import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { queryValue, run } from "@mohen/data-access";
import { OPERATOR_COOKIE, getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// POST /api/studio/attachments —— 上传/关联材料附件（对齐 FA-015-02）
// 补缺施工第二步：真实落盘到 public/uploads 并登记 assets 候选台账；权利核验后续做。
export async function POST(req: NextRequest) {
  const token = req.cookies.get(OPERATOR_COOKIE)?.value;
  if (!(await getSessionUser(token))) {
    return NextResponse.json({ ok: false, reason: "auth_required" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file !== "object" || typeof (file as Blob).arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, reason: "file_required" }, { status: 400 });
  }

  const name = (file as File).name || "attachment";
  const buf = Buffer.from(await (file as Blob).arrayBuffer());
  const ext = path.extname(name) || "";
  const safeName = crypto.randomUUID() + ext;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buf);

  const assetId = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.assets (asset_id, title, kind, source_url, status) " +
      "values (:'id', :'title', 'attachment', :'url', 'candidate')",
    { id: assetId!, title: name, url: `/uploads/${safeName}` }
  );

  return NextResponse.json({ ok: true, asset_id: assetId, url: `/uploads/${safeName}` });
}
