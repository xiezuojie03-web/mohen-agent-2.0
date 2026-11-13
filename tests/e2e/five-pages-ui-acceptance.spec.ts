import { test, expect } from "@playwright/test";

test.describe("WATCH catalogue failures", () => {
  for (const response of [
    { status: 503, contentType: "application/json", body: '{"ok":false}' },
    { status: 500, contentType: "text/html", body: '<html>unavailable</html>' },
    { status: 200, contentType: "application/json", body: '{"unexpected":[]}' },
  ]) {
    test(`WATCH distinguishes failure ${response.status} ${response.contentType} from an empty catalogue`, async ({ page }) => {
      await page.route("**/api/works/published", route => route.fulfill(response));
      await page.goto("/watch");
      await expect(page.locator(".watch").getByRole("alert")).toContainText("作品暂时加载失败");
      await expect(page.getByRole("button", { name: "重试", exact: true })).toBeVisible();
      await expect(page.getByText("暂无已发布作品", { exact: true })).toHaveCount(0);
    });
  }

  test("WATCH distinguishes a successful empty catalogue from a service error", async ({ page }) => {
    await page.route("**/api/works/published", route => route.fulfill({ json: { works: [] } }));
    await page.goto("/watch");
    await expect(page.getByText("暂无已发布作品", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "重试", exact: true })).toHaveCount(0);
  });

  test("WATCH retries a failed catalogue and restores published chapters", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/works/published", route => ++attempts === 1
      ? route.fulfill({ status: 503, json: { ok: false } })
      : route.fulfill({ json: { works: [{ work_id: "watch-retry-work", revision_id: "watch-retry-revision", revision_no: "3", title: "恢复的作品", description: "", published_at: "2026-11-01", content: JSON.stringify({ beats: [{ title: "恢复的第一章", visual: "可靠的画面描述", narration: "可靠的旁白", directorTimecodeMs: 0 }] }) }] } }));
    await page.goto("/watch");
    await page.getByRole("button", { name: "重试", exact: true }).click();
    await expect(page.getByRole("heading", { name: "恢复的第一章", exact: true })).toBeVisible();
    await expect(page.getByText("已发布 · 版本 3", { exact: true })).toBeVisible();
    await expect(page.locator(".watch").getByRole("alert")).toHaveCount(0);
  });
});

async function prepareSubmission(page: import("@playwright/test").Page) {
  // 项目对用户隐形：页面不再要求选择/新建项目，第一句话发出时后台自动建立研究底稿。
  await page.route("**/api/studio/projects", route => route.request().method() === "POST"
    ? route.fulfill({ json: { ok: true, project: { project_id: "submission-project", project_title: "投稿测试项目" } } })
    : route.fulfill({ json: { ok: true, projects: [] } }));
  await page.route("**/api/studio/research-tasks", route => route.fulfill({ json: { ok: true, decision: { mohenLine: "测试发现", materials: [], gaps: [] } } }));
  await page.route("**/api/studio/director-plans", route => route.fulfill({ json: { ok: true, plan_id: "submission-plan", facts: [], planA: { angle: "观察空间变化", points: ["观察地点"] }, planB: { angle: "观察日常生活", points: ["观察生活"] } } }));
  await page.route("**/api/studio/director-plans/submission-plan/select", route => route.fulfill({ json: { ok: true, beats: [{ title: "首章", visual: "预览画面", narration: "预览旁白", directorTimecodeMs: 0, provenanceRefs: ["test-ref"] }] } }));
  await page.route("**/api/studio/director-plans/submission-plan/panels", route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.route("**/api/studio/works/*/revisions", route => {
    const workId = new URL(route.request().url()).pathname.split("/")[4];
    return route.fulfill({ json: { ok: true, revisionId: `director-${workId}`, revisionNo: 2 } });
  });
  await page.goto("/studio");
  await page.getByLabel("向墨痕委托或提问").fill("研究金泽古桥");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page.getByRole("button", { name: "生成方案", exact: true }).click();
  await page.getByRole("button", { name: /方案 A/ }).click();
  await page.getByRole("button", { name: "采纳方案 A", exact: true }).click();
  await expect(page.locator(".studio__preview-visual")).toHaveText("预览画面");
  await page.getByPlaceholder("给这部作品起个标题").fill("保存的作品");
}

test("Studio keeps the created work when submission fails and retries only the saved revision", async ({ page }) => {
  const work = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
  const initialRevision = "4790013f-43ed-422e-b047-d3f8ddbf22c3";
  const directorRevision = `director-${work}`;
  let creations = 0;
  const committed: unknown[] = [];
  const submitted: unknown[] = [];
  await page.route("**/api/works", route => {
    creations++;
    return route.fulfill({ json: { ok: true, work_id: work, revision_id: initialRevision } });
  });
  await page.route(`**/api/works/${work}/submit`, route => {
    submitted.push(route.request().postData() ? route.request().postDataJSON() : null);
    return submitted.length === 1
      ? route.fulfill({ status: 503, contentType: "text/html", body: "unavailable" })
      : route.fulfill({ json: { ok: true, work_id: work, revision_id: directorRevision, status: "submitted" } });
  });
  await prepareSubmission(page);
  await page.route(`**/api/studio/works/${work}/revisions`, route => {
    committed.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, revisionId: directorRevision, revisionNo: 2 } });
  });
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.locator(".studio__submit-msg")).toContainText("已创建的作品已保留");
  await expect(page.getByPlaceholder("给这部作品起个标题")).toHaveValue("保存的作品");
  await expect(page.locator(".studio__submit-msg")).not.toContainText("已提交审核");
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.locator(".studio__submit-msg")).toContainText("已提交审核");
  expect(creations).toBe(1);
  expect(committed).toEqual([
    { plan_id: "submission-plan", expected_revision_no: 1, rights_acknowledged: true },
    { plan_id: "submission-plan", expected_revision_no: 1, rights_acknowledged: true },
  ]);
  expect(submitted).toEqual([{ revision_id: directorRevision }, { revision_id: directorRevision }]);
});

test("Studio does not submit an old snapshot after an edit", async ({ page }) => {
  let creations = 0;
  let submissions = 0;
  await page.route("**/api/works", route => {
    creations++;
    return route.fulfill({ json: { ok: true, work_id: "saved-work", revision_id: "saved-revision" } });
  });
  await page.route("**/api/works/saved-work/submit", route => {
    submissions++;
    return route.fulfill({ status: 503, json: { ok: false } });
  });
  await prepareSubmission(page);
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.locator(".studio__submit-msg")).toBeVisible();
  await page.getByPlaceholder("给这部作品起个标题").fill("修改后的作品");
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.locator(".studio__submit-msg")).toContainText("保存新版本");
  expect(creations).toBe(1);
  expect(submissions).toBe(1);
  await expect(page.getByPlaceholder("给这部作品起个标题")).toHaveValue("修改后的作品");
});

test("Studio freezes draft changes while a creation acknowledgement is pending", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/works", async route => {
    await pending;
    return route.fulfill({ json: { ok: true, work_id: "pending-work", revision_id: "pending-revision" } });
  });
  await page.route("**/api/works/pending-work/submit", route => route.fulfill({ json: { ok: true, work_id: "pending-work", revision_id: "director-pending-work", status: "submitted" } }));
  await prepareSubmission(page);
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  try {
    await expect(page.getByPlaceholder("给这部作品起个标题")).toBeDisabled();
    await expect(page.getByRole("button", { name: "生成方案", exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(page.locator(".studio__submit-msg")).toContainText("已提交审核");
});

test("Studio keeps a stable creation identity when the creation response is lost", async ({ page }) => {
  const ids: unknown[] = [];
  await page.route("**/api/works", route => {
    ids.push(route.request().postDataJSON().creation_id);
    return ids.length === 1 ? route.abort("failed") : route.fulfill({ json: { ok: true, work_id: "retry-work", revision_id: "retry-revision" } });
  });
  await page.route("**/api/works/retry-work/submit", route => route.fulfill({ json: { ok: true, work_id: "retry-work", revision_id: "director-retry-work", status: "submitted" } }));
  await prepareSubmission(page);
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.locator(".studio__submit-msg")).toContainText("创建作品失败");
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.locator(".studio__submit-msg")).toContainText("已提交审核");
  expect(typeof ids[0]).toBe("string");
  expect(ids[0]).toBe(ids[1]);
});

// E1-8 五页 UI 冒烟验收：加载 F01-F05 五页，验证全局导航 + 各页主组件渲染。
// 逐项 PASS/FAIL 由运行结果给出；152 动作全量逐交互验收在 UI 组件补齐后另行细化。

test("F01 首页：全局导航 + 品牌/入口渲染", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/墨痕/);
  // 游客首页有唯一三模式入口，Admin不是公众模式。
  for (const href of ["/studio", "/watch", "/explore"]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
});

test("F02 Studio：创作工作台渲染", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.locator("body")).toContainText(/创作|委托|研究|导演/);
});

test("F03 WATCH：观看页渲染（含空态）", async ({ page }) => {
  await page.goto("/watch");
  await expect(page.locator("body")).toContainText(/作品|观看|暂无/);
});

test("F04 EXP：探索工作台渲染", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.locator("body")).toContainText(/探索|关系|时间|空间|证据/);
});

test("F05 Admin：运营工作台渲染", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(/运营|审核|发布|资产|知识/);
});

test.describe("UXD7 HOME", () => {
  test("one mode group and no public Admin card", async ({ page }) => {
    await page.goto("/");
    for (const href of ["/studio", "/watch", "/explore"]) {
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(page.locator("a[href='/admin']")).toHaveCount(0);
    await expect(page.locator(".mo-hero__flow")).toHaveCount(0);
    for (const width of [1920, 1680, 1440, 1280, 1199, 1024, 768, 650, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});

for (const roles of [[], ["creator"], ["operator"], ["reviewer"]]) {
  test(`UXD7 HOME role navigation ${roles.join("+") || "visitor"}`, async ({ page }) => {
    await page.route("**/api/session/me", route => route.fulfill({ json: {
      authenticated: roles.length > 0,
      user: { user_id: "ui-fixture", email: "fixture@example.test", username: "测试", roles },
    } }));
    await page.goto("/");
    await expect(page.locator(".mo-nav a[href='/studio']")).toHaveCount(0);
    await expect(page.locator("main a[href='/admin']")).toHaveCount(0);
    await expect(page.locator(".mo-nav a[href='/admin']")).toHaveCount(roles.includes("operator") || roles.includes("reviewer") ? 1 : 0);
    await page.goto("/watch");
    await expect(page.locator(".mo-nav a[href='/studio']")).toBeVisible();
  });
}

test("UXD7 Studio separates research leads from qualified assets before a work exists", async ({ page }) => {
  await page.route("**/api/studio/research-tasks", route => route.fulfill({ json: {
    ok: true, task_id: "fixture-task", production: { ok: false, reason: "independent_gate_required" },
    decision: { mohenLine: "夹具观察：先检查原件中的空间线索。", materials: [
      { id: "lead-1", snippet: "夹具材料线索，尚未签发资格", sourceRef: "测试原件", epistemic: "hypothesis" },
    ], gaps: ["原件定位待核对"] },
  } }));
  await page.goto("/studio");
  await page.getByLabel("向墨痕委托或提问").fill("检查这份材料，暂不生成作品");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  const research = page.getByRole("region", { name: "研究资料与知识资产" });
  await expect(research).toContainText("测试原件");
  await expect(research).toContainText("尚未接入当前资格");
  await expect(page.getByRole("region", { name: "作品产出" })).toContainText("尚未形成作品");
  await expect(page.getByText("生产完成，成果已入库。")).toHaveCount(0);
});

test("UXD7 Studio A/B preview does not adopt and failed adoption keeps the previous work", async ({ page }) => {
  await page.route("**/api/studio/research-tasks", route => route.fulfill({ json: { ok: true, decision: { mohenLine: "夹具发现", materials: [], gaps: [] } } }));
  await page.route("**/api/studio/director-plans", route => route.fulfill({ json: { ok: true, plan_id: "fixture-plan", facts: [],
    planA: { angle: "从空间看变化", points: ["观察地点"] }, planB: { angle: "从日常生活进入", points: ["观察活动"] },
  } }));
  let adopted = 0;
  await page.route("**/api/studio/director-plans/fixture-plan/select", route => {
    adopted++;
    return adopted === 1
      ? route.fulfill({ json: { ok: true, beats: [{ visual: "夹具原有画面", narration: "夹具原有旁白", durationSec: 8 }] } })
      : route.fulfill({ status: 503, json: { ok: false } });
  });
  await page.route("**/api/studio/director-plans/fixture-plan/panels", route => route.fulfill({ json: { ok: false } }));
  await page.goto("/studio");
  await page.getByLabel("向墨痕委托或提问").fill("研究城市生活");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page.getByRole("button", { name: "生成方案", exact: true }).click();
  await page.getByRole("button", { name: /方案 A/ }).click();
  await expect(page.getByRole("button", { name: "采纳方案 A", exact: true })).toBeVisible();
  expect(adopted).toBe(0);
  await page.getByRole("button", { name: "采纳方案 A", exact: true }).click();
  await expect(page.locator(".studio__preview-visual")).toHaveText("夹具原有画面");
  await page.getByRole("button", { name: /方案 B/ }).click();
  expect(adopted).toBe(1);
  await page.getByRole("button", { name: "采纳方案 B", exact: true }).click();
  await expect(page.locator(".studio").getByRole("alert")).toContainText("原作品已保留");
  await expect(page.locator(".studio__preview-visual")).toHaveText("夹具原有画面");
});

test("UXD7 WATCH without media is chapter reading, never a fake player", async ({ page }) => {
  await page.route("**/api/works/published", route => route.fulfill({ json: { works: [{
    work_id: "fixture-work", revision_id: "fixture-revision", revision_no: "7", title: "夹具作品", creator: "测试", published_at: "2026-10-31",
    content: JSON.stringify({ beats: [{ title: "第一章", visual: "夹具画面描述", narration: "夹具旁白", directorTimecodeMs: 0 }, { title: "第二章", visual: "第二幅描述", narration: "第二段旁白", directorTimecodeMs: 8000 }] }),
  }] } }));
  await page.goto("/watch");
  await expect(page.getByText("图文阅读 · 暂无可播放媒体")).toBeVisible();
  await expect(page.getByRole("button", { name: "播放", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "下一章", exact: true }).click();
  await expect(page.getByRole("heading", { name: "第二章", exact: true })).toBeVisible();
  await expect(page.getByText("已发布 · 版本 7")).toBeVisible();
});

test("UXD7 Admin describes independent G qualification without granting operator signing", async ({ page }) => {
  await page.route("**/api/session/me", route => route.fulfill({ json: { authenticated: true, user: { roles: ["operator"], username: "测试运营" } } }));
  await page.goto("/admin");
  await expect(page.getByText("历史知识资格由独立专业Reviewer签发；运营审核与作品发布不能代签G0—G5。")).toBeVisible();
  await expect(page.getByText(/机器门禁.*自动把关/)).toHaveCount(0);
});

test("UXD7 Studio adopted identity belongs to the exact plan, not the A/B letter", async ({ page }) => {
  await page.route("**/api/studio/research-tasks", route => route.fulfill({ json: { ok: true, decision: { mohenLine: "夹具发现", materials: [], gaps: [] } } }));
  let candidates = 0;
  await page.route("**/api/studio/director-plans", route => route.fulfill({ json: { ok: true, plan_id: `plan-${++candidates}`, facts: [], planA: { angle: `方案组${candidates}的空间观察`, points: [] }, planB: { angle: "生活观察", points: [] } } }));
  let finishAdoption!: () => void;
  const adoptionWait = new Promise<void>(resolve => { finishAdoption = resolve; });
  let startAdoption!: () => void;
  const adoptionStarted = new Promise<void>(resolve => { startAdoption = resolve; });
  await page.route("**/api/studio/director-plans/plan-1/select", async route => {
    startAdoption(); await adoptionWait;
    await route.fulfill({ json: { ok: true, beats: [{ title: "旧作品", visual: "P1画面", narration: "P1旁白", provenanceRefs: [], directorTimecodeMs: 0 }] } });
  });
  await page.route("**/api/studio/director-plans/*/panels", route => route.fulfill({ json: { ok: false } }));
  await page.goto("/studio");
  await page.getByLabel("向墨痕委托或提问").fill("第一份委托");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page.getByRole("button", { name: "生成方案", exact: true }).click();
  await page.locator(".studio__plan--a").click();
  await page.getByRole("button", { name: "采纳方案 A", exact: true }).click();
  await adoptionStarted;
  await expect(page.getByRole("button", { name: "生成方案", exact: true })).toBeDisabled();
  finishAdoption();
  await expect(page.locator(".studio__preview-visual")).toHaveText("P1画面");
  await expect(page.getByRole("button", { name: "生成方案", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "生成方案", exact: true }).click();
  await expect(page.locator(".studio__plan--a")).toContainText("方案组2");
  await expect(page.locator(".studio__plan--a")).not.toHaveClass(/is-selected/);
  await expect(page.locator(".studio__preview-visual")).toHaveText("P1画面");
});
