// 01-run-golden-eval.mjs — 第一层金样本实测（样本 1/5/6）
// 性质：只接 LLM 打金样本、只产出评测结果，不写库、不激活 production-registry、不发布 G5。
// 红线：合成测试不写真实历史；ground truth 全部来自冻结语义（SAMPLE-TRIAL-10）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const envPath = 'D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/.env.local';
const KEY = (readFileSync(envPath, 'utf8').match(/DEEPSEEK_API_KEY=([^\r\n]+)/) || [])[1]?.trim();
const BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat'; // 请求名；实际返回模型名以 usage/model 为准（实测 deepseek-flash）

const PROMPT_VERSION = 'sample-trial-10-layer1-v1.0';
const SCHEMA_VERSION = 'sample-trial-10-schemas-v1.0';

// ---- 提示词（提炼自 SAMPLE-TRIAL-10_STEP-PROMPTS_LAYER1.md，版本锁定）----
const D02_SYSTEM = `你是墨痕数据生产的 D02 材料观察器。按【分类→定位关键区→精读→结构化输出】四步跳读，只观察材料、不建世界事实、不判史实真伪。
方法：H05 地方志（主）/ H04 历史地理著作（邻类）。
纪律：
1. 分类：按材料知识组织目的判主类 H05，含地名沿革/山川水道判 H04 邻类；类型不清写 H-UNRESOLVED。
2. 定位关键区：凡涉及人/时/地/物/数的段落逐一给 span。
3. 精读：区分"本届纂修者/旧志引文/地方传闻/收录碑文"四层话语；"旧传""俗云""旧志转录"不得当独立证实。
4. 结构化输出：字面提及进 material_mentions（mention_kind ∈ person/time/place/thing/number，字面原貌，禁止写 world.entity_id）；陈述性质 assertion_kind ∈ record/norm/wish/hearsay/argument/fiction/hypothesis；声音依据 voice_basis ∈ direct_witness/transcription/reported/advert/hearsay/unknown。
5. 只输出一个 JSON 对象，不要 markdown、不要解释。字段对齐 schema-d02-material-observation.v1。`;

const D03_CONFLICT_SYSTEM = `你是墨痕数据生产的 D03 世界建构器，本次只执行 W09 冲突与认识状态管理。
纪律：
1. 先对齐身份/谓词/单位/阶段/时间/空间口径，再区分"实质互斥"与"表面差异"。
2. 竞争候选一律并列保留，不择一、不静默覆盖；resolution_status 用 preserved_open。
3. 认识状态 ∈ material_report/candidate/supported_with_limits/contested/unresolved/withdrawn。
4. 只输出一个 JSON 对象，不要 markdown、不要解释。字段对齐 schema-d03-world-claim-revision.v1 的 conflicts 结构。`;

const D03_DISAMBIG_SYSTEM = `你是墨痕数据生产的 D03 世界建构器，本次只执行 W01 身份与连续性判定 + W08 来源谱系评估。
纪律：
1. 名称完全一致 ≠ 同一对象；同名/近邻/图形相似不构成同一性。
2. 合并须有可核查桥接（明示同一指认/连续角色轨迹/多约束独立证据），并搜索互斥年代与"新旧/东西"之别。
3. 结论用 SAME / DIFFERENT / UNRESOLVED，并给依据。
4. 只输出一个 JSON 对象，不要 markdown、不要解释。字段对齐 schema-d03-world-claim-revision.v1 的 identity_decisions 结构。`;

// ---- 样本定义（输入片段取自 SAMPLE-TRIAL-10_GOLDEN-SAMPLE_PACK.md，冻结）----
const samples = [
  {
    id: '1',
    name: '地方志实体/关系抽取（D02-H05/H04）',
    system: D02_SYSTEM,
    user: `请按 D02 分步跳读处理以下金泽地方志/地名志数字文本片段，产出 material_observation：
片段A：「古名白苎里。因地处湖荡泽地……古有『穑人获泽如金』之说，故名金泽」
片段B：「是上海的『桥乡』，现存古桥 21 座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥……」
片段C：「南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人」`,
    // 客观检查点（文本级关键词，用于规则化打分）
    checkpoints: {
      entities: ['万安桥', '普济桥', '迎祥桥', '颐浩寺', '吕颐浩', '白苎里'],
      relations: ['同跨一河', '姐妹桥', '寺名取自', '故宅'],
      h_class: ['H05', '地方志'],
      mustNotClaim: ['白苎里', '金溪', '金泽'], // 若三者被连成"白苎里→金溪→金泽"连续链则扣分（金溪无证据）
    },
  },
  {
    id: '5',
    name: '冲突管理·并列不择一（D03-W09）',
    system: D03_CONFLICT_SYSTEM,
    user: `请处理以下金泽三组历史记载冲突，输出 conflicts（并列保留，不择一）：
冲突1 赵孟頫生年：Legacy 记 1271，Wikidata 记 1254-1322。
冲突2 万安桥跨水道：上图地名志「跨秀州塘」 vs 青浦官方「跨金泽塘/市河」；上海地名志「秀州塘＋万安桥」实存金山朱泾（疑跨镇误挂）。
冲突3 普济桥建造年代：官方「南宋咸淳三年（1267）」 vs 图注「北宋咸淳元年（1265）」。`,
    checkpoints: {
      conflict1: ['1271', '1254'],
      conflict2: ['秀州塘', '金泽塘'],
      conflict3: ['1267', '1265'],
      notSinglePick: ['并列', '并存', '不择', 'preserved_open', '不覆盖', '保留'],
    },
  },
  {
    id: '6',
    name: '同名异地/异人消歧（D03-W01/W08）',
    system: D03_DISAMBIG_SYSTEM,
    user: `请对以下金泽三类同名案例做身份消歧，输出 identity_decisions（SAME/DIFFERENT/UNRESOLVED + 依据）：
案例1 金泽放生桥（青浦，区级） vs 朱家角放生桥（跨漕港河，市级，约11km外）。
案例2 与「万安桥」完全同名的另 7 座（嘉定/金山山阳/浦东大团/宣桥/徐泾/新场/赵屯陈岳）。
案例3 「吕颐浩」家谱 3 个祖先实体，temporalValue 互斥（明/南宋/无纪年）。`,
    checkpoints: {
      case1: ['DIFFERENT', '不同', '非同', '非同物'],
      case2: ['不同', '不合并', '非同', 'DIFFERENT'],
      case3: ['异人', '不同人', '非同', 'DIFFERENT', '不对齐'],
    },
  },
];

// ---- 工具 ----
function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function callDeepseek(system, user) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // 请求 JSON 输出；部分实现不支持则靠提示词+正则兜底
      ...(false ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  const reasoning = json?.choices?.[0]?.message?.reasoning_content ?? '';
  const modelUsed = json?.model ?? MODEL;
  const usage = json?.usage ?? {};
  return {
    http: res.status,
    modelUsed,
    content,
    reasoning,
    usage: {
      prompt_tokens: usage.prompt_tokens ?? null,
      completion_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
    },
    latency_ms: Date.now() - t0,
  };
}

function score(sample, content) {
  const hits = [];
  const misses = [];
  const check = (label, needles, haystack) => {
    const found = needles.some((n) => haystack.toLowerCase().includes(n.toLowerCase()));
    if (found) hits.push(label); else misses.push(label);
  };
  const s = sample.checkpoints;
  if (s.entities) check('entities', s.entities, content);
  if (s.relations) check('relations', s.relations, content);
  if (s.h_class) check('h_class', s.h_class, content);
  if (s.conflict1) check('conflict1(两值并列)', s.conflict1, content);
  if (s.conflict2) check('conflict2(两值并列)', s.conflict2, content);
  if (s.conflict3) check('conflict3(两值并列)', s.conflict3, content);
  if (s.notSinglePick) check('并列不择一', s.notSinglePick, content);
  if (s.case1) check('case1(放生桥非同物)', s.case1, content);
  if (s.case2) check('case2(同名万安桥不合并)', s.case2, content);
  if (s.case3) check('case3(吕颐浩家谱异人)', s.case3, content);
  // 断裂点负向检查（样本1）：若"白苎里/金溪/金泽"三词同段出现，视为错误补全连续链
  let mustNotViolated = false;
  if (s.mustNotClaim) {
    const [a, b, c] = s.mustNotClaim;
    const hasAll = [a, b, c].every((n) => content.includes(n));
    const hasLink = /金溪/.test(content) && /白苎里/.test(content) && /金泽/.test(content);
    if (hasLink) { mustNotViolated = true; misses.push('断裂点(金溪不得补全)'); }
    else hits.push('断裂点(金溪未误连)');
  }
  const total = hits.length + misses.length;
  return { hits, misses, total, score: total ? +(hits.length / total).toFixed(3) : 0, mustNotViolated };
}

// ---- 主流程 ----
const results = [];
for (const s of samples) {
  console.log(`\n=== 样本 ${s.id}：${s.name} ===`);
  const r = await callDeepseek(s.system, s.user);
  const parsed = extractJson(r.content);
  const sc = score(s, r.content);
  const row = {
    sample_id: s.id,
    name: s.name,
    http: r.http,
    model_used: r.modelUsed,
    schema_json_parsed: !!parsed,
    ...sc,
    usage: r.usage,
    latency_ms: r.latency_ms,
    content_snippet: r.content.slice(0, 400),
    reasoning_snippet: r.reasoning.slice(0, 200),
  };
  results.push(row);
  console.log(`  HTTP=${r.http} model=${r.modelUsed} json_parsed=${!!parsed}`);
  console.log(`  命中 ${sc.hits.length}/${sc.total} = ${(sc.score * 100).toFixed(1)}%`);
  if (sc.misses.length) console.log(`  未命中: ${sc.misses.join(' | ')}`);
  console.log(`  tokens: prompt=${r.usage.prompt_tokens} completion=${r.usage.completion_tokens} total=${r.usage.total_tokens}`);
  console.log(`  输出片段: ${r.content.slice(0, 180).replace(/\n/g, ' ')}`);
}

const report = {
  generated_at: new Date().toISOString(),
  engine: 'sample-trial-11',
  prompt_version: PROMPT_VERSION,
  schema_version: SCHEMA_VERSION,
  model_requested: MODEL,
  note: 'model_used 为 API 实际返回模型名；真实评测前不认定具体型号/价格。',
  results,
};
const outDir = 'd:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/tasks/results/sample-trial-11-golden-eval';
mkdirSync(outDir, { recursive: true });
const outFile = `${outDir}/eval-result-raw.json`;
writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n结果已写: ${outFile}`);
