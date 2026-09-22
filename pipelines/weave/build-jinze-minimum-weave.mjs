// pipelines/weave/build-jinze-minimum-weave.mjs — TASK-0006 WP-B/C/D
//
// 唯一主链：Evidence → Claim → Entity/Relation/Change → Knowledge Path → Discovery Candidate
//
// 铁律（TASK-0006 §3/§6/§9）：
//   - 每条新 claim 必须有 Evidence linkage（不变量 1）；无 Evidence 的一律不建 claim。
//   - 不从词语共现生成语义关系（不变量 2）。
//   - legend 保持 legend（赵孟頫↔颐浩寺不建 claim）；research 保持 unresolved（四十二虹桥不批量 part_of）。
//   - HR-3/HR-5/HR-6 不变；不猜坐标；不 published；不写 Legacy；无 secret。
//   - 只使用既有 Evidence，不新增外部检索。
//
// 幂等：自身产物按 generated_by='mohen-knowledge-weave'（claims）/ path_code / discovery_code 先删后写。

import crypto from "node:crypto";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";
// 复用与 recover 完全一致的门禁逻辑：weave 产出的 claim 必须同样走 G0–G6，
// 否则 recover 重跑会因「新对象未审计」而新增审计行，破坏其幂等（TASK-0004 test 8）。
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";

const GEN = "mohen-knowledge-weave";
// recover.mjs 对 claim 的强制 Tier C 理由（保持一致，使两方写入的审计行内容稳定）
const CLAIM_FORCEC = "关键结论由 Legacy 字段继承，未经独立来源复核";

// 稳定确定性 UUID：同一 code 每次运行得到同一 claim_id/path_id/discovery_id，
// 避免 delete+reinsert 造成的 UUID churn（churn 会遗留悬空审计行）。
function detUuid(code) {
  const h = crypto.createHash("sha256").update(`mohen-weave/v1/${code}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// —— 解析器：一律按内容定位，绝不硬编码 UUID；找不到即 fail loud，不伪造 ——
async function entityId(name) {
  const r = await queryRows(`select entity_id::text as id from entities where canonical_name=:'n' limit 1`, { n: name });
  if (!r.length) throw new Error(`entity not found: ${name}`);
  return r[0].id;
}
async function evWhere(where, params) {
  const r = await queryRows(`select evidence_id::text as id from evidence where ${where} order by evidence_id limit 1`, params);
  if (!r.length) throw new Error(`evidence not found for: ${where} ${JSON.stringify(params || {})}`);
  return r[0].id;
}

async function main() {
  // ── 定位关键 Entity ─────────────────────────────────────────────
  const E = {
    ovl1: await entityId("白苎里 → 金溪 → 金泽 · 地名叠影"), // 地名层积（含独立于 Legacy 的 JZ-OVL-001）
    wanan: await entityId("万安桥"),
    puji: await entityId("普济桥"),
    yingxiang: await entityId("迎祥桥"),
    yihaosi: await entityId("颐浩寺遗址"),
    lvyihao: await entityId("吕颐浩"),
    zhaomengfu: await entityId("赵孟頫"),
  };

  // ── 定位关键 Evidence（全部来自既有库，不新增检索）──────────────
  const EV = {
    // S1 地名志：金泽古名白苎里
    dmzPlace: await evWhere(`extraction_method='s1_shnh_dmz_webapi_geonames_list' and locator=:'l'`,
      { l: "http://data.library.sh.cn/dmz/entity/place/ij2dm4q8uoe086kv" }),
    // S1 地名志(镇)：现存古桥21座 + 桥名罗列
    dmzTown: await evWhere(`extraction_method='s1_shnh_dmz_webapi_geonames_list' and quote_text ilike '%现存古桥%'`, {}),
    // Legacy 桥描述（姐妹桥）
    sisters: await evWhere(`extraction_method='legacy_description_mining' and subject_hint=:'s'`, { s: "万安桥 / 普济桥" }),
    // 各桥建造年代（上图 legacy_json_extract）
    wananBuilt: await evWhere(`extraction_method='legacy_json_extract' and quote_text ilike '%景定年间%'`, {}),
    pujiBuilt: await evWhere(`extraction_method='legacy_json_extract' and quote_text ilike '%咸淳三年%'`, {}),
    yingxiangBuilt: await evWhere(`extraction_method='legacy_json_extract' and quote_text ilike '%至元年间%'`, {}),
    // 颐浩寺「就吕颐浩故宅创建，寺名取自其人」
    yihaosiDesc: await evWhere(`extraction_method='legacy_description_mining' and subject_hint=:'s'`, { s: "颐浩寺遗址 / 吕颐浩" }),
    // 颐浩寺遗址 元代遗物（不断云石刻）
    yihaosiYuan: await evWhere(`extraction_method='legacy_entity_source' and quote_text ilike '%不断云%'`, {}),
    // 赵孟頫 生卒（上图著录 1271-1368）
    zmfPeriod: await evWhere(`extraction_method='legacy_entity_source' and subject_hint='赵孟頫'`, {}),
    // 吕颐浩 Wikidata 身份锚点（HR-1）
    lvyihaoIdentity: await evWhere(`extraction_method='identity_resolution:wikidata_entity_match'`, {}),
  };

  // ── 既有语义关系（evidence-backed，非 crossLink）────────────────
  const rels = await queryRows(`
    select r.relation_id::text as id, s.canonical_name as subj, r.predicate, o.canonical_name as obj,
           (select count(*) from relation_evidence re where re.relation_id=r.relation_id)::int as ev
      from relations r join entities s on r.subject_id=s.entity_id join entities o on r.object_id=o.entity_id
     where r.predicate <> 'crossLink' order by r.predicate, s.canonical_name`);
  const relByName = (subj, pred, obj) => {
    const hit = rels.find((r) => r.subj === subj && r.predicate === pred && r.obj === obj);
    if (!hit) throw new Error(`relation not found: ${subj} ${pred} ${obj}`);
    return hit;
  };
  const R = {
    namedAfter: relByName("颐浩寺遗址", "named_after", "吕颐浩"),        // 颐浩寺名取自吕颐浩
    pujiWanan: relByName("普济桥", "spans_same_waterway", "万安桥"),     // 姐妹桥
    lvyihaoYihaosi: relByName("吕颐浩", "mentioned_in", "颐浩寺遗址"),
  };

  // ── 幂等：稳定确定性 ID（不 churn）+ 仅清理「已不在定义中的」旧 weave 对象 ──
  const CLAIM_CODES = ["clm-jinze-former-name", "clm-jinze-bridge-town", "clm-wanan-extant", "clm-puji-extant", "clm-yingxiang-extant"];
  const PATH_CODES = ["PATH-jinze-toponym", "PATH-jinze-bridge-town", "PATH-jinze-yihaosi-candidate"];
  const DSC_CODES = ["DSC-jinze-toponym-layering", "DSC-jinze-bridge-museum", "DSC-yihaosi-naming-memory", "DSC-zhaomengfu-legend"];
  const uuidArr = (codes, prefix) => `{${codes.map((c) => detUuid(prefix + c)).join(",")}}`;
  await run(`delete from claims where generated_by=:'g' and claim_id <> all(:'ids'::uuid[])`, { g: GEN, ids: uuidArr(CLAIM_CODES, "claim:") });
  await run(`delete from knowledge_paths where generated_by=:'g' and path_id <> all(:'ids'::uuid[])`, { g: GEN, ids: uuidArr(PATH_CODES, "path:") });
  await run(`delete from discovery_candidates where generated_by=:'g' and discovery_id <> all(:'ids'::uuid[])`, { g: GEN, ids: uuidArr(DSC_CODES, "disc:") });
  // 悬空 claim 审计行清理（快照一致性：删除对象不会自动删其审计行，会留下指向不存在对象的兜底行）
  await run(`delete from evidence_gate_audit a where a.object_type='claim'
             and not exists (select 1 from claims c where c.claim_id::text = a.object_id)`);

  // ══ WP-B：最小 claim 集（每条都有 Evidence）══════════════════════
  // certainty=0 表示「未评分」（沿用本项目既有 claims 约定），不把 confidence=0 猜成具体分值。
  const newClaims = [
    {
      code: "clm-jinze-former-name",
      subject: E.ovl1, predicate: "former_name", objectId: null,
      objectValue: { former_name: "白苎里", current_name: "金泽", attested_by: "S1 地名志" },
      reviewNote: "S1 地名志原文：古名白苎里…故名金泽。中间名『金溪』仅见于 Legacy 实体名，S1 未获证据。",
      evidence: [EV.dmzPlace],
    },
    {
      code: "clm-jinze-bridge-town",
      subject: E.ovl1, predicate: "known_as_bridge_town", objectId: null,
      objectValue: {
        epithet: "上海的桥乡", extant_ancient_bridges: 21,
        // 严格照录 S1 地名志原字（R-引用1 引文不篡改）。
        // 注意：S1 原文作「天王阁桥」，本库 Legacy 实体名为「天皇阁桥」——同一桥的异写。
        // 此处保留 S1 原字，另以 legacy_name_variant 记录异写映射，不把 Legacy 写法冒充 S1 原文。
        named_ancient_bridges_s1: {
          "宋": ["万安桥", "普济桥"],
          "元": ["迎祥桥", "如意桥"],
          "清": ["天王阁桥", "放生桥"],
        },
        legacy_name_variant: { "天王阁桥": "天皇阁桥" },
      },
      reviewNote: "S1 地名志原文：是上海的『桥乡』，现存古桥21座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥、如意桥，建于清代的天王阁桥、放生桥等。",
      evidence: [EV.dmzTown],
    },
    {
      code: "clm-wanan-extant",
      subject: E.ovl1, predicate: "has_extant_ancient_bridge", objectId: E.wanan,
      objectValue: { dynasty: "宋", built: "南宋景定年间（1260-1264）" },
      reviewNote: "S1 地名志 + 上图桥梁著录。",
      evidence: [EV.dmzTown, EV.wananBuilt],
    },
    {
      code: "clm-puji-extant",
      subject: E.ovl1, predicate: "has_extant_ancient_bridge", objectId: E.puji,
      objectValue: { dynasty: "宋", built: "南宋咸淳三年（1267）" },
      reviewNote: "S1 地名志 + 上图桥梁著录。",
      evidence: [EV.dmzTown, EV.pujiBuilt],
    },
    {
      code: "clm-yingxiang-extant",
      subject: E.ovl1, predicate: "has_extant_ancient_bridge", objectId: E.yingxiang,
      objectValue: { dynasty: "元", built: "元（后）至元年间（1335-1340）" },
      reviewNote: "S1 地名志 + 上图桥梁著录。",
      evidence: [EV.dmzTown, EV.yingxiangBuilt],
    },
  ];

  const claimIds = {};
  for (const c of newClaims) {
    const cid = detUuid("claim:" + c.code);
    claimIds[c.code] = cid;
    await run(
      `insert into claims(claim_id, subject_id, predicate, object_id, object_value, certainty, status, review_tier, generated_by, review_note)
       values (:'id'::uuid, :'subj'::uuid, :'pred', :'obj', :'ov'::jsonb, 0, 'candidate', 'C', :'g', :'note')
       on conflict (claim_id) do update set
         subject_id=excluded.subject_id, predicate=excluded.predicate, object_id=excluded.object_id,
         object_value=excluded.object_value, review_note=excluded.review_note, status='candidate', review_tier='C'`,
      { id: cid, subj: c.subject, pred: c.predicate, obj: c.objectId, ov: JSON.stringify(c.objectValue), g: GEN, note: c.reviewNote }
    );
    await run(`delete from claim_evidence where claim_id=:'c'::uuid`, { c: cid });
    for (const e of c.evidence) {
      await run(`insert into claim_evidence(claim_id, evidence_id) values (:'c'::uuid, :'e'::uuid) on conflict do nothing`,
        { c: cid, e });
    }
    // 门禁审计：与 recover 对 claim 的评估口径一致（同对象同门 delete+insert，重跑幂等）
    const evCount = c.evidence.length;
    const res = evaluateGates({
      source: evCount > 0, identity: true, time: undefined, spatial: undefined,
      evidence: evCount > 0, conflict: false, forcedC: [CLAIM_FORCEC],
    });
    for (const gc of GATE_CODES) {
      await run(`delete from evidence_gate_audit where object_type='claim' and object_id=:'oid' and gate_code=:'gc'`, { oid: cid, gc });
      await run(
        `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
         values ('claim',:'oid',:'gc',:'rs',:'rn','rule')`,
        { oid: cid, gc, rs: res.gates[gc].result, rn: res.gates[gc].reason }
      );
    }
  }

  // ══ WP-C：最小 Knowledge Path（≥2，此处 3；短链不填充弱关系）════
  const arr = (ids) => `{${ids.join(",")}}`;

  const paths = [
    {
      code: "PATH-jinze-toponym",
      title: "金泽地名层积（白苎里 → 金泽）",
      question: "金泽之名从何而来？",
      status: "candidate",
      steps: [
        { kind: "entity", ref: E.ovl1, label: "白苎里 → 金溪 → 金泽 · 地名叠影", st: "candidate", ev: [] },
        { kind: "claim", ref: claimIds["clm-jinze-former-name"], label: "古名白苎里 → 今名金泽（S1 地名志）", st: "candidate", ev: [EV.dmzPlace] },
      ],
      coverage: { evidence_ids: [EV.dmzPlace], covered_steps: 1, total_steps: 2 },
      breaks: [{ break: "中间名『金溪』仅见于 Legacy 实体名，S1 未获证据", impact: "三段地名层积不得呈现为连续链" }],
    },
    {
      code: "PATH-jinze-bridge-town",
      title: "桥乡谱系（金泽 · 古桥群 → 三座宋元古桥）",
      question: "金泽为何被称为『桥乡／古桥博物馆』？",
      status: "candidate",
      steps: [
        { kind: "claim", ref: claimIds["clm-jinze-bridge-town"], label: "金泽=上海的桥乡，现存古桥21座", st: "candidate", ev: [EV.dmzTown] },
        { kind: "claim", ref: claimIds["clm-wanan-extant"], label: "万安桥（宋代）现存", st: "candidate", ev: [EV.dmzTown, EV.wananBuilt] },
        { kind: "claim", ref: claimIds["clm-puji-extant"], label: "普济桥（宋代）现存", st: "candidate", ev: [EV.dmzTown, EV.pujiBuilt] },
        { kind: "claim", ref: claimIds["clm-yingxiang-extant"], label: "迎祥桥（元代）现存", st: "candidate", ev: [EV.dmzTown, EV.yingxiangBuilt] },
        { kind: "relation", ref: R.pujiWanan.id, label: "普济桥 —同跨一河— 万安桥（姐妹桥）", st: "candidate", ev: [EV.sisters] },
      ],
      coverage: {
        evidence_ids: [EV.dmzTown, EV.wananBuilt, EV.pujiBuilt, EV.yingxiangBuilt, EV.sisters],
        covered_steps: 5, total_steps: 5,
      },
      breaks: [{ break: "『四十二虹桥』与今存桥群的关系未确认（HR-3 = research）；『今存七桥』一说暂无 S1 证据", impact: "古桥群历史总数不得作为事实给出" }],
    },
    {
      code: "PATH-jinze-yihaosi-candidate",
      title: "颐浩寺之名与吕颐浩（据地方文献记载 · candidate）",
      question: "颐浩寺与吕颐浩的关系（据地方文献记载）",
      status: "candidate",
      steps: [
        { kind: "entity", ref: E.lvyihao, label: "吕颐浩（南宋名相）", st: "candidate", ev: [EV.lvyihaoIdentity] },
        { kind: "relation", ref: R.namedAfter.id, label: "颐浩寺遗址 —寺名取自— 吕颐浩", st: "candidate", ev: [EV.yihaosiDesc] },
        { kind: "entity", ref: E.yihaosi, label: "颐浩寺遗址", st: "candidate", ev: [] },
      ],
      coverage: { evidence_ids: [EV.lvyihaoIdentity, EV.yihaosiDesc], covered_steps: 2, total_steps: 3 },
      breaks: [
        { break: "缺 S1 方志原文（gj instances / instanceInfo 0 命中），仅据地方文献描述", impact: "HR-4=B：不得升为无条件历史事实" },
        { break: "赵孟頫↔颐浩寺为 legend（HR-2），生年冲突未解（HR-6）", impact: "不得并入本路径作为事实" },
      ],
    },
  ];

  for (const p of paths) {
    const pid = detUuid("path:" + p.code);
    await run(
      `insert into knowledge_paths(path_id, path_code, title, purpose_question, status, evidence_coverage, unresolved_breaks, generated_by)
       values (:'id'::uuid, :'c', :'t', :'q', :'s', :'cov'::jsonb, :'brk'::jsonb, :'g')
       on conflict (path_id) do update set
         path_code=excluded.path_code, title=excluded.title, purpose_question=excluded.purpose_question,
         status=excluded.status, evidence_coverage=excluded.evidence_coverage, unresolved_breaks=excluded.unresolved_breaks`,
      { id: pid, c: p.code, t: p.title, q: p.question, s: p.status, cov: JSON.stringify(p.coverage), brk: JSON.stringify(p.breaks), g: GEN }
    );
    await run(`delete from knowledge_path_steps where path_id=:'p'::uuid`, { p: pid });
    let n = 0;
    for (const st of p.steps) {
      await run(
        `insert into knowledge_path_steps(path_id, step_no, step_kind, ref_id, label, epistemic_status, evidence_ids)
         values (:'p'::uuid, :'n', :'k', :'r', :'l', :'st', :'ev'::uuid[])`,
        { p: pid, n: ++n, k: st.kind, r: st.ref || null, l: st.label, st: st.st, ev: arr(st.ev) }
      );
    }
  }

  // ══ WP-D：Discovery Candidates（2–4，此处 4；全部 publishable=false）══
  const discoveries = [
    {
      code: "DSC-jinze-toponym-layering",
      title: "金泽地名层积：白苎里 → 金泽",
      objects: [{ type: "name", value: "白苎里" }, { type: "place", ref: E.ovl1, label: "金泽（地名叠影）" }],
      change: "地名变更：古名白苎里 → 今名金泽",
      evidence: [EV.dmzPlace],
      question: "金泽之名从何而来，命名逻辑承载什么？",
      status: "candidate",
      why: "地名是地方认同与记忆的起点；『穑人获泽如金』的命名逻辑本身承载水乡物产与泽地意象。",
      unresolved: [{ item: "中间名『金溪』无 S1 证据" }],
    },
    {
      code: "DSC-jinze-bridge-museum",
      title: "金泽『古桥博物馆』：宋元清桥群与姐妹桥谱系",
      // 桥名照 S1 地名志原字（天王阁桥）；「天皇阁桥」为 Legacy 异写，仅在 legacy_name_variant 中记录。
      objects: ["万安桥", "普济桥", "迎祥桥", "如意桥", "天王阁桥", "放生桥"].map((n) => ({ type: "bridge", value: n })),
      change: "空间/形制关系：同跨一河、形制相承；S1 地名志所列古桥跨宋、元、清三代（宋代万安桥/普济桥，元代迎祥桥/如意桥，清代天王阁桥/放生桥）",
      evidence: [EV.dmzTown, EV.sisters, EV.wananBuilt, EV.pujiBuilt, EV.yingxiangBuilt],
      question: "金泽为何被称为『桥乡／古桥博物馆』？",
      status: "candidate",
      why: "以一镇之力保存跨宋、元、清三代的桥型实物序列，是江南水乡聚落与桥梁技术的稀有样本。",
      unresolved: [{ item: "『四十二虹桥』与今存桥群的关系未确认（HR-3 禁止批量 part_of）；『今存七桥』一说目前无 S1 证据" }],
    },
    {
      code: "DSC-yihaosi-naming-memory",
      title: "颐浩寺：寺名与人物记忆的绑定（据地方文献记载）",
      objects: [{ type: "temple", ref: E.yihaosi, label: "颐浩寺遗址" }, { type: "person", ref: E.lvyihao, label: "吕颐浩" }],
      change: "命名/纪念关系：寺名取自吕颐浩，寺址即其故宅（据地方文献记载）",
      evidence: [EV.yihaosiDesc, EV.lvyihaoIdentity],
      question: "寺院与历史人物的命名记忆如何绑定？",
      status: "candidate",
      why: "寺名即人物记忆的活载体，体现地方对南宋人物的纪念性命名，是『人名—地名—寺名』互文的样本。",
      unresolved: [{ item: "缺 S1 方志原文；HR-4=B 仅 candidate，不得升为无条件历史事实" }],
    },
    {
      code: "DSC-zhaomengfu-legend",
      title: "赵孟頫『不断云』传说与颐浩寺元代遗物并置",
      objects: [{ type: "person", ref: E.zhaomengfu, label: "赵孟頫" }, { type: "temple", ref: E.yihaosi, label: "颐浩寺遗址" }, { type: "artifact", value: "不断云石刻（元代遗物）" }],
      change: "传说关联（legend / tradition，非实证）",
      evidence: [EV.yihaosiYuan, EV.zmfPeriod],
      question: "传说与实物如何并置，而不被误当史实？",
      status: "legend",
      why: "传说虽非实证，却是地方文化记忆的组成；与元代遗物在时间上可作有限比照。",
      unresolved: [{ item: "传说本身无一手证据（HR-2 定为 legend）" }, { item: "赵孟頫生年冲突 1271 vs 1254（HR-6）" }],
    },
  ];

  for (const d of discoveries) {
    await run(
      `insert into discovery_candidates(discovery_id, discovery_code, title, objects, relationship_change, evidence_refs,
         relevance_question, epistemic_status, humanistic_why, unresolved_evidence, publishable, generated_by)
       values (:'id'::uuid, :'c', :'t', :'o'::jsonb, :'ch', :'ev'::uuid[], :'q', :'st', :'w', :'un'::jsonb, false, :'g')
       on conflict (discovery_id) do update set
         discovery_code=excluded.discovery_code, title=excluded.title, objects=excluded.objects,
         relationship_change=excluded.relationship_change, evidence_refs=excluded.evidence_refs,
         relevance_question=excluded.relevance_question, epistemic_status=excluded.epistemic_status,
         humanistic_why=excluded.humanistic_why, unresolved_evidence=excluded.unresolved_evidence`,
      {
        id: detUuid("disc:" + d.code), c: d.code, t: d.title, o: JSON.stringify(d.objects), ch: d.change, ev: arr(d.evidence),
        q: d.question, st: d.status, w: d.why, un: JSON.stringify(d.unresolved), g: GEN,
      }
    );
  }

  // ── 回读计数 ─────────────────────────────────────────────────
  const cnt = async (sql) => Number((await queryRows(sql))[0].c);
  const summary = {
    weave_claims: await cnt(`select count(*)::int c from claims where generated_by='${GEN}'`),
    weave_claim_evidence_links: await cnt(`select count(*)::int c from claim_evidence ce join claims cl on cl.claim_id=ce.claim_id where cl.generated_by='${GEN}'`),
    weave_claims_without_evidence: await cnt(`select count(*)::int c from claims cl where cl.generated_by='${GEN}' and not exists (select 1 from claim_evidence ce where ce.claim_id=cl.claim_id)`),
    semantic_relations_used: rels.length,
    knowledge_paths: await cnt(`select count(*)::int c from knowledge_paths where generated_by='${GEN}'`),
    path_steps: await cnt(`select count(*)::int c from knowledge_path_steps kps join knowledge_paths kp on kp.path_id=kps.path_id where kp.generated_by='${GEN}'`),
    discovery_candidates: await cnt(`select count(*)::int c from discovery_candidates where generated_by='${GEN}'`),
    discovery_publishable_true: await cnt(`select count(*)::int c from discovery_candidates where publishable=true`),
    published_weave_claims: await cnt(`select count(*)::int c from claims where generated_by='${GEN}' and status::text='published'`),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => { console.error("WEAVE FAILED:", e.message); process.exit(1); });
