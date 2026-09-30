const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file:///D:/work%20Buddy/2026-08-23-23-12-38/mohen-agent-2.0/specs/experience-ui/mockups/verify_real_layout.html';
const viewports = [
  { name: 'desktop_land', w: 1280, h: 720 },
  { name: 'phone_port', w: 390, h: 844 },
  { name: 'phone_land', w: 844, h: 390 },
  { name: 'ipad_port', w: 768, h: 1024 },
  { name: 'short_land', w: 1024, h: 500 },
];
// 2D 重叠：两轴都相交才算遮挡
function overlap(a, b) {
  if (!a || !b || !a.visible || !b.visible) return false;
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}
const get = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom), display: cs.display, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 };
}, sel);

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const rows = [];
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(FILE, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 250));
    const issues = [];
    const iw = vp.w, ih = vp.h;
    // 真信号 1：页面级溢出（canvas overflow:hidden 应兜住，否则整页可滚=破损）
    const docOx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const docOy = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    if (docOx > 1) issues.push('页面横向溢出' + docOx);
    if (docOy > 1) issues.push('页面纵向溢出' + docOy);
    const canvas = await get(page, '.exp-canvas');
    const current = await get(page, '.exp-canvas__current');
    const side = await get(page, '.exp-canvas__side');
    const hook = await get(page, '.exp-hook');
    const strip = await get(page, '.exp-photostrip');
    const annot = await get(page, '.exp-annot');
    const rail = await get(page, '.exp-rail');
    const advance = await get(page, '#next-button');
    const mohen = await get(page, '.mohen-askbtn');
    // 真信号 2：关键容器存在且可见、且画布本身不越界视口
    for (const [n, el] of [['canvas', canvas], ['current', current], ['side', side]]) {
      if (!el) { issues.push(n + '缺失'); continue; }
      if (!el.visible) issues.push(n + '不可见');
      if (el.x < -1 || el.y < -1 || el.right > iw + 1 || el.bottom > ih + 1) issues.push(n + '越界');
    }
    // 真信号 3（用户核心痛点）：右栏不得 2D 遮挡中央主角；右栏内浮层也不得压住中央
    if (side && current && overlap(side, current)) issues.push('side遮挡current(2D重叠)');
    if (hook && current && overlap(hook, current)) issues.push('hook压住current');
    if (strip && current && overlap(strip, current)) issues.push('strip压住current');
    if (annot && current && overlap(annot, current)) issues.push('annot压住current');
    // 真信号 4：前进按钮与墨痕可点中（最顶层 hit-test）
    const hit = await page.evaluate(() => {
      const b = document.querySelector('#next-button'); if (!b) return false; const r = b.getBoundingClientRect();
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return b === t || b.contains(t);
    });
    if (!hit) issues.push('advance不可点中');
    const mhit = await page.evaluate(() => {
      const b = document.querySelector('.mohen-askbtn'); if (!b) return false; const r = b.getBoundingClientRect();
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return b === t || b.contains(t);
    });
    if (!mhit) issues.push('mohen不可点中');
    rows.push({ vp: vp.name, pass: issues.length === 0, issues });
    await page.close();
  }
  await browser.close();
  for (const r of rows) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.vp + (r.pass ? '' : '  -> ' + r.issues.join('; ')));
  console.log('汇总: ' + rows.length + ' 项, 失败 ' + rows.filter(r => !r.pass).length);
})().catch(e => { console.error('ERR', e); process.exit(1); });
