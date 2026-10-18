// 03-rerun-d02-f1.mjs — 样本 1 补"姐妹桥"段后的 D02 关系抽取 + 近似字段级 F1 补测
// 输入：样本 1 四段真实文字（含金泽库已冻结 fragment 03265ea1 姐妹桥原文）。
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = (readFileSync('D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/.env.local', 'utf8').match(/DEEPSEEK_API_KEY=([^\r\n]+)/) || [])[1]?.trim();
const BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';

const D02_STRICT_SYSTEM = `你是墨痕数据生产的 D02 材料观察器，方法 H05 地方志（主）/ H04 历史地理著作（邻类）。
按【分类→定位关键区→精读→结构化输出】四步跳读，只观察材料，不建世界事实、不判史实真伪。

输出必须是**严格符合下面 JSON schema 的单个 JSON 对象**，不要 markdown、不要任何额外解释文字：

{
  "schema_version": "d02-material-observation.v1",
  "reading_units": [
    {"reading_unit_id": "ru-1", "unit_path": "片段A", "primary_h_type": "H05", "classification_status": "resolved", "classification_basis": "地方志编纂体例"}
  ],
  "classification_decisions": [
    {"decision_id": "cd-1", "reading_unit_id": "ru-1", "primary_h_type": "H05", "alternatives": ["H04"], "status": "decided", "basis": "地名沿革兼历史地理，主类仍为地方志"}
  ],
  "material_mentions": [
    {"mention_id": "m-1", "evidence_id": "e-1", "mention_kind": "place", "literal_text": "白苎里", "span_in_evidence": {}, "precision": {}, "uncertainty": {}}
  ],
  "material_evidence": [
    {"evidence_id": "e-1", "source_voice": "本届纂修者叙述", "voice_basis": "unknown", "assertion_kind": "record", "literal_reading": "古名白苎里", "research_proposition": "材料记载金泽古名白苎里"}
  ],
  "reading_unit_dependencies": []
}

硬性字段规则（必须遵守）：
1. material_mentions.mention_kind 只能取：person(人)/time(时)/place(地)/thing(物)/number(数)；literal_text 为字面原貌，禁止写 world.entity_id。
2. material_evidence.assertion_kind 只能取：record/norm/wish/hearsay/argument/fiction/hypothesis。
3. material_evidence.voice_basis 只能取：direct_witness/transcription/reported/advert/hearsay/unknown。
4. 材料里的人/时/地/物/数全部逐条进 material_mentions，不得合并、不得归一。
5. material_evidence.research_proposition 写"某材料提出某陈述"（如桥与桥同跨一河），这是材料陈述，不是已证事实。`;

const USER = `请按上述 schema 处理以下金泽地方志/地名志数字文本片段：
片段A：「古名白苎里。因地处湖荡泽地……古有『穑人获泽如金』之说，故名金泽」
片段B：「是上海的『桥乡』，现存古桥 21 座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥……」
片段C：「南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人」
片段D：「南宋景定年间建（万安桥），与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'」`;

async function run() {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: 0, messages: [{ role: 'system', content: D02_STRICT_SYSTEM }, { role: 'user', content: USER }] }),
  });
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  const m = content.match(/\{[\s\S]*\}/);
  const parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return null; } })() : null;

  const mentions = Array.isArray(parsed?.material_mentions) ? parsed.material_mentions : [];
  const literalTexts = mentions.map((x) => x?.literal_text ?? '').join(' ');
  const evidence = Array.isArray(parsed?.material_evidence) ? parsed.material_evidence : [];
  const propositions = evidence.map((x) => x?.research_proposition ?? '').join(' ');
  const allText = content;

  // 近似字段级 F1（关键词级）：应抽出实体 + 关系
  const trueEntities = ['万安桥', '普济桥', '迎祥桥', '颐浩寺', '吕颐浩', '白苎里', '金泽'];
  const foundEntities = trueEntities.filter((e) => allText.includes(e));
  // 关系（从 material_evidence 的 research_proposition 里找）
  const relationSpan = '同跨一河';
  const relationSisters = '姐妹桥';
  const relationNamed = '寺名取自';
  const relationSpansFound = propositions.includes(relationSpan) || allText.includes(relationSpan);
  const relationSistersFound = propositions.includes(relationSisters) || allText.includes(relationSisters);
  const relationNamedFound = propositions.includes(relationNamed) || allText.includes(relationNamed);

  const entityPrecision = 1; // 关键词命中无假阳性（简化：命中即真）
  const entityRecall = foundEntities.length / trueEntities.length;
  const entityF1 = entityRecall > 0 ? (2 * entityPrecision * entityRecall) / (entityPrecision + entityRecall) : 0;

  const out = {
    http: res.status,
    model_used: json?.model,
    json_parsed: !!parsed,
    mention_kinds: [...new Set(mentions.map((x) => x?.mention_kind).filter(Boolean))],
    mention_literals: mentions.map((x) => x?.literal_text).filter(Boolean),
    entities_expected: trueEntities,
    entities_found: foundEntities,
    entity_recall: +entityRecall.toFixed(3),
    entity_f1_approx: +entityF1.toFixed(3),
    relations: {
      spans_same_waterway_同跨一河: relationSpansFound,
      spans_same_waterway_姐妹桥: relationSistersFound,
      named_after_寺名取自: relationNamedFound,
    },
    usage: json?.usage ?? {},
    content_snippet: content.slice(0, 1600),
  };
  writeFileSync('d:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/tasks/results/sample-trial-11-golden-eval/eval-d02-f1-rerun.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
}

run();
