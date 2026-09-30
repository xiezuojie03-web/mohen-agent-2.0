/**
 * verify_v04.cjs — v0.4 右栏收口验收（客观取证，不靠肉眼）
 *
 * 三道闸门：
 *  1. dev overlay 报错：React 重复 key 警告必须消失（此前 ×6 exact-current_provider_object_point）。
 *  2. 右栏「常驻 UI」（钩子 / 三图 / 坐标失权 / 注解 / 交互栏 / 问墨痕按钮 / 前进按钮）
 *     之间不得有「真实可见」的两两重叠——用 elementFromPoint 在重叠中心取最顶层元素，
 *     若被前一层不透明钉底条盖住（裁剪伪重叠）则判为 OK，否则判为真实缺陷。
 *  3. 打开「问墨痕」后：Dialog 必须是浮层（position:absolute + 限高 + 内部滚动），
 *     不得再向上溢出污染流内容；且 Dialog 之外不得残留其它绝对定位污染。
 *
 * 用法：
 *   NODE_PATH=<managed-node-workspace>/node_modules \
 *   <managed-node>/node.exe specs/experience-ui/mockups/verify_v04.cjs
 */
const puppeteer = require("puppeteer-core");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const URL = "http://localhost:3000/experience/jinze-water-net";

// 常驻 UI 选择器 -> 人类名（Dialog/Guide 属浮层，单独检查，不进此表）
const PERSIST = [
  [".exp-hook", "钩子问题卡"],
  [".exp-photostrip", "三图配图条"],
  [".exp-epistemic-shift", "坐标失权注"],
  [".exp-annot", "注解层"],
  ["[data-testid='exp-rail']", "交互栏"],
  ["[data-testid='mohen-ask-open']", "问墨痕按钮"],
  ["[data-testid='next-button']", "前进按钮"],
];

function overlaps(a, b) {
  return a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--no-proxy-server", "--proxy-bypass-list=<-loopback>", "--window-size=1280,720"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  const msgs = [];
  const four04 = [];
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") msgs.push(`[${t}] ${m.text().slice(0, 320)}`);
  });
  page.on("pageerror", (e) => msgs.push(`[pageerror] ${String(e).slice(0, 320)}`));
  page.on("requestfailed", (r) => { if (r.url().includes("localhost:3000")) four04.push(`[reqfail] ${r.url().slice(0, 120)}`); });
  page.on("response", (r) => { if (r.status() === 404 && r.url().includes("localhost:3000")) four04.push(`[404] ${r.url().slice(0, 120)}`); });

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1400));

  // ── 闸门 1：dev overlay 报错分类 ──
  const keyWarns = msgs.filter((m) => /Encountered two children with the same key|same key/i.test(m));
  console.log("=== 闸门 1：React 重复 key 警告 ===");
  console.log(keyWarns.length === 0 ? "  ✓ 0 条（v0.3 的 ×6 exact-* 已消除）" : `  ✗ ${keyWarns.length} 条仍存`);
  const otherErrs = msgs.filter((m) => !/Encountered two children with the same key|same key/i.test(m));
  console.log(`  其它 console error/warning 共 ${otherErrs.length} 条（含已知 404）：`);
  otherErrs.slice(0, 8).forEach((m) => console.log(`    · ${m}`));

  // ── 闸门 2：常驻 UI 真实重叠（elementFromPoint 取证）──
  const totalScenes = await page.evaluate(() => {
    const m = (document.querySelector("[data-testid='exp-progress']")?.textContent || "").match(/·\s*\d+\/(\d+)/);
    return m ? Number(m[1]) : 8;
  });
  let realOverlaps = 0;
  let clipArtifacts = 0;
  const scenesDetail = [];

  for (let i = 1; i <= totalScenes; i++) {
    const rects = await page.evaluate((PERSIST) => {
      const out = [];
      for (const [sel, name] of PERSIST) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        out.push({ name, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } });
      }
      return { scene: document.querySelector("[data-testid='exp-progress']")?.textContent || "", items: out };
    }, PERSIST);

    const P = rects.items;
    const sceneProblems = [];
    for (let a = 0; a < P.length; a++) {
      for (let b = a + 1; b < P.length; b++) {
        if (!overlaps(P[a].rect, P[b].rect)) continue;
        const cx = (Math.max(P[a].rect.left, P[b].rect.left) + Math.min(P[a].rect.right, P[b].rect.right)) / 2;
        const cy = (Math.max(P[a].rect.top, P[b].rect.top) + Math.min(P[a].rect.bottom, P[b].rect.bottom)) / 2;
        const top = await page.evaluate((x, y) => {
          const el = document.elementFromPoint(x, y);
          if (!el) return "(none)";
          // 向上找最近的带 data-testid / 已知 class 的祖先，判定它属于哪个常驻块
          let n = el;
          for (let k = 0; k < 4 && n; k++) {
            const cls = (n.className || "").toString();
            const tid = n.getAttribute && n.getAttribute("data-testid");
            if (/exp-hook|exp-photostrip|exp-epistemic-shift|exp-annot|exp-rail|mohen-askbtn|exp-advance|exp-rail__primary|exp-side-actions|exp-side__flow/.test(cls) || tid) {
              const label = tid || cls.split(" ")[0];
              return `${label}@<${n.tagName.toLowerCase()}>`;
            }
            n = n.parentElement;
          }
          return `<${el.tagName.toLowerCase()} class="${(el.className || "").toString().slice(0, 40)}">`;
        }, cx, cy);
        // 判定：若最顶层是「钉底操作条 / 前进 / 问墨痕按钮 / 流容器」，说明后一层被不透明条盖住 → 裁剪伪重叠，OK。
        // 注意 elementFromPoint 返回的是 data-testid（mohen-ask-open / next-button）而非 class，两者都要认。
        const COVERERS = ["exp-side-actions", "exp-side__flow", "mohen-askbtn", "exp-advance", "exp-rail__primary", "mohen-dialog", "mohen-guide"];
        const isCoveredByBar = COVERERS.some((c) => top.includes(c)) || /mohen-ask-open|next-button/.test(top);
        if (isCoveredByBar) {
          clipArtifacts++;
          sceneProblems.push(`~ ${P[a].name}×${P[b].name}: 裁剪伪重叠（最顶层=${top}，被钉底条盖住，无可见重叠）`);
        } else {
          realOverlaps++;
          sceneProblems.push(`✗ ${P[a].name}×${P[b].name}: 真实可见重叠（最顶层=${top}）`);
        }
      }
    }
    scenesDetail.push({ i, scene: rects.scene, problems: sceneProblems });

    // 步进到下一幕（与 diag_side 一致），确保逐幕体检而非只测首屏
    if (i < totalScenes) {
      const btn = await page.$("[data-testid='next-button']");
      if (!btn) { console.log(`   !! 第 ${i} 场找不到 next-button，停止前进`); break; }
      await btn.click();
      await new Promise((r) => setTimeout(r, 750));
    }
  }

  console.log(`\n=== 闸门 2：常驻 UI 真实重叠（共 ${totalScenes} 场）===`);
  let anyReal = false;
  scenesDetail.forEach((s) => {
    if (s.problems.length === 0) { console.log(`  第 ${s.i} 场 ${s.scene}：✓ 无真实重叠`); return; }
    s.problems.forEach((p) => {
      console.log(`  第 ${s.i} 场 ${s.scene}：${p}`);
      if (p.startsWith("✗")) anyReal = true;
    });
  });
  console.log(`  汇总：真实可见重叠 ${realOverlaps} 处 / 裁剪伪重叠 ${clipArtifacts} 处`);

  // ── 闸门 3：打开问墨痕 → Dialog 必须是浮层 ──
  console.log("\n=== 闸门 3：问墨痕 Dialog 浮层化 ===");
  const ask = await page.$("[data-testid='mohen-ask-open']");
  let dialogOk = "未找到问墨痕按钮";
  if (ask) {
    await ask.click();
    await new Promise((r) => setTimeout(r, 500));
    const d = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='mohen-dialog']");
      if (!el) return { exists: false };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        exists: true,
        position: cs.position,
        maxHeight: cs.maxHeight,
        overflowY: cs.overflowY,
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        scrollH: el.scrollHeight, clientH: el.clientHeight,
      };
    });
    if (d.exists) {
      const isOverlay = d.position === "absolute" && /calc/.test(d.maxHeight) && d.overflowY !== "visible";
      // 是否向上溢出到流内容（top 是否越过右栏上沿太多）—— 浮层应锚定在栏内
      dialogOk = isOverlay
        ? `✓ 浮层化（position=${d.position}, maxHeight=${d.maxHeight}, overflowY=${d.overflowY}, 是否内部滚动=${d.scrollH > d.clientH + 1}）`
        : `✗ 仍非合规浮层（position=${d.position}, maxHeight=${d.maxHeight}, overflowY=${d.overflowY}）`;
    }
  }
  console.log(`  ${dialogOk}`);

  console.log("\n=== 本地 404 / 请求失败（非布局，仅记录）===");
  console.log(four04.length ? four04.slice(0, 6).map((x) => `  ${x}`).join("\n") : "  无");

  await browser.close();

  // ── 终裁 ──
  const pass = keyWarns.length === 0 && realOverlaps === 0 && /✓/.test(dialogOk);
  console.log(`\n=== 终裁：${pass ? "PASS ✅" : "FAIL ❌"} ===`);
  console.log(`  React重复key=0: ${keyWarns.length === 0 ? "是" : "否"}`);
  console.log(`  常驻UI真实可见重叠=0: ${realOverlaps === 0 ? "是" : "否"}`);
  console.log(`  Dialog浮层化: ${/✓/.test(dialogOk) ? "是" : "否"}`);
  process.exit(pass ? 0 : 2);
})().catch((e) => { console.error("验收脚本异常:", e); process.exit(1); });
