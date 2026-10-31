// apps/web/lib/admin-assets.ts — 图片资产台账（E1-4）数据访问
import { queryRows, queryValue, run } from "@mohen/data-access";

export interface AssetCandidate {
  title: string;
  kind: string;
  source_url?: string;
  license?: string;
  author?: string;
  intended_use?: string;
  ratio?: string;
}

export interface AssetFilter {
  kind?: string;
  status?: string;
  q?: string;
}

/** 资产检索（按类别/状态/关键词过滤；空过滤返回全量，按创建倒序）。 */
export function listAssets(filter: AssetFilter = {}) {
  const conds: string[] = [];
  const params: Record<string, string> = {};
  if (filter.kind) { conds.push("kind = :'kind'"); params.kind = filter.kind; }
  if (filter.status) { conds.push("status = :'status'"); params.status = filter.status; }
  if (filter.q) {
    conds.push("(title ilike :'q' or kind ilike :'q' or author ilike :'q' or intended_use ilike :'q')");
    params.q = `%${filter.q}%`;
  }
  const where = conds.length ? `where ${conds.join(" and ")}` : "";
  return queryRows(
    `select asset_id::text as asset_id, title, kind, source_url, license, author,
            rights, intended_use, ratio, status, created_at::text as created_at
     from public.assets ${where} order by created_at desc`,
    params
  );
}

/** Promotion requires independent qualification; Operator approval cannot issue G5. */
export async function promoteAsset(assetId: string, operator: string): Promise<{ ok: boolean; reason?: string }> {
  const row = await queryRows(
    "select asset_id::text as asset_id, title, status from public.assets where asset_id = :'id'",
    { id: assetId }
  );
  if (!row.length) return { ok: false, reason: "asset_not_found" };
  if (row[0].status === "verified") return { ok: false, reason: "already_verified" };

  // Promotion waits for a separately authorized professional qualification.
  return { ok: false, reason: "independent_gate_required" };
}

export async function addAssetCandidate(input: AssetCandidate): Promise<string> {
  const id = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into public.assets (asset_id, title, kind, source_url, license, author, intended_use, ratio, status)
     values (:'id', :'title', :'kind', :'src', :'license', :'author', :'use', :'ratio', 'candidate')`,
    {
      id: id!,
      title: input.title,
      kind: input.kind,
      src: input.source_url ?? null,
      license: input.license ?? null,
      author: input.author ?? null,
      use: input.intended_use ?? null,
      ratio: input.ratio ?? null,
    }
  );
  return id!;
}
