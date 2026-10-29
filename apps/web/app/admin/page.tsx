import AdminWorkbench from "./AdminWorkbench";
import { readProductionRelationSummary } from "../../lib/read-model-bridge";

export const metadata = { title: "运营管理 Admin · 墨痕" };

export default async function AdminPage() {
  const summary = await readProductionRelationSummary();
  return <AdminWorkbench summary={summary} />;
}
