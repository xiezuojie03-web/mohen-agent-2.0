import { redirect } from "next/navigation";
import { queryRows } from "@mohen/data-access";
import { getSession } from "../../../lib/session";
import { buildBaskets } from "../../../lib/mohen-agent/material-score";
import type { ShlMaterial } from "../../../lib/mohen-agent/retrieve-shl";
import { V1_SOURCES } from "../../../lib/mohen-agent/sources";
import ImportForm from "./ImportForm";
import ProjectNotebook from "./ProjectNotebook";
import { importedResearchMaterial } from "../../../lib/imported-materials";

export const metadata = { title: "资料台 · 墨痕 Studio" };
export const dynamic = "force-dynamic";

type TaskRow = {
  task_id: string;
  topic: string;
  prompt: string;
  checkpoint: string;
};

function asMaterials(raw: unknown): ShlMaterial[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x): ShlMaterial | null => {
      if (!x || typeof x !== "object") return null;
      const m = x as Record<string, unknown>;
      const fragments = Array.isArray(m.fragments)
        ? m.fragments.map(String)
        : m.summary
          ? [String(m.summary)]
          : [];
      if (!fragments.length && !m.title) return null;
      return {
        provider: String(m.provider ?? "unknown"),
        title: String(m.title ?? m.uri ?? "未命名材料"),
        source_type: String(m.source_type ?? "bibliography"),
        carrier_type: String(m.carrier_type ?? "digital_text"),
        provenance_status: String(m.provenance_status ?? "candidate"),
        content_availability:
          m.content_availability === "full_text" || m.content_availability === "excerpt"
            ? (m.content_availability as ShlMaterial["content_availability"])
            : "metadata_only",
        url: String(m.url ?? m.uri ?? ""),
        publisher: String(m.publisher ?? m.provider ?? ""),
        license: String(m.license ?? ""),
        rights_clear:
          m.rights_clear === "clear" || m.rights_clear === "per_item"
            ? (m.rights_clear as ShlMaterial["rights_clear"])
            : "unknown",
        snapshot_path: typeof m.snapshot_path === "string" ? m.snapshot_path : null,
        fragments,
      };
    })
    .filter((x): x is ShlMaterial => x !== null);
}

function parseCheckpoint(raw: string): { leads: ShlMaterial[]; decisionMaterials: ShlMaterial[] } {
  try {
    const cp = JSON.parse(raw) as Record<string, unknown>;
    const leads = asMaterials(cp.researchLeads);
    const decision = cp.decision as Record<string, unknown> | undefined;
    const decisionMaterials = asMaterials(decision?.materials);
    return { leads, decisionMaterials };
  } catch {
    return { leads: [], decisionMaterials: [] };
  }
}

const badge = (g: string) => {
  const color =
    g === "A" ? "#1f7a4d" : g === "B" ? "#3d6b8f" : g === "C" ? "#9a6b2f" : "#8a3b3b";
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 20,
        textAlign: "center",
        padding: "1px 6px",
        borderRadius: 4,
        background: color,
        color: "#fff",
        fontSize: 11,
        marginRight: 6,
      }}
    >
      {g}
    </span>
  );
};

export default async function DeskPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tasks = (await queryRows(
    "select task_id::text as task_id, topic, prompt, checkpoint::text as checkpoint from public.research_tasks where owner_user_id = :'owner' order by created_at desc limit 20",
    { owner: session.uid }
  )) as TaskRow[];

  const latest = tasks[0];
  const { leads, decisionMaterials } = latest ? parseCheckpoint(latest.checkpoint) : { leads: [], decisionMaterials: [] };

  const importedRows = (await queryRows(
    "select material_id::text as material_id, title, text_content, source_url, license from public.imported_materials where owner_user_id = :'owner' order by created_at desc limit 50",
    { owner: session.uid }
  )) as Array<{ material_id: string; title: string; text_content: string; source_url: string | null; license: string | null }>;
  const imported: ShlMaterial[] = importedRows.map(importedResearchMaterial);

  const materials = [...leads, ...decisionMaterials, ...imported].filter(
    (m, i, arr) => arr.findIndex((x) => `${x.source_type}|${x.title}` === `${m.source_type}|${m.title}`) === i
  );
  const baskets = buildBaskets(materials, latest?.topic ?? "");
  const v1Sources = V1_SOURCES;

  // D00 第一道工序（Y01 来源需求）的真实回执：只列本人项目，缺口由工序自己算。
  const needRows = (await queryRows(
    `select n.need_id::text as need_id, n.research_intent, n.produced_by,
            n.created_at::text as created_at, n.existing_stock_gap::text as existing_stock_gap,
            p.project_title
       from source.source_needs n
       join studio.projects p on p.project_id = n.project_id
      where p.owner_user_id = :'owner'
      order by n.created_at desc limit 10`,
    { owner: session.uid }
  )) as Array<{
    need_id: string;
    research_intent: string;
    produced_by: string;
    created_at: string;
    existing_stock_gap: string | null;
    project_title: string;
  }>;

  // D00 第二道工序（Y02 资源目录观察）的真实登记：条目由工序在来源准入时
  // 按已核验的登记真值派生（含馆方目录号），只列本人项目。
  const catalogRows = (await queryRows(
    `select c.catalog_entry_id::text as catalog_entry_id, c.provider, c.catalog_title,
            c.catalog_identifier, c.carrier_hint, c.availability_state,
            c.discovered_by_method, c.method_version,
            c.rights_hint::text as rights_hint, c.created_at::text as created_at,
            p.project_title
       from source.resource_catalog c
       join studio.projects p on p.project_id = c.project_id
      where p.owner_user_id = :'owner'
      order by c.created_at desc limit 10`,
    { owner: session.uid }
  )) as Array<{
    catalog_entry_id: string;
    provider: string;
    catalog_title: string;
    catalog_identifier: string | null;
    carrier_hint: string | null;
    availability_state: string;
    discovered_by_method: string;
    method_version: string;
    rights_hint: string | null;
    created_at: string;
    project_title: string;
  }>;

  // D00 第三道工序（Y03 候选核查）的真实记录：核过的逐项留依据，没读到的写未评估。
  const verificationRows = (await queryRows(
    `select v.verification_id::text as verification_id, v.verdict, v.reason_code,
            v.method_key, v.method_version, v.checks::text as checks,
            v.created_at::text as created_at,
            c.catalog_title, c.provider, c.catalog_identifier,
            p.project_title
       from source.candidate_verifications v
       join source.resource_catalog c on c.catalog_entry_id = v.catalog_entry_id
       join studio.projects p on p.project_id = v.project_id
      where p.owner_user_id = :'owner'
      order by v.created_at desc limit 10`,
    { owner: session.uid }
  )) as Array<{
    verification_id: string;
    verdict: string;
    reason_code: string;
    method_key: string;
    method_version: string;
    checks: string | null;
    created_at: string;
    catalog_title: string;
    provider: string;
    catalog_identifier: string | null;
    project_title: string;
  }>;

  // D00 第四道工序（Y04 取得范围与缺失部件）的真实记录：拿到了什么、还缺什么，
  // 只写核到的；总量没核实就说未核实，不说完整。
  const coverageRows = (await queryRows(
    `select v.coverage_id::text as coverage_id, v.completeness_state,
            v.coverage_scope::text as coverage_scope, v.missing_parts::text as missing_parts,
            v.verified_against::text as verified_against, v.created_at::text as created_at,
            c.catalog_title, c.provider, c.catalog_identifier,
            p.project_title
       from source.acquisition_coverages v
       left join source.resource_catalog c on c.catalog_entry_id = v.catalog_entry_id
       join studio.projects p on p.project_id = v.project_id
      where p.owner_user_id = :'owner'
      order by v.created_at desc limit 10`,
    { owner: session.uid }
  )) as Array<{
    coverage_id: string;
    completeness_state: string;
    coverage_scope: string | null;
    missing_parts: string | null;
    verified_against: string | null;
    created_at: string;
    catalog_title: string | null;
    provider: string | null;
    catalog_identifier: string | null;
    project_title: string;
  }>;

  // D00 第五道工序（Y05 来源对象、版本与依赖鉴别）：按架构不另建身份表，
  // 七层身份分层随获取尝试的 candidate_ref 存证，此处读回展示。
  const identityRows = (await queryRows(
    `select a.attempt_id::text as attempt_id, a.candidate_ref::text as candidate_ref,
            a.method_key, a.method_version, a.created_at::text as created_at,
            p.project_title
       from source.acquisition_attempts a
       join studio.projects p on p.project_id = a.project_id
      where p.owner_user_id = :'owner'
      order by a.created_at desc limit 10`,
    { owner: session.uid }
  )) as Array<{
    attempt_id: string;
    candidate_ref: string | null;
    method_key: string;
    method_version: string;
    created_at: string;
    project_title: string;
  }>;

  const readRightsStatus = (raw: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { status?: string };
      return typeof parsed?.status === "string" && parsed.status ? parsed.status : null;
    } catch {
      return null;
    }
  };

  const AVAILABILITY_LABELS: Record<string, string> = {
    catalog_found: "目录中可见",
    catalog_listed_no_item: "目录有条目、未见实物",
    restricted: "受限",
    not_available: "不可得",
    unknown: "未知",
  };

  const VERIFICATION_LABELS: Record<string, string> = {
    admissible: "可采纳（身份与词源均已核）",
    needs_owner: "需人确认（有时空/语言未评估项）",
    rejected: "不采纳",
  };

  const EXPANSION_LABELS: Record<string, string> = {
    place_name: "历史地名/旧辖属",
    era: "时代纪年",
    language: "语言",
    person: "人物名",
    water_system: "水系",
    genre: "文类",
    version: "版本",
    topic: "主题",
  };

  const readVerificationChecks = (raw: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        schema?: string;
        locator?: { catalog_no?: string };
        named_expansions?: { unresolved?: unknown };
        rights?: { unknown_actions?: unknown };
      };
      if (parsed?.schema !== "mohen.source-candidate-verification.v1") return null;
      const unresolved = Array.isArray(parsed.named_expansions?.unresolved)
        ? (parsed.named_expansions.unresolved as string[])
        : [];
      const unknownActions = Array.isArray(parsed.rights?.unknown_actions)
        ? (parsed.rights.unknown_actions as string[])
        : [];
      return { locator: parsed.locator?.catalog_no ?? null, unresolved, rightsUnknown: unknownActions.length };
    } catch {
      return null;
    }
  };

  const COMPLETENESS_LABELS: Record<string, string> = {
    complete: "完整",
    partial: "部分",
    unknown: "总量未核实",
  };

  const MISSING_PART_LABELS: Record<string, string> = {
    unassessed: "未评估",
    not_acquired: "本次未取得",
  };

  const readCoverage = (scopeRaw: string | null, missingRaw: string | null) => {
    try {
      const scope = scopeRaw
        ? (JSON.parse(scopeRaw) as {
            schema?: string;
            method?: string;
            acquired?: { pages?: unknown } | null;
            total_extent?: string;
          })
        : null;
      if (scope?.schema !== "mohen.source-coverage-conclusion.v1") return null;
      const missing = missingRaw ? (JSON.parse(missingRaw) as Array<{ part?: string; state?: string }>) : [];
      const pages = Array.isArray(scope.acquired?.pages) ? (scope.acquired.pages as number[]) : [];
      return {
        method: typeof scope.method === "string" ? scope.method : null,
        pages,
        totalExtent: scope.total_extent ?? "unknown",
        missing: missing.filter((m) => typeof m?.part === "string") as Array<{ part: string; state?: string }>,
      };
    } catch {
      return null;
    }
  };

  const IDENTITY_LAYER_LABELS: Record<string, string> = {
    provider: "提供方",
    collection: "收藏",
    catalog_record: "目录记录",
    work: "作品",
    version: "版本",
    holding: "藏所",
    digital_asset: "数字资产",
  };

  const readIdentityRef = (raw: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        schema?: string;
        layers?: Array<{ layer?: string; state?: string; value?: Record<string, unknown> }>;
        dependencies?: { unresolved?: unknown };
      };
      if (parsed?.schema !== "mohen.source-identity-stratification.v1" || !Array.isArray(parsed.layers)) {
        return null;
      }
      const unresolved = Array.isArray(parsed.dependencies?.unresolved)
        ? (parsed.dependencies.unresolved as string[])
        : [];
      return {
        layers: parsed.layers.filter((l) => typeof l?.layer === "string") as Array<{
          layer: string; state?: string; value?: Record<string, unknown>;
        }>,
        unresolved,
      };
    } catch {
      return null;
    }
  };

  const identityLayerText = (layer: { layer: string; value?: Record<string, unknown> }) => {
    const v = layer.value ?? {};
    switch (layer.layer) {
      case "provider": return String(v.name ?? "");
      case "catalog_record": return [v.catalog_no, v.item != null ? `件 ${String(v.item)}` : null].filter(Boolean).join(" · ");
      case "work": return String(v.title ?? "");
      case "version": return [v.source_type, v.carrier_type].filter(Boolean).join(" · ") || "已定位";
      case "holding": return String(v.institution ?? "");
      case "digital_asset": return [v.content_type, v.byte_size != null ? `${String(v.byte_size)} B` : null].filter(Boolean).join(" · ");
      default: return "";
    }
  };

  const readGap = (raw: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { schema?: string; gaps?: unknown; has_gap?: boolean };
      if (parsed?.schema !== "mohen.source-need-diagnosis.v1" || !Array.isArray(parsed.gaps)) return null;
      return parsed.gaps as Array<{ dimension: string; state: string; detail: string }>;
    } catch {
      return null;
    }
  };

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 60px", color: "#17201d" }}>
      <a href="/studio" style={{ color: "#3d6b8f", fontSize: 13 }}>
        ← 回创作 Studio
      </a>
      <h1 style={{ fontSize: 26, margin: "10px 0 6px" }}>资料台</h1>
      <p style={{ color: "#5c6662", fontSize: 13, marginBottom: 18 }}>
        看墨痕找到了什么、能不能用、还缺什么。评分是机器初评，不是事实裁决；A/B 才可进证据链，C 只作线索。
      </p>

      <ImportForm />
      <ProjectNotebook />

      {!latest ? (
        <section style={{ padding: 24, border: "1px dashed #c9c2b4", borderRadius: 8 }}>
          还没有研究任务。先回 Studio 说一句“我想做一部关于……的作品”。
        </section>
      ) : (
        <>
          <section style={{ marginBottom: 16, fontSize: 13, color: "#5c6662" }}>
            当前任务：<strong>{latest.topic || "未命名"}</strong> · {latest.prompt.slice(0, 60)}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
            {[
              ["材料", baskets.gaps.total],
              ["证据篮 A/B", baskets.gaps.evidenceCount],
              ["故事篮 A/B", baskets.gaps.storyCount],
              ["权利未核", baskets.gaps.rightsUnknown],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#6b746f" }}>{k}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16 }}>证据篮（给知识生产线）</h2>
              {baskets.evidence.length === 0 && <p style={{ color: "#8a3b3b", fontSize: 13 }}>不足 5 条，生产会被拒绝。</p>}
              {baskets.evidence.slice(0, 8).map((x) => (
                <article key={x.material.title + x.evidence} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {badge(x.eGrade)} {x.material.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#5c6662", marginTop: 4 }}>
                    E {x.evidence} / S {x.story} · {x.material.source_type} · {x.material.content_availability}
                  </div>
                  {x.reasons.length > 0 && (
                    <div style={{ fontSize: 11, color: "#9a6b2f", marginTop: 4 }}>{x.reasons.join("；")}</div>
                  )}
                </article>
              ))}
            </div>

            <div>
              <h2 style={{ fontSize: 16 }}>故事篮（给创作线）</h2>
              {baskets.story.length === 0 && <p style={{ color: "#8a3b3b", fontSize: 13 }}>不足 3 个场景，只能出研究稿。</p>}
              {baskets.story.slice(0, 8).map((x) => (
                <article key={x.material.title + x.story} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {badge(x.sGrade)} {x.material.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#5c6662", marginTop: 4 }}>
                    S {x.story} / E {x.evidence} · {x.material.fragments[0]?.slice(0, 60)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginTop: 0 }}>缺口与下一步</h2>
            {baskets.gaps.missing.length === 0 ? (
              <p style={{ color: "#1f7a4d", fontSize: 13 }}>当前门槛已满足（仍需人工抽检）。</p>
            ) : (
              <ul style={{ fontSize: 13, color: "#8a3b3b", margin: "6px 0 12px 18px" }}>
                {baskets.gaps.missing.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: 12, color: "#6b746f" }}>建议补检索：</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {baskets.gaps.nextQueries.map((q) => (
                <span key={q} style={{ background: "#f0ece2", borderRadius: 4, padding: "4px 8px", fontSize: 12 }}>
                  {q}
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      <section style={{ borderTop: "1px solid #e2ddd1", paddingTop: 14, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15 }}>来源需求回执（D00 第一道工序）</h2>
        <p style={{ fontSize: 12, color: "#6b746f", margin: "4px 0 10px" }}>
          每条都是生产线上真实落库的需求回执；缺口由工序按项目真实存量算出，不是人工填的。
        </p>
        {needRows.length === 0 && (
          <p style={{ fontSize: 13, color: "#8a3b3b" }}>还没有来源需求回执。</p>
        )}
        {needRows.map((need) => {
          const gaps = readGap(need.existing_stock_gap);
          return (
            <article key={need.need_id} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{need.research_intent}</div>
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {need.project_title} · {need.produced_by} · {need.created_at.slice(0, 10)}
              </div>
              {gaps === null ? (
                <div style={{ fontSize: 12, color: "#9a6b2f", marginTop: 5 }}>旧回执：当时未做存量缺口诊断。</div>
              ) : gaps.length === 0 ? (
                <div style={{ fontSize: 12, color: "#1f7a4d", marginTop: 5 }}>存量未发现缺口。</div>
              ) : (
                <ul style={{ fontSize: 12, color: "#8a3b3b", margin: "5px 0 0 18px" }}>
                  {gaps.map((gap) => (
                    <li key={gap.dimension}>
                      {gap.dimension}（{gap.state}）：{gap.detail}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      <section style={{ borderTop: "1px solid #e2ddd1", paddingTop: 14, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15 }}>资源目录登记（D00 第二道工序）</h2>
        <p style={{ fontSize: 12, color: "#6b746f", margin: "4px 0 10px" }}>
          每条都是来源准入时工序自己从已核验登记派生的目录观察：这个研究看到了哪家机构的哪件资源、
          对方目录里叫什么。不是人工填的，也不是搜索结果的堆叠。
        </p>
        {catalogRows.length === 0 && (
          <p style={{ fontSize: 13, color: "#8a3b3b" }}>还没有资源目录登记。</p>
        )}
        {catalogRows.map((entry) => {
          const rightsStatus = readRightsStatus(entry.rights_hint);
          return (
            <article key={entry.catalog_entry_id} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {entry.catalog_title}
                {entry.catalog_identifier ? ` · ${entry.catalog_identifier}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {entry.provider} · {AVAILABILITY_LABELS[entry.availability_state] ?? entry.availability_state}
                {entry.carrier_hint ? ` · ${entry.carrier_hint}` : ""}
                {rightsStatus ? ` · 权利：${rightsStatus}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {entry.project_title} · {entry.discovered_by_method}@{entry.method_version} · {entry.created_at.slice(0, 10)}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ borderTop: "1px solid #e2ddd1", paddingTop: 14, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15 }}>候选核查（D00 第三道工序）</h2>
        <p style={{ fontSize: 12, color: "#6b746f", margin: "4px 0 10px" }}>
          这条来源能不能用，结论必须带逐项依据：身份、字节、馆方目录号核过的写核过；
          历史地名异称、时代纪年、语言没有词源依据的写未评估。未评估不会被说成可用。
        </p>
        {verificationRows.length === 0 && (
          <p style={{ fontSize: 13, color: "#8a3b3b" }}>还没有候选核查记录。</p>
        )}
        {verificationRows.map((row) => {
          const checks = readVerificationChecks(row.checks);
          return (
            <article key={row.verification_id} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {row.catalog_title} · {VERIFICATION_LABELS[row.verdict] ?? row.verdict}
              </div>
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {row.provider}
                {row.catalog_identifier ? ` · ${row.catalog_identifier}` : ""} · {row.reason_code}
              </div>
              {checks === null ? (
                <div style={{ fontSize: 12, color: "#9a6b2f", marginTop: 5 }}>
                  旧核查记录：不是本工序派生的，未按时空异名维度评估。
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#2f4a3f", marginTop: 5 }}>
                  已核：身份与字节一致
                  {checks.locator === "present" ? "、馆方目录号在册" : "、馆方未给目录号"}
                  {`；权利九动作中 ${checks.rightsUnknown} 项未核`}
                </div>
              )}
              {checks && checks.unresolved.length > 0 ? (
                <ul style={{ fontSize: 12, color: "#9a6b2f", margin: "4px 0 0 18px" }}>
                  {checks.unresolved.map((dimension) => (
                    <li key={dimension}>
                      未评估：{EXPANSION_LABELS[dimension] ?? dimension}（本次没有可回指的词源）
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 12, color: "#1f7a4d", marginTop: 4 }}>时空异名维度均已带词源核过。</div>
              )}
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {row.project_title} · {row.method_key}@{row.method_version} · {row.created_at.slice(0, 10)}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ borderTop: "1px solid #e2ddd1", paddingTop: 14, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15 }}>取得范围与缺失部件（D00 第四道工序）</h2>
        <p style={{ fontSize: 12, color: "#6b746f", margin: "4px 0 10px" }}>
          每次取得到底拿到了什么、还缺什么：本页字节与取得账对上的写已取得；
          其余页如实写未评估；这份版本一共多少页没核实，就说总量未核实，不说完整。
        </p>
        {coverageRows.length === 0 && (
          <p style={{ fontSize: 13, color: "#8a3b3b" }}>还没有取得范围记录。</p>
        )}
        {coverageRows.map((row) => {
          const coverage = readCoverage(row.coverage_scope, row.missing_parts);
          return (
            <article key={row.coverage_id} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {row.catalog_title ?? "未挂目录条目"} · {COMPLETENESS_LABELS[row.completeness_state] ?? row.completeness_state}
              </div>
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {row.provider ?? "机构未知"}
                {row.catalog_identifier ? ` · ${row.catalog_identifier}` : ""}
              </div>
              {coverage === null ? (
                <div style={{ fontSize: 12, color: "#9a6b2f", marginTop: 5 }}>
                  旧覆盖记录：不是本工序派生的，未按取得范围结构评估。
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "#2f4a3f", marginTop: 5 }}>
                    {coverage.pages.length > 0
                      ? `已取得并核验：第 ${coverage.pages.join("、")} 页（字节与取得账一致）`
                      : "本次尝试未取得已核验字节"}
                  </div>
                  {coverage.missing.length > 0 && (
                    <ul style={{ fontSize: 12, color: "#9a6b2f", margin: "4px 0 0 18px" }}>
                      {coverage.missing.map((part) => (
                        <li key={part.part}>
                          {part.part === "other_pages" ? "其余页" : part.part}：
                          {MISSING_PART_LABELS[part.state ?? ""] ?? part.state ?? "未评估"}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 3 }}>
                {row.project_title}
                {coverage?.method ? ` · ${coverage.method}` : ""} · {row.created_at.slice(0, 10)}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ borderTop: "1px solid #e2ddd1", paddingTop: 14, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15 }}>来源身份分层（D00 第五道工序）</h2>
        <p style={{ fontSize: 12, color: "#6b746f", margin: "4px 0 10px" }}>
          这份来源是谁、哪个版本、依赖什么：七层身份（提供方/收藏/目录记录/作品/版本/藏所/数字资产）
          逐层标明已确认或未确认。按架构不另建身份表，分层随获取尝试的 candidate_ref 存证。
        </p>
        {identityRows.length === 0 && (
          <p style={{ fontSize: 13, color: "#8a3b3b" }}>还没有获取尝试，身份分层无从存证。</p>
        )}
        {identityRows.map((row) => {
          const identity = readIdentityRef(row.candidate_ref);
          return (
            <article key={row.attempt_id} style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              {identity === null ? (
                <div style={{ fontSize: 12, color: "#9a6b2f" }}>
                  该次获取尝试未带身份分层（D00 第七道工序接通前的记录）。
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                  {identity.layers.map((layer) => (
                    <span
                      key={layer.layer}
                      style={{
                        border: "1px solid #e2ddd1", borderRadius: 4, padding: "3px 8px", fontSize: 12,
                        color: layer.state === "known" ? "#1f7a4d" : "#9a6b2f",
                      }}
                    >
                      {IDENTITY_LAYER_LABELS[layer.layer] ?? layer.layer}：
                      {layer.state === "known" ? (identityLayerText(layer) || "已确认") : "未确认"}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#6b746f", marginTop: 5 }}>
                {row.project_title} · {row.method_key}@{row.method_version} · {row.created_at.slice(0, 10)}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ borderTop: "1px solid #e2ddd1", paddingTop: 14 }}>
        <h2 style={{ fontSize: 15 }}>来源地图（V1 接入中）</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {v1Sources.map((s) => (
            <span key={s.id} style={{ border: "1px solid #e2ddd1", borderRadius: 4, padding: "4px 8px", fontSize: 12 }}>
              {s.name} · {s.access}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
