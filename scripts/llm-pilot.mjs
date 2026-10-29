// scripts/llm-pilot.mjs — 金样本实测：用金泽真实材料，验证 DeepSeek 能否生成"有据、不编造"的导演方案
import fs from "node:fs";
import path from "node:path";

// 读 .env.local（仅取 key，不回显）
const envPath = path.resolve(process.cwd(), ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const key = env.DEEPSEEK_API_KEY;
if (!key) {
  console.log("✗ 未找到 DEEPSEEK_API_KEY");
  process.exit(1);
}
console.log("DEEPSEEK_API_KEY: 已配置（值隐藏）");

// 金泽真实材料（取自已审核 read_model，只作为事实白名单）
const facts = [
  "万安桥与普济桥互为姐妹桥，同跨一条水道",
  "金泽曾有颐浩寺，今存遗址",
  "迎祥桥是金泽的一座古桥",
  "吕颐浩与颐浩寺得名有关",
  "桥所跨水道有金泽塘、秀州塘、市河三种着录",
];

const system = `你是墨痕的创作编导。基于给定的真实历史材料，为一部短纪录片式作品生成两个不同的讲故事方案（A/B）。
铁律（违反即作废）：
1. 只能使用「真实材料」里出现的事实，禁止新增任何年份、地名、人物、关系、事件；
2. 方案A与方案B的差异必须来自叙事角度/结构，不是换措辞；
3. 每个方案给出：角度（一句话）、结构要点（3条）、封面画面建议（1条）。
4. 只输出 JSON：{"planA":{"angle":"...","points":["...","...","..."],"cover":"..."},"planB":{...}}，不要多余文字。`;

const user = `真实材料：
${facts.map((f) => "- " + f).join("\n")}

委托：做一部关于"金泽古桥与寺院"的作品。`;

const res = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
  body: JSON.stringify({
    model: "deepseek-chat",
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }),
});

const json = await res.json().catch(() => null);
console.log("HTTP status:", res.status);
if (res.status !== 200) {
  console.log("响应:", JSON.stringify(json, null, 2));
  process.exit(1);
}
const text = json?.choices?.[0]?.message?.content?.trim();
console.log("模型回复：\n" + text);

// 事实护栏：检查生成内容里是否出现材料之外的年份/实体
const years = text.match(/\d{4}/g) ?? [];
console.log("\n护栏检查：出现四位年份 =", years.length ? years.join(",") : "无（材料本无年份，正确）");
