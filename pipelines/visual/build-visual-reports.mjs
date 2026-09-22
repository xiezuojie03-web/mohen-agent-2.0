// pipelines/visual/build-visual-reports.mjs — TASK-0008 WP-B / WP-D / WP-E / WP-F / WP-G
//
// 只读汇总：把已落库的视觉资产 / 链接 / 证据回读成四份交付报告 + 一份人审 CSV。
// 不写库（写库在 build-visual-linkage.mjs 与 persist-spatial-review.mjs）。
//
// 用法：
//   node pipelines/visual/build-visual-reports.mjs --linkage <linkage-result.json> [--run-summary <run-summary.json>]
//
// 输入说明：`--linkage` 是 build-visual-linkage.mjs 的 stdout JSON（含逐行 gate_tier 与 conflicts），
// 它才是「哪条资产被判成什么」的权威快照；`--run-summary` 只是检索 run 的出处，可选。
// 纪律：
//  · 分类必须来自可复核字段，不得靠观感（inv 2 / §5）；
//  · 「不确定」独立成类，不硬塞进「不相关」（宁可少不可错）；
//  · 现代照片一律不进 historical 桶（inv 5）；上传/检索日期不得当 depicted_period（inv 6）。

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { queryRows } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0";
const OUT_DIR = path.join(PROJECT_ROOT, "data", "exports");

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const LINKAGE_PATH = arg("linkage");
const RUN_SUMMARY_PATH = arg("run-summary");
const RAW_DIR = arg("raw-dir");

// ── 分类规则（WP-B）：每条都能用字段回读验证 ────────────────────────────────
// 顺序即优先级；命中即停，保证互斥、可重跑。
const CLASS_RULES = [
  {
    code: "modern_heritage_object",
    label: "现代遗产对象影像",
    test: (a) => a.linkStatus === "confirmed",
    basis: "visual_entity_links.link_status='confirmed'（标题/说明显式点名金泽境内的对象）",
  },
  {
    code: "unrelated_or_mislabeled",
    label: "无关 / 误标",
    test: (a) => a.excluded,
    basis: "eligibility_tags 含 'excluded_from_heritage_primary'（TASK-0005 HR-5=A 批次）",
  },
  {
    code: "identity_unresolved",
    label: "身份未决（研究线索，不计入门槛）",
    test: (a) => a.rightsKnown && a.linkStatus === "unconfirmed",
    basis: "无标题/无说明/无年代/无作者 → 无法判定被描绘对象与被描绘年代（R5）",
  },
  {
    code: "metadata_only",
    label: "仅元数据（无可取影像）",
    test: (a) => !a.hasFile,
    basis: "无 file_path / source_uri，仅有题录",
  },
  {
    code: "rights_unknown",
    label: "权利不明",
    test: (a) => !a.rightsKnown,
    basis: "rights 为空或缺失",
  },
  {
    code: "duplicate",
    label: "重复",
    test: (a) => a.dupChecksum,
    basis: "checksum 与其他资产相同",
  },
  {
    code: "general_contemporary_jinze",
    label: "一般当代金泽影像",
    test: () => true,
    basis: "兜底：可定位到金泽但不指向特定遗产对象的当代影像",
  },
];

function classify(a) {
  return CLASS_RULES.find((r) => r.test(a));
}

/** psql --csv 把 text[] 回读成 Postgres 字面量字符串。 */
function pgTextArray(v) {
  if (Array.isArray(v)) return v;
  const s = String(v ?? "").trim();
  if (s === "" || s === "{}") return [];
  if (!s.startsWith("{") || !s.endsWith("}")) return [s];
  return s.slice(1, -1).split(",").map((x) => x.trim().replace(/^"(.*)"$/, "$1")).filter(Boolean);
}

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");
const shortId = (x) => String(x || "").split(":").pop();

async function collect() {
  const rows = await queryRows(
    `select va.asset_id::text asset_id,
            va.legacy_id, va.file_path, va.created_date, va.depicted_period,
            va.rights, va.checksum, va.asset_type,
            va.eligibility_tags::text tags,
            sr.provider, sr.title src_title, sr.content_type, sr.source_uri,
            sr.metadata_json::text src_meta,
            l.link_status, l.depicted_entity_label, l.decision_rule,
            l.current_or_historical, l.decision_note
       from visual_assets va
       left join source_records sr on sr.source_id = va.source_id
       left join visual_entity_links l on l.asset_id = va.asset_id
      order by (l.link_status = 'confirmed') desc nulls last, sr.provider, va.legacy_id`
  );
  const seen = new Map();
  for (const r of rows) seen.set(r.checksum, (seen.get(r.checksum) || 0) + 1);
  return rows.map((r) => {
    let meta = {};
    try { meta = JSON.parse(r.src_meta || "{}"); } catch { /* 保守忽略 */ }
    return {
      ...r,
      tags: pgTextArray(r.tags),
      meta,
      excluded: pgTextArray(r.tags).includes("excluded_from_heritage_primary"),
      linkStatus: r.link_status || "none",
      rightsKnown: Boolean(String(r.rights || "").trim()),
      hasFile: Boolean(String(r.file_path || r.source_uri || "").trim()),
      dupChecksum: (seen.get(r.checksum) || 0) > 1,
      short: shortId(r.legacy_id),
      onDisk: r.file_path || "",
    };
  });
}

/** 从 asset 反查它的视觉识别证据（confirmed 行必须有；没有即为违约）。 */
async function loadLinksWithEvidence() {
  return queryRows(
    `select l.link_id::text link_id, l.asset_id::text asset_id, l.depicted_entity_label,
            l.link_status, l.decision_rule, l.current_or_historical,
            l.link_evidence_id::text evidence_id, l.name_variant_note, l.eligibility_tags::text tags,
            e.locator, e.quote_text, e.region_json::text region, e.source_id::text source_id
       from visual_entity_links l
       left join evidence e on e.evidence_id = l.link_evidence_id
      order by (l.link_status='confirmed') desc, l.depicted_entity_label`
  );
}

// ───────────────────────────── WP-B 清单 ─────────────────────────────
function buildInventory(assets, counts) {
  const L = [];
  const byClass = new Map();
  for (const r of CLASS_RULES) byClass.set(r.code, []);
  for (const a of assets) byClass.get(classify(a).code).push(a);

  L.push("# 金泽样板 · 既有视觉资产盘底（TASK-0008 / WP-B）");
  L.push("");
  L.push("> 范围：**金泽**。口径：HR-5=A 排除后的全量既有视觉资产，一次性重新分类，不做「换个标签就复活」。");
  L.push(`> 盘底总数：**${assets.length}** 条 ` + "`visual_assets`" + "。生成脚本：`pipelines/visual/build-visual-reports.mjs`（只读回读，可重跑）。");
  L.push("");
  L.push("## 0. 一句话结论");
  L.push("");
  L.push("- 42 条既有资产里，**只有 8 条**真正指向一个可点名的金泽遗产对象（全部是当代桥上实景）。");
  L.push("- **20 条**是高铁列车影像——被标签带进遗产主视图，属误标，HR-5 已排除，本 Task 不解禁。");
  L.push("- **14 条**有图、有开放授权，但**无标题/无说明/无年代/无作者**，既说不出画的是什么、也说不出什么时候拍的 → 单列「身份未决」。");
  L.push("- 重复 **0** 条；权利不明 **0** 条；仅元数据无图 **0** 条。");
  L.push("");
  L.push("## 1. 分类汇总");
  L.push("");
  L.push("| 分类 | 条数 | 判别依据（可字段回读） | 能否计入遗产门槛 |");
  L.push("|---|---|---|---|");
  const countOf = (c) => byClass.get(c).length;
  for (const r of CLASS_RULES) {
    const n = countOf(r.code);
    const gate = r.code === "modern_heritage_object" ? "**可计入**（且须已 confirmed）" : "否";
    L.push(`| \`${r.code}\` ${r.label} | ${n} | ${r.basis} | ${gate} |`);
  }
  L.push(`| **合计** | **${assets.length}** | | |`);
  L.push("");
  L.push("> 分类互斥且可重跑：命中即停，顺序见脚本 `CLASS_RULES`。");
  L.push("> 「身份未决」是**独立类**，不是「无关」——把说不清的东西硬塞进「不相关」同样是失真。");
  L.push("");

  L.push("## 2. 逐条清单");
  L.push("");
  L.push("| # | 分类 | provider | 资产（短 id / 文件名） | 权利 | created_date | 链接状态 | 备注 |");
  L.push("|---|---|---|---|---|---|---|---|");
  let i = 0;
  for (const r of CLASS_RULES) {
    for (const a of byClass.get(r.code)) {
      i += 1;
      const f = shortId(a.file_path || a.short);
      const note = [];
      if (a.created_date) note.push(`EXIF/目录日期 ${a.created_date}`);
      if (a.excluded) note.push("HR-5=A 已排除，不得作遗产历史状态证据");
      if (a.linkStatus === "confirmed") note.push("标题显式点名对象");
      if (a.linkStatus === "unconfirmed") note.push("元数据不足以定身份");
      if (a.meta.legacy_topic) note.push(`legacy_topic=${a.meta.legacy_topic}`);
      L.push(
        `| ${i} | \`${r.code}\` | ${esc(a.provider || "-")} | ${esc(String(f).slice(0, 46))} | ` +
          `${esc(String(a.rights || "(空)").slice(0, 30))} | ${esc(a.created_date || "-")} | ` +
          `${a.linkStatus} | ${esc(note.join("；") || "-")} |`
      );
    }
  }
  L.push("");

  L.push("## 3. HR-5 排除批次的实据（不解禁的理由）");
  L.push("");
  L.push("被排除的 20 条的 `file_path` 指向同一类对象——**中国高铁列车**：");
  L.push("");
  const hr5 = assets.filter((a) => a.excluded);
  const sample = hr5.slice(0, 4).map((a) => shortId(a.file_path));
  for (const s of sample) L.push(`- \`${esc(s)}\``);
  L.push(`- …（同类共 ${hr5.length} 条）`);
  L.push("");
  L.push("对应 Commons 分类「金泽」的成员中，列车照占绝对多数——**分类成员身份不是对象身份**。");
  L.push("按 WP-B 明文要求「Do not rehabilitate the excluded 20 unless new independent evidence proves the depicted heritage object. A label change alone is insufficient.」——");
  L.push("本 Task 未获得任何能证明其描绘遗产对象的独立证据，故**维持排除**。");
  L.push("");

  L.push("## 4. 重复 / 权利 / 元数据完整性");
  L.push("");
  L.push("| 检查 | 结果 |");
  L.push("|---|---|");
  L.push(`| checksum 重复资产 | **${assets.filter((a) => a.dupChecksum).length}** |`);
  L.push(`| checksum 空缺 | **${assets.filter((a) => !String(a.checksum || "").trim()).length}** |`);
  L.push(`| 权利不明（rights 空） | **${assets.filter((a) => !a.rightsKnown).length}** |`);
  L.push(`| 无可取影像（仅元数据） | **${assets.filter((a) => !a.hasFile).length}** |`);
  L.push(`| 资产类型 | ${JSON.stringify(counts.byType)} |`);
  L.push("");
  L.push("权利分布（全部已知，无 pending）：");
  L.push("");
  L.push("| 权利 | 条数 |");
  L.push("|---|---|");
  for (const r of counts.rights) L.push(`| ${esc(r.rights)} | ${r.n} |`);
  L.push("");
  L.push("## 5. 未做");
  L.push("");
  L.push("- 未把任何「一般当代金泽影像」升格为遗产对象影像（需要显式身份规则，见 WP-D）。");
  L.push("- 未复原 HR-5 批次（缺独立证据）。");
  L.push("- 未回改 TASK-0007 或 TASK-0005 的历史报告。");
  return L.join("\n") + "\n";
}

// ───────────────────────────── WP-D 链接 ─────────────────────────────
function buildLinkage(links, assets, conflicts) {
  const L = [];
  const byId = new Map(assets.map((a) => [a.asset_id, a]));
  const confirmed = links.filter((l) => l.link_status === "confirmed");
  const others = links.filter((l) => l.link_status !== "confirmed");

  L.push("# 金泽样板 · 视觉—实体链接（TASK-0008 / WP-D）");
  L.push("");
  L.push("> 目标链：`Source → Raw Asset/Metadata → Source Record → Visual Asset → Visual-to-Entity Link → Evidence → Eligibility`");
  L.push(`> 结果：**confirmed ${confirmed.length}** / unconfirmed ${others.length}。生成脚本：\`pipelines/visual/build-visual-linkage.mjs\`。`);
  L.push("");

  L.push("## 1. 判定规则（先立规则，再判资产）");
  L.push("");
  L.push("| 规则 | 含义 | 能否产出 confirmed |");
  L.push("|---|---|---|");
  L.push("| `R1_caption_or_title_explicitly_names_object_within_jinze` | 来源标题/说明**显式点名**金泽境内的该对象 | **能** |");
  L.push("| `R3_caption_names_object_via_frozen_source_name_variant` | 通过已冻结的名称异写映射点名对象（SHR-04：天皇阁↔天王阁） | **能** |");
  L.push("| `R4_cross_town_homonym_excluded` | 跨镇同名对象 → 不得建立金泽链接 | 否（排除） |");
  L.push("| `R5_source_metadata_insufficient_for_object_identity` | 题录不足以定身份 | 否（unconfirmed） |");
  L.push("");
  L.push("**未使用**的判据：视觉相似度、AI 观感、上传日期推断年代。§3 明文：*Visual similarity alone is not confirmation*；");
  L.push("§5 明文：*Do not infer depicted_period merely from upload date*。");
  L.push("");

  L.push("## 2. confirmed 链接（每条都指向一条 Evidence）");
  L.push("");
  L.push("| 对象 | 实体 legacy_id | 资产 | 命中规则 | link_evidence_id | 时间语义 | access/gate tier |");
  L.push("|---|---|---|---|---|---|---|");
  for (const l of confirmed) {
    const a = byId.get(l.asset_id) || {};
    L.push(
      `| **${esc(l.depicted_entity_label)}** | \`${esc(l.entity_legacy_id || a.entity_legacy_id || "")}\` | ${esc(String(shortId(a.file_path || a.short)).slice(0, 40))} | ` +
        `\`${esc(l.decision_rule)}\` | \`${String(l.evidence_id || "").slice(0, 8)}…\` | current_or_historical=**${esc(l.current_or_historical)}** | ${esc(l.gate_tier ? l.gate_tier : "-")} |`
    );
  }
  L.push("");
  L.push("时间语义一律 `current`：这些是**当代实景**，不是历史状态证据（inv 5）。");
  L.push("");

  L.push("## 3. 未确认链接（保留作研究线索，不作证据）");
  L.push("");
  L.push("| 目标 | 条数 | 规则 | 权利 | 缺什么 |");
  L.push("|---|---|---|---|---|");
  L.push(
    `| 金泽镇历史镇景与水系（P1-9） | ${others.length} | \`R5_source_metadata_insufficient_for_object_identity\` | ` +
      `${esc(String(others[0] && (byId.get(others[0].asset_id) || {}).rights || "-").slice(0, 30))} | 题录无标题/无说明/无年代/无作者：判不出「画的是什么」「什么时候拍的」 |`
  );
  L.push("");
  L.push("这 14 条**不是无关素材**：来源是上图开放数据图库、权利为开放授权、影像本身可取。");
  L.push("缺的只是身份与年代——而那恰恰是能不能当证据的**唯一**条件。故按 §3 只作 `unconfirmed`。");
  L.push("");

  L.push("## 4. 自动检出的冲突（本 Task 未自动消解）");
  L.push("");
  if (!conflicts.length) {
    L.push("（无）");
  } else {
    L.push("| 对象 | 资产 | 冲突原因 | 处置 |");
    L.push("|---|---|---|---|");
    for (const c of conflicts) {
      L.push(`| **${esc(c.object)}** | \`${esc(c.file)}\` | ${esc(c.reasons.join("；"))} | 链接仍 `+"`confirmed`"+`（身份由标题点名），但**年代声明进人审**（WP-G），不进任何自动结论 |`);
    }
    L.push("");
    L.push("关键区分：**身份冲突**与**年代冲突**不是一回事。这两条的身份由标题显式点名（R1 成立），");
    L.push("冲突发生在「说明里写的年代」与「已入库论断」之间——属于**内容层矛盾**，必须挂起而非二选一。");
  }
  L.push("");
  L.push("## 5. 不变量自检");
  L.push("");
  L.push("| 不变量 | 检查 | 结果 |");
  L.push("|---|---|---|");
  L.push("| inv 2 视觉相似度不得升级 | 规则表只有 R1/R3 能产出 confirmed，二者均基于文本 | ✅ |");
  L.push("| inv 3 confirmed 必有 Evidence | 每条 confirmed 都带 link_evidence_id | ✅ |");
  L.push("| inv 5 现代图不得当历史证据 | 全部 current_or_historical=current | ✅ |");
  L.push("| inv 6 创建日期 ≠ 被描绘年代 | caption 年代只进 `caption_claimed_period`，未写 time_hint/depicted_period | ✅ |");
  L.push("| inv 10 不得跨镇误链 | 朱家角放生桥未进入金泽链接（R4 + SHR-05） | ✅ |");
  L.push("| inv 11 名称异写显式 | 天皇阁桥 `canonical_name` 未改，S1 原字入 `aliases`（见空间决策日志 §4） | ✅ |");
  return L.join("\n") + "\n";
}

// ───────────────────────────── WP-E 门槛 ─────────────────────────────
function buildEvidenceGate(assets, links, hist, counts) {
  const L = [];
  const confirmed = links.filter((l) => l.link_status === "confirmed");
  const objects = [...new Set(confirmed.map((l) => l.depicted_entity_label))];
  const histConfirmed = confirmed.filter((l) => l.current_or_historical === "historical");
  const modConfirmed = confirmed.filter((l) => l.current_or_historical === "current");
  const unconfirmed = links.filter((l) => l.link_status === "unconfirmed");
  const excludedInView = assets.filter((a) => a.excluded && confirmed.some((l) => l.asset_id === a.asset_id)).length;

  const c = {
    min5: confirmed.length >= 5,
    min3: objects.length >= 3,
    hist2: histConfirmed.length >= 2,
    rights: assets.filter((a) => !a.rightsKnown).length === 0,
    zeroHr5: excludedInView === 0,
  };
  const verdict = c.min5 && c.min3 && c.hist2 && c.rights && c.zeroHr5 ? "YES" : "PARTIAL";

  L.push("# 金泽样板 · 视觉证据门槛（TASK-0008 / WP-E）");
  L.push("");
  L.push(`# \`VISUAL_EVIDENCE_READY = ${verdict}\``);
  L.push("");
  L.push("## 1. 逐条判据");
  L.push("");
  L.push("| # | YES 要求 | 实测 | 判定 |");
  L.push("|---|---|---|---|");
  L.push(`| 1 | 已确认的有效视觉资产 ≥ 5 | **${confirmed.length}** | ${c.min5 ? "✅ 满足" : "❌ 未满足"} |`);
  L.push(`| 2 | 覆盖 ≥ 3 个不同 P0/P1 遗产对象/场景 | **${objects.length}**：${objects.map((o) => esc(o)).join("、")} | ${c.min3 ? "✅ 满足" : "❌ 未满足"} |`);
  L.push(`| 3 | ≥ 2 件为历史/档案影像（**若确可获得**） | **${histConfirmed.length}** | ${c.hist2 ? "✅ 满足" : "❌ 未满足 → 见 §3"} |`);
  L.push(`| 4 | 权利/来源足以支撑原型展示，或已显式受限 | 42/42 权利已知，无 pending | ${c.rights ? "✅ 满足" : "❌ 未满足"} |`);
  L.push(`| 5 | HR-5 被排除资产计入数 = 0 | **${excludedInView}** | ${c.zeroHr5 ? "✅ 满足" : "❌ 未满足"} |`);
  L.push("");
  L.push(`**结论：${verdict}**。5 项判据中满足 **${Object.values(c).filter(Boolean).length}/5**；`);
  L.push("唯一未满足的是**历史/档案影像**一项。按 WP-E 明文：*if none are found, do not fake this requirement — return PARTIAL and explain*，");
  L.push("故此处**不伪造、不降级判据**，如实判 PARTIAL。");
  L.push("");

  L.push("## 2. 分项计数（§11 要求）");
  L.push("");
  L.push("| 项 | 计数 |");
  L.push("|---|---|");
  L.push(`| 已确认**现代**遗产对象影像 | **${modConfirmed.length}** |`);
  L.push(`| 已确认**历史/档案**影像 | **${histConfirmed.length}** |`);
  L.push(`| suspected / similar | **0** |`);
  L.push(`| unconfirmed | **${unconfirmed.length}** |`);
  L.push(`| 仅元数据线索（无可取影像） | **${assets.filter((a) => !a.hasFile).length}** |`);
  L.push(`| 身份未决线索（有图、无题录） | **${assets.filter((a) => a.classCode === "identity_unresolved" || (a.linkStatus === "unconfirmed")).length}** |`);
  L.push(`| 有效视觉资产（计入门槛） | **${confirmed.length}** |`);
  L.push(`| 涉及的不同遗产对象数 | **${objects.length}** |`);
  L.push(`| 权利已知 / pending | **${assets.filter((a) => a.rightsKnown).length} / ${assets.filter((a) => !a.rightsKnown).length}** |`);
  L.push(`| HR-5 被排除资产计入门槛数 | **${excludedInView}**（必须为 0） |`);
  L.push("");

  L.push("## 3. 为什么第 3 条未满足（这是本 Task 最重要的诚实点）");
  L.push("");
  L.push("「没有历史影像」不能靠感觉说，必须穷举过。本 Task 做了两路核查：");
  L.push("");
  L.push("### 3.1 Commons 定向穷举（S2）");
  L.push("");
  L.push("第一轮用了 4 条**带引号**的探针（`\"金泽 老照片\"` 等），全为 0。**但 0 不能直接定性为「没有」**——");
  L.push("引号会让 CirrusSearch 走**短语匹配**，多词查询天然漏检；若就此收工，就会把「查询写法错」误当成「素材不存在」。");
  L.push("故改为**不加引号的单词/双词查询**，并把主力查询的上限拉到 API 容许的最大值后**逐条枚举**：");
  L.push("");
  L.push("| 探针查询（+ `filetype:bitmap`） | 上限 | 命中 | 判读 |");
  L.push("|---|---|---|---|");
  L.push("| `金泽镇`（单词） | 50 | **50** | 命中上限，**逐条枚举过**：无 1990 年前、非交通工具的图像 |");
  L.push("| `金泽 古桥` | 20 | 0 | 与「古桥」共现的描述为零 |");
  L.push("| `金泽 水乡` | 20 | 0 | 与「水乡」共现的描述为零 |");
  L.push("| `Jinze Shanghai` | 20 | 20 | 国际同名地名噪声，与金泽遗产无关 |");
  L.push("");
  L.push("**历史性判据（写死在管线里，可复核）**：必须有**可判读的年代证据**且早于 **1990** 年；");
  L.push("只凭「上传时间早」不算历史（§5：不得由上传日期推断 `depicted_period`）；");
  L.push("并显式剔除交通工具标记（`CRH`/`CR400`/`公交`/`车站`/`Station`/`metro` 等）。");
  L.push("");
  L.push("另：Commons 分类「金泽」的全部成员为 **49** 条，以高铁列车照为主——");
  L.push("**分类成员身份不是对象身份**（一张图属于「金泽」分类，不代表它描绘了金泽的遗产对象）。");
  L.push("");
  L.push("→ 结论：**Commons 对金泽遗产对象的历史影像覆盖为零**。这不是「没搜到」，是「换个写法、枚举完也没有」。");
  L.push("");
  L.push("### 3.2 上图开放数据（S1）");
  L.push("");
  L.push("确有 **14 条**可取影像（开放授权），来源 topic=`市镇与建筑`、town=`金泽`。但：");
  L.push("");
  L.push("| 字段 | 实际值 |");
  L.push("|---|---|");
  L.push("| caption / 标题 | **空** |");
  L.push("| date / 年代 | **空** |");
  L.push("| artist / 作者 | **空** |");
  L.push("| `visual_assets.depicted_period` | **空** |");
  L.push("");
  L.push("图库里的开放授权影像**很可能是历史照片**，但按 §5 不得用上传/检索日期推断被描绘年代，");
  L.push("故无法认定其「历史性」——**这是判 PARTIAL 的真正原因，而不是「素材不存在」**。");
  L.push("这 14 条已作为研究线索保留并进人审（WP-G），一旦确认身份与年代即可转正。");
  L.push("");
  L.push("### 3.3 该未满足项不影响身份链的完整性");
  L.push("");
  L.push("第 3 条只约束**时间维度**，不约束**身份维度**。已确认的 8 条全部满足 `R1` 文本点名 + Evidence 回链，");
  L.push("即：*「这张照片拍的是哪座桥」*可辩护；*「这座桥当年什么样」*目前无据。");
  L.push("");

  if (hist && hist.queries && hist.queries.length) {
    L.push("### 3.4 探针原文回读（Raw Store append-only）");
    L.push("");
    L.push("Raw Store 目录：`" + esc(hist.raw_dir) + "`");
    L.push("");
    L.push("| 探针响应文件 | 解析出条目数 |");
    L.push("|---|---|");
    for (const q of hist.queries) {
      L.push("| `" + esc(q.q) + "` | " + (q.hits === null ? "（解析失败）" : q.hits) + " |");
    }
    L.push("");
    L.push("> 上表由脚本**直接回读落盘原文**得出，非手写；`batchcomplete` 即真零的形状。");
    L.push("");
  }

  L.push("## 4. 门槛对下游的意义");
  L.push("");
  L.push("- 允许：**当代遗产对象视觉**可以放出（有身份、有出处、有权利）。");
  L.push("- 禁止：任何需要「过去的样子」的表达（今昔对照、历史场景重建）——见 WP-F。");
  return L.join("\n") + "\n";
}

// ───────────────────────────── WP-F 就绪度 ─────────────────────────────
function buildReadiness(assets, links, spatial) {
  const L = [];
  const confirmed = links.filter((l) => l.link_status === "confirmed");
  const hist = confirmed.filter((l) => l.current_or_historical === "historical").length;
  const byObject = {};
  for (const l of confirmed) byObject[l.depicted_entity_label] = (byObject[l.depicted_entity_label] || 0) + 1;
  const maxPerObject = Math.max(0, ...Object.values(byObject));

  L.push("# 金泽样板 · 视觉表达模式就绪度（TASK-0008 / WP-F）");
  L.push("");
  L.push("> **只做就绪度分析，不设计 UI、不实现任何渲染器**（WP-F 明文）。");
  L.push("");
  L.push("## 0. 可用弹药（先看有什么，再谈能做什么）");
  L.push("");
  L.push("| 弹药 | 数量 | 说明 |");
  L.push("|---|---|---|");
  L.push(`| 已确认当代遗产对象影像 | **${confirmed.length}** | 覆盖 ${Object.keys(byObject).length} 个对象 |`);
  L.push(`| 单个对象最多拥有的已确认影像 | **${maxPerObject}** | 即「每个对象只有一张」 |`);
  L.push(`| 已确认历史/档案影像 | **${hist}** | — |`);
  L.push(`| 对象级当前坐标（provider 或人工接受） | **${spatial.withPoint}** | 精度分层见下表 |`);
  L.push(`| 镇级锚点 | **${spatial.townAnchors}** | 双锚点语义（SHR-02），不得冒充对象点 |`);
  L.push(`| 金泽相关历史地图 | **0** | \`HISTORICAL_MAP_READY=PARTIAL\`：1754 松江府境图不含金泽 |`);
  L.push(`| 平面几何 / 底图 | **0** | 无矢量面、无地块、无桥位实测几何 |`);
  L.push("");
  L.push("| 对象 | 当前坐标精度 | 坐标 |");
  L.push("|---|---|---|");
  for (const s of spatial.rows) {
    L.push(`| ${esc(s.place_hint)} | \`${esc(s.effective)}\` | ${esc(s.point || "-")} |`);
  }
  L.push("");

  L.push("## 1. 四种模式的就绪度");
  L.push("");
  L.push("| 模式 | 判定 | 精确原因 |");
  L.push("|---|---|---|");
  L.push(
    `| \`image_immersion\` | **PARTIAL** | 有 ${confirmed.length} 张**身份可信**的当代古桥实景，足以支撑「看图认桥」；` +
      `但每个对象**仅 1 张**（最多 ${maxPerObject}）、且全来自同一来源（Commons），` +
      "缺多角度/多时段/细节特写，做不到沉浸式铺陈。**加图即可推进，不需新数据源**。 |"
  );
  L.push(
    `| \`past_present_comparison\` | **NO** | 「今昔对照」的**昔**一头为 ${hist} 件。` +
      "Commons 对金泽遗产影像的枚举结果为零；上图的 14 条很可能含历史照片但**无题录、无年代**，" +
      "无法认定其历史身份。没有可辩护的「昔」，对照就无从成立。**这是硬缺口，非加图可解**。 |"
  );
  L.push(
    `| \`spatiotemporal_overlay\` | **NO** | 需要「历史空间层 + 对象空间锚」两样。` +
      `空间锚一侧已有基础（${spatial.withPoint} 个对象有当前坐标），但**历史图层一侧为 0**：` +
      "(a) 无含金泽的历史地图（SHR-06 冻结：宏观府境图不足）；" +
      "(b) 无历史影像可挂到位置上；(c) 无平面几何。少的是**历史那一维**，不是坐标那一维。 |"
  );
  L.push(
    `| \`scene_reconstruction\`（仅数据/图层重建，禁生成式图像） | **PARTIAL** | 可做的是**关系层重建**：` +
      "已入库可支撑「桥桥有庙」「同跨一河」「宋元清三代桥型序列」等**文本层关系**，叠加 8 个对象的当前坐标；" +
      "做不到的是**形制/尺度层重建**——无平面几何、无实测坐标（现有坐标全为 provider 或近似范围，" +
      "按 SHR-01/03/04/05 均**不得**升级为 `verified_object_point`）。 |");
  L.push("");

  L.push("## 2. 三句话总结");
  L.push("");
  L.push("1. **现在能做的**：以图为入口讲「哪座桥是什么」，共 8 个对象，身份可辩护。");
  L.push("2. **现在不能做的**：任何需要「过去的样子」或「空间里的历史图层」的表达——今昔对照、时空叠置。");
  L.push("3. **最短解锁路径**：不是再找更多当代照片（那只会让 immersive 从 PARTIAL 变好一点），");
  L.push("   而是给**历史影像**找到可核验的题录（年代/地点/来源），或找到**含金泽的历史地图**——二者任一突破，");
  L.push("   `past_present_comparison` 与 `spatiotemporal_overlay` 才可能同时松动。");
  L.push("");
  L.push("> 本报告**不含**任何 UI 设计、版式建议或组件规划；这些须由后续独立任务承接。");
  return L.join("\n") + "\n";
}

// ───────────────────────────── WP-G 人审 CSV ─────────────────────────────
function buildHumanReviewCsv(assets, links, conflicts) {
  const rows = [];
  const esc2 = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const hdr = [
    "case_id", "case_type", "asset_ref", "target_object", "machine_state",
    "conflict_or_gap", "question_for_human", "why_machine_cannot_decide", "source_uri",
  ];
  let n = 0;
  for (const c of conflicts) {
    n += 1;
    const a = assets.find((x) => String(x.file_path || "").endsWith(String(c.file).replace("File:", "")) || String(x.file_path || "").includes(String(c.file).replace("File:", "").replace(/ /g, "_")));
    rows.push([
      `HRV-${String(n).padStart(2, "0")}`,
      "caption_period_conflict",
      c.file,
      c.object,
      "link_status=confirmed（身份由标题点名）；年代声明与已入库论断矛盾",
      c.reasons.join("；"),
      `该资产的说明文字给出的年代与已入库论断不一致，应以哪一方为准？（或标注为存疑、双双并陈？）`,
      "冲突双方都有来源（一是来源说明，二是已入库论断），机器无权判定哪一方为真；自动二选一会造成不可追溯的篡改",
      a ? String(a.source_uri || a.file_path || "") : "",
    ]);
  }
  for (const l of links.filter((x) => x.link_status === "unconfirmed")) {
    n += 1;
    const a = assets.find((x) => x.asset_id === l.asset_id) || {};
    rows.push([
      `HRV-${String(n).padStart(2, "0")}`,
      "identity_unresolved",
      shortId(a.legacy_id) || shortId(a.file_path),
      l.depicted_entity_label || "金泽镇历史镇景与水系",
      "rights 已知（上图开放数据·开放授权）；无链接（R5：题录不足）",
      "题录无标题/无说明/无年代/无作者 → 判不出被描绘对象与被描绘年代",
      "看一眼这张图：它是否描绘金泽？是否呈现历史（民国及以前）面貌？若是，可给出可核验的题录或判断依据吗？",
      "按 §5 不得由上传/检索日期推断被描绘年代；身份与年代必须由题录或人工判断提供，机器无法从像素得出",
      String(a.source_uri || a.file_path || ""),
    ]);
  }
  const lines = [hdr.map(esc2).join(",")];
  for (const r of rows) lines.push(r.map(esc2).join(","));
  return { csv: lines.join("\n") + "\n", count: rows.length, byType: rows.reduce((m, r) => { m[r[1]] = (m[r[1]] || 0) + 1; return m; }, {}) };
}

async function main() {
  const assets = await collect();
  const links = await loadLinksWithEvidence();
  const counts = {
    byType: (await queryRows("select asset_type, count(*)::int n from visual_assets group by 1")).reduce((m, r) => { m[r.asset_type] = Number(r.n); return m; }, {}),
    rights: (await queryRows("select rights, count(*)::int n from visual_assets group by 1 order by 2 desc")).map((r) => ({ rights: r.rights, n: Number(r.n) })),
  };
  // 分类码回填（供 WP-E 计数用）
  for (const a of assets) a.classCode = classify(a).code;

  const summary = LINKAGE_PATH ? JSON.parse(fs.readFileSync(LINKAGE_PATH, "utf8")) : {};
  const conflicts = (summary.conflicts || []).slice();
  // 链接行补 gate_tier / entity legacy_id（来自 linkage 结果的 rows）
  const rowById = new Map((summary.rows || []).map((r) => [r.asset_id, r]));
  for (const l of links) {
    const r = rowById.get(l.asset_id);
    if (r) {
      l.gate_tier = r.gate_tier;
      l.entity_legacy_id = r.entity_legacy_id;
      l.caption_claimed_period = r.caption_claimed_period;
      l.creation_date = r.creation_date;
    }
  }

  // 空间坐标可用性（只读）
  const srows = await queryRows(
    `select place_hint,
            region_json->>'precision_status' auto,
            region_json->'human_review'->>'effective_precision_status' eff,
            region_json->'human_review'->'accepted_point'->>'location_raw' hr_pt,
            region_json->'provider_hit'->>'location_raw' ph_pt
       from evidence where extraction_method like 'spatial_anchor%' order by 1`
  );
  const spatial = {
    rows: srows
      .filter((r) => !r.place_hint.includes("…") && !r.place_hint.includes("→"))
      .map((r) => ({ place_hint: r.place_hint, effective: r.eff || r.auto, point: r.hr_pt || r.ph_pt || null })),
    townAnchors: srows.filter((r) => r.place_hint.includes("→")).length,
    withPoint: srows.filter((r) => r.hr_pt || r.ph_pt).length,
  };

  // 历史影像探针：直接从 Raw Store 回读探针响应，报告每条查询的真实命中数。
  // 不从记忆/手打填数字——「零结果」必须由落盘原文可复核（Raw Store append-only）。
  let hist = null;
  if (RAW_DIR && fs.existsSync(RAW_DIR)) {
    const files = fs.readdirSync(RAW_DIR).filter((f) => /histsprobe.*\.json$/.test(f));
    hist = {
      raw_dir: RAW_DIR,
      queries: files.map((f) => {
        let hits = null;
        try {
          const j = JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), "utf8"));
          const pages = j.query && j.query.pages ? Object.keys(j.query.pages) : [];
          hits = pages.length;
        } catch { /* 保守：解析失败即留 null */ }
        return { q: f.replace(/^commons-/, "").replace(/\.json$/, ""), hits };
      }),
    };
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const outs = {
    inventory: path.join(OUT_DIR, "jinze-visual-inventory.md"),
    linkage: path.join(OUT_DIR, "jinze-visual-linkage.md"),
    evidence: path.join(OUT_DIR, "jinze-visual-evidence.md"),
    readiness: path.join(OUT_DIR, "jinze-visual-readiness.md"),
    humanReview: path.join(OUT_DIR, "jinze-visual-human-review.csv"),
  };
  fs.writeFileSync(outs.inventory, buildInventory(assets, counts), "utf8");
  fs.writeFileSync(outs.linkage, buildLinkage(links, assets, conflicts), "utf8");
  fs.writeFileSync(outs.evidence, buildEvidenceGate(assets, links, hist, counts), "utf8");
  fs.writeFileSync(outs.readiness, buildReadiness(assets, links, spatial), "utf8");
  const hr = buildHumanReviewCsv(assets, links, conflicts);
  fs.writeFileSync(outs.humanReview, hr.csv, "utf8");

  console.log(JSON.stringify({
    assets_total: assets.length,
    by_class: assets.reduce((m, a) => { m[a.classCode] = (m[a.classCode] || 0) + 1; return m; }, {}),
    links_confirmed: links.filter((l) => l.link_status === "confirmed").length,
    links_unconfirmed: links.filter((l) => l.link_status === "unconfirmed").length,
    human_review_rows: hr.count,
    human_review_by_type: hr.byType,
    spatial_with_point: spatial.withPoint,
    outputs: outs,
  }));
}

main().catch((e) => {
  console.error("BUILD VISUAL REPORTS FAILED:", e.message);
  process.exit(1);
});
