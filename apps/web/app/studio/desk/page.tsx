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
