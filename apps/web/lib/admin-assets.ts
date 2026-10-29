// apps/web/lib/admin-assets.ts — 图片资产台账（E1-4）数据访问
import { queryRows, queryValue, run } from "@mohen/data-access";
import { createGovernanceRun, writeGovernanceGate } from "./governance-gate";

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

/** 资产晋级：candidate/demo → verified，写治理 run + G5 门禁记录（R15：无门禁不得晋级）。 */
export async function promoteAsset(assetId: string, operator: string): Promise<{ ok: boolean; reason?: string }> {
  const row = await queryRows(
    "select asset_id::text as asset_id, title, status from public.assets where asset_id = :'id'",
    { id: assetId }
  );
  if (!row.length) return { ok: false, reason: "asset_not_found" };
  if (row[0].status === "verified") return { ok: false, reason: "already_verified" };

  const runId = await createGovernanceRun(`资产晋级：${row[0].title}`);
  await writeGovernanceGate(runId, "asset", assetId, "admin", {
    title: String(row[0].title ?? ""),
    operator,
    promoted_at: new Date().toISOString(),
  });
  await run("update public.assets set status = 'verified' where asset_id = :'id'", { id: assetId });
  return { ok: true };
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
