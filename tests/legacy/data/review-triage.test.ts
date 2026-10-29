// tests/data/review-triage.test.ts — M2 第四条：review_queue AUTO/HOLD/REJECT 三分。
// 对应迁移：supabase/migrations/202610020009_review_queue_triage.sql（断点 B-02 的正解）。
//
// 覆盖：
//   1. 分诊行必须带 reason_code（判断必须可解释）
//   2. auto：Tier C 禁止；出生必须 approved；必须记录规则 review_note；合法 auto 通过
//   3. hold：出生必须 pending；人审定案（status='approved'）可事后进行且 reviewed_at 落库
//   4. reject：出生必须 rejected；合法 reject 通过
//   5. triage_outcome 不可改写（人审改的是 status，不是当初的分诊）
//   6. ingest_run_id 外键 + 同 run 同对象唯一（分诊幂等）
//   7. 源契约：unattended-runner 的候选写入必须产生带 triage 的 review_queue 行（防 SQL 漂移）
//   8. 向后兼容：不带 triage_outcome 的行照常可插（既有流程不受影响；历史行 NULL 不算违规）
//
// 约定：DB 用例连「<真库名>_test」测试库（pnpm test 自动建库并灌入真库快照，入口护栏见
// tests/setup/db-guard.ts）；探针行以 t9-triage- 前缀标记，afterAll 清理。

import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { queryRows, run, queryValue } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const db = {
  rows: queryRows as (
    sql: string,
    params?: Record<string, unknown>
  ) => Promise<Record<string, string>[]>,
};

// 负例：整段包在 begin/rollback 里，报错即 ON_ERROR_STOP → psql 非零退出 → rejects。
async function expectRejects(sql: string) {
  await expect(db.rows(`begin;\n${sql}\nrollback;`)).rejects.toThrow();
}

afterAll(async () => {
  await run(`delete from review_queue where object_id like 't9-triage-%'`);
  await run(`delete from ingest_runs where pipeline_name = 't9-triage-test'`);
});

describe("M2-4 · review_queue 三分（迁移 202610020009）", () => {
  it("1. 分诊行必须带 reason_code", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome)
       values ('entity','t9-triage-1','C',null,'pending','hold')`
    );
  });

  it("2a. auto + Tier C → 拒绝", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,review_note,triage_outcome)
       values ('entity','t9-triage-2a','C','rc','approved','rule:test v1','auto')`
    );
  });

  it("2b. auto 出生非 approved → 拒绝", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,review_note,triage_outcome)
       values ('entity','t9-triage-2b','B','rc','pending','rule:test v1','auto')`
    );
  });

  it("2c. auto 无 review_note（规则/版本）→ 拒绝", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome)
       values ('entity','t9-triage-2c','B','rc','approved','auto')`
    );
  });

  it("2d. 合法 auto（Tier B + approved + 规则）通过", async () => {
    await run(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status,review_note,triage_outcome)
       values ('entity','t9-triage-2d','B','deterministic_match','测试：确定性晋级','approved','rule:test v1','auto')`
    );
    const rows = await db.rows(
      `select status, triage_outcome, review_note from review_queue where object_id='t9-triage-2d'`
    );
    expect(rows.length).toBe(1);
    expect(rows[0].triage_outcome).toBe("auto");
    expect(rows[0].status).toBe("approved");
    expect(rows[0].review_note).toBe("rule:test v1");
  });

  it("3a. hold 出生即 approved → 拒绝（隔离区定案权在人）", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome)
       values ('entity','t9-triage-3a','C','rc','approved','hold')`
    );
  });

  it("3b. 合法 hold 出生 pending → 人审后可 approved（reviewed_at 落库）", async () => {
    await run(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status,triage_outcome)
       values ('entity','t9-triage-3b','C','identity_ambiguous','测试：同名歧义','pending','hold')`
    );
    // 人审定案：改的是 status（Tier C 另需 review_note + reviewed_at，既有 tier_c 守卫）
    await run(
      `update review_queue set status='approved', review_note='human: 确认无误', reviewed_at=now()
       where object_id='t9-triage-3b'`
    );
    const rows = await db.rows(
      `select status, triage_outcome, reviewed_at is not null as has_reviewed from review_queue where object_id='t9-triage-3b'`
    );
    expect(rows[0].status).toBe("approved");
    expect(rows[0].triage_outcome).toBe("hold"); // 分诊不因定案而改变
    expect(rows[0].has_reviewed === true || rows[0].has_reviewed === "t").toBe(true);
  });

  it("4a. reject 出生非 rejected → 拒绝", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome)
       values ('entity','t9-triage-4a','C','rc','pending','reject')`
    );
  });

  it("4b. 合法 reject 通过（对象未成为候选也留痕）", async () => {
    await run(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status,review_note,triage_outcome)
       values ('visual_asset','t9-triage-4b','C','non_image_mime','测试：非图片冒充','rejected','rule:test fail-closed','reject')`
    );
    const rows = await db.rows(
      `select status, triage_outcome from review_queue where object_id='t9-triage-4b'`
    );
    expect(rows[0].status).toBe("rejected");
    expect(rows[0].triage_outcome).toBe("reject");
  });

  it("5. triage_outcome 不可改写（置 NULL / 改值都拒绝）", async () => {
    const ins = `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome)
                 values ('entity','t9-triage-5','C','rc','pending','hold');`;
    await expectRejects(
      `${ins}\nupdate review_queue set triage_outcome=null where object_id='t9-triage-5';`
    );
    await expectRejects(
      `${ins}\nupdate review_queue set triage_outcome='auto' where object_id='t9-triage-5';`
    );
  });

  it("6a. ingest_run_id 指向不存在的 run → 拒绝（外键）", async () => {
    await expectRejects(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome,ingest_run_id)
       values ('entity','t9-triage-6a','C','rc','pending','hold','00000000-0000-0000-0000-000000000000'::uuid)`
    );
  });

  it("6b. 同 run 同对象重复分诊 → 拒绝（分诊幂等）", async () => {
    const rid = await queryValue(
      `insert into ingest_runs (pipeline_name, source_scope) values ('t9-triage-test','probe') returning ingest_run_id::text`
    );
    expect(rid).toBeTruthy();
    const ins = (oid: string) =>
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status,triage_outcome,ingest_run_id)
       values ('entity','${oid}','C','rc','pending','hold','${rid}'::uuid);`;
    // 第一条 + 同对象第二条 → 唯一部分索引 uq_review_queue_triage_per_run 拒绝
    await expectRejects(`${ins("t9-triage-6b")}\n${ins("t9-triage-6b")}`);
    // 不同对象同 run → 合法
    await run(ins("t9-triage-6b-ok"));
    const rows = await db.rows(
      `select count(*)::int as c from review_queue where object_id like 't9-triage-6b%' and ingest_run_id='${rid}'::uuid`
    );
    expect(Number(rows[0].c)).toBe(1);
  });

  it("7. 源契约：runner 的候选写入必须带 triage（防 SQL 漂移）", () => {
    const src = fs.readFileSync(
      path.join(PROJECT_ROOT, "pipelines/legacy/unattended-runner.mjs"),
      "utf8"
    );
    // review_queue 插入必须含 triage_outcome + ingest_run_id
    expect(src).toMatch(/insert into review_queue[\s\S]*?triage_outcome/);
    expect(src).toMatch(/triage_outcome,ingest_run_id/);
    // recordTriage 至少在 jobImages 与 jobCoords 两处接线
    const uses = src.match(/await recordTriage\(/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    // run 级归因：登记 + 收口
    expect(src).toMatch(/insert into ingest_runs/);
    expect(src).toMatch(/update ingest_runs set finished_at/);
  });

  it("8. 向后兼容：不带 triage_outcome 的行照常可插（历史行 NULL 不算违规）", async () => {
    await run(
      `insert into review_queue (object_type,object_id,review_tier,reason_code,status)
       values ('entity','t9-triage-8','B','legacy_flow','pending')`
    );
    const rows = await db.rows(
      `select triage_outcome is null as is_null from review_queue where object_id='t9-triage-8'`
    );
    expect(rows[0].is_null === true || rows[0].is_null === "t").toBe(true);
    // 既有 293 行（出生于机制之前）保持 NULL：不算违规、未被触碰。
    // 不断言恰好 293：其他测试文件可能并发写 review_queue（同跑 _test 库），只锁下界。
    const legacy = await db.rows(
      `select count(*)::int as c from review_queue where triage_outcome is null and object_id not like 't9-triage-%'`
    );
    expect(Number(legacy[0].c)).toBeGreaterThanOrEqual(293);
  });
});
