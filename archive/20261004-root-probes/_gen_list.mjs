// 临时：输出老项目 fetched 全量 JSON 文件列表（用于扩充 N01 的 SOURCE_FILES）
import fs from "node:fs";
const dir = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
console.log("COUNT=" + files.length);
// 以 6 个一行输出，方便直接写入 unattended-jobs.mjs
for (let i = 0; i < files.length; i += 4) {
  console.log("  " + files.slice(i, i + 4).map((f) => JSON.stringify(f)).join(", ") + ",");
}
// 体积统计
let total = 0;
for (const f of files) total += fs.statSync(dir + "/" + f).size;
console.log("TOTAL_MB=" + (total / 1024 / 1024).toFixed(1));
