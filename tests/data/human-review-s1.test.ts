// tests/data/human-review-s1.test.ts — TASK-0005 Human Review + S1 验收测试。
//
// 覆盖任务书 §11 的 13 项：
//   1. HR-1～HR-6 六项决策均可追溯
//   2. HR-2 legend 不会被当 historical fact
//   3. HR-3 pending 不会自动生成批量 part_of
//   4. HR-5 视觉资产不能进入 heritage-primary selection
//   5. HR-6 conflict 不会被静默覆盖
//   6. API raw snapshot append-only（S1）
//   7. S1 metadata-only 不能冒充正文 Evidence
//   8. OCR normalized 不覆盖 raw
//   9. 无对象级坐标时 G3 不会因文字位置描述而 pass
//  10. semantic relation 必须有 Evidence linkage
//  11. 重跑幂等（persist-human-review 重跑计数不变）
//  12. Legacy 零写
//  13. 既有 Evidence Gate / Tier C guard invariants 继续通过
//
// 约定：DB 用例直接连本机 mohen_dev（连接串来自 gitignored 的 .env.local，测试内不出现密码）。

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { queryRows } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const RAW_STORE = "D:/MoHen/data/raw";
const S1_RUN_DIR = path.join(RAW_STORE, "external", "jinze-s1", "jinze-s1-20260922-07ce10fd");
const LEGACY_REPO = path.resolve(PROJECT_ROOT, "..", "hushang-jingwei");
const LEGACY_SEED = path.join(LEGACY_REPO, "data", "seed.master.json");

const db = {
  rows: queryRows as (sql: string) => Promise<Record<string, string>[]>,
};

// 加载时快照 Legacy 真源（同 TASK-0004：不用 git status，因 Legacy 仓库有历史未提交改动）
const baseline = fs.existsSync(LEGACY_SEED)
  ? { size: fs.statSync(LEGACY_SEED).size, mtimeMs: fs.statSync(LEGACY_SEED).mtimeMs }
  : null;

describe("TASK-0005 Human Review + S1 Evidence", () => {
  // 1. HR-1～HR-6 六项决策均可追溯
  it("1. HR-1~HR-6 六项决策均可追溯", async () => {
    // 只取 TASK-0005 的 `HR-*` 命名空间：后续任务在同一机制里新增了 `SHR-*`（空间编辑决策），
    // 二者前缀与语义均不同义，混计会把「别的任务加了决策」误报成「本任务决策被改」。
    const rows = await db.rows(
      `select hr_code, decision_code, status_after, actor from human_review_decisions
        where hr_code ~ '^HR-[1-6]$' order by hr_code`
    );
    const byCode = Object.fromEntries(rows.map((r) => [r.hr_code, r]));
    expect(rows.length).toBe(6);
    for (const code of ["HR-1", "HR-2", "HR-3", "HR-4", "HR-5", "HR-6"]) {
      expect(byCode[code]).toBeDefined();
      expect(byCode[code].actor).toBe("user-confirmed"); // 人工确认，非 AI
    }
    // 冻结语义未被改写
    expect(byCode["HR-1"].decision_code).toBe("A");
    expect(byCode["HR-2"].decision_code).toBe("A");
    expect(byCode["HR-3"].decision_code).toBe("C");
    expect(byCode["HR-4"].decision_code).toBe("B");
    expect(byCode["HR-5"].decision_code).toBe("A");
    expect(byCode["HR-6"].decision_code).toBe("C");
  });

  // 2. HR-2 legend 不会被当 historical fact
  it("2. HR-2 legend 不会被当 historical fact", async () => {
    const rows = await db.rows(
      `select r.relation_id from relations r
        join entities s on r.subject_id = s.entity_id
        join entities o on r.object_id = o.entity_id
       where (s.canonical_name ilike '%赵孟頫%' or o.canonical_name ilike '%赵孟頫%')
         and (s.canonical_name ilike '%颐浩%' or o.canonical_name ilike '%颐浩%')
         and r.status::text in ('verified','published')`
    );
    expect(rows.length).toBe(0); // 赵孟頫↔颐浩寺无任何 verified/published 关系
  });

  // 3. HR-3 pending 不会自动生成批量 part_of
  it("3. HR-3 pending 不会自动生成批量 part_of", async () => {
    const rows = await db.rows(`select count(*)::int as c from relations where predicate='part_of'`);
    expect(Number(rows[0].c)).toBe(0);
  });

  // 4. HR-5 视觉资产不能进入 heritage-primary selection
  it("4. HR-5 视觉资产不能进入 heritage-primary selection", async () => {
    const total = await db.rows(`select count(*)::int as c from visual_assets`);
    // 不断言「总量 == 排除量」：那是 TASK-0005 结束时库内只有这 20 张才成立的**当时快照**，
    // 不是不变量。后续任务可以合法新增可用的遗产视觉资产（TASK-0008 WP-C/D 即如此）。
    expect(Number(total[0].c)).toBeGreaterThanOrEqual(20);

    const excluded = await db.rows(
      `select count(*)::int as c from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`
    );
    expect(Number(excluded[0].c)).toBe(20); // HR-5 批次恰好 20 张，一张都不许被「换标签复活」

    // 真正的不变量：heritage-primary（effective 视图）里不得出现任何一张被排除资产
    const leaked = await db.rows(
      `select count(*)::int as c from effective_visual_assets e
         join visual_assets a on a.asset_id = e.asset_id
        where a.eligibility_tags && array['excluded_from_heritage_primary']`
    );
    expect(Number(leaked[0].c)).toBe(0);
  });

  // 5. HR-6 conflict 不会被静默覆盖
  it("5. HR-6 conflict 不会被静默覆盖", async () => {
    const rows = await db.rows(
      `select decision_code, status_after, machine_readable_flags
         from human_review_decisions where hr_code='HR-6'`
    );
    expect(rows.length).toBe(1);
    expect(rows[0].decision_code).toBe("C"); // 仍 pending/research，未变 verified
    expect(rows[0].status_after).toBe("research");
    const flags = JSON.parse(rows[0].machine_readable_flags);
    expect(flags.conflict).toBe(true);
    expect(flags.silent_override).toBe("blocked"); // 明确阻止静默覆盖
    expect(Array.isArray(flags.conflicting_values)).toBe(true);
    expect(flags.conflicting_values).toContain("1271");
    expect(flags.conflicting_values).toContain("1254");
  });

  // 6. API raw snapshot append-only（S1）
  it("6. S1 API raw snapshot append-only 且 source 去重", async () => {
    // raw 快照目录存在、20 个 raw 文件、manifest 存在
    expect(fs.existsSync(S1_RUN_DIR)).toBe(true);
    const rawFiles = fs.readdirSync(S1_RUN_DIR).filter((f) => f.startsWith("raw-"));
    expect(rawFiles.length).toBe(20);
    expect(fs.existsSync(path.join(S1_RUN_DIR, "manifest.json"))).toBe(true);

    // source_records 按 (provider, checksum) 去重 → shanghai-library 实际 9 条（4 个 gj_instances + 2 kg 的 0 命中同 checksum 折叠）
    const src = await db.rows(
      `select count(*)::int as c from source_records where provider='shanghai-library'`
    );
    expect(Number(src[0].c)).toBe(9);

    // 不含 key 的 source_uri：抽查是否含 "?key="
    const keyed = await db.rows(
      `select count(*)::int as c from source_records where provider='shanghai-library' and source_uri like '%key=%'`
    );
    expect(Number(keyed[0].c)).toBe(0);
  });

  // 7. S1 metadata-only 不能冒充正文 Evidence
  it("7. S1 metadata-only 不能冒充正文 Evidence", async () => {
    // S1 证据全部 candidate（metadata 未自动升 verified）
    const st = await db.rows(
      `select count(*)::int as c from evidence e join source_records s on e.source_id=s.source_id
        where s.provider='shanghai-library' and e.verification_status::text in ('verified','published')`
    );
    expect(Number(st[0].c)).toBe(0);

    // record 型证据 quote 仅为「书名：…」（书目 metadata），不含正文长句
    const rec = await db.rows(
      `select quote_text from evidence e join source_records s on e.source_id=s.source_id
        where s.provider='shanghai-library' and e.evidence_type='record'`
    );
    expect(rec.length).toBeGreaterThan(0);
    for (const r of rec) {
      expect(r.quote_text).toMatch(/^书名：/); // 仅书目名，非正文
      expect((r.quote_text || "").length).toBeLessThanOrEqual(40);
    }
  });

  // 8. OCR normalized 不覆盖 raw
  it("8. OCR normalized 不覆盖 raw", async () => {
    const ocr = await db.rows(
      `select count(*)::int as c from evidence where extraction_method ilike '%ocr%'`
    );
    expect(Number(ocr[0].c)).toBe(0); // 本任务未做任何 OCR，亦未用 OCR 覆盖 raw
    // raw 快照仍为最初响应体（20 文件齐全，见 test 6）
    expect(fs.existsSync(S1_RUN_DIR)).toBe(true);
  });

  // 9. 无对象级坐标时 G3 不会因文字位置描述而 pass
  it("9. 无对象级坐标时 G3 不会因文字位置描述而 pass", async () => {
    // S1 证据无对象级坐标（region_json 不带 lat/lng 对象点位）
    const s1coord = await db.rows(
      `select count(*)::int as c from evidence e join source_records s on e.source_id=s.source_id
        where s.provider='shanghai-library'
          and region_json::text ~ '"(lat|lng|lon|longitude|latitude)"\\s*:'`
    );
    expect(Number(s1coord[0].c)).toBe(0);

    // G3 实体层 fail 仍 > 0（文字位置描述未把任何对象抬成 pass）
    const g3 = await db.rows(
      `select result, count(*)::int as c from evidence_gate_audit
        where object_type='entity' and gate_code='G3' group by result`
    );
    const byResult = Object.fromEntries(g3.map((r) => [r.result, Number(r.c)]));
    expect((byResult["fail"] || 0)).toBeGreaterThan(0);
    expect((byResult["pass"] || 0)).toBe(0);
  });

  // 10. semantic relation 必须有 Evidence linkage
  it("10. semantic relation 必须有 Evidence linkage", async () => {
    const rows = await db.rows(
      `select r.relation_id, r.predicate, count(re.evidence_id)::int as ev
         from relations r
         left join relation_evidence re on re.relation_id = r.relation_id
        group by r.relation_id, r.predicate`
    );
    const semantic = rows.filter((r) => r.predicate !== "crossLink");
    expect(semantic.length).toBeGreaterThan(0);
    for (const r of semantic) {
      expect(Number(r.ev), `relation ${r.relation_id} (${r.predicate}) 缺 evidence`).toBeGreaterThan(0);
    }
  });

  // 11. 重跑幂等（persist-human-review 重跑计数不变）
  it("11. 重跑 persist-human-review 幂等", async () => {
    // 只数本任务的 `HR-*` 命名空间：别的任务在同一机制里加决策，不应被误读为「本管线不幂等」。
    const before = await db.rows(
      `select count(*)::int as c from human_review_decisions where hr_code ~ '^HR-[1-6]$'`
    );
    const beforeEx = await db.rows(
      `select count(*)::int as c from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`
    );
    execFileSync(process.execPath, ["pipelines/review/persist-human-review.mjs"], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      env: { ...process.env },
    });
    const after = await db.rows(
      `select count(*)::int as c from human_review_decisions where hr_code ~ '^HR-[1-6]$'`
    );
    const afterEx = await db.rows(
      `select count(*)::int as c from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`
    );
    expect(Number(after[0].c)).toBe(Number(before[0].c)); // 仍为 6
    expect(Number(afterEx[0].c)).toBe(Number(beforeEx[0].c)); // 仍为 20
  }, 60_000);

  // 12. Legacy 零写
  it("12. Legacy repo 零写入", () => {
    expect(baseline).not.toBeNull();
    const now = fs.statSync(LEGACY_SEED);
    expect(now.size).toBe(baseline!.size);
    expect(now.mtimeMs).toBe(baseline!.mtimeMs);

    const pipeDir = path.join(PROJECT_ROOT, "pipelines");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith(".mjs")) files.push(p);
      }
    };
    walk(pipeDir);
    const writeRe = /(?:writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync)\s*\(\s*([^,;]+)/g;
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(f, "utf8");
      let m: RegExpExecArray | null;
      while ((m = writeRe.exec(src)) !== null) {
        if (/LEGACY_SEED|LEGACY_REPO|hushang-jingwei|seed\.master\.json/.test(m[1])) return true;
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });

  // 13. 既有 Evidence Gate / Tier C guard invariants 继续通过
  it("13. 既有 Gate / Tier C 守卫 invariants 继续通过", async () => {
    // (a) 全库无 verified/published（实体/关系/证据）
    for (const t of ["entities", "relations"]) {
      const rows = await db.rows(
        `select count(*)::int as c from ${t} where status::text in ('verified','published')`
      );
      expect(Number(rows[0].c), `${t} 出现 verified/published`).toBe(0);
    }
    const ev = await db.rows(
      `select count(*)::int as c from evidence where verification_status::text in ('verified','published')`
    );
    expect(Number(ev[0].c)).toBe(0);

    // (b) Tier C 直接 approved 仍被拒（TASK-0003 触发器未削弱）
    await expect(
      db.rows(`begin;
        insert into review_queue(object_type,object_id,review_tier,status)
        values ('entity','t5-probe-c','C','approved');
        rollback;`)
    ).rejects.toThrow();

    // (c) Legacy Entity 默认 candidate，全部 candidate
    const ents = await db.rows(
      `select count(*)::int as total, count(*) filter (where status::text='candidate') as candidate from entities`
    );
    expect(Number(ents[0].total)).toBeGreaterThan(0);
    expect(Number(ents[0].candidate)).toBe(Number(ents[0].total));

    // (d) G3 实体 fail 仍 = 15（坐标 Gate 未被文字位置描述绕过）
    const g3 = await db.rows(
      `select count(*)::int as c from evidence_gate_audit
        where object_type='entity' and gate_code='G3' and result='fail'`
    );
    expect(Number(g3[0].c)).toBe(15);
  }, 60_000);
});
