// 00-ping-deepseek.mjs — DeepSeek 连通性与可用模型探测（金样本实测前）
// 从沪上经纬 .env.local 读取 key，不硬编码、不打印 key。
import { readFileSync } from 'node:fs';

const envPath = 'D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/.env.local';
const envText = readFileSync(envPath, 'utf8');
const key = (envText.match(/DEEPSEEK_API_KEY=([^\r\n]+)/) || [])[1]?.trim();
if (!key) {
  console.error('NO_KEY_FOUND');
  process.exit(1);
}

const BASE = 'https://api.deepseek.com';
async function ping(model) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 4 }),
  });
  const text = await res.text();
  console.log(`[${model}] HTTP ${res.status} :: ${text.slice(0, 240)}`);
}

// 探测常用模型名（真实评测前不认定具体型号，仅确认哪些可连通）
await ping('deepseek-chat');
await ping('deepseek-reasoner');
