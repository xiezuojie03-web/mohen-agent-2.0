import { NextResponse } from "next/server";
import {
  createLocalPrivateOriginalStorage,
  createPrivateOriginalStorage,
  queryRows,
} from "@mohen/data-access";
import { listWatchEligible } from "../../../../../lib/publication";
import { readJsonColumn } from "../../../../../lib/db-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 只读原件画面：仅当该媒资确实被某条**当前 WATCH 合格**的已发布修订引用时才返回字节。
// 每次请求都重新跑 WATCH 资格校验（撤权后立刻 404），不从仓库/public 目录读任何副本。
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NOT_FOUND = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

const notFound = () => new NextResponse(null, { status: 404, headers: NOT_FOUND });

type MediaRef = { asset_id?: unknown };
type WorkContent = { media?: unknown };

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!UUID.test(assetId)) return notFound();
  try {
    const works = await listWatchEligible();
    const referenced = works.some((work) => {
      let content: WorkContent = {};
      try {
        content = readJsonColumn<WorkContent>(work.content, {});
      } catch {
        return false;
      }
      if (!Array.isArray(content.media)) return false;
      return content.media.some((item) => {
        if (!item || typeof item !== "object") return false;
        return String((item as MediaRef).asset_id ?? "").toLowerCase() === assetId.toLowerCase();
      });
    });
    if (!referenced) return notFound();

    const rows = await queryRows(
      `select a.content_sha256 as asset_sha256, a.status as asset_status,
          a.rights_by_action->>'display' as display_right,
          o.sha256 as original_sha256, o.byte_size, o.content_type,
          o.state as original_state, o.storage_key
         from public.assets a
         join studio.private_originals o on o.original_id = a.original_id
        where a.asset_id = :'id'::uuid`,
      { id: assetId }
    );
    const row = rows[0];
    if (!row) return notFound();
    if (String(row.asset_status) !== "verified" || String(row.display_right) !== "allowed") return notFound();
    if (String(row.original_state) !== "STORED_VERIFIED") return notFound();
    if (row.asset_sha256 !== row.original_sha256) return notFound();
    const contentType = String(row.content_type ?? "");
    if (!IMAGE_TYPES.has(contentType)) return notFound();

    const storage = process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS === "true"
      ? createLocalPrivateOriginalStorage()
      : createPrivateOriginalStorage();
    const bytes = await storage.readVerified(String(row.storage_key), String(row.original_sha256), Number(row.byte_size));
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'",
      },
    });
  } catch {
    // 私有存储缺失、哈希不符或资格异常一律按不存在处理（失败关闭）。
    return notFound();
  }
}
