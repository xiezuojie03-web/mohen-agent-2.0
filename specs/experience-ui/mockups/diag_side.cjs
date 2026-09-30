/**
 * diag_side.cjs — 右栏「混乱」根因诊断（客观取证，不靠肉眼）
 *
 * 做三件事：
 * 1. 抓真实 dev server 的 console error / warning / pageerror（对应截图左下角 “N Issues”）
 * 2. 列出 .exp-canvas__side 内所有 position != static 的后代（这些就是“浮在流内容之上”的元凶）
 * 3. 逐幕（s01..s08）检查右栏内关键元素两两 2D 重叠 + 是否越出右栏边界
 *
 * 用法：
 *   NODE_PATH=<managed-node-workspace>/node_modules \
 *   <managed-node>/node.exe specs/experience-ui/mockups/diag_side.cjs
 */
const puppeteer = require("puppeteer-core");

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const URL = "http://localhost:3000/experience/jinze-water-net";

// 右栏内需要重点体检的元素（选择器 -> 人类名字）
const TARGETS = [
  [".exp-hook", "钩子问题卡"],
  [".exp-photostrip", "三图配图条"],
  [".exp-epistemic-shift", "坐标失权注"],
  [".exp-annot", "注解层"],
  ["[data-testid='exp-rail']", "交互栏(前进/动作)"],
  ["[data-testid='mohen-ask-open']", "问墨痕按钮"],
  ["[data-testid='mohen-guide']", "墨痕 Guide"],
  ["[data-testid='mohen-dialog']", "墨痕 Dialog"],
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

  const consoleMsgs = [];
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") consoleMsgs.push(`[${t}] ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => consoleMsgs.push(`[pageerror] ${String(e).slice(0, 300)}`));

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  const beats = await page.evaluate(() => {
    const txt = document.querySelector("[data-testid='exp-progress']")?.textContent || "";
    return txt;
  });
  console.log("=== 首屏进度 ===", beats);

  // —— 1. 右栏内 position != static 的后代（浮层元凶）——
  const absolutes = await page.evaluate(() => {
    const side = document.querySelector(".exp-canvas__side");
    if (!side) return { err: "no .exp-canvas__side" };
    const out = [];
    side.querySelectorAll("*").forEach((el) => {
      const pos = getComputedStyle(el).position;
      if (pos === "absolute" || pos === "fixed" || pos === "sticky") {
        const r = el.getBoundingClientRect();
        out.push({
          cls: (el.className || "").toString().slice(0, 60),
          tag: el.tagName.toLowerCase(),
          pos,
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        });
      }
    });
    return { total: out.length, items: out };
  });
  console.log("\n=== 右栏内脱离文档流的后代（position absolute/fixed/sticky）===");
  console.log("个数:", absolutes.total);
  (absolutes.items || []).forEach((it) => console.log(`  ${it.pos}  <${it.tag} class="${it.cls}">  rect=[${it.rect.join(",")}]`));

  // —— 2. 逐幕体检 ——
  const totalScenes = await page.evaluate(() => {
    const m = (document.querySelector("[data-testid='exp-progress']")?.textContent || "").match(/·\s*\d+\/(\d+)/);
    return m ? Number(m[1]) : 8;
  });
  console.log(`\n=== 逐幕右栏体检（共 ${totalScenes} 场）===`);

  for (let i = 1; i <= totalScenes; i++) {
    const res = await page.evaluate((TARGETS) => {
      const side = document.querySelector(".exp-canvas__side");
      const sr = side.getBoundingClientRect();
      const present = [];
      TARGETS.forEach(([sel, name]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vis = r.width > 1 && r.height > 1;
        if (!vis) return;
        present.push({ name, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } });
      });
      // 越界检测：元素是否横向上超出右栏
      const outOfBounds = present
        .filter((p) => p.rect.left < sr.left - 2 || p.rect.right > sr.right + 2)
        .map((p) => `${p.name}(l=${Math.round(p.rect.left)} r=${Math.round(p.rect.right)} vs 栏 ${Math.round(sr.left)}~${Math.round(sr.right)})`);
      // 内容总高 vs 栏高
      let contentH = 0;
      Array.from(side.children).forEach((c) => {
        const st = getComputedStyle(c);
        if (st.position === "absolute") return;
        contentH += c.getBoundingClientRect().height + 10;
      });
      return {
        scene: document.querySelector("[data-testid='exp-progress']")?.textContent,
        sideH: Math.round(sr.height),
        sideScrollH: side.scrollHeight,
        flowContentH: Math.round(contentH),
        present: present.map((p) => ({ name: p.name, left: Math.round(p.rect.left), top: Math.round(p.rect.top), right: Math.round(p.rect.right), bottom: Math.round(p.rect.bottom) })),
        outOfBounds,
      };
    }, TARGETS);

    // 两两重叠
    const ov = [];
    const P = res.present;
    for (let a = 0; a < P.length; a++) {
      for (let b = a + 1; b < P.length; b++) {
        if (overlaps(P[a], P[b])) {
          const ovl = Math.min(P[a].right, P[b].right) - Math.max(P[a].left, P[b].left);
          const ovt = Math.min(P[a].bottom, P[b].bottom) - Math.max(P[a].top, P[b].top);
          ov.push(`${P[a].name} × ${P[b].name} 重叠 ${Math.round(ovl)}×${Math.round(ovt)}px`);
        }
      }
    }
    console.log(`\n--- 第 ${i} 场 ${res.scene}`);
    console.log(`    右栏高 ${res.sideH}px / scrollH ${res.sideScrollH}px / 流内容高 ${res.flowContentH}px（超出即需滚动：${res.sideScrollH > res.sideH ? "是" : "否"}）`);
    console.log(`    在场元素: ${P.map((p) => p.name).join(" / ")}`);
    if (ov.length) ov.forEach((o) => console.log(`    ⚠ 重叠: ${o}`));
    else console.log("    ✓ 无两两重叠");
    if (res.outOfBounds.length) res.outOfBounds.forEach((o) => console.log(`    ⚠ 越出右栏: ${o}`));

    if (i < totalScenes) {
      const btn = await page.$("[data-testid='next-button']");
      if (!btn) {
        console.log("    !! 找不到 next-button，停止前进");
        break;
      }
      await btn.click();
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  // —— 3. 打开 问墨痕，看 dialog 与 rail 是否互压 ——
  console.log("\n=== 打开「问墨痕」后 ===");
  const ask = await page.$("[data-testid='mohen-ask-open']");
  if (ask) {
    await ask.click();
    await new Promise((r) => setTimeout(r, 500));
    const after = await page.evaluate(() => {
      const side = document.querySelector(".exp-canvas__side");
      const sr = side.getBoundingClientRect();
      const get = (s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      const n = (x) => (x ? x : null);
      return {
        dialog: n(get("[data-testid='mohen-dialog']")),
        rail: n(get("[data-testid='exp-rail']")),
        annot: n(get(".exp-annot")),
        strip: n(get(".exp-photostrip")),
        sideRect: { left: sr.left, top: sr.top, right: sr.right, bottom: sr.bottom },
        dialogScrollW: document.querySelector("[data-testid='mohen-dialog']")?.scrollWidth,
        dialogClientW: document.querySelector("[data-testid='mohen-dialog']")?.clientWidth,
      };
    });
    console.log("    dialog rect:", JSON.stringify(after.dialog));
    console.log("    rail   rect:", JSON.stringify(after.rail));
    console.log("    annot  rect:", JSON.stringify(after.annot));
    console.log("    strip  rect:", JSON.stringify(after.strip));
    console.log(`    dialog 内容宽 ${after.dialogScrollW} vs 可视宽 ${after.dialogClientW} → ${after.dialogScrollW > after.dialogClientW + 1 ? "★文字被挤压/溢出（横幅不足）" : "正常"}`);
    const checks = [
      ["dialog", after.dialog], ["rail", after.rail], ["annot", after.annot], ["strip", after.strip],
    ].filter(([, v]) => v);
    for (let a = 0; a < checks.length; a++)
      for (let b = a + 1; b < checks.length; b++)
        if (overlaps(checks[a][1], checks[b][1])) console.log(`    ⚠ ${checks[a][0]} × ${checks[b][0]} 重叠`);
  } else {
    console.log("    未找到问墨痕按钮");
  }

  console.log("\n=== dev overlay 报错（console error/warning + pageerror）===");
  if (consoleMsgs.length === 0) console.log("  无");
  else {
    const uniq = {};
    consoleMsgs.forEach((m) => (uniq[m] = (uniq[m] || 0) + 1));
    Object.entries(uniq).forEach(([m, c]) => console.log(`  ×${c}  ${m}`));
  }

  await browser.close();
})().catch((e) => {
  console.error("诊断脚本异常:", e);
  process.exit(1);
});
