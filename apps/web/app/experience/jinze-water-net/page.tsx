// apps/web/app/experience/jinze-water-net/page.tsx
//
// TASK-0013 — 墨痕体验路由（服务端）。
//
// Source of Truth 规则（任务书 §2）：
// - 本页只做一件事：读入 TASK-0012/0012A 冻结产物（逐字副本），校验冻结不变量，
//   然后交给客户端 ExperienceShell 渲染。
// - 本页不写任何剧情文本、不写任何历史事实；全部语义来自冻结 JSON。
// - 副本与 data/exports 原件的一致性由 tests/experience/renderer.test.ts 断言。

import fs from "node:fs";
import path from "node:path";
import ExperienceShell from "./ExperienceShell";
import {
  checkFrozenInvariants,
  type ExperienceScript,
  type FollowupPatch,
} from "@mohen/experience-engine";
import type { CulturalWorldProjectionSource } from "./culturalWorldProjection";
import type { CuratedPhoto } from "./surfaces/types";
import { readProductionRelationSummary } from "../../../lib/read-model-bridge";

const DATA_DIR = path.join(process.cwd(), "data", "experience");

function readFrozen(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

export const metadata = {
  title: "墨痕 · 金泽：一公里之内的南宋",
  description: "Evidence-grounded experience: 两座宋桥、一处宋代寺院遗址，为什么靠得这么近？",
};

export default async function ExperiencePage() {
  const script = readFrozen("jinze-3min-experience-script.json") as ExperienceScript;
  const patch = readFrozen("jinze-3min-experience-followup-patch.json") as FollowupPatch;
  const slice = readFrozen("jinze-historical-spatial-slice.json") as React.ComponentProps<
    typeof ExperienceShell
  >["slice"];
  // M4.1（EXP-CULTURAL-03）：008 cultural_* 第一簇的只读投影副本（真源仍是 008；此为体验端读副本）
  const culturalSource = readFrozen(
    "jinze-cultural-world-008.json"
  ) as CulturalWorldProjectionSource;
  // Stage 1·2.2：今貌影像策划清单（curated manifest；非冻结 JSON，不污染导演稿真源）
  const presentDayManifest = readFrozen("jinze-present-day-photos.json") as {
    hero_hook?: string;
    photos: CuratedPhoto[];
  };

  // 冻结不变量在服务端入口强制校验：产物被篡改则拒绝进入体验（fail loud）
  const report = checkFrozenInvariants(script, patch);
  if (!report.ok) {
    throw new Error("Frozen experience artifacts violate invariants: " + report.errors.join("; "));
  }

  // 第二层：读真实数据生产链产出（consumer='visual_stage'）；可用则呈现，否则前端降级冻结 JSON
  const productionSummary = await readProductionRelationSummary();

  return (
    <ExperienceShell
      script={script}
      patch={patch}
      slice={slice}
      culturalSource={culturalSource}
      presentDayPhotos={presentDayManifest.photos}
      presentDayHeroHook={presentDayManifest.hero_hook}
      productionSummary={productionSummary}
    />
  );
}
