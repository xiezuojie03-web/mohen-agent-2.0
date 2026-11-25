#!/usr/bin/env node
/**
 * 段 5 真实内容生成（金泽）：授权通道内跑 H1→H2→H3 + 四面板，只打印不落库。
 *
 * 路径（M5 批次 G 正道）：
 *   授权委托 77bdea5d（llm_director_h1/h2/h3 + llm_work_panels / GRANTED / 1.00 USD）
 *   → authorizeStudioDispatchGrant(maxCalls=4) 铸一次 grant
 *   → dispatchWithGrant 依次真实调用 H1(识母题) → H2(A/B 方案) → H3(分镜 beats) → 四面板
 *   每步都用 studio-creation.ts 的原始提示词与解析器（原样带入，不复制第二套逻辑）。
 *
 * 本脚本只输出生成结果与费用，不写库。产出经人工核验无编造后再由后续步骤持久化。
 * 铁律护栏：provenanceRefs 必须逐字引用输入事实，禁止新增年份/地名/人物/关系/事件。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && m[2] !== "") env[m[1]] = m[2];
}
// 只注入必需的运行时变量，不打印任何值。
for (const k of ["DATABASE_URL", "MOHEN_DATABASE_SESSION_SECRET", "MOHEN_LLM_API_KEY", "DEEPSEEK_API_KEY"]) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}

{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!loopback || !/dev|isolat|test/.test(name)) throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "a2b0cf23-edba-42ec-8c44-0911eb52855e";
const DELEGATION = "77bdea5d-f932-affd-9b13-19b14523e4c0";
const SOURCE = "f889a887-1320-43bb-b505-01106e881abb";
const CLAIM_REV = "02ef673c-8a2c-8810-3571-8a3c30bb6643";
const PROJECTION = "4dd2a3f3-e396-1c67-8088-a94282216809";
const ACTIONS = ["llm_director_h1", "llm_director_h2", "llm_director_h3", "llm_work_panels"];

const BRIEF = "以《上海地名志·金泽》条目为唯一史料，制一部短篇历史作品：讲清金泽镇名称由来（古名白苎里、\u201c穑人获泽如金\u201d之说）与沿水聚落格局；严格只讲方志可证内容，存疑处如实保留，不新增任何事实。";

const MOTIFS = {
  M1: { code: "M1", name: "消失的关系世界", question: "今天彼此孤立的桥、河、寺、街、市场、遗址、人物或制度，过去是否曾属于同一个生活世界？" },
  M2: { code: "M2", name: "一个地方为什么会长成这样", question: "为什么这里会有这么多桥/庙/巷/码头/城门/会馆/园林？反复出现的事物背后是什么结构？" },
  M3: { code: "M3", name: "过去的人生活在怎样的一张地图里", question: "过去的人如何通过水、路、市场、信仰、生产和往来理解这里？" },
  M4: { code: "M4", name: "一个地方究竟是怎样活起来的", question: "自然条件、交通、生产、贸易、信仰、制度与人的日常如何共同生成聚落、街区、城市或文化空间？" },
  M5: { code: "M5", name: "今天到底还剩多少过去", question: "眼前哪些是原物、重建、延续的名称、空间关系、生活习惯、记忆或后来的文化重塑？" },
};

const nonempty = (v) => typeof v === "string" && v.trim().length > 0;
const strings = (v) => Array.isArray(v) && v.every(nonempty);
function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
function parseH1(value) {
  const p = value;
  if (!p || !strings(p.motifCodes) || !p.motifCodes.length || !p.motifCodes.every((c) => Object.hasOwn(MOTIFS, c))
    || !nonempty(p.historicalQuestion) || !nonempty(p.understandingDelta) || !nonempty(p.supportScope)
    || !strings(p.limitations)) return null;
  return { motifCodes: p.motifCodes.slice(0, 3), historicalQuestion: String(p.historicalQuestion), understandingDelta: String(p.understandingDelta), supportScope: String(p.supportScope), limitations: p.limitations.map(String) };
}
function validPlan(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return nonempty(v.angle) && strings(v.points) && v.points.length > 0 && nonempty(v.cover)
    && (v.motif === undefined || (typeof v.motif === "string" && Object.hasOwn(MOTIFS, v.motif)))
    && (v.directorDecisions === undefined || strings(v.directorDecisions));
}
function parsePlans(value) {
  const p = value;
  if (!validPlan(p?.planA) || !validPlan(p?.planB)) return null;
  return { planA: p.planA, planB: p.planB };
}
function parseBeats(value, facts) {
  const p = value;
  if (!Array.isArray(p?.beats) || !p.beats.length) return null;
  const allowed = new Set(facts);
  let prev = -1;
  for (const b of p.beats) {
    if (!b || !nonempty(b.title) || !nonempty(b.narration) || !nonempty(b.visual)
      || !Number.isSafeInteger(b.directorTimecodeMs) || b.directorTimecodeMs < 0 || b.directorTimecodeMs <= prev
      || !strings(b.provenanceRefs) || !b.provenanceRefs.length || !b.provenanceRefs.every((r) => allowed.has(r))) return null;
    prev = b.directorTimecodeMs;
  }
  return p.beats;
}

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const errCode = (e) => (e && typeof e === "object" && "code" in e) ? String(e.code) : String(e?.message ?? e).split("\n")[0];

async function main() {
  const dataAccess = await import("../packages/data-access/src/index.mjs");
  const dispatcher = await import("../apps/web/lib/studio/provider-dispatcher.ts");
  const deps = await dispatcher.createStudioDispatcherDeps();

  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  if (!process.env.MOHEN_LLM_API_KEY && !process.env.DEEPSEEK_API_KEY) throw new Error("LLM API key missing");
  const token = makeToken(OWNER, secret);

  // 收集合格事实：证据 literal_reading + 世界投影 body.facts + claim 断言。
  const factSet = new Set();
  const evRows = await dataAccess.queryRows(
    `select literal_reading as t from evidence.material_evidence
      where source_id = :'sid'::uuid and literal_reading is not null and char_length(literal_reading) > 0`, { sid: SOURCE });
  evRows.forEach((r) => factSet.add(String(r.t).trim()));
  const clRows = await dataAccess.queryRows(
    `select assertion_payload_json->>'assertion' as t from world.claim_revisions where claim_revision_id = :'cid'::uuid`, { cid: CLAIM_REV });
  clRows.forEach((r) => { if (nonempty(r.t)) factSet.add(String(r.t).trim()); });
  const projRows = await dataAccess.queryRows(
    `select jsonb_array_elements(payload->'body'->'facts')->>'assertion' as t
      from read_model.world_projections where projection_id = :'pid'::uuid`, { pid: PROJECTION });
  projRows.forEach((r) => { if (nonempty(r.t)) factSet.add(String(r.t).trim()); });
  const facts = [...factSet];
  if (facts.length < 2) throw new Error(`insufficient facts: ${facts.length}`);
  console.log(`FACTS ${facts.length} 条，最长 ${Math.max(...facts.map((f) => f.length))} 字`);

  const delegation = await deps.delegations.getDelegation(DELEGATION, token);
  if (!delegation) throw new Error("DELEGATION_NOT_FOUND");
  console.log(`DELEGATION ${delegation.delegation_id} budget=${delegation.budget_limit} ${delegation.currency} xp=${delegation.transfer_rights_decision?.external_processing}`);

  const grant = await dispatcher.authorizeStudioDispatchGrant(deps, {
    delegationId: DELEGATION, projectId: PROJECT, actions: ACTIONS,
    model: "deepseek-flash", sourceIds: [SOURCE], sessionToken: token, maxCalls: 4,
  });
  console.log(`GRANT_AUTHORIZED grantId=${grant.grantId}`);

  const factsBlock = facts.map((f) => "- " + f).join("\n");

  // H1
  const h1 = await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h1", {
    system: `你是墨痕的 H1 历史叙事方法。基于真实材料识别适用母题（M1-M5），形成认识增量。
铁律：1. 母题是追问方向，不是答案；材料不足就收窄问题、保留未知；2. 禁止新增任何年份、地名、人物、关系、事件；3. 认识增量必须基于材料里能查证的内容。
母题定义：
${Object.values(MOTIFS).map((m) => `${m.code} ${m.name}：${m.question}`).join("\n")}
只输出 JSON：{"motifCodes":["M1"],"historicalQuestion":"...","understandingDelta":"...","supportScope":"...","limitations":["..."]}。`,
    user: `真实材料：\n${factsBlock}\n\n委托：${BRIEF}`, temperature: 0.3,
  });
  console.log("H1_RAW", (h1.text ?? "").slice(0, 500));
  const finding = parseH1(parseJson(h1.text ?? ""));
  console.log("H1_PARSED", finding ? JSON.stringify(finding) : "(parse fail)");
  if (!finding) throw new Error("H1_PARSE_FAIL");

  const motifLine = `适用母题：${finding.motifCodes.join("、")}\n历史问题：${finding.historicalQuestion}\n认识增量：${finding.understandingDelta}\n支持范围：${finding.supportScope}`;

  // H2
  const h2 = await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h2", {
    system: `你是墨痕的创作编导（H2）。基于给定的真实历史材料和 H1 认识增量，为一部短纪录片式作品生成两个不同的讲故事方案（A/B）。
铁律（违反即作废）：1. 只能使用「真实材料」里出现的事实，禁止新增任何年份、地名、人物、关系、事件；2. 方案A与方案B的差异必须来自叙事角度/结构（导演取舍 D1-D7：视角、故事顺序、主要焦点、节奏），不是换措辞；3. 每个方案给出 angle（一句话角度）、points（3条结构要点）、cover（封面画面建议）、motif（一个母题代码）、directorDecisions（2-3条导演取舍）。4. 只输出 JSON：{"planA":{"angle":"...","points":["..."],"cover":"...","motif":"M1","directorDecisions":["..."]},"planB":{...}}，不要多余文字。`,
    user: `真实材料：\n${factsBlock}\n\n${motifLine}\n\n委托：${BRIEF}`, temperature: 0.7,
  });
  console.log("H2_RAW", (h2.text ?? "").slice(0, 800));
  const plans = parsePlans(parseJson(h2.text ?? ""));
  console.log("H2_PARSED", plans ? JSON.stringify(plans) : "(parse fail)");
  if (!plans) throw new Error("H2_PARSE_FAIL");

  // H3（用方案 A）
  const plan = plans.planA;
  const h3 = await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h3", {
    system: `你是墨痕的创作编导。基于给定的真实历史材料和一个选定的讲故事方案，生成这部短作品的分镜章节。
铁律：1. 只能使用材料里的事实，禁止新增任何年份、地名、人物、关系、事件；2. 每章给出 title（标题）、narration（旁白，2-3句话，纪录片口吻，只讲有据内容）、visual（画面建议，1句，基于材料里的对象）、directorTimecodeMs（导演时码，毫秒，从0递增，各章间隔约5000-15000）、provenanceRefs（逐项原样引用输入真实材料列表中的完整字符串，不得自编标识符）；3. 共 3-5 章；时码是播放时间，不是历史年代。4. 只输出 JSON：{"beats":[{"title":"...","narration":"...","visual":"...","directorTimecodeMs":0,"provenanceRefs":["..."]}]}，不要多余文字。`,
    user: `真实材料：\n${factsBlock}\n\n选定方案：${plan.angle}\n结构要点：${plan.points.join("；")}`, temperature: 0.7,
  });
  console.log("H3_RAW", (h3.text ?? "").slice(0, 1200));
  const beats = parseBeats(parseJson(h3.text ?? ""), facts);
  console.log("H3_PARSED", beats ? JSON.stringify(beats) : "(parse fail)");
  if (!beats) throw new Error("H3_PARSE_FAIL");

  // 四面板
  const pan = await dispatcher.dispatchWithGrant(deps, grant, "llm_work_panels", {
    system: `你是墨痕的视觉与音乐导演。基于给定的导演方案和真实材料，为一部短纪录片式历史作品设计画面风格与背景音乐方案。
铁律：1. 禁止新增任何年份、地名、人物、关系、事件；2. 画面风格要克制、真实，符合历史纪录片的质感；3. 音乐方案必须诚实——无版权音乐就建议"静音 + 环境声"，不得虚构可用的音乐曲目。
只输出 JSON：{"visualStyle":{"style":"...","palette":"...","shot":"..."},"soundtrack":{"plan":"...","note":"..."}}，不要多余文字。`,
    user: `导演方案：${plan.angle}\n真实材料：\n${factsBlock}`, temperature: 0.6,
  });
  const panelsJson = parseJson(pan.text ?? "");
  console.log("PANELS", panelsJson ? JSON.stringify(panelsJson) : "(parse fail): " + (pan.text ?? "").slice(0, 300));

  const receipts = await deps.delegations.listReceipts(DELEGATION, token);
  const total = receipts.reduce((s, r) => s + Number(r.cost ?? 0), 0);
  console.log("\n===== SUMMARY =====");
  console.log("finding:", JSON.stringify(finding.understandingDelta ?? ""));
  console.log("planA.angle:", plan.angle);
  console.log("beats:", beats.length, "章");
  beats.forEach((b, i) => console.log(`  [${i}] ${b.title} | ${b.directorTimecodeMs}ms | ${b.narration.slice(0, 80)}`));
  console.log("receipts:", receipts.length, "total_cost=$" + total.toFixed(6));
  console.log("GENERATION_OK (未落库，待核验无编造后持久化)");

  const out = {
    generated_at: new Date().toISOString(),
    project_id: PROJECT,
    source_id: SOURCE,
    delegation_id: DELEGATION,
    facts,
    brief: BRIEF,
    finding,
    planA: plans.planA,
    planB: plans.planB,
    selected: "A",
    beats,
    panels: panelsJson ?? null,
    cost_usd: total,
    receipt_count: receipts.length,
  };
  const outPath = path.join(ROOT, "work", "scratch", "shinze-generation.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("WROTE", outPath);
}

try {
  await main();
} catch (e) {
  console.log("GENERATION_FAIL code=", errCode(e));
  process.exitCode = 1;
}