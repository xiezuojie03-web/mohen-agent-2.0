import AdminWorkbench from "./AdminWorkbench";
import { readProductionRelationSummary } from "../../lib/read-model-bridge";

export const metadata = { title: "运营管理 Admin · 墨痕" };

export default async function AdminPage() {
  const summary = await readProductionRelationSummary();
  return (
    <>
      <a
        href="/admin/sources"
        style={{
          position: "fixed",
          right: 18,
          top: 10,
          zIndex: 60,
          background: "#1f3a2d",
          color: "#fff",
          borderRadius: 4,
          padding: "5px 10px",
          fontSize: 12,
          textDecoration: "none",
        }}
      >
        来源健康
      </a>
      <AdminWorkbench summary={summary} />
    </>
  );
}
