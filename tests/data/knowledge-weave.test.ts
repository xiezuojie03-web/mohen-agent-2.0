// tests/data/knowledge-weave.test.ts — TASK-0006 Jinze Minimum Knowledge Weave 验收测试。
//
// 覆盖任务书 §6 的 15 项不变量 + §7 audit-ledger 诊断 + §11 PASS 判据。
// 约定：DB 用例直连本机 mohen_dev（连接串来自 gitignored 的 .env.local，测试内不出现密码）。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { queryRows } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const GEN = "mohen-knowledge-weave";
const LEGACY_SEED = path.join(path.resolve(PROJECT_ROOT, "..", "hushang-jingwei"), "data", "seed.master.json");

const db = { rows: queryRows as (sql: string, p?: Record<string, unknown>) => Promise<Record<string, string>[]> };
const n = async (sql: string) => Number((await db.rows(sql))[0].c);

const baseline = fs.existsSync(LEGACY_SEED)
  ? { size: fs.statSync(LEGACY_SEED).size, mtimeMs: fs.statSync(LEGACY_SEED).mtimeMs }
  : null;

const CAUSAL = /(because|led_to|led\s*to|therefore|formed_due_to|due_to|resulted_in|caused|导致|因为|所以)/i;

describe("TASK-0006 Jinze Minimum Knowledge Weave", () => {
  // 1. No Knowledge Claim without Evidence
  it("1. 无证据的 Claim 不存在（weave claims 全部有 Evidence）", async () => {
    const total = await n(`select count(*)::int c from claims where generated_by='${GEN}'`);
    const orphan = await n(
      `select count(*)::int c from claims cl where cl.generated_by='${GEN}'
        and not exists (select 1 from claim_evidence ce where ce.claim_id=cl.claim_id)`
    );
    expect(total).toBeGreaterThan(0);
    expect(orphan).toBe(0);
    // 链路完整：Evidence → Claim
    const links = await n(
      `select count(*)::int c from claim_evidence ce join claims cl on cl.claim_id=ce.claim_id where cl.generated_by='${GEN}'`
    );
    expect(links).toBeGreaterThanOrEqual(total);
  });

  // 2. No semantic edge generated only from lexical co-occurrence
  it("2. 语义关系不来自词语共现（非 crossLink 关系皆有 Evidence）", async () => {
    const noEv = await n(
      `select count(*)::int c from relations r
        where r.predicate <> 'crossLink'
          and not exists (select 1 from relation_evidence re where re.relation_id=r.relation_id)`
    );
    expect(noEv).toBe(0);
    // 本任务未新增任何 relation（relations 总数保持 30）
    expect(await n(`select count(*)::int c from relations`)).toBe(30);
    // 结构型 crossLink 恒无 Evidence（不得被当作知识边）
    const crossWithEv = await n(
      `select count(*)::int c from relations r join relation_evidence re on re.relation_id=r.relation_id where r.predicate='crossLink'`
    );
    expect(crossWithEv).toBe(0);
  });

  // 3. Legend remains legend
  it("3. legend 保持 legend（赵孟頫↔颐浩寺未升级、未建 claim）", async () => {
    const viol = await n(`
      select count(*)::int c from relations r
        join entities s on r.subject_id=s.entity_id join entities o on r.object_id=o.entity_id
       where (s.canonical_name ilike '%赵孟頫%' or o.canonical_name ilike '%赵孟頫%')
         and (s.canonical_name ilike '%颐浩%' or o.canonical_name ilike '%颐浩%')
         and r.status::text in ('verified','published')`);
    expect(viol).toBe(0);
    // weave 不得为赵孟頫↔颐浩寺建立 claim（无证据）
    const zmfClaim = await n(`
      select count(*)::int c from claims cl
        join entities s on cl.subject_id=s.entity_id
        left join entities o on cl.object_id=o.entity_id
       where cl.generated_by='${GEN}'
         and (s.canonical_name ilike '%赵孟頫%' or o.canonical_name ilike '%赵孟頫%')
         and cl.predicate in ('named_after','mentioned_in','created_by','located_in')`);
    expect(zmfClaim).toBe(0);
    const hr2 = await db.rows(`select status_after from human_review_decisions where hr_code='HR-2'`);
    expect(hr2[0].status_after).toBe("legend");
  });

  // 4. Research remains unresolved
  it("4. research 保持 unresolved（四十二虹桥未被并入事实路径/claim）", async () => {
    const ovl2 = await db.rows(`select entity_id::text id from entities where canonical_name like '%四十二虹桥%'`);
    expect(ovl2.length).toBe(1);
    const id = ovl2[0].id;
    const used = await n(
      `select count(*)::int c from claims where generated_by='${GEN}' and (subject_id='${id}'::uuid or object_id='${id}'::uuid)`
    );
    expect(used).toBe(0);
    const hr3 = await db.rows(`select status_after from human_review_decisions where hr_code='HR-3'`);
    expect(hr3[0].status_after).toBe("research");
  });

  // 5. HR-3 still blocks batch part_of
  it("5. HR-3 仍阻断批量 part_of", async () => {
    expect(await n(`select count(*)::int c from relations where predicate='part_of'`)).toBe(0);
    const steps = await db.rows(`select label from knowledge_path_steps`);
    expect(steps.every((s) => !/part_of/i.test(s.label))).toBe(true);
  });

  // 6. HR-5 visual exclusion unchanged
  it("6. HR-5 视觉排除不变", async () => {
    expect(await n(`select count(*)::int c from visual_assets`)).toBe(20);
    expect(await n(`select count(*)::int c from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`)).toBe(20);
    expect(await n(`select count(*)::int c from visual_assets where not (eligibility_tags && array['excluded_from_heritage_primary'])`)).toBe(0);
  });

  // 7. HR-6 conflict unchanged
  it("7. HR-6 生年冲突不变", async () => {
    const r = await db.rows(`select decision_code, status_after, machine_readable_flags from human_review_decisions where hr_code='HR-6'`);
    const f = JSON.parse(r[0].machine_readable_flags);
    expect(r[0].status_after).toBe("research");
    expect(f.conflict).toBe(true);
    expect(f.silent_override).toBe("blocked");
  });

  // 8. No causal edge without explicit causal Evidence
  it("8. 无因果发明（谓词/标签不含因果词）", async () => {
    const claims = await db.rows(`select predicate from claims where generated_by='${GEN}'`);
    expect(claims.every((c) => !CAUSAL.test(c.predicate))).toBe(true);
    const rels = await db.rows(`select distinct predicate from relations`);
    expect(rels.every((r) => !CAUSAL.test(r.predicate))).toBe(true);
    const disc = await db.rows(`select relationship_change from discovery_candidates`);
    // 允许「名词化描述」，但不得出现明确因果连接词
    expect(disc.every((d) => !CAUSAL.test(d.relationship_change))).toBe(true);
  });

  // 9. Discovery Candidate ≠ raw Evidence / backlog row
  it("9. Discovery Candidate 不等价于裸 Evidence", async () => {
    const rows = await db.rows(
      `select discovery_code, objects::text o, relationship_change, relevance_question, epistemic_status,
              coalesce(array_length(evidence_refs,1),0)::int ev, publishable
         from discovery_candidates`
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const d of rows) {
      expect(d.o && d.o.length).toBeGreaterThan(4);           // 显式对象
      expect(d.relationship_change.length).toBeGreaterThan(2); // 显式关系/变化
      expect(d.relevance_question.length).toBeGreaterThan(2);  // 问题相关性
      expect(["candidate", "legend", "research", "unresolved"]).toContain(d.epistemic_status);
      expect(Number(d.ev)).toBeGreaterThan(0);                 // Evidence refs
      expect(d.publishable).toBe("f");
    }
    // 每个 evidence_ref 必须指向真实证据
    const bad = await n(
      `select count(*)::int c from discovery_candidates d, unnest(d.evidence_refs) e
        where not exists (select 1 from evidence ev where ev.evidence_id=e)`
    );
    expect(bad).toBe(0);
    // 与 evidence / backlog 不同构
    expect(rows.length).not.toBe(await n(`select count(*)::int c from evidence`));
  });

  // 10. No new object-level coordinate guessed
  it("10. 未新造对象级坐标（weave 不产出任何 evidence）", async () => {
    expect(await n(`select count(*)::int c from evidence where extraction_method ilike '%${GEN}%'`)).toBe(0);
    // 坐标证据仍为遗留镇级锚点，且 precision_scope 全为 town_level
    const scope = await db.rows(
      `select region_json->>'precision_scope' s, count(*)::int c from evidence where extraction_method='coordinate_provenance:wikidata_p625_town_anchor' group by 1`
    );
    const byS = Object.fromEntries(scope.map((r) => [r.s, Number(r.c)]));
    expect(byS["town_level"]).toBe(15);
    expect(byS["object"] || 0).toBe(0);
  });

  // 11. No published status created by this task
  it("11. 本任务未产生 published（且 discovery 不可 publishable）", async () => {
    for (const t of ["claims", "relations", "entities"]) {
      expect(await n(`select count(*)::int c from ${t} where status::text in ('published','verified')`)).toBe(0);
    }
    expect(await n(`select count(*)::int c from knowledge_paths where status::text in ('published','verified')`)).toBe(0);
    expect(await n(`select count(*)::int c from discovery_candidates where publishable=true`)).toBe(0);
    // 守卫：尝试 publishable=true 必须被 trigger 拒绝
    await expect(
      db.rows(`begin;
        insert into discovery_candidates(discovery_code,title,objects,relationship_change,evidence_refs,relevance_question,epistemic_status,humanistic_why,publishable)
        values ('T6-probe-pub','x','{}'::jsonb,'x',array['00000000-0000-0000-0000-000000000000'::uuid],'x','candidate','x',true);
        rollback;`)
    ).rejects.toThrow();
  });

  // 12. Rerun idempotent
  it("12. 重跑幂等（真实执行两次，计数不变）", async () => {
    const snap = async () => ({
      claims: await n(`select count(*)::int c from claims where generated_by='${GEN}'`),
      links: await n(`select count(*)::int c from claim_evidence ce join claims cl on cl.claim_id=ce.claim_id where cl.generated_by='${GEN}'`),
      paths: await n(`select count(*)::int c from knowledge_paths where generated_by='${GEN}'`),
      steps: await n(`select count(*)::int c from knowledge_path_steps`),
      disc: await n(`select count(*)::int c from discovery_candidates where generated_by='${GEN}'`),
      evidence: await n(`select count(*)::int c from evidence`),
      relations: await n(`select count(*)::int c from relations`),
    });
    const before = await snap();
    for (let i = 0; i < 2; i++) {
      execFileSync(process.execPath, ["pipelines/weave/build-jinze-minimum-weave.mjs"], {
        cwd: PROJECT_ROOT, stdio: "pipe", env: { ...process.env },
      });
    }
    expect(await snap()).toEqual(before);
  }, 90_000);

  // 13. Legacy zero-write
  it("13. Legacy 零写入", () => {
    expect(baseline).not.toBeNull();
    const now = fs.statSync(LEGACY_SEED);
    expect(now.size).toBe(baseline!.size);
    expect(now.mtimeMs).toBe(baseline!.mtimeMs);
  });

  // 14. No secret exposure
  it("14. 无 secret 泄露（weave 管线不含 key 字面量）", () => {
    const dir = path.join(PROJECT_ROOT, "pipelines", "weave");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs")).map((f) => path.join(dir, f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src).not.toMatch(/SHANGHAI_LIBRARY_API_KEY\s*=\s*["'][A-Za-z0-9]{16,}/);
      expect(src).not.toMatch(/\b[0-9a-f]{40}\b/i); // 40 位十六进制 key 形态
    }
  });

  // 15. Existing TASK-0003/0004/0005 invariants remain green
  it("15. 既有 TASK-0003/0004/0005 不变量继续成立", async () => {
    expect(await n(`select count(*)::int c from human_review_decisions`)).toBe(6);
    expect(await n(`
      select count(*)::int c from relations r
        join entities s on r.subject_id=s.entity_id join entities o on r.object_id=o.entity_id
       where (s.canonical_name ilike '%赵孟頫%' or o.canonical_name ilike '%赵孟頫%')
         and (s.canonical_name ilike '%颐浩%' or o.canonical_name ilike '%颐浩%')
         and r.status::text in ('verified','published')`)).toBe(0);
    expect(await n(`select count(*)::int c from evidence where verification_status::text='verified'`)).toBe(0);
    // Tier C 守卫仍在
    await expect(
      db.rows(`begin;
        insert into review_queue(object_type,object_id,review_tier,status) values ('entity','t6-probe-c','C','approved');
        rollback;`)
    ).rejects.toThrow();
  });

  // §7 audit-ledger 诊断：快照而非历史账本
  it("§7 evidence_gate_audit 是当前态快照（total == distinct triples）", async () => {
    const r = await db.rows(
      `select count(*)::int total, count(distinct (object_type,object_id,gate_code))::int triples from evidence_gate_audit`
    );
    expect(Number(r[0].total)).toBe(Number(r[0].triples)); // 每「对象×门」恒一行 → 快照
    expect(Number(r[0].total)).toBeGreaterThan(0);
  });
});
