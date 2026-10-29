import ExploreWorkbench from "./ExploreWorkbench";
import { readProductionRelationSummary } from "../../lib/read-model-bridge";

export const metadata = { title: "探索 EXP · 墨痕" };

export default async function ExplorePage() {
  const summary = await readProductionRelationSummary();
  return <ExploreWorkbench summary={summary} />;
}
