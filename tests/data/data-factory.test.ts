// tests/data/data-factory.test.ts — TASK-0003 Data Factory 验收测试。
//
// 覆盖任务书 I 节 8 项：
//   1. Raw snapshot 不覆盖旧 run
//   2. 同 Legacy ID 重跑不重复 mapping
//   3. Legacy Entity 默认 candidate
//   4. 无 Evidence Claim 不能 published
//   5. Tier C 不能自动 approved
//   6. 缺 source/identity/spatial provenance 时 Gate pending/fail
//   7. Pipeline 只选金泽，不误迁其他镇
//   8. Legacy repo 无写入
//
// 说明：DB 用例直接连本机 mohen_dev（连接串来自 gitignored 的 .env.local，测试内不出现密码）。
// 所有写操作都在事务内回滚；测试结束校验无残留。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

// @ts-expect-error —— 直接引用 .mjs 实现，vitest 可解析；TS 不做类型检查
import { writeRawSnapshot, makeRunId } from "../../pipelines/ingest/snapshot.mjs";
// @ts-expect-error —— 同上
import { evaluateGates } from "../../pipelines/evidence/gates.mjs";
// @ts-expect-error —— 同上
import { queryRows, run } from "../../packages/data-access/src/index.mjs";

const RAW_STORE = "D:/MoHen/data/raw";
const LEGACY_REPO = path.resolve(__dirname, "..", "..", "..", "hushang-jingwei");
const LEGACY_SEED = path.join(LEGACY_REPO, "data", "seed.master.json");

// 基线：本测试文件加载时快照 Legacy 真源的 size/mtime。
// 注意：不能用「git status 干净」来证明零写入 —— Legacy 仓库在本次任务之前就存在未提交改动，
// 用它做断言会把既有改动误判为本任务造成。正确做法是证明「本次运行期间该文件未被改动」。
const baseline = fs.existsSync(LEGACY_SEED)
  ? { size: fs.statSync(LEGACY_SEED).size, mtimeMs: fs.statSync(LEGACY_SEED).mtimeMs }
  : null;

const db = {
  rows: queryRows as (sql: string) => Promise<Record<string, string>[]>,
  run: run as (sql: string) => Promise<boolean>,
};

describe("TASK-0003 Data Factory", () => {
  it("1. Raw snapshot 不覆盖旧 run（append-only）", () => {
    const tmpStore = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-raw-"));
    const runId = makeRunId();
    const subset = { entities: [{ id: "A" }] };
    const manifest = { run_id: runId };

    const first = writeRawSnapshot({ runId, subset, manifest, rawStorePath: tmpStore });
    expect(fs.existsSync(first.dir)).toBe(true);
    expect(fs.existsSync(path.join(first.dir, "manifest.json"))).toBe(true);

    // 同一 runId 再写一次必须抛错，禁止覆盖旧 run
    expect(() =>
      writeRawSnapshot({ runId, subset, manifest, rawStorePath: tmpStore })
    ).toThrow(/禁止覆盖旧 run/);

    // 不同 runId 可并存（append-only 语义）
    const second = writeRawSnapshot({
      runId: makeRunId(),
      subset,
      manifest,
      rawStorePath: tmpStore,
    });
    expect(second.dir).not.toBe(first.dir);
    expect(fs.existsSync(first.dir)).toBe(true);

    fs.rmSync(tmpStore, { recursive: true, force: true });
  });

  it("2. 同 Legacy ID 重跑不重复 mapping（唯一约束生效）", async () => {
    const rows = await db.rows(
      `select count(*) as total,
              count(distinct (legacy_source, legacy_type, legacy_id, target_type)) as distinct_keys
       from legacy_mappings`
    );
    const total = Number(rows[0].total);
    const distinct = Number(rows[0].distinct_keys);
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(distinct); // 无任何重复键
  });

  it("3. Legacy Entity 默认 candidate，不出现 verified/published", async () => {
    const rows = await db.rows(
      `select count(*) as total,
              count(*) filter (where status::text = 'candidate') as candidate,
              count(*) filter (where status::text in ('verified','published')) as promoted
       from entities`
    );
    expect(Number(rows[0].total)).toBeGreaterThan(0);
    expect(Number(rows[0].candidate)).toBe(Number(rows[0].total));
    expect(Number(rows[0].promoted)).toBe(0);
  });

  it("4. 无 Evidence 的 Claim 不能 published（门禁拦截）", async () => {
    // 对照：status=candidate 必须成功；实验：status=published 必须失败。
    // 注意门禁是 deferrable initially deferred，必须 set constraints all immediate 才会触发。
    const mk = (status: string) => `
      begin;
      insert into entities(entity_type,canonical_name,status) values ('probe','t3-probe','candidate');
      insert into claims(subject_id,predicate,certainty,status,review_tier)
        select entity_id,'t3-probe',0.5,'${status}','C'
        from entities where canonical_name='t3-probe';
      set constraints all immediate;
      rollback;`;

    await expect(db.run(mk("candidate"))).resolves.toBeTruthy();
    await expect(db.run(mk("published"))).rejects.toThrow();
  });

  it("5. Tier C 不能自动 approved（无复核记录）", async () => {
    await expect(
      db.run(`begin;
        insert into review_queue(object_type,object_id,review_tier,status)
        values ('entity','t3-probe-c','C','approved');
        rollback;`)
    ).rejects.toThrow();

    // 对照：Tier C 置 pending 允许
    await expect(
      db.run(`begin;
        insert into review_queue(object_type,object_id,review_tier,status)
        values ('entity','t3-probe-c','C','pending');
        rollback;`)
    ).resolves.toBeTruthy();
  });

  it("6. 缺 source/identity/spatial provenance 时 Gate 为 fail 或 pending", () => {
    // 三要素均缺失（false=已判定不通过）
    const bad = evaluateGates({
      source: false,
      identity: false,
      spatial: false,
      evidence: true,
      time: true,
      conflict: false,
    });
    expect(bad.gates.G0.result).toBe("fail");
    expect(bad.gates.G1.result).toBe("fail");
    expect(bad.gates.G3.result).toBe("fail");
    expect(bad.gates.G6.result).toBe("fail"); // 不具备发布资格
    expect(bad.tier).toBe("C");

    // 三要素未知（undefined=待补）→ pending，不得判为 pass
    const unknown = evaluateGates({});
    expect(unknown.gates.G0.result).toBe("pending");
    expect(unknown.gates.G1.result).toBe("pending");
    expect(unknown.gates.G3.result).toBe("pending");
    expect(unknown.tier).toBe("B"); // 无 fail 但有 pending → B，不得自动晋级
  });

  it("7. Pipeline 只选金泽，不误迁其他镇", async () => {
    const statePath = path.join(RAW_STORE, "legacy", "jinze", ".last-run.json");
    expect(fs.existsSync(statePath)).toBe(true);
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const snapPath = path.join(
      RAW_STORE,
      "legacy",
      "jinze",
      state.run_id,
      "jinze-snapshot.json"
    );
    const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));

    expect(snap.entities.length).toBeGreaterThan(0);
    expect(snap.entities.every((e: { town: string }) => e.town === "金泽")).toBe(true);

    // 库内实体数与样本一致，且不超过最小样本规模（≤15）
    const rows = await db.rows(`select count(*) as c from entities`);
    expect(Number(rows[0].c)).toBe(snap.entities.length);
    expect(Number(rows[0].c)).toBeLessThanOrEqual(15);
  });

  it("8. Legacy repo 零写入（本次运行期间 size/mtime 未变，且管线无写向 Legacy 的代码）", () => {
    expect(baseline).not.toBeNull();
    const now = fs.statSync(LEGACY_SEED);
    expect(now.size).toBe(baseline!.size);
    expect(now.mtimeMs).toBe(baseline!.mtimeMs);

    // 静态扫描：管线源码中不得出现指向 Legacy 仓库的写操作
    const pipeDir = path.resolve(__dirname, "..", "..", "pipelines");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith(".mjs")) files.push(p);
      }
    };
    walk(pipeDir);
    expect(files.length).toBeGreaterThan(0);

    // 精确匹配：只看写调用的**第一个参数**（目标路径）是否指向 Legacy
    const writeRe =
      /(?:writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync)\s*\(\s*([^,;]+)/g;
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(f, "utf8");
      let m: RegExpExecArray | null;
      while ((m = writeRe.exec(src)) !== null) {
        const target = m[1];
        if (/LEGACY_SEED|LEGACY_REPO|hushang-jingwei|seed\.master\.json/.test(target)) {
          return true;
        }
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });
});
