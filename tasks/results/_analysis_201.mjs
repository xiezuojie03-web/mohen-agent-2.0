// 一次性分析脚本（非生产代码）：验证"201"配额截断 + 计算每个来源真实可抽取片段数
import fs from "node:fs";
import path from "node:path";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";

// 复用抽取器的阈值（unattended-runner.mjs）
const CJK = /[一-鿿]/;
function isSubstantialText(s) {
  if (s.length < 24 || s.length > 1200) return false;
  if (!CJK.test(s)) return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/data\.library\.sh\.cn|wikidata\.org|upload\.wikimedia|shanghai\.org/.test(s)) return false;
  if (/^[\d\s.,。、;:：\-/()（）]+$/.test(s)) return false;
  return true;
}
function chunkText(text, max = 400) {
  if (text.length <= max) return [text];
  const segs = text.split(/(?<=[。！？；;])/).filter(Boolean);
  const chunks = []; let cur = "";
  for (const s of segs) {
    if ((cur + s).length > max) { if (cur) chunks.push(cur); cur = s; } else cur += s;
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [text.slice(0, max)];
}
function collectTextFragments(node, out, p = [], depth = 0) {
  if (depth > 12) return;
  if (typeof node === "string") {
    if (isSubstantialText(node.trim())) out.push(node.trim());
    return;
  }
  if (Array.isArray(node)) { for (const x of node) collectTextFragments(x, out, p, depth + 1); return; }
  if (node && typeof node === "object") { for (const k of Object.keys(node)) collectTextFragments(node[k], out, p, depth + 1); }
}

const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data";
function findFile(base, acc = []) {
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    const p = path.join(base, e.name);
    if (e.isDirectory()) findFile(p, acc);
    else if (e.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

async function main() {
  // 15 个触顶来源：file + 已抽取(evidence-fragment / N03)
  const rows = await queryRows(`
    select s.source_id, s.title, s.metadata_json->>'file' as file,
      (select count(*) from evidence e where e.source_id=s.source_id and e.extraction_method='unattended-evidence-fragment') as frag,
      (select count(*) from evidence e where e.source_id=s.source_id and e.extraction_method<>'unattended-evidence-fragment') as other
    from source_records s
    where s.source_id in (select source_id from (select source_id, count(*) c from evidence group by source_id) e where c=201)
    order by s.title`);
  const files = findFile(FETCHED);
  const fileByBase = new Map();
  for (const f of files) { const b = path.basename(f); if (!fileByBase.has(b)) fileByBase.set(b, f); }

  let grandReal = 0, grandExtracted = 0, grandRemaining = 0;
  const out = [];
  for (const r of rows) {
    const fp = r.file ? fileByBase.get(path.basename(r.file)) : null;
    let realFrags = 0, fileFound = false;
    if (fp) {
      try {
        const doc = JSON.parse(fs.readFileSync(fp, "utf8"));
        const texts = []; collectTextFragments(doc, texts);
        for (const t of texts) realFrags += chunkText(t).length; // 与抽取器一致：按 400 字切分计数
        fileFound = true;
      } catch {}
    }
    const extracted = Number(r.frag) + Number(r.other);
    const remaining = realFrags - Number(r.frag); // 扣掉触顶的 200 片段
    grandReal += realFrags; grandExtracted += extracted; grandRemaining += Math.max(0, remaining);
    out.push({ title: r.title, file: r.file || "(title-derived)", fileFound, realFrags, frag: Number(r.frag), other: Number(r.other), extracted, capped: Number(r.frag) >= 200, remaining: Math.max(0, remaining) });
  }
  console.log("source | fileFound | realFrags | frag(200cap) | other | extracted | capped | remaining");
  for (const o of out) console.log(`${o.title} | ${o.fileFound} | ${o.realFrags} | ${o.frag} | ${o.other} | ${o.extracted} | ${o.capped} | ${o.remaining}`);
  console.log(`\nGRAND realFrags=${grandReal} extracted=${grandExtracted} remaining(uncapped)=${grandRemaining}`);
  fs.writeFileSync("tasks/results/_analysis_201.json", JSON.stringify(out, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
