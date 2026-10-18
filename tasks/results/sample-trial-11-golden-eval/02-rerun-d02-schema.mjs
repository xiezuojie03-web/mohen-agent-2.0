// 02-rerun-d02-schema.mjs — 样本 1 的 D02 schema 严格对齐复测
// 背景：第一轮 D02 输出用了自由结构 segments，未严格对齐 schema 字段。
// 本轮在提示词内嵌精确字段名 + few-shot 结构，并做 schema 合规自动检查。
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
1. material_mentions.mention_kind 只能取：person(人) / time(时) / place(地) / thing(物) / number(数)；literal_text 为字面原貌，禁止写 world.entity_id。
2. material_evidence.assertion_kind 只能取：record(记述) / norm(规范) / wish(愿望) / hearsay(传闻) / argument(论辩) / fiction(虚构) / hypothesis(假说)。
3. material_evidence.voice_basis 只能取：direct_witness(亲历) / transcription(转录) / reported(转述) / advert(广告) / hearsay(传闻) / unknown(未知)。
4. 区分"本届纂修者/旧志引文/地方传闻/收录碑文"四层话语；"旧传""俗云""旧志转录"不得当独立证实。
5. 把材料里的人/时/地/物/数全部逐条进 material_mentions，不得合并、不得归一。`;

const USER = `请按上述 schema 处理以下金泽地方志/地名志数字文本片段：
片段A：「古名白苎里。因地处湖荡泽地……古有『穑人获泽如金』之说，故名金泽」
片段B：「是上海的『桥乡』，现存古桥 21 座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥……」
片段C：「南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人」`;

async function run() {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: D02_STRICT_SYSTEM },
        { role: 'user', content: USER },
      ],
    }),
  });
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  const m = content.match(/\{[\s\S]*\}/);
  const parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return null; } })() : null;

  // schema 合规自动检查
  const schema = parsed || {};
  const topKeys = Object.keys(schema);
  const requiredTop = ['reading_units', 'classification_decisions', 'material_mentions', 'material_evidence'];
  const missingTop = requiredTop.filter((k) => !(k in schema));
  const mentions = Array.isArray(schema.material_mentions) ? schema.material_mentions : [];
  const mentionKinds = new Set(mentions.map((x) => x?.mention_kind));
  const validKinds = ['person', 'time', 'place', 'thing', 'number'];
  const badKinds = [...mentionKinds].filter((k) => !validKinds.includes(k));
  const evidence = Array.isArray(schema.material_evidence) ? schema.material_evidence : [];
  const badAssertion = evidence.filter((e) => e && !['record','norm','wish','hearsay','argument','fiction','hypothesis'].includes(e.assertion_kind));
  const badVoice = evidence.filter((e) => e && !['direct_witness','transcription','reported','advert','hearsay','unknown'].includes(e.voice_basis));
  // 实体命中
  const hit = (n) => content.includes(n);
  const entities = ['万安桥','普济桥','迎祥桥','颐浩寺','吕颐浩','白苎里'].filter(hit);
  const relationHits = ['同跨一河','姐妹桥','寺名取自','故宅'].filter(hit);

  const out = {
    http: res.status,
    model_used: json?.model,
    json_parsed: !!parsed,
    schema_top_keys: topKeys,
    schema_missing_top: missingTop,
    mention_kinds_found: [...mentionKinds],
    mention_kinds_invalid: badKinds,
    evidence_count: evidence.length,
    bad_assertion_kind_count: badAssertion.length,
    bad_voice_basis_count: badVoice.length,
    entities_hit: entities,
    relation_hits: relationHits,
    usage: json?.usage ?? {},
    content_snippet: content.slice(0, 900),
  };
  writeFileSync('d:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/tasks/results/sample-trial-11-golden-eval/eval-d02-schema-rerun.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
}

run();
