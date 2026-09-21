// tests/data/evidence-recovery.test.ts — TASK-0004 Jinze Evidence Recovery 验收测试。
//
// 覆盖任务书 Tests 节 10 项：
//   1. 坐标无 provenance 不能通过 G3
//   2. 有 provenance 但只有镇级范围不能冒充精确点位
//   3. crossLink 无 Evidence 不会自动语义化
//   4. semantic relation candidate 必须至少有 Evidence linkage
//   5. 同名人物不会仅凭 name 自动 merge
//   6. visual source label 与实际 provider 不一致时产生风险标记
//   7. Tier C 不会自动 approved/verified
//   8. Evidence recovery 重跑幂等
//   9. Legacy 零写入
//  10. TASK-0002/0003 既有 invariants 继续通过
//
// 约定：DB 用例直接连本机 mohen_dev（连接串来自 gitignored 的 .env.local，测试内不出现密码）。
// 破坏性用例一律写在事务里 rollback。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// @ts-expect-error —— 直接引用 .mjs 实现，vitest 可解析；TS 不做类型检查
import { evaluateGates, STRUCTURAL_PREDICATES } from "../../pipelines/evidence/gates.mjs";
// @ts-expect-error —— 同上
import {
  coordinateStatus,
  isObjectLevelCoordinate,
  resolveIdentity,
  classifyVisual,
  predicateFrom,
} from "../../pipelines/evidence/recovery-rules.mjs";
// @ts-expect-error —— 同上
import { queryRows, run } from "../../packages/data-access/src/index.mjs";

const RAW_STORE = "D:/MoHen/data/raw";
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const LEGACY_REPO = path.resolve(PROJECT_ROOT, "..", "hushang-jingwei");
const LEGACY_SEED = path.join(LEGACY_REPO, "data", "seed.master.json");

// 本测试文件加载时快照 Legacy 真源；用例结束时比对（同 TASK-0003 做法：
// 不用 git status，因为 Legacy 仓库在本次任务之前就存在未提交改动）
const baseline = fs.existsSync(LEGACY_SEED)
  ? { size: fs.statSync(LEGACY_SEED).size, mtimeMs: fs.statSync(LEGACY_SEED).mtimeMs }
  : null;

const db = {
  rows: queryRows as (sql: string) => Promise<Record<string, string>[]>,
  run: run as (sql: string) => Promise<boolean>,
};

describe("TASK-0004 Jinze Evidence Recovery", () => {
  it("1. 坐标无 provenance 不能通过 G3", async () => {
    // 规则层：坐标存在但来源不可证明 → G3 fail，且不带出发布资格
    const g = evaluateGates({
      source: true,
      identity: true,
      time: true,
      spatial: false, // 有坐标但来源无法证明
      evidence: true,
      conflict: false,
    });
    expect(g.gates.G3.result).toBe("fail");
    expect(g.gates.G6.result).toBe("fail");
    expect(g.tier).toBe("C");

    // 数据层：15 个金泽实体全部 G3=fail（Legacy 坐标随迁但无来源/精度）
    const rows = await db.rows(
      `select result, count(*)::int as c from evidence_gate_audit
        where object_type='entity' and gate_code='G3' group by result`
    );
    const byResult = Object.fromEntries(rows.map((r) => [r.result, Number(r.c)]));
    expect(byResult["fail"] || 0).toBe(15);
    expect(byResult["pass"] || 0).toBe(0);

    // 规则层：coordinateStatus 对无位置著录的文本不给任何坐标可信度
    expect(coordinateStatus("").status).toBe("unresolved");
  });

  it("2. 有 provenance 但只有镇级范围不能冒充精确点位", async () => {
    // 规则层：镇级锚点不是对象级坐标
    expect(isObjectLevelCoordinate({ scope: "town_level" })).toBe(false);
    expect(isObjectLevelCoordinate({ scope: "object" })).toBe(true);
    expect(isObjectLevelCoordinate(null)).toBe(false);

    // 规则层：即使描述里写满了「位于…」，也永远推不出 verified
    const rich = coordinateStatus("位于金泽镇北市，横跨市河，寺址在镇区东南");
    expect(rich.hasLocationalProse).toBe(true);
    expect(rich.status).toBe("approximate");
    expect(rich.status).not.toBe("verified");

    // 数据层：15 条坐标 Evidence 的 precision_scope 全部是 town_level，没有一条是对象点位
    const rows = await db.rows(
      `select region_json->>'precision_scope' as scope, count(*)::int as c
         from evidence
        where extraction_method = 'coordinate_provenance:wikidata_p625_town_anchor'
        group by 1`
    );
    const byScope = Object.fromEntries(rows.map((r) => [r.scope, Number(r.c)]));
    expect(byScope["town_level"] || 0).toBe(15);
    expect(byScope["object"] || 0).toBe(0);
    expect(byScope["building_centroid"] || 0).toBe(0);

    // 数据层：实体 G3 通过数仍为 0（镇级锚点没有把任何对象抬成 pass）
    const pass = await db.rows(
      `select count(*)::int as c from evidence_gate_audit
        where object_type='entity' and gate_code='G3' and result='pass'`
    );
    expect(Number(pass[0].c)).toBe(0);
  });

  it("3. crossLink 无 Evidence 不会自动语义化", async () => {
    // 数据层：24 条 baseline crossLink 必须原样存在
    const cross = await db.rows(
      `select count(*)::int as c from relations where predicate='crossLink'`
    );
    expect(Number(cross[0].c)).toBe(24);

    // 数据层：crossLink 不得挂任何 relation_evidence（无证据就不语义化）
    const linked = await db.rows(
      `select count(*)::int as c
         from relations r join relation_evidence re on re.relation_id = r.relation_id
        where r.predicate = 'crossLink'`
    );
    expect(Number(linked[0].c)).toBe(0);

    // 规则层：crossLink 属结构型谓词，命中强制 Tier C
    expect(STRUCTURAL_PREDICATES.has("crossLink")).toBe(true);
    const g = evaluateGates({
      source: true,
      identity: true,
      evidence: false,
      conflict: false,
      forcedC: ["仅有结构型谓词 crossLink，未证明具体人文语义"],
    });
    expect(g.tier).toBe("C");
  });

  it("4. semantic relation candidate 必须至少有 Evidence linkage", async () => {
    // 数据层：任何非结构型谓词的 relation，都必须有 relation_evidence
    const rows = await db.rows(
      `select r.predicate, count(re.evidence_id)::int as ev
         from relations r
         left join relation_evidence re on re.relation_id = r.relation_id
        group by r.relation_id, r.predicate`
    );
    const semantic = rows.filter((r) => !STRUCTURAL_PREDICATES.has(r.predicate));
    expect(semantic.length).toBeGreaterThan(0); // 本轮确实产出了语义候选
    for (const r of semantic) {
      expect(Number(r.ev)).toBeGreaterThan(0);
    }

    // 规则层：谓词必须由证据句子推导；无明确语义时兜底为最弱的 mentioned_in
    expect(predicateFrom("两桥同跨一河，并称姐妹桥")).toBe("spans_same_waterway");
    // 方向校验（防「不猜方向」回退）：named_after 仅在「被命名者=建筑、命名来源=人物」时成立
    expect(
      predicateFrom("寺名取自吕颐浩", { subjectType: "building", objectType: "figure" })
    ).toBe("named_after");
    // 反向（人物为被命名者）→ 不返回 named_after，降级为最弱共提
    expect(
      predicateFrom("寺名取自吕颐浩", { subjectType: "figure", objectType: "building" })
    ).toBe("mentioned_in");
    expect(predicateFrom("某某记载中提到此桥")).toBe("mentioned_in");
  });

  it("5. 同名人物不会仅凭 name 自动 merge", async () => {
    // 规则层：只有 1 个维度一致 → unresolved
    expect(resolveIdentity({
      dimensions: [{ dim: "姓名", agree: true }],
      trueCrossTownHomonym: false,
      stubHomonym: true,
    }).decision).toBe("unresolved");

    // 规则层：真实跨镇同名存在时，即使维度一致也不得判定为同一人
    expect(resolveIdentity({
      dimensions: [{ agree: true }, { agree: true }],
      trueCrossTownHomonym: true,
      stubHomonym: false,
    }).decision).toBe("unresolved");

    // 规则层：维度足够也只是 candidate，merged 恒为 false（跨源链接须人工裁决）
    const ok = resolveIdentity({
      dimensions: [{ agree: true }, { agree: true }, { agree: false }],
      trueCrossTownHomonym: false,
      stubHomonym: true,
    });
    expect(ok.decision).not.toBe("unresolved");
    expect(ok.merged).toBe(false);

    // 数据层：库内不存在任何 sameAs 自动合并关系
    const sameAs = await db.rows(
      `select count(*)::int as c from relations where predicate='sameAs'`
    );
    expect(Number(sameAs[0].c)).toBe(0);

    // 数据层：吕颐浩实体唯一（姓名桩未被合并进来）
    const ly = await db.rows(
      `select count(*)::int as c from entities where canonical_name='吕颐浩'`
    );
    expect(Number(ly[0].c)).toBe(1);
  });

  it("6. visual source label 与实际 provider 不一致时产生风险标记", async () => {
    // 规则层：登记标签 hushang-jingwei，实际托管 upload.wikimedia.org → 必须打标
    const bad = classifyVisual({
      filePath: "https://upload.wikimedia.org/wikipedia/commons/9/96/CRH380A.jpg",
      providerLabel: "hushang-jingwei",
      imageinfo: { extmetadata: {} },
      description: "CRH380A at Jinze",
    });
    expect(bad.providerActual).toBe("wikimedia-commons");
    expect(bad.labelMismatch).toBe(true);
    expect(bad.riskFlags).toContain("provider_label_mismatch");
    expect(bad.riskFlags).toContain("content_not_depicting_entity");

    // 规则层：标签一致时不产生该标记（对照组，证明不是无脑打标）
    const good = classifyVisual({
      filePath: "https://upload.wikimedia.org/wikipedia/commons/9/96/x.jpg",
      providerLabel: "wikimedia-commons",
      imageinfo: { extmetadata: {} },
      description: "",
    });
    expect(good.labelMismatch).toBe(false);
    expect(good.riskFlags).not.toContain("provider_label_mismatch");

    // 数据层：本批 20 张全部被识别出标签不一致（source_id 仍指向 Legacy 来源记录）
    const rows = await db.rows(
      `select count(*)::int as c from evidence
        where extraction_method='visual_provenance:commons_imageinfo'
          and (region_json->>'label_mismatch')::boolean`
    );
    expect(Number(rows[0].c)).toBe(20);
  });

  it("7. Tier C 不会自动 approved/verified", async () => {
    // 数据层：没有任何对象被自动提到 verified/published
    for (const t of ["entities", "claims", "relations"]) {
      const rows = await db.rows(
        `select count(*)::int as c from ${t} where status::text in ('verified','published')`
      );
      expect(Number(rows[0].c)).toBe(0);
    }
    const evs = await db.rows(
      `select count(*)::int as c from evidence where verification_status::text in ('verified')`
    );
    expect(Number(evs[0].c)).toBe(0);

    // 门禁层：Tier C 直接 approved 仍被拒（TASK-0003 触发器未被削弱）
    await expect(
      db.run(`begin;
        insert into review_queue(object_type,object_id,review_tier,status)
        values ('entity','t4-probe-c','C','approved');
        rollback;`)
    ).rejects.toThrow();
  });

  it("8. Evidence recovery 重跑幂等（真实执行两次，计数不变）", async () => {
    const countAll = async () => {
      const rows = await db.rows(
        `select extraction_method, count(*)::int as c
           from evidence
          where extraction_method = any(array[
            'coordinate_provenance:wikidata_p625_town_anchor',
            'visual_provenance:commons_imageinfo',
            'identity_resolution:wikidata_entity_match',
            'legacy_description_mining'])
          group by extraction_method`
      );
      const rel = await db.rows(
        `select count(*)::int as c from relations where legacy_id is null`
      );
      const audit = await db.rows(
        `select count(*)::int as c from evidence_gate_audit`
      );
      return {
        evidence: rows
          .map((r) => `${r.extraction_method}=${r.c}`)
          .sort()
          .join("|"),
        newRelations: Number(rel[0].c),
        audit: Number(audit[0].c),
      };
    };

    const before = await countAll();
    // 真实跑两次（每次约 6s），验证既不重复插入也不重复建关系
    for (let i = 0; i < 2; i++) {
      execFileSync(process.execPath, ["pipelines/evidence/recover.mjs"], {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
        env: { ...process.env },
      });
    }
    const after = await countAll();

    // 两次重跑后，各类证据计数、新增关系数、审计行数全部不变
    expect(after).toEqual(before);

    // 且每类恰好一份：坐标 15 / 视觉 20 / 身份 1 / 关系证据 6，新增语义关系 6
    const ev = await db.rows(
      `select extraction_method, count(*)::int as c from evidence group by extraction_method`
    );
    const m = Object.fromEntries(ev.map((r) => [r.extraction_method, Number(r.c)]));
    expect(m["coordinate_provenance:wikidata_p625_town_anchor"]).toBe(15);
    expect(m["visual_provenance:commons_imageinfo"]).toBe(20);
    expect(m["identity_resolution:wikidata_entity_match"]).toBe(1);
    expect(m["legacy_description_mining"]).toBe(6);
    expect(after.newRelations).toBe(6);
  }, 180_000);

  it("9. Legacy repo 零写入（运行期间 size/mtime 未变，且管线无写向 Legacy 的代码）", () => {
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
    expect(files.length).toBeGreaterThan(0);

    const writeRe =
      /(?:writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync)\s*\(\s*([^,;]+)/g;
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

  it("10. TASK-0002/0003 既有 invariants 继续通过", async () => {
    // (a) Legacy Entity 默认 candidate，未出现 verified/published
    const ents = await db.rows(
      `select count(*)::int as total,
              count(*) filter (where status::text='candidate') as candidate
         from entities`
    );
    expect(Number(ents[0].total)).toBeGreaterThan(0);
    expect(Number(ents[0].candidate)).toBe(Number(ents[0].total));

    // (b) 重跑不产生重复 mapping
    const maps = await db.rows(
      `select count(*)::int as total,
              count(distinct (legacy_source,legacy_type,legacy_id,target_type)) as distinct_keys
         from legacy_mappings`
    );
    expect(Number(maps[0].total)).toBe(Number(maps[0].distinct_keys));

    // (c) 无 Evidence 的 Claim 不能 published
    const mk = (status: string) => `
      begin;
      insert into entities(entity_type,canonical_name,status) values ('probe','t4-probe','candidate');
      insert into claims(subject_id,predicate,certainty,status,review_tier)
        select entity_id,'t4-probe',0.5,'${status}','C'
        from entities where canonical_name='t4-probe';
      set constraints all immediate;
      rollback;`;
    await expect(db.run(mk("candidate"))).resolves.toBeTruthy();
    await expect(db.run(mk("published"))).rejects.toThrow();

    // (d) Raw snapshot 仍只含金泽，未被本轮覆盖
    const statePath = path.join(RAW_STORE, "legacy", "jinze", ".last-run.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const snap = JSON.parse(
      fs.readFileSync(
        path.join(RAW_STORE, "legacy", "jinze", state.run_id, "jinze-snapshot.json"),
        "utf8"
      )
    );
    expect(snap.entities.length).toBeGreaterThan(0);
    expect(snap.entities.every((e: { town: string }) => e.town === "金泽")).toBe(true);

    // (e) 本轮新增的外部 Raw 落在独立目录，未覆盖 TASK-0003 的 Legacy snapshot
    const extStatePath = path.join(RAW_STORE, "external", "jinze-evidence-recovery", ".last-run.json");
    expect(fs.existsSync(extStatePath)).toBe(true);
    const extState = JSON.parse(fs.readFileSync(extStatePath, "utf8"));
    expect(extState.dir).toContain("external");
    expect(fs.existsSync(path.join(extState.dir, "manifest.json"))).toBe(true);
  }, 120_000);
});
