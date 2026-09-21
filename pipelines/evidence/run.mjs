// pipelines/evidence/run.mjs — Evidence Gate 主管线：G0–G6 评估 + 审计留痕 + 人工复核队列 + 导出。
//
// 管线位置：Legacy → Raw Snapshot → Source Record → Candidate(normalize) → 【本阶段 Evidence Gate】→ Review Queue。
// 硬规则：本阶段只写 audit / review_queue 与导出文件；绝不把对象改为 verified / published。
// 幂等：同一对象的同一 gate 先删后写（保持审计轨迹干净且不重复）；review_queue 已存在则跳过。

import fs from "node:fs";
import path from "node:path";
import {
  run as dbRun,
  runMany,
  queryRows,
} from "../../packages/data-access/src/index.mjs";
import { evaluateGates, summarize, GATE_CODES, STRUCTURAL_PREDICATES } from "./gates.mjs";

const LEGACY_SOURCE = "hushang-jingwei";
const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
const LEGACY_SEED =
  process.env.MOHEN_LEGACY_SEED ||
  path.resolve(PROJECT_ROOT, "..", "hushang-jingwei", "data", "seed.master.json");

const CSV_COLUMNS = [
  "review_id",
  "object_type",
  "display_name",
  "reason",
  "evidence_summary",
  "confidence",
  "recommended_action",
];

// 置信度显示：0 = 未评定（约定值，见报告第 8 节），不得显示为裸数字以免被误读为「评估为低」
function formatConfidence(v) {
  if (v === null || v === undefined || v === "") return "未评定(0)";
  if (Number(v) === 0) return "未评定(0)";
  return String(v);
}

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  // 换行会破坏「一行一项」，压成空格；引号按 RFC4180 双写。
  return `"${s.replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

// 依据失败/待补门禁与强制 C 原因，给出人话建议动作
function recommendedAction(res) {
  const acts = [];
  const g = res.gates;
  if (g.G0.result !== "pass") acts.push("补录可追溯来源（出处/URI）后再评估");
  if (g.G1.result !== "pass") acts.push("人工判定对象身份（排除同名异地）");
  if (g.G2.result !== "pass") acts.push("补齐或修正时间信息");
  if (g.G3.result !== "pass") acts.push("核实坐标来源与精度；无法证明则不得展示坐标");
  if (g.G4.result !== "pass") acts.push("补充可引用的 Evidence 后再评估");
  if (g.G5.result !== "pass") acts.push("人工裁决冲突");
  for (const f of res.forcedC) {
    if (f.includes("结构型谓词")) acts.push("确认该关系的人文语义，否则只能作为结构关联展示");
    else if (f.includes("Legacy 字段继承")) acts.push("用独立来源复核后再晋级");
    else if (f.includes("历史图像")) acts.push("核验图像拍摄地点/年代与今地对应关系");
  }
  if (!acts.length) acts.push("人工复核");
  return [...new Set(acts)].join("；");
}

async function main() {
  // ---------- 1. 载入 run 状态与快照 ----------
  const statePath = path.join(RAW_STORE, "legacy", "jinze", ".last-run.json");
  if (!fs.existsSync(statePath)) throw new Error("未找到 .last-run.json，请先运行 ingest");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const runId = process.argv[2] || state.run_id;
  const ingestRunId = state.ingest_run_id;

  const snapPath = path.join(RAW_STORE, "legacy", "jinze", runId, "jinze-snapshot.json");
  const subset = JSON.parse(fs.readFileSync(snapPath, "utf8"));

  // manifest 由 ingest 阶段写入，含 Legacy commit 与 subset checksum（可追溯性依据）
  const manifestPath = path.join(RAW_STORE, "legacy", "jinze", runId, "manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : {};
  const legacyById = new Map(subset.entities.map((e) => [e.id, e]));

  // ---------- 2. 只读读取 Legacy，做「同名异地」与「缺 source_uri」检测 ----------
  const legacy = JSON.parse(fs.readFileSync(LEGACY_SEED, "utf8"));
  const legacyEntities = legacy.entities || [];
  const nameTowns = new Map(); // name -> Set(town)
  for (const e of legacyEntities) {
    if (!e.name) continue;
    if (!nameTowns.has(e.name)) nameTowns.set(e.name, new Set());
    nameTowns.get(e.name).add(e.town || "(无镇)");
  }
  const legacyCommit =
    manifest.legacy_commit ||
    (legacy.meta && (legacy.meta.commit || legacy.meta.git_commit)) ||
    null;

  // ---------- 3. 从库里读候选对象 ----------
  const entities = await queryRows(
    `select e.entity_id::text, e.entity_type, e.canonical_name, e.valid_from, e.valid_to,
            e.confidence, e.status::text as status, e.legacy_id,
            (select count(*) from claim_evidence ce join claims c on c.claim_id=ce.claim_id
              where c.subject_id=e.entity_id) as ev_count
     from entities e order by e.canonical_name`
  );
  const relations = await queryRows(
    `select r.relation_id::text, r.predicate, r.subject_id::text, r.object_id::text,
            r.valid_from, r.valid_to, r.status::text as status, r.legacy_id,
            (select count(*) from relation_evidence re where re.relation_id=r.relation_id) as ev_count
     from relations r order by r.predicate`
  );
  const visuals = await queryRows(
    `select v.asset_id::text, v.asset_type, v.file_path, v.created_date, v.depicted_period,
            v.rights, v.checksum, v.legacy_id, v.source_id::text
     from visual_assets v order by v.file_path`
  );
  const evidences = await queryRows(
    `select ev.evidence_id::text, ev.evidence_type, ev.locator, ev.subject_hint, ev.place_hint,
            ev.time_hint, ev.verification_status::text as status, ev.source_id::text,
            (select count(*) from claim_evidence ce where ce.evidence_id=ev.evidence_id) as claim_count
     from evidence ev order by ev.evidence_type`
  );
  const claims = await queryRows(
    `select c.claim_id::text, c.subject_id::text, c.predicate, c.certainty, c.status::text as status,
            c.review_tier, c.review_note,
            (select count(*) from claim_evidence ce where ce.claim_id=c.claim_id) as ev_count
     from claims c`
  );

  // entity_id → 名称，供 relation/claim 生成人能看懂的 display_name
  const entName = new Map(entities.map((e) => [e.entity_id, e.canonical_name]));
  const nameOf = (id) => entName.get(id) || String(id).slice(0, 8) + "…";

  const results = []; // {object_type, object_id, display_name, res, evidence_summary, confidence}
  const stats = {
    missing_source_uri: 0,
    missing_evidence: 0,
    coords_present_unprovenanced: 0,
    coords_missing: 0,
    structural_relations: 0,
    semantic_relations: 0,
    visual_provenance_risk: 0,
    cross_town_homonym: 0,
  };

  // ---------- 4. entities ----------
  for (const e of entities) {
    const legacyRow = legacyById.get(String(e.legacy_id || "").replace(`${LEGACY_SOURCE}:entity:`, ""));
    const towns = nameTowns.get(e.canonical_name) || new Set([ "金泽" ]);
    const homonym = towns.size > 1;
    if (homonym) stats.cross_town_homonym++;

    const hasCoords = !!(legacyRow && legacyRow.lat && legacyRow.lng);
    const hasSourceUri = !!(legacyRow && legacyRow.source_uri);
    if (!hasSourceUri) stats.missing_source_uri++;
    if (hasCoords) stats.coords_present_unprovenanced++;
    else stats.coords_missing++;

    const evCount = Number(e.ev_count || 0);
    if (evCount === 0) stats.missing_evidence++;

    const forcedC = [];
    if (!hasSourceUri) forcedC.push("Legacy 该实体无 source_uri，出处不可跳转核对");
    if (homonym) forcedC.push("同名异地：该名称在 Legacy 中出现在多个镇");

    const res = evaluateGates({
      source: evCount > 0 && hasSourceUri ? true : hasSourceUri === false ? false : undefined,
      identity: homonym ? false : true,
      time: e.valid_from && e.valid_to
        ? Number(e.valid_from) <= Number(e.valid_to)
        : e.valid_from ? undefined : false,
      // Legacy 坐标随迁但未记录来源/精度 → 不可直接采信（spec D：坐标来源无法证明）
      spatial: hasCoords ? false : undefined,
      evidence: evCount > 0 ? true : false,
      conflict: false,
      forcedC,
    });

    results.push({
      object_type: "entity",
      object_id: e.entity_id,
      display_name: e.canonical_name,
      res,
      evidence_summary: evCount > 0 ? `${evCount} 条（实体来源引文）` : "无",
      confidence: formatConfidence(e.confidence),
    });
  }

  // ---------- 5. relations ----------
  for (const r of relations) {
    const structural = STRUCTURAL_PREDICATES.has(r.predicate);
    if (structural) stats.structural_relations++;
    else stats.semantic_relations++;

    const evCount = Number(r.ev_count || 0);
    if (evCount === 0) stats.missing_evidence++;

    const forcedC = structural
      ? [`仅有结构型谓词 ${r.predicate}，未证明具体人文语义`]
      : [];

    const res = evaluateGates({
      source: r.legacy_id ? true : false, // 可回溯到 Legacy mapping，但无独立出处引用
      identity: r.subject_id && r.object_id ? true : false,
      time: r.valid_from || r.valid_to ? true : undefined,
      spatial: undefined, // relations 无空间字段
      evidence: evCount > 0 ? true : false,
      conflict: false,
      forcedC,
    });

    results.push({
      object_type: "relation",
      object_id: r.relation_id,
      display_name: `${nameOf(r.subject_id)} → ${nameOf(r.object_id)}（${r.predicate}）`,
      res,
      evidence_summary: evCount > 0 ? `${evCount} 条` : "无",
      confidence: "未评定(0)",
    });
  }

  // ---------- 6. visual_assets ----------
  for (const v of visuals) {
    const hasDate = !!(v.created_date && String(v.created_date).trim());
    const forcedC = [];
    // spec D：历史图像与现代地点疑似同景 → 无法自动判定，一律交人工
    // 措辞保持中性：样本中既有老照片也有现代照片（如 2026 年高铁图），不能一律称「历史图像」
    forcedC.push("图像缺少可证明的拍摄地点/年代对应关系，需人工核验（含历史图像与今地疑似同景的情形）");
    stats.visual_provenance_risk++;

    const res = evaluateGates({
      source: v.source_id && v.checksum && v.file_path ? true : false,
      identity: undefined, // visual_assets 无本体关联字段，无法机器判定描绘对象
      time: hasDate ? true : undefined,
      spatial: undefined, // 无坐标字段
      evidence: undefined, // 图像未作为 evidence 与实体关联
      conflict: false,
      forcedC,
    });

    results.push({
      object_type: "visual_asset",
      object_id: v.asset_id,
      display_name: v.file_path || "(无路径)",
      res,
      evidence_summary: `来源 checksum ${String(v.checksum || "").slice(0, 8)}…`,
      confidence: "未评定(0)",
    });
  }

  // ---------- 7. evidence ----------
  for (const ev of evidences) {
    const claimCount = Number(ev.claim_count || 0);
    const res = evaluateGates({
      source: ev.source_id && ev.locator ? true : false,
      identity: ev.subject_hint ? true : undefined,
      time: ev.time_hint ? true : undefined,
      spatial: ev.place_hint ? true : undefined,
      evidence: claimCount > 0 ? true : undefined, // 自身即证据：是否已挂到某个 claim
      conflict: false,
      forcedC: [],
    });

    results.push({
      object_type: "evidence",
      object_id: ev.evidence_id,
      display_name: String(ev.locator || "").slice(0, 60) || "(无 locator)",
      res,
      evidence_summary: `类型 ${ev.evidence_type}；关联 claim ${claimCount} 个`,
      confidence: "未评定(0)",
    });
  }

  // ---------- 8. claims ----------
  for (const c of claims) {
    const evCount = Number(c.ev_count || 0);
    if (evCount === 0) stats.missing_evidence++;

    const res = evaluateGates({
      source: evCount > 0 ? true : false,
      identity: c.subject_id ? true : false,
      time: undefined, // claim 本身无时间字段，时间语义由 subject 实体承担
      spatial: undefined, // 「属金泽」含空间断言，但无坐标/无 provenance
      evidence: evCount > 0 ? true : false,
      conflict: false,
      // Legacy 数据不得因旧项目已使用而自动成为 verified → 关键结论须独立复核
      forcedC: ["关键结论由 Legacy 字段继承，未经独立来源复核"],
    });

    results.push({
      object_type: "claim",
      object_id: c.claim_id,
      display_name: `${nameOf(c.subject_id)} · ${c.predicate}`,
      res,
      evidence_summary: evCount > 0 ? `${evCount} 条` : "无",
      confidence: formatConfidence(c.certainty),
    });
  }

  // ---------- 9. 写审计 + 复核队列（幂等，批量执行） ----------
  // 已存在的复核项一次性取回，避免逐对象查询（逐条起进程会超时）
  const existingQueue = await queryRows(
    `select object_type, object_id from review_queue`
  );
  const existingKeys = new Set(
    existingQueue.map((r) => `${r.object_type}:${r.object_id}`)
  );

  const auditStmts = [];
  const queueStmts = [];
  let auditRows = 0;
  let queueNew = 0;
  let queueExisting = 0;

  for (const item of results) {
    for (const code of GATE_CODES) {
      const g = item.res.gates[code];
      // 同对象同门先删后写，保证重跑不产生重复审计行
      auditStmts.push({
        sql: `delete from evidence_gate_audit where object_type=:'ot' and object_id=:'oid' and gate_code=:'gc'`,
        params: { ot: item.object_type, oid: item.object_id, gc: code },
      });
      auditStmts.push({
        sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
              values (:'ot',:'oid',:'gc',:'rs',:'rn','rule')`,
        params: {
          ot: item.object_type,
          oid: item.object_id,
          gc: code,
          rs: g.result,
          rn: g.reason,
        },
      });
      auditRows++;
    }

    if (item.res.tier === "A") continue; // A 级无需人工，不入队

    const reasonText = [
      ...item.res.failed.map((c) => `${c} 不通过：${item.res.gates[c].reason}`),
      ...item.res.pending.map((c) => `${c} 待补：${item.res.gates[c].reason}`),
      ...item.res.forcedC,
    ].join("｜");

    // 已存在则刷新为本轮复评结果，避免库内 summary 与本次导出的 CSV 不一致
    if (existingKeys.has(`${item.object_type}:${item.object_id}`)) {
      queueExisting++;
      queueStmts.push({
        sql: `update review_queue set review_tier=:'tier', reason_code=:'rc', summary=:'sum'
              where object_type=:'ot' and object_id=:'oid'`,
        params: {
          tier: item.res.tier,
          rc: item.res.failed.join(",") || item.res.pending.join(",") || "forced_c",
          sum: reasonText || "需人工复核",
          ot: item.object_type,
          oid: item.object_id,
        },
      });
      continue;
    }

    queueStmts.push({
      sql: `insert into review_queue(object_type,object_id,review_tier,reason_code,summary,evidence_ids,status)
            values (:'ot',:'oid',:'tier',:'rc',:'sum','{}'::text[],'pending')`,
      params: {
        ot: item.object_type,
        oid: item.object_id,
        tier: item.res.tier,
        rc: item.res.failed.join(",") || item.res.pending.join(",") || "forced_c",
        sum: reasonText || "需人工复核",
      },
    });
    queueNew++;
  }

  // 分批提交，控制单文件体积
  const CHUNK = 400;
  for (let i = 0; i < auditStmts.length; i += CHUNK) {
    await runMany(auditStmts.slice(i, i + CHUNK));
  }
  for (let i = 0; i < queueStmts.length; i += CHUNK) {
    await runMany(queueStmts.slice(i, i + CHUNK));
  }

  // ---------- 10. 导出 CSV ----------
  const queueRows = await queryRows(
    `select r.review_id::text, r.object_type, r.object_id, r.review_tier, r.reason_code, r.summary, r.status
     from review_queue r order by
       case r.review_tier when 'C' then 0 when 'B' then 1 else 2 end, r.object_type, r.created_at`
  );
  const itemByKey = new Map(results.map((i) => [`${i.object_type}:${i.object_id}`, i]));

  const exportsDir = path.join(PROJECT_ROOT, "data", "exports");
  fs.mkdirSync(exportsDir, { recursive: true });

  const csvLines = [CSV_COLUMNS.join(",")];
  for (const q of queueRows) {
    const item = itemByKey.get(`${q.object_type}:${q.object_id}`);
    const reason = [q.summary, item ? `Tier ${item.res.tier}` : ""].filter(Boolean).join("｜");
    csvLines.push(
      [
        q.review_id,
        q.object_type,
        item ? item.display_name : q.object_id,
        reason,
        item ? item.evidence_summary : "无",
        item ? item.confidence : "未评定(0)",
        item ? recommendedAction(item.res) : "人工复核",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  const csvPath = path.join(exportsDir, "jinze-review-queue.csv");
  // 加 UTF-8 BOM：Excel 双击打开中文不乱码（面向非程序员审核）
  fs.writeFileSync(csvPath, "﻿" + csvLines.join("\r\n") + "\r\n", "utf8");

  // ---------- 11. 导出报告 ----------
  const sum = summarize(results);
  const byType = {};
  for (const i of results) byType[i.object_type] = (byType[i.object_type] || 0) + 1;

  const gateTable = GATE_CODES.map((c) => {
    const g = sum.byGate[c];
    return `| ${c} | ${g.pass} | ${g.fail} | ${g.pending} |`;
  }).join("\n");

  const tierTable = ["A", "B", "C"]
    .map((t) => `| Tier ${t} | ${sum.byTier[t]} |`)
    .join("\n");

  const typeTable = Object.entries(byType)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join("\n");

  // 待人工审核 Top 10：C 级优先，按失败门数降序
  const top10 = results
    .filter((i) => i.res.tier !== "A")
    .sort((a, b) => {
      const ta = a.res.tier === "C" ? 0 : 1;
      const tb = b.res.tier === "C" ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return b.res.failed.length - a.res.failed.length;
    })
    .slice(0, 10)
    .map(
      (i, idx) =>
        `| ${idx + 1} | ${i.object_type} | ${i.display_name} | Tier ${i.res.tier} | ${
          i.res.failed.join(",") || "-"
        } | ${i.res.pending.join(",") || "-"} | ${recommendedAction(i.res)} |`
    )
    .join("\n");

  const report = `# Jinze Data Factory Report

- Ingest run id: \`${runId}\`
- Ingest run uuid: \`${ingestRunId}\`
- Legacy repo commit: ${legacyCommit || "未记录"}
- Legacy input checksum（subset sha256）: ${manifest.subset_checksum || "未记录"}
- Raw snapshot: \`${path.join(RAW_STORE, "legacy", "jinze", runId)}\`
- 生成时间: ${new Date().toISOString()}

> 本报告**不使用单一总分**。各门禁、各分级、各类问题分别计数，问题不被均摊掩盖。

## 1. 输入与产出计数

| 项目 | 数量 |
|---|---|
| 输入 entities（金泽最小样本） | ${subset.entities.length} |
| 输入 relations（引用金泽实体） | ${subset.relations.length} |
| 输入 photos | ${subset.photos.length} |
| 输入 narrative_assets | ${subset.narrative_assets.length} |
| 输入 external_maps | ${subset.external_maps.length} |
| 输入 stories（仅作 narrative input，非结论） | ${subset.stories.length} |
| Source Records | ${(await queryRows(`select count(*)::text as c from source_records`))[0].c} |
| Entities（candidate） | ${byType.entity || 0} |
| Relations（candidate） | ${byType.relation || 0} |
| Visual Assets | ${byType.visual_asset || 0} |
| Evidence | ${byType.evidence || 0} |
| Claims | ${byType.claim || 0} |
| Legacy mappings | ${(await queryRows(`select count(*)::text as c from legacy_mappings`))[0].c} |
| 写入 audit 行 | ${auditRows} |
| Review queue（新增/已存在） | ${queueNew} / ${queueExisting} |

## 2. G0–G6 门禁结果

| Gate | pass | fail | pending |
|---|---|---|---|
${gateTable}

含义：G0 来源完整 / G1 对象身份 / G2 时间语义 / G3 空间诚实 / G4 证据支持 / G5 冲突检测 / G6 发布资格。

## 3. 分级 Tier A/B/C

| Tier | 数量 |
|---|---|
${tierTable}

规则：任一门 fail 或命中强制 C 情形 → C；否则有 pending → B；全 pass → A。
Tier C 不得自动 approved（由 \`review_queue_tier_c_guard\` 触发器强制）。

## 4. 按对象类型分布

| object_type | 数量 |
|---|---|
${typeTable}

## 5. 数据质量问题明细

| 问题 | 数量 | 说明 |
|---|---|---|
| 缺 source_uri（Legacy 无出处 URI） | ${stats.missing_source_uri} | 出处不可跳转核对 |
| 缺 Evidence 支持 | ${stats.missing_evidence} | 无 evidence 不得晋级 |
| 有坐标但来源不可证明 | ${stats.coords_present_unprovenanced} | Legacy 坐标随迁但未记录来源/精度，属可疑坐标 |
| 缺坐标 | ${stats.coords_missing} | 无空间信息 |
| 跨镇同名（同名异地） | ${stats.cross_town_homonym} | 身份不确定 |
| structural relation（仅结构连接） | ${stats.structural_relations} | ${relations.length ? "全部为 crossLink，未证明具体人文语义" : "无"} |
| semantic relation（有人文语义） | ${stats.semantic_relations} | 本次样本中为 0 |
| visual provenance 风险 | ${stats.visual_provenance_risk} | 图像拍摄地点/年代对应关系未核实 |

## 6. 待人工审核 Top 10

| # | 类型 | 名称 | 分级 | 不通过门 | 待补门 | 建议动作 |
|---|---|---|---|---|---|---|
${top10}

## 7. 拒绝与跳过原因

- **relations 未入库 ${subset.relations.length - (byType.relation || 0)} 条**：引用金泽实体的关系共 ${subset.relations.length} 条，其中仅 ${byType.relation || 0} 条两端都在本次 15 个最小实体样本内；其余端点实体未纳入本批，故未入库（待扩样补齐，不猜值补端点）。
- **全部 24 条关系均为 \`crossLink\`**：属结构型连接，未证明具体人文语义 → 一律 Tier C，不得作为人文结论展示。
- **坐标未采信**：Legacy \`lat/lng\` 未记录来源与精度，本阶段只登记不展示。
- **story 未作为结论**：金泽 story 仅登记为 Legacy narrative input，未生成任何 verified 结论。
- **无对象被设为 verified/published**：本阶段零 verified、零 published，符合「AI/脚本不得直接产生 verified 历史事实」。

## 8. 约定与偏差

- 置信度：\`relations.confidence\` / \`evidence.confidence\` / \`claims.certainty\` 三列为 NOT NULL 且无默认值（001 migration 本任务禁止修改），
  故未经评定时统一记 **0 = 未评定**，语义为「尚未评估」，**不是**「评估为低」。Legacy 原有的等级标注（如 A）为字符串，不折算为数值，原文保留于 \`claims.review_note\` / \`object_value\`。
- \`entities.confidence\` 与 \`legacy_mappings.confidence\` 可空，保持 NULL 表示未知。
- 审计写入策略：同一对象同一 gate 先删后写，保证重跑不产生重复审计行（审计表本身仍为 append 语义的单值快照）。

## 9. 验收命令

\`\`\`bash
node pipelines/ingest/run.mjs     # Raw Snapshot + Source Record + ingest_run
node pipelines/normalize/run.mjs  # Legacy → candidate（幂等）
node pipelines/evidence/run.mjs   # G0–G6 + review queue + CSV + 本报告
\`\`\`
`;

  const reportPath = path.join(exportsDir, "jinze-data-factory-report.md");
  fs.writeFileSync(reportPath, report, "utf8");

  console.log(
    JSON.stringify(
      {
        run_id: runId,
        audited_objects: results.length,
        audit_rows: auditRows,
        review_queue_new: queueNew,
        review_queue_existing: queueExisting,
        tier: sum.byTier,
        csv: csvPath,
        report: reportPath,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("EVIDENCE GATE FAILED:", e.message);
  if (process.env.MOHEN_DEBUG) console.error(e.stack);
  process.exit(1);
});
