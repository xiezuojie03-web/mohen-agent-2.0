// tests/data/spatial-grounding.test.ts — TASK-0007 Jinze Spatial Grounding 验收测试。
//
// 覆盖任务书 §8 的 18 项不变量 + WP-D/WP-E 门槛 + §9 audit-ledger 约束。
// 约定（同 TASK-0006）：DB 用例直连本机 mohen_dev（连接串来自 gitignored 的 .env.local，测试内不出现密码）。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { queryRows } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SPATIAL_METHOD = "spatial_anchor:amap_place_text_v3";
const PIPELINE = path.join(PROJECT_ROOT, "pipelines", "ingest", "retrieve-amap-jinze.mjs");
const LEGACY_SEED = path.join(path.resolve(PROJECT_ROOT, "..", "hushang-jingwei"), "data", "seed.master.json");
const RAW_ROOT = process.env.MOHEN_RAW_STORE_PATH
  ? path.join(process.env.MOHEN_RAW_STORE_PATH, "external", "jinze-spatial")
  : "D:/MoHen/data/raw/external/jinze-spatial";

const q = queryRows as (sql: string) => Promise<Record<string, unknown>[]>;
const n = async (sql: string) => Number((await q(sql))[0].c);
/** spatial evidence 行（显式成类型，避免索引签名带来的类型噪音） */
type SpatialRow = {
  id: string;
  place_hint: string;
  subject_hint: string | null;
  time_hint: string | null;
  source_id: string;
  subject_is_null: string;
  time_is_null: string;
  region_json: Record<string, any>;
};

/** 取 spatial evidence 全量（唯一入口，避免各用例 SQL 口径漂移） */
// 两个坑：(1) queryRows 经 psql CSV 返回，jsonb 列是「字符串」，必须显式 JSON.parse；
//        (2) 同一传输会把 SQL NULL 渲染成空串，无法与真空串区分 → 另取 (col is null) 布尔量判定（渲染为 true/false）。
const spatial = async (): Promise<SpatialRow[]> => {
  const rows = await q(
    `select evidence_id::text as id, place_hint, subject_hint, time_hint, source_id::text as source_id,
            (subject_hint is null)::text as subject_is_null,
            (time_hint is null)::text as time_is_null,
            region_json::text as region_json
       from evidence where extraction_method='${SPATIAL_METHOD}' order by place_hint`
  );
  return rows.map((r) => ({
    ...(r as unknown as SpatialRow),
    region_json: JSON.parse(String(r.region_json)) as Record<string, any>,
  }));
};

const baseline = fs.existsSync(LEGACY_SEED)
  ? { size: fs.statSync(LEGACY_SEED).size, mtimeMs: fs.statSync(LEGACY_SEED).mtimeMs }
  : null;

function latestReplayDir(): string | null {
  if (!fs.existsSync(RAW_ROOT)) return null;
  const dirs = fs
    .readdirSync(RAW_ROOT)
    .filter((d) => d.startsWith("jinze-spatial-"))
    .map((d) => path.join(RAW_ROOT, d))
    .filter((d) => fs.statSync(d).isDirectory())
    .filter((d) => fs.readdirSync(d).some((f) => f.startsWith("raw-amap-")))
    .sort();
  return dirs.length ? dirs[dirs.length - 1] : null;
}

const ACCEPTED = ["万安桥", "普济桥", "迎祥桥", "林老桥"];
const AMBIGUOUS = ["白苎里 → 金溪 → 金泽 · 地名叠影", "金泽放生桥", "如意桥", "天皇阁桥", "颐浩寺遗址"];

describe("TASK-0007 Jinze Spatial Grounding", () => {
  // 1. No guessed coordinates
  it("1. 不猜坐标：未接受对象一律无坐标（original / transformed 皆 null）", async () => {
    const rows = await spatial();
    expect(rows.length).toBe(9);
    for (const r of rows) {
      const rj = r.region_json as Record<string, unknown>;
      if (rj.precision_status !== "official_or_provider_object_point") {
        expect(rj.original, `${r.place_hint} 不应有坐标`).toBeNull();
        expect(rj.transformed).toBeNull();
        expect(rj.coord_system).toBeNull();
      }
    }
    // 接受数恰为 4
    const acc = rows.filter(
      (r) => (r.region_json as Record<string, unknown>).precision_status === "official_or_provider_object_point"
    );
    expect(acc.map((r) => r.place_hint).sort()).toEqual([...ACCEPTED].sort());
  });

  // 2. Town-level anchor never becomes object-level point
  it("2. 镇级锚点绝不冒充对象点", async () => {
    // 既有 Wikidata 镇锚仍全部 town_level，且数量未被本任务改动
    expect(
      await n(`select count(*)::int c from evidence where region_json->>'precision_scope'='town_level'`)
    ).toBe(15);
    expect(
      await n(
        `select count(*)::int c from evidence
          where region_json->>'precision_scope'='town_level' and extraction_method like 'coordinate_provenance:wikidata%'`
      )
    ).toBe(15);
    // 「金泽镇」这一镇级对象不得被接受为对象点
    const town = (await spatial()).find((r) => r.place_hint === "白苎里 → 金溪 → 金泽 · 地名叠影");
    const rj = town!.region_json as Record<string, unknown>;
    expect(rj.precision_status).toBe("ambiguous");
    expect(rj.original).toBeNull();
    expect(rj.precision_scope).toBe("unknown");
    // 对象点只能是 object_point_provider，且其数 == 4
    expect(
      await n(
        `select count(*)::int c from evidence where extraction_method='${SPATIAL_METHOD}'
          and region_json->>'precision_scope'='object_point_provider'`
      )
    ).toBe(4);
  });

  // 3. AMap current POI never becomes historical-position Evidence
  it("3. 当前 POI 绝不冒充历史位置（current_vs_historical=current；G2 不得 pass）", async () => {
    const rows = await spatial();
    for (const r of rows) {
      const rj = r.region_json as Record<string, unknown>;
      expect(rj.current_vs_historical, `${r.place_hint}`).toBe("current");
      // time_hint 必须为 SQL NULL（psql CSV 把 NULL 渲染为空串 → 用 is null 布尔量判定；布尔渲染为 true/false）
      expect(String(r.time_is_null), `${r.place_hint} 不得声称时间有效性`).toMatch(/^t(rue)?$/);
    }
    // G2（时间门）对 spatial evidence 必须全为 pending
    expect(
      await n(`select count(*)::int c from evidence_gate_audit a
                where a.object_type='evidence' and a.gate_code='G2' and a.result='pass'
                  and exists (select 1 from evidence e where e.evidence_id::text=a.object_id
                              and e.extraction_method='${SPATIAL_METHOD}')`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from evidence_gate_audit a
                where a.object_type='evidence' and a.gate_code='G2' and a.result='pending'
                  and exists (select 1 from evidence e where e.evidence_id::text=a.object_id
                              and e.extraction_method='${SPATIAL_METHOD}')`)
    ).toBe(9);
  });

  // 4. Original provider coordinates preserved
  it("4. 原始坐标原样保留（与 raw 快照逐点比对，不改一字）", async () => {
    const rows = await spatial();
    let checked = 0;
    for (const r of rows) {
      const rj = r.region_json as Record<string, unknown>;
      const orig = rj.original as { lat: number; lng: number; location_raw: string } | null;
      if (!orig) continue;
      const hit = rj.provider_hit as { id: string; location_raw: string };
      expect(orig.location_raw).toBe(hit.location_raw); // 与 provider_hit 一致
      expect(orig.location_raw).toBe(`${orig.lng},${orig.lat}`); // 形态：lng,lat
      // 必须能在 raw 快照中原样找到（证明未经改写）
      const runId = rj.run_id as string;
      const dir = path.join(RAW_ROOT, runId);
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith("raw-amap-")) : [];
      const found = files.some((f) => {
        const txt = fs.readFileSync(path.join(dir, f), "utf8");
        return txt.includes(orig.location_raw) && txt.includes(`"${hit.id}"`);
      });
      expect(found, `${r.place_hint} 的原始 location 必须存在于 raw 快照`).toBe(true);
      checked++;
    }
    expect(checked).toBe(4);
  });

  // 5. Any coordinate transformation is explicit and reproducible
  it("5. 任何坐标转换必须显式可复现（本任务换算数 = 0）", async () => {
    for (const r of await spatial()) {
      const rj = r.region_json as Record<string, unknown>;
      expect(rj.transform_applied, `${r.place_hint} 本任务不应做任何换算`).toBe(false);
      expect(rj.transformed).toBeNull();
      expect(rj.transform_method).toBeNull();
      // 不做换算的理由必须显式登记（有坐标者）
      if (rj.original) expect(String(rj.transform_reason).length).toBeGreaterThan(20);
      // 坐标系必须显式登记
      if (rj.original) expect(rj.coord_system).toBe("GCJ-02");
    }
  });

  // 6. Ambiguous POI search is not auto-resolved
  it("6. 歧义不得被机器消歧（5 例全部转人审，且各留下完整候选）", async () => {
    const rows = await spatial();
    const amb = rows.filter((r) => (r.region_json as Record<string, unknown>).precision_status === "ambiguous");
    expect(amb.length).toBe(5);
    expect(amb.map((r) => r.place_hint).sort()).toEqual([...AMBIGUOUS].sort());
    for (const r of amb) {
      const rj = r.region_json as Record<string, unknown>;
      expect(rj.original).toBeNull(); // 未择一
      expect(String(r.subject_is_null), `${r.place_hint} 不得冒认身份`).toMatch(/^t(rue)?$/); // 未冒认身份
      // 未接受者必须有决策规则与理由，且候选被留存（供人审）
      expect(String(rj.decision_rule)).toContain("禁止以距离远近作为取舍依据");
      expect(String(rj.decision_reason).length).toBeGreaterThan(8);
      const cc = rj.candidate_counts as Record<string, number>;
      expect(cc.total).toBeGreaterThan(0);
      expect(Array.isArray(rj.candidate_points)).toBe(true);
      expect((rj.candidate_points as unknown[]).length).toBeGreaterThan(0);
    }
    // 人审包存在，且包含 5 个 POI 议题
    const csv = fs.readFileSync(path.join(PROJECT_ROOT, "data", "exports", "jinze-spatial-human-review.csv"), "utf8");
    for (const name of ["颐浩寺遗址", "如意桥", "天皇阁桥", "金泽放生桥"]) {
      expect(csv).toContain(name);
    }
  });

  // 7. Every accepted spatial anchor has Evidence
  it("7. 每个被接受的锚点都有 Evidence（且 G0/G1/G3 pass、来源可追溯）", async () => {
    const rows = (await spatial()).filter(
      (r) => (r.region_json as Record<string, unknown>).precision_status === "official_or_provider_object_point"
    );
    expect(rows.length).toBe(4);
    for (const r of rows) {
      expect(r.source_id).toBeTruthy();
      const g = await q(
        `select gate_code, result from evidence_gate_audit
          where object_type='evidence' and object_id='${r.id}' order by gate_code`
      );
      const byCode = Object.fromEntries(g.map((x) => [String(x.gate_code), String(x.result)]));
      expect(byCode.G0, `${r.place_hint} G0`).toBe("pass");
      expect(byCode.G1, `${r.place_hint} G1`).toBe("pass");
      expect(byCode.G3, `${r.place_hint} G3`).toBe("pass");
      // 来源记录必须指向 raw 快照，且不含 key
      const src = await q(`select source_uri, raw_path, provider, checksum from source_records
                            where source_id='${r.source_id}'`);
      expect(src.length).toBe(1);
      expect(String(src[0].provider)).toBe("amap");
      expect(String(src[0].source_uri)).not.toContain("key=");
      expect(String(src[0].raw_path)).toContain("raw-amap-");
    }
  });

  // 8/9. Historical map provenance + usage mode explicit
  it("8+9. 历史地图 provenance 与用途模式必须显式（且不得有未登记资产混入）", async () => {
    const maps = await q(`select source_uri, license_code, provider from source_records
                           where content_type='image/map'`);
    expect(maps.length).toBe(3);
    for (const m of maps) {
      expect(String(m.source_uri)).toMatch(/^https?:\/\//);
      expect(String(m.provider)).toBe("Wikimedia Commons");
    }
    // 用途模式已声明（6 词表之一），且每张图各有判定
    const audit = fs.readFileSync(
      path.join(PROJECT_ROOT, "data", "exports", "jinze-historical-map-audit.md"),
      "utf8"
    );
    for (const mode of [
      "global_registration",
      "local_registration",
      "anchor_points_only",
      "historical_spatial_reconstruction",
      "original_map_narrative",
      "not_usable",
    ]) {
      expect(audit).toContain(mode);
    }
    // provenance 在文档层必须显式（license / 作者 / 年代 / 核验端点）
    expect(audit).toContain("Public domain");
    expect(audit).toContain("汪祖绶");
    expect(audit).toContain("陳夢雷");
    expect(audit).toContain("extmetadata");
    // 未登记的 public/yutu 扫描资产不得进入 DB。
    // §12-26：绊线只拦 `public/yutu/` **目录扫描件**（36 页无 provenance 的方志舆图）；
    // TASK-0011 起上图 yutu 图谱**馆藏记录**（yutu.library.sh.cn，带元数据 provenance）
    // 可合法登记，不属于本绊线范围。
    expect(
      await n(`select count(*)::int c from source_records where source_uri like '%public/yutu%'`)
    ).toBe(0);
    expect(await n(`select count(*)::int c from visual_assets where asset_type='map'`)).toBe(0);
  });

  // 8b. 已披露缺口绊线（不得静默变化）
  it("8b. 已披露缺口：3 张地图 Source Record 的 license_code 仍为空（DB 层缺口已被文档记录）", async () => {
    const empty = await n(`select count(*)::int c from source_records
                            where content_type='image/map' and coalesce(license_code,'')=''`);
    expect(empty, "若已回填 license_code，须同步更新 jinze-historical-map-audit.md §9 并解除本用例").toBe(3);
    const audit = fs.readFileSync(
      path.join(PROJECT_ROOT, "data", "exports", "jinze-historical-map-audit.md"),
      "utf8"
    );
    expect(audit).toContain("license_code` 为空");
  });

  // 10. No forced global georeferencing
  it("10. 未做强制全局配准（无新 migration、管线无配准实现）", async () => {
    const migDir = path.join(PROJECT_ROOT, "supabase", "migrations");
    const migs = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
    // 本任务的不变量是「**本任务未为配准新增 migration**」，不是「migration 总数恒为 4」——
    // 后者会把别的任务合法新增的 migration（如 TASK-0008 的 006 视觉链接）误报成本任务违约。
    // 改为直接检查现存 migration 内容：不得出现配准/仿射/控制点实现。
    const georefMigs = migs.filter((f) => {
      const sql = fs.readFileSync(path.join(migDir, f), "utf8");
      return /georeferenc|affine|control_point|controlPoint/i.test(sql);
    });
    expect(georefMigs, "不得新增配准相关 migration").toEqual([]);
    const src = fs.readFileSync(PIPELINE, "utf8");
    expect(src.includes("georeferenc")).toBe(false);
    expect(src.includes("affine")).toBe(false);
    expect(src.includes("controlPoint") || src.includes("control_point")).toBe(false);
  });

  // 11. HR-1…HR-6 unchanged
  it("11. HR-1…HR-6 冻结不变", async () => {
    // HR-3：批量 part_of 仍为 0
    expect(await n(`select count(*)::int c from relations where predicate='part_of'`)).toBe(0);
    // HR-5：视觉排除仍为 20
    expect(
      await n(`select count(*)::int c from visual_assets where eligibility_tags::text like '%excluded_from_heritage_primary%'`)
    ).toBe(20);
    // legend 保持 legend（赵孟頫 ↔ 颐浩寺 未升级）
    expect(
      await n(`select count(*)::int c from claims where generated_by='mohen-knowledge-weave'
                and (predicate ilike '%zhaomengfu%' or object_value::text ilike '%赵孟頫%')`)
    ).toBe(0);
    // HR-1…HR-6 记录文档未被本任务改写
    const hrDocs = fs
      .readdirSync(path.join(PROJECT_ROOT, "data", "exports"))
      .filter((f) => /human-review/i.test(f));
    expect(hrDocs.length).toBeGreaterThan(0);
  });

  // 12. Knowledge Weave unchanged
  it("12. Knowledge Weave 未被改动（claims/paths/discoveries/relations 计数不变）", async () => {
    expect(await n(`select count(*)::int c from claims where generated_by='mohen-knowledge-weave'`)).toBe(5);
    expect(await n(`select count(*)::int c from knowledge_paths`)).toBe(3);
    expect(await n(`select count(*)::int c from discovery_candidates`)).toBe(4);
    // §12-26（TASK-0010 修正）：此处原本断言 `relations` 总数 = 30 —— 那是**过期的绝对总数**。
    // 改为断言真正的不变量：legacy 映射恒 24、非 crossLink 关系必带 Evidence、
    // 且切片关系（TASK-0010 起）落在 historical_spatial_relations 而非 relations。
    // ENG-GOV-01（A 类调和 STALE_COUNT）：CW-02 AD-02 规范锚 relation 以 legacy_id=''
    // 合法入列，使「legacy_id is not null」误含该行（24→25）——用 nullif 排除空串，
    // 不变量本体不变：**weave legacy 映射关系恒为 24**。
    expect(await n(`select count(*)::int c from relations where nullif(legacy_id,'') is not null`)).toBe(24);
    // ENG-GOV-01（B 类调和 STALE_STATE）：无证据语义关系恒为 0 的不变量不变；
    // 挂接路径承认 legacy relation_evidence ∨ 008 claim 片段挂接（CW-02 former_site_of）。
    expect(
      await n(`select count(*)::int c from relations r
                where r.predicate <> 'crossLink'
                  and not exists (select 1 from relation_evidence re where re.relation_id=r.relation_id)
                  and not exists (
                        select 1 from cultural_relation_claims crc
                         where crc.existing_relation_id = r.relation_id
                           and coalesce(array_length(crc.evidence_fragment_ids, 1), 0) > 0)`)
    ).toBe(0);
    // 空间任务不得产生 claim / relation / discovery
    expect(
      await n(`select count(*)::int c from claims where generated_by ilike '%spatial%'`)
    ).toBe(0);
    expect(
      await n(`select count(*)::int c from discovery_candidates where discovery_code ilike '%spatial%'`)
    ).toBe(0);
  });

  // 13. No new published
  it("13. 本任务未产生 published", async () => {
    expect(await n(`select count(*)::int c from claims where status='published'`)).toBe(0);
    expect(await n(`select count(*)::int c from discovery_candidates where publishable`)).toBe(0);
    expect(await n(`select count(*)::int c from knowledge_paths where status='published'`)).toBe(0);
    // spatial evidence 一律 candidate
    expect(
      await n(`select count(*)::int c from evidence where extraction_method='${SPATIAL_METHOD}'
                and verification_status <> 'candidate'`)
    ).toBe(0);
  });

  // 14. Raw external responses append-only
  it("14. raw 快照 append-only（历史 run 目录不被覆盖）", async () => {
    const dirs = fs
      .readdirSync(RAW_ROOT)
      .filter((d) => d.startsWith("jinze-spatial-"))
      .sort();
    expect(dirs.length).toBeGreaterThanOrEqual(2);
    const withRaw = dirs.filter((d) =>
      fs.readdirSync(path.join(RAW_ROOT, d)).some((f) => f.startsWith("raw-amap-"))
    );
    expect(withRaw.length).toBeGreaterThanOrEqual(2);
    // 取「文件最多的那一次 run」（= 含 P0+P1 的完整 run）作为完整快照样本
    const fullest = withRaw
      .map((d) => ({ d, files: fs.readdirSync(path.join(RAW_ROOT, d)).filter((f) => f.startsWith("raw-amap-")) }))
      .sort((a, b) => b.files.length - a.files.length)[0];
    expect(fullest.files.length).toBe(11);
    // 两个 run 的同一对象快照各自留存（未被后一次覆盖）
    for (const d of withRaw) {
      const p = path.join(RAW_ROOT, d, "raw-amap-万安桥__万安桥.json");
      if (fs.existsSync(p)) expect(fs.statSync(p).size).toBeGreaterThan(0);
    }
    expect(
      withRaw.some((d) => fs.existsSync(path.join(RAW_ROOT, d, "raw-amap-万安桥__万安桥.json"))),
      "首轮 raw 必须仍存在"
    ).toBe(true);
    // 最终目录内必须有 run 摘要（证明 run 独立、未复用同一目录）
    expect(fs.existsSync(path.join(RAW_ROOT, withRaw[withRaw.length - 1], "_run-summary.json"))).toBe(true);
  });

  // 15. No secret exposure
  it("15. 无 secret 泄露（key 不落盘、不入库、不入 Git）", async () => {
    const src = fs.readFileSync(PIPELINE, "utf8");
    // 管线内不得出现任何疑似 AMap key 字面量（32 位十六进制串）
    const literalKeys = src.match(/["'][0-9a-f]{32}["']/gi) || [];
    expect(literalKeys, "不得硬编码 key").toEqual([]);
    expect(src).toContain("key_persisted: false");
    // 入库的 source_uri 不含 key 参数
    expect(
      await n(`select count(*)::int c from source_records where source_uri ilike '%key=%'`)
    ).toBe(0);
    // raw 快照内不得出现 key 参数
    const dir = latestReplayDir();
    expect(dir).toBeTruthy();
    for (const f of fs.readdirSync(dir!).filter((x) => x.startsWith("raw-amap-"))) {
      expect(fs.readFileSync(path.join(dir!, f), "utf8").includes("key=")).toBe(false);
    }
    // 凭据文件必须被 gitignore
    const gi = fs.readFileSync(path.join(PROJECT_ROOT, ".gitignore"), "utf8");
    expect(gi).toMatch(/\.env\.local/);
  });

  // 16. Rerun idempotent
  it("16. 重跑幂等（真实以 --from-raw 离线重放两次，计数不变）", async () => {
    const dir = latestReplayDir();
    expect(dir, "需要既有 raw 快照才能离线重放").toBeTruthy();
    // ENG-GOV-01（fixture 调和）：沙箱禁止 node 自旋 node 子进程（spawnSync EBUSY）——
    // 改为**进程内**执行同一管线：--from-raw 离线重放经 process.argv 注入（重放模式不接触 key），
    // 管线 summary 经 console.log 捕获后按原逻辑解析。幂等不变量与全部断言零变更（等价证据）。
    const runOnce = async (tag: number) => {
      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };
      const prevArgv = process.argv;
      process.argv = [prevArgv[0] ?? "node", PIPELINE, "--from-raw", dir!];
      try {
        const spec = pathToFileURL(PIPELINE).href + (tag > 1 ? "?engov01-rerun=2" : "");
        await import(spec);
        // ENG-GOV-01：retrieve-amap-jinze 是 fire-and-forget main()（无 TLA）——await import
        // 不会等 main() 完成，其最后一条语句是 console.log(JSON.stringify(summary, null, 1))。
        // 以「捕获到可解析 JSON summary」为完成信号（等价于子进程模式「进程退出 = main 完成」）。
        // 单次离线重放实测 ≈51s（本机 mohen_dev）：轮询上限 120s 留足余量。
        const deadline = Date.now() + 120_000;
        let done = false;
        while (Date.now() < deadline) {
          const all = logs.join("\n");
          const j = all.indexOf("{");
          if (j >= 0) {
            try {
              JSON.parse(all.slice(j));
              done = true;
              break;
            } catch {
              /* summary 未完整，继续等 */
            }
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!done) throw new Error("ENG-GOV-01：retrieve-amap-jinze 未在时限内输出结束 summary");
      } finally {
        process.argv = prevArgv;
        console.log = origLog;
      }
      const out = logs.join("\n");
      const i = out.indexOf("{");
      return JSON.parse(out.slice(i)) as Record<string, unknown>;
    };
    const a = await runOnce(1);
    const before = {
      evidence: await n(`select count(*)::int c from evidence where extraction_method='${SPATIAL_METHOD}'`),
      sources: await n(`select count(*)::int c from source_records where provider='amap'`),
      audit: await n(`select count(*)::int c from evidence_gate_audit
                       where object_type='evidence' and exists (select 1 from evidence e
                         where e.evidence_id::text=object_id and e.extraction_method='${SPATIAL_METHOD}')`),
    };
    const b = await runOnce(2);
    expect(b.evidence_written).toBe(a.evidence_written);
    expect(b.source_created).toBe(0); // 重放：全部来源已存在 → 全部复用
    expect(b.source_reused).toBe(a.source_reused);
    const after = {
      evidence: await n(`select count(*)::int c from evidence where extraction_method='${SPATIAL_METHOD}'`),
      sources: await n(`select count(*)::int c from source_records where provider='amap'`),
      audit: await n(`select count(*)::int c from evidence_gate_audit
                       where object_type='evidence' and exists (select 1 from evidence e
                         where e.evidence_id::text=object_id and e.extraction_method='${SPATIAL_METHOD}')`),
    };
    expect(after).toEqual(before);
    expect(before.evidence).toBe(9);
    expect(before.audit).toBe(63);
  }, 300_000); // ENG-GOV-01：单次重放实测 ≈51s，两次 + 快照 > 旧 120s 时限（fixture 参数，断言零变更）

  // 17. Legacy zero-write
  it("17. Legacy 零写入（seed.master.json 字节与 mtime 未变）", () => {
    if (!baseline) return; // 无 Legacy 副本时跳过
    const now = { size: fs.statSync(LEGACY_SEED).size, mtimeMs: fs.statSync(LEGACY_SEED).mtimeMs };
    expect(now.size).toBe(baseline.size);
    expect(now.mtimeMs).toBe(baseline.mtimeMs);
  });

  // 18. Existing tests remain green
  it("18. 既有测试文件保持存在（TASK-0002…0006 未被破坏）", () => {
    const files = fs.readdirSync(path.join(PROJECT_ROOT, "tests", "data"));
    for (const f of [
      "foundation.test.ts",
      "data-factory.test.ts",
      "evidence-recovery.test.ts",
      "human-review-s1.test.ts",
      "knowledge-weave.test.ts",
      "spatial-grounding.test.ts",
    ]) {
      expect(files, `缺少 ${f}`).toContain(f);
    }
  });

  // §9 audit-ledger governance
  it("§9 audit 仍为当前态快照，且 relation 孤儿审计行未增大", async () => {
    const total = await n(`select count(*)::int c from evidence_gate_audit`);
    const distinct = await n(
      `select count(distinct (object_type, object_id, gate_code))::int c from evidence_gate_audit`
    );
    expect(total).toBe(distinct); // 快照语义（每对象×门恒 1 行）
    // TASK-0006 基线 63，本任务不得增大
    expect(
      await n(`select count(*)::int c from evidence_gate_audit a
                where a.object_type='relation'
                  and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`)
    ).toBe(63);
    // 未实施 evidence_gate_ledger
    expect(
      await n(`select count(*)::int c from information_schema.tables
                where table_schema='public' and table_name='evidence_gate_ledger'`)
    ).toBe(0);
  });

  // WP-D / WP-E 门槛落档
  it("WP-D/E 门槛判定已落档且与实测一致", async () => {
    const doc = fs.readFileSync(
      path.join(PROJECT_ROOT, "data", "exports", "jinze-spatial-readiness.md"),
      "utf8"
    );
    expect(doc).toContain("SPATIAL_TARGET_SET_READY = **YES**");
    expect(doc).toContain("HISTORICAL_MAP_READY = **PARTIAL**");
    // YES 的依据（≥3 个对象级点）必须真实成立
    expect(
      await n(`select count(*)::int c from evidence where extraction_method='${SPATIAL_METHOD}'
                and region_json->>'precision_status'='official_or_provider_object_point'`)
    ).toBeGreaterThanOrEqual(3);
    // 四份必交付报告齐备
    for (const f of [
      "jinze-spatial-inventory.md",
      "jinze-object-coordinate-evidence.md",
      "jinze-historical-map-audit.md",
      "jinze-spatial-readiness.md",
      "jinze-spatial-human-review.csv",
    ]) {
      expect(fs.existsSync(path.join(PROJECT_ROOT, "data", "exports", f)), `缺少 ${f}`).toBe(true);
    }
  });
});
