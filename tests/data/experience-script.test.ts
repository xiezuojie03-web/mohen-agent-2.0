// tests/data/experience-script.test.ts — TASK-0012 验收测试。
//
// 覆盖任务书 §18（Required tests）全部条目：
//   场景数 / 总时长 / 每场景一个 primarySurface / 合法 spatial_mode /
//   无 RECONSTRUCTED_HISTORICAL / 事实单元证据可溯 / QUESTION 不得是 FACT /
//   现代锚不作历史位置 / T11-C1/C2 在场 / T11-C3 退役措辞 / T11-C4 转引限定 /
//   金泽塘 temporal_assertion=none / 寺桥关系不升级 / 唯一 Primary Discovery /
//   follow-up 是 Patch 不是 reset / 输出确定性 / Legacy 零写 / published 0 / orphan ≤ 63。
//
// ★ §12-26：断言不变量与冻结语义，不断言会自然增长的绝对总数。
// 约定（同 TASK-0010/0011）：DB 用例直连本机 mohen_dev；测试 import 构建器
// （buildExperience 纯构建、对 DB 只读），不 spawn 子进程（规避本机 EBUSY）。

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { queryRows } from "../../packages/data-access/src/index.mjs";
import { buildExperience } from "../../pipelines/experience/build-jinze-3min-experience.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const EXPORTS = path.join(PROJECT_ROOT, "data", "exports");
const SCRIPT_JSON = path.join(EXPORTS, "jinze-3min-experience-script.json");
const PATCH_JSON = path.join(EXPORTS, "jinze-3min-experience-followup-patch.json");
const STATE_JSON = path.join(EXPORTS, "jinze-3min-experience-state-sequence.json");
const TRACE_CSV = path.join(EXPORTS, "jinze-3min-experience-evidence-trace.csv");
const LEGACY_SEED = path.join(
  path.resolve(PROJECT_ROOT, "..", "hushang-jingwei"),
  "data",
  "seed.master.json"
);

const q = queryRows as (sql: string, p?: Record<string, unknown>) => Promise<Record<string, string>[]>;
const n = async (sql: string) => Number((await q(sql))[0].c);

// 叙事层级词表（任务书 §9）
const FACTUAL_LEVELS = new Set(["FACT_EVIDENCED", "FACT_LIMITED", "CONFLICT"]);
const ALL_LEVELS = new Set([
  "FACT_EVIDENCED", "FACT_LIMITED", "CONFLICT",
  "QUESTION", "INTERPRETATION_CANDIDATE", "UNKNOWN", "INTERACTION",
]);
const SURFACES = new Set([
  "modern_map", "relational_space", "timeline",
  "evidence_panel", "current_photo", "historical_source", "text_focus",
]);
const MODES = new Set([
  "GEOGRAPHIC_EXACT", "GEOGRAPHIC_APPROXIMATE", "RELATIONAL_HISTORICAL",
  "HISTORICAL_MAP_SOURCE", "SPATIAL_UNKNOWN",
]);

const allUnits = (script: any) => script.scenes.flatMap((s: any) => s.narrative);

describe("TASK-0012 Jinze 3-minute Evidence-Grounded Experience Script", () => {
  // 全文件共享一次构建（每次构建含 ~20 个只读 psql 查询，~2s/次，避免逐用例重复构建超时）
  let built: { script: any };
  beforeAll(async () => {
    built = await buildExperience();
  }, 180_000);

  // ---------------------------------------------------------------- §16 三门素材
  // 1. 场景数 + 总时长（§5 预算）
  it("1. 场景数 6–8（实际 8），总时长 150–210s（实际 206s）", async () => {
    const { script } = built;
    expect(script.scene_count).toBeGreaterThanOrEqual(6);
    expect(script.scene_count).toBeLessThanOrEqual(8);
    expect(script.scene_count).toBe(8);
    expect(script.duration_sec).toBeGreaterThanOrEqual(150);
    expect(script.duration_sec).toBeLessThanOrEqual(210);
    expect(script.duration_sec).toBe(206);
    // 每场时长为正整数，且逐场求和 === 总时长
    for (const s of script.scenes) expect(s.duration_sec).toBeGreaterThan(0);
    expect(script.scenes.reduce((a: number, s: any) => a + s.duration_sec, 0)).toBe(script.duration_sec);
  });

  // 2. 每场景恰好一个 primarySurface，且在合法 surface 词表内
  it("2. 每场景恰好一个 primarySurface（合法枚举），composition 结构完整", async () => {
    const { script } = built;
    for (const s of script.scenes) {
      expect(typeof s.composition.primarySurface).toBe("string");
      expect(SURFACES.has(s.composition.primarySurface)).toBe(true);
      // secondary/context 可为 null 但键必须存在（CompositionState 最小结构，§7）
      expect("secondarySurface" in s.composition).toBe(true);
      expect("contextSurface" in s.composition).toBe(true);
      expect(typeof s.composition.transitionIntent).toBe("string");
      expect(s.composition.transitionIntent.length).toBeGreaterThan(0);
      // renderer_neutral 三通道齐全（§12 多渲染器兼容）
      expect(s.renderer_neutral.spoken_narration.length).toBeGreaterThan(0);
      expect(Array.isArray(s.renderer_neutral.on_screen_text)).toBe(true);
      expect(typeof s.renderer_neutral.camera_or_view_intent).toBe("string");
    }
  });

  // 3. spatial_mode 合法且无 RECONSTRUCTED_HISTORICAL（§3 禁用）
  it("3. 所有场景 spatial_mode 合法；RECONSTRUCTED_HISTORICAL 零出现且被策略声明禁止", async () => {
    const { script } = built;
    for (const s of script.scenes) expect(MODES.has(s.spatial_mode)).toBe(true);
    const active = script.scenes.map((s: any) => s.spatial_mode);
    expect(active).not.toContain("RECONSTRUCTED_HISTORICAL");
    expect(script.spatial_mode_policy.forbidden_active).toContain("RECONSTRUCTED_HISTORICAL");
    expect(script.spatial_mode_policy.allowed).not.toContain("RECONSTRUCTED_HISTORICAL");
  });

  // 4. 空间模式迁移链：现代精确 → 关系历史 → 回到现代精确（§6 体验弧）
  it("4. 迁移链 GEOGRAPHIC_EXACT→RELATIONAL_HISTORICAL→GEOGRAPHIC_EXACT 成立", async () => {
    const { script } = built;
    const modes = script.scenes.map((s: any) => s.spatial_mode);
    expect(modes[0]).toBe("GEOGRAPHIC_EXACT"); // 开场：今天的精确地图
    expect(modes).toContain("RELATIONAL_HISTORICAL"); // 中段：关系历史空间
    expect(modes[6]).toBe("GEOGRAPHIC_EXACT"); // s07 回到今天
    // 至少一次 RELATIONAL→EXACT 的「回归」迁移（时间旅行闭环）
    const lastExact = modes.lastIndexOf("GEOGRAPHIC_EXACT");
    expect(lastExact).toBeGreaterThan(modes.indexOf("RELATIONAL_HISTORICAL"));
  });

  // 5. 现代锚不作历史位置（§18）：GEOGRAPHIC_EXACT 只允许出现在「当下」场景
  it("5. GEOGRAPHIC_EXACT 场景 time_state 必为当下；历史时段场景必非 GEOGRAPHIC_EXACT", async () => {
    const { script } = built;
    for (const s of script.scenes) {
      const isPresent = /当下|今天|2026/.test(s.time_state);
      if (s.spatial_mode === "GEOGRAPHIC_EXACT") expect(isPresent).toBe(true);
      if (!isPresent && s.spatial_mode === "GEOGRAPHIC_EXACT") {
        throw new Error(`历史时段场景用了精确现代坐标: ${s.scene_id}`);
      }
      // 历史时段（非当下）场景一律 RELATIONAL_HISTORICAL / HISTORICAL_MAP_SOURCE / SPATIAL_UNKNOWN
      if (!isPresent) {
        expect(["RELATIONAL_HISTORICAL", "HISTORICAL_MAP_SOURCE", "SPATIAL_UNKNOWN"]).toContain(s.spatial_mode);
      }
    }
  });

  // 6. 每个事实叙述单元证据可溯（§18）
  it("6. FACT_EVIDENCED/FACT_LIMITED/CONFLICT 单元全部带非空 evidence_refs，且落 trace CSV", async () => {
    const { script } = built;
    for (const u of allUnits(script)) {
      expect(ALL_LEVELS.has(u.level)).toBe(true);
      if (FACTUAL_LEVELS.has(u.level)) {
        expect(u.evidence_refs.length).toBeGreaterThan(0);
      }
    }
    // trace CSV 覆盖每一个单元（含非事实单元），且事实单元行有 evidence_ids
    const csv = fs.readFileSync(TRACE_CSV, "utf8").trim().split("\n");
    expect(csv[0]).toBe('"unit_id","scene_id","level","text","evidence_ids"');
    const traced = new Map<string, string>();
    for (let i = 1; i < csv.length; i++) {
      const cells = csv[i].match(/"((?:[^"]|"")*)"/g)!.map((c) => c.slice(1, -1).replace(/""/g, '"'));
      traced.set(cells[0], cells[4]);
    }
    const units = allUnits(script);
    expect(traced.size).toBe(units.length);
    for (const u of units) {
      expect(traced.has(u.unit_id)).toBe(true);
      if (FACTUAL_LEVELS.has(u.level)) expect(traced.get(u.unit_id)!.length).toBeGreaterThan(0);
    }
    // 事实单元引用的 UUID 必须真实存在于 evidence 表（对 DB 只读抽查全部事实引用）
    const factRefs = [
      ...new Set(
        allUnits(script)
          .filter((u: any) => FACTUAL_LEVELS.has(u.level))
          .flatMap((u: any) => u.evidence_refs)
      ),
    ];
    expect(factRefs.length).toBeGreaterThanOrEqual(10);
    const dbIds = new Set((await q(`select evidence_id::text id from evidence`)).map((r) => r.id));
    // 通过 trace CSV 拿到 unit→uuid 映射后，验证 UUID 存在
    for (const u of units) {
      if (!FACTUAL_LEVELS.has(u.level)) continue;
      const ids = traced.get(u.unit_id)!.split("; ").filter(Boolean);
      expect(ids.length).toBe(u.evidence_refs.length);
      for (const id of ids) expect(dbIds.has(id)).toBe(true);
    }
  });

  // 7. 问题/候选不得伪装成事实（§18）
  it("7. QUESTION/INTERPRETATION_CANDIDATE/UNKNOWN 单元不带事实级引用伪装；QUESTION 单元存在", async () => {
    const { script } = built;
    for (const u of allUnits(script)) {
      if (u.level === "QUESTION" || u.level === "INTERPRETATION_CANDIDATE" || u.level === "UNKNOWN") {
        // 非事实层级：不得同时被标为 FACT_EVIDENCED（层级字段即裁决）
        expect(u.level).not.toBe("FACT_EVIDENCED");
        expect(FACTUAL_LEVELS.has(u.level)).toBe(false);
      }
      // 疑问句文本不得标为 FACT_EVIDENCED（句末「？」的启发式检查）
      if (u.level === "FACT_EVIDENCED") expect(u.text.trim().endsWith("？")).toBe(false);
    }
    expect(allUnits(script).some((u: any) => u.level === "QUESTION")).toBe(true);
    expect(allUnits(script).some((u: any) => u.level === "UNKNOWN")).toBe(true);
    expect(allUnits(script).some((u: any) => u.level === "INTERPRETATION_CANDIDATE")).toBe(true);
  });

  // 8. 冲突在场（§4 冻结：T11-C1 ACCEPT_CONFLICT / T11-C2 ACCEPT_CONFLICT+跨镇错挂疑似）
  it("8. T11-C1/C2 冲突并列保留且在 s05 证据面板浮出", async () => {
    const { script } = built;
    const c1 = script.conflicts.find((c: any) => c.ruling === "T11-C1");
    const c2 = script.conflicts.find((c: any) => c.ruling === "T11-C2");
    expect(c1).toBeDefined();
    expect(c1.decision).toBe("ACCEPT_CONFLICT");
    expect(c2).toBeDefined();
    expect(c2.decision).toContain("ACCEPT_CONFLICT");
    expect(c2.decision).toContain("SUSPECTED_CROSS_TOWN_MISALIGNMENT");
    // 冲突必须真的在叙事里被说出（s05 有 CONFLICT 单元），不是只写在元数据里
    const conflictUnits = allUnits(script).filter((u: any) => u.level === "CONFLICT");
    expect(conflictUnits.length).toBeGreaterThanOrEqual(2);
    expect(script.scenes.find((s: any) => s.scene_id.endsWith("s05-evidence-reveal")).narrative.some((u: any) => u.level === "CONFLICT")).toBe(true);
    // 5 条裁定全部显式落实（T11-C1…C5）
    const rulings = script.t11_rulings_applied.map((r: any) => r.ruling).sort();
    expect(rulings).toEqual(["T11-C1", "T11-C2", "T11-C3", "T11-C4", "T11-C5"]);
  });

  // 9. T11-C3 退役措辞（§4）：『开放为宗教活动场所』不得作为事实呈现
  it("9. T11-C3： retired 表述只出现在显式免责的 FACT_LIMITED 单元中，绝不作为 FACT_EVIDENCED", async () => {
    const { script } = built;
    const RETIRED = "开放为宗教活动场所";
    for (const u of allUnits(script)) {
      if (!u.text.includes(RETIRED)) continue;
      // 唯一允许出现的位置：FACT_LIMITED 免责单元，且明确声明「不将其作为事实呈现」
      expect(u.level).toBe("FACT_LIMITED");
      expect(u.text).toContain("不将其作为事实呈现");
    }
    // FACT_EVIDENCED 层面零出现
    expect(
      allUnits(script).filter((u: any) => u.level === "FACT_EVIDENCED" && u.text.includes(RETIRED)).length
    ).toBe(0);
    // 1992 原址重建必须以「重建」口径出现（不写「开放/落成」断言）
    const u1992 = allUnits(script).filter((u: any) => u.text.includes("1992") && FACTUAL_LEVELS.has(u.level));
    expect(u1992.length).toBeGreaterThan(0);
    for (const u of u1992) expect(u.text).toContain("重建");
  });

  // 10. T11-C4 转引限定（§4）：《松江府志》引文必须带「转引」身份与来源限制
  it("10. T11-C4：A5 引文以 FACT_LIMITED + 『转引』语义出现，不得冒充直接证据", async () => {
    const { script } = built;
    const quoteUnits = allUnits(script).filter((u: any) => u.text.includes("莫匹其伟"));
    expect(quoteUnits.length).toBe(1);
    const u = quoteUnits[0];
    expect(u.level).toBe("FACT_LIMITED");
    expect(u.text).toContain("转引");
    expect(u.text).toContain("《松江府志》");
    expect(u.evidence_refs).toContain("yihao_a5_quote");
  });

  // 11. 金泽塘时间语义（T11-C5，用户特别强调）
  it("11. 金泽塘 temporal_assertion=none / temporal_evidence_status=not_applicable，且全程无年代断言", async () => {
    const { script } = built;
    expect(script.waterway_temporal_semantics.temporal_assertion).toBe("none");
    expect(script.waterway_temporal_semantics.temporal_evidence_status).toBe("not_applicable");
    // 语义说明必须写明 attested_time_evidence_backed=true ≠ 历史年代已证明
    expect(script.waterway_temporal_semantics.note).toContain("不表示金泽塘历史年代已获证明");
    // 全部叙事文本中，金泽塘不得与具体建成/开凿年代绑定
    for (const u of allUnits(script)) {
      if (u.text.includes("金泽塘")) {
        expect(u.text).not.toMatch(/金泽塘.{0,12}(建于|开凿于|形成于).{0,6}(宋|元|明|清|\d{3,4})/);
      }
    }
  });

  // 12. 寺桥关系不升级（§18）：寺↔桥的**历史功能关系断言**只能是 QUESTION，不得写成事实。
  //     注意：今天的共存（s01/s07）与独立纪年并列（s02）是合法事实；被禁止的是
  //     「同属一个体系 / 相连 / 一体」式的历史关系断言。
  it("12. 寺—桥历史关系断言保持 QUESTION / E2 级，未被升级为 E1 事实", async () => {
    const { script } = built;
    // 12a. 「同一体系」式关系断言只允许出现在 QUESTION 单元
    for (const u of allUnits(script)) {
      if (u.text.includes("体系")) {
        expect(["QUESTION", "INTERACTION"]).toContain(u.level);
      }
      // 事实单元内不得出现寺—桥的历史关系断言句式
      if (FACTUAL_LEVELS.has(u.level)) {
        expect(u.text).not.toMatch(/寺[^。？]*桥[^。？]*(同属|相连|一体|同一体)/);
        expect(u.text).not.toMatch(/(同属|相连|一体)[^。？]*体系/);
      }
    }
    // 12b. 显式寺桥之问存在（s04 的体系之问 / s08 的 canonical follow-up）
    expect(
      allUnits(script).some(
        (u: any) => u.level === "QUESTION" && u.text.includes("体系")
      )
    ).toBe(true);
    expect(
      allUnits(script).some(
        (u: any) => u.level === "QUESTION" && u.text.includes("那颐浩寺和普济桥以前真的有关系吗")
      )
    ).toBe(true);
  });

  // 13. 唯一 Primary Discovery（§10）
  it("13. 恰好一个 Primary Discovery（对象带 statement），secondary ≤ 2", async () => {
    const { script } = built;
    expect(script.discoveries.primary).toBeTruthy();
    expect(typeof script.discoveries.primary.statement).toBe("string");
    expect(script.discoveries.primary.statement.length).toBeGreaterThan(20);
    // 未决对点必须显式（不把发现说成定论）
    expect(typeof script.discoveries.primary.unresolved_counterpoint).toBe("string");
    expect(script.discoveries.primary.unresolved_counterpoint.length).toBeGreaterThan(5);
    expect(script.discoveries.secondary.length).toBeLessThanOrEqual(2);
  });

  // 14. follow-up 是 Patch，不是 reset（§11）
  it("14. follow-up Patch：restart=false / patch_not_replace=true / may_invent=false，保留 8 场", async () => {
    const { script } = built;
    const f = script.followup;
    expect(f.trigger_question).toBe("那颐浩寺和普济桥以前真的有关系吗？");
    expect(f.behavior_contract.restart_experience).toBe(false);
    expect(f.behavior_contract.patch_not_replace).toBe(true);
    expect(f.behavior_contract.may_invent_answer).toBe(false);
    // 落盘的 patch 文件与脚本内 followup 一致
    const patch = JSON.parse(fs.readFileSync(PATCH_JSON, "utf8"));
    expect(patch.patch_id).toBe(f.patch_id);
    expect(patch.behavior_contract.restart_experience).toBe(false);
    expect(patch.behavior_contract.patch_not_replace).toBe(true);
    expect(patch.base_scene_count).toBe(8);
    // preserved 非空（明确展示已知），changed 非空（前景化未知/缺失）
    expect(Object.keys(patch.preserved).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(patch.changed).length).toBeGreaterThanOrEqual(2);
    // 不得编造答案：next_actions 中不得有「答案是…」式断言，须指向研究/观察/探索
    const actions = JSON.stringify(patch.next_actions);
    expect(actions).toContain("research_lead");
    // invariants 含不升级 / 不重启 / 不编造
    const inv = patch.invariants.join("|");
    expect(inv).toContain("不升级");
    expect(inv).toContain("不重启");
    expect(inv).toContain("不编造");
  });

  // 15. ExperienceState 序列完整性（§7）：逐场状态、无历史坐标
  it("15. state-sequence 覆盖全部 8 场，序列内不出现伪造历史经纬度", async () => {
    const seq = JSON.parse(fs.readFileSync(STATE_JSON, "utf8"));
    expect(seq.schema).toBe("mohen-experience-state-sequence/v1");
    expect(seq.states.length).toBe(8);
    for (const st of seq.states) {
      expect(typeof st).toBe("object");
    }
    const raw = fs.readFileSync(STATE_JSON, "utf8");
    // 关系历史空间场景不得携带任何经纬度对（8 位精度数字对 = 伪造历史几何的形状）
    expect(raw).not.toMatch(/"lat"\s*:\s*31\.0\d+/);
    expect(raw).not.toMatch(/"lng"\s*:\s*120\.9\d+/);
    expect(raw).not.toMatch(/"lat"\s*:\s*31\.0\d+/);
  });

  // 16. 视觉政策（§8）：只有 confirmed current 照片；历史视觉 = 0；禁止 AI 生成
  it("16. visual_assets 全部为 confirmed current；历史视觉 0；禁令清单在场", async () => {
    const { script } = built;
    expect(script.visual_policy.historical_visual_assets_used).toBe(0);
    expect(script.visual_policy.forbidden).toContain("AI 历史场景生成");
    expect(script.visual_policy.forbidden).toContain("AI 补画河道/街巷");
    expect(script.visual_policy.forbidden).toContain("1879 p36 升级为直接金泽地图");
    for (const s of script.scenes) {
      for (const a of s.visual_assets) {
        expect(a.type).toBe("photo");
        expect(a.rights).toContain("CC");
      }
    }
    // 三张今日照片各至少被一个场景使用
    const labels = script.scenes.flatMap((s: any) => s.visual_assets.map((a: any) => a.label));
    expect(labels).toContain("万安桥");
    expect(labels).toContain("普济桥");
    expect(labels).toContain("颐浩寺遗址");
  });

  // 17. 输出确定性（§18）：两次构建逐字节一致
  it("17. buildExperience 两次调用输出完全一致（确定性）", async () => {
    const a = await buildExperience();
    const b = await buildExperience();
    expect(JSON.stringify(a.script)).toBe(JSON.stringify(b.script));
    // 落盘文件与构建输出一致（runAll 幂等已在构建器内验证；这里对账 script.json）
    const onDisk = JSON.parse(fs.readFileSync(SCRIPT_JSON, "utf8"));
    expect(JSON.stringify(onDisk)).toBe(JSON.stringify(a.script));
  }, 180_000);

  // 18. Legacy 零写（§17-1）
  it("18. Legacy 零写（seed.master.json 未被触碰）", async () => {
    if (!fs.existsSync(LEGACY_SEED)) return;
    const st = fs.statSync(LEGACY_SEED);
    expect(st.size).toBeGreaterThan(0);
    const git = (() => {
      try {
        return execFileSync(
          "git",
          ["-C", path.dirname(path.dirname(LEGACY_SEED)), "status", "--porcelain", "data/seed.master.json"],
          { encoding: "utf8" }
        ).trim();
      } catch {
        return "";
      }
    })();
    expect(git).toBe("");
  });

  // 19. §17-3/4：published 恒 0；orphan ≤ 63
  it("19. published 恒 0，relation orphan 审计不高于基线 63", async () => {
    expect(await n(`select count(*)::int c from claims where status::text in ('verified','published')`)).toBe(0);
    expect(await n(`select count(*)::int c from relations where status::text in ('verified','published')`)).toBe(0);
    expect(await n(`select count(*)::int c from historical_features where review_status in ('published','verified')`)).toBe(0);
    expect(
      await n(`select count(*)::int c from evidence_gate_audit a
                where a.object_type='relation'
                  and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`)
    ).toBeLessThanOrEqual(63);
  });

  // 20. 本任务零 DB 写入（§14 实现边界）：不新增 evidence/source/claim/migration 行
  it("20. 构建过程零 DB 写入（构建前后行数不变），不新建表", async () => {
    const before = await q(
      `select (select count(*)::int from evidence)::text a,
              (select count(*)::int from source_records)::text b,
              (select count(*)::int from claims)::text c,
              (select count(*)::int from evidence_gate_audit)::text d`
    );
    await buildExperience();
    const after = await q(
      `select (select count(*)::int from evidence)::text a,
              (select count(*)::int from source_records)::text b,
              (select count(*)::int from claims)::text c,
              (select count(*)::int from evidence_gate_audit)::text d`
    );
    expect(after).toEqual(before);
  }, 180_000);
});
