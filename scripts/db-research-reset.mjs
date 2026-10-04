// scripts/db-research-reset.mjs — 清空 Research Workspace 的**研究态**数据（不含任何 Truth 表）
//
// 用途：重跑某一研究范围（scope）或整轮研究时，避免多轮结果并存造成重复候选与误判。
// 例：首轮 LR-ADS-01 曾因全局预算上限只覆盖部分来源，深度重跑后必须清掉浅挖版本。
//
// 安全：
//   · 只删 `research_run`（8 张子表均为 on delete cascade，一并清除）；
//   · **不触碰任何 Truth 表**（entities / claims / relations / evidence / visual_assets …）；
//   · 默认**试算**（打印将删除的 run），必须显式 --apply 才执行。
//
// 用法：
//   node scripts/db-research-reset.mjs --scope LR-ADS-01          # 试算
//   node scripts/db-research-reset.mjs --scope LR-ADS-01 --apply  # 执行
//   node scripts/db-research-reset.mjs --all --apply              # 清空整个研究区
import { run, queryRows, queryValue } from "../packages/data-access/src/index.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ALL = args.includes("--all");
const scope = (() => { const i = args.indexOf("--scope"); return i >= 0 ? args[i + 1] : ""; })();

if (!ALL && !scope) {
  console.error("用法：node scripts/db-research-reset.mjs --scope <名称> [--apply] 或 --all [--apply]");
  process.exit(2);
}

const where = ALL ? "true" : "research_scope = :'sc'";
const rows = await queryRows(
  `select run_id::text, job_id, research_scope, write_enabled, started_at
     from research_run where ${where} order by started_at`,
  scope ? { sc: scope } : undefined
);
console.log(`MATCHED runs=${rows.length}`);
for (const r of rows) console.log(`  ${r.run_id} | ${r.research_scope} | write=${r.write_enabled} | ${r.started_at}`);

if (!APPLY) { console.log("DRY 未删除。加 --apply 执行。"); process.exit(0); }
if (!rows.length) { console.log("无可删除数据。"); process.exit(0); }

const n = Number(await queryValue(
  `with d as (delete from research_run where ${where} returning 1) select count(*)::int from d`,
  scope ? { sc: scope } : undefined
));
console.log(`DELETED runs=${n}`);
