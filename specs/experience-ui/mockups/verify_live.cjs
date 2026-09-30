// 对着「正在运行的真实 dev 服务」跑 5 视口坐标+命中体检（不是镜像，是真页面）
const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://localhost:3000/experience/jinze-water-net';
const viewports = [
  { name: 'desktop_land', w: 1280, h: 720 },
  { name: 'phone_port', w: 390, h: 844 },
  { name: 'phone_land', w: 844, h: 390 },
  { name: 'ipad_port', w: 768, h: 1024 },
  { name: 'short_land', w: 1024, h: 500 },
];
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
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server', '--proxy-bypass-list=<-loopback>'] });
  const rows = [];
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) { rows.push({ vp: vp.name, pass: false, issues: ['页面加载失败:' + String(e).slice(0, 60)] }); await page.close(); continue; }
    await new Promise(r => setTimeout(r, 3500));
    const issues = [];
    const iw = vp.w, ih = vp.h;
    const docOx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const docOy = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    if (docOx > 1) issues.push('页面横向溢出' + docOx);
    if (docOy > 1) issues.push('页面纵向溢出' + docOy);
    const current = await get(page, '.exp-canvas__current');
    const side = await get(page, '.exp-canvas__side');
    const hook = await get(page, '.exp-hook');
    const strip = await get(page, '.exp-photostrip');
    const annot = await get(page, '.exp-annot');
    if (!current) issues.push('current缺失');
    if (!side) issues.push('side缺失');
    if (side && current && overlap(side, current)) issues.push('side遮挡current');
    if (hook && current && overlap(hook, current)) issues.push('hook压住current');
    if (strip && current && overlap(strip, current)) issues.push('strip压住current');
    if (annot && current && overlap(annot, current)) issues.push('annot压住current');
    const hit = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="next-button"]'); if (!b) return 'no-btn'; const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return 'zero-size';
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return (b === t || b.contains(t)) ? 'ok' : 'covered';
    });
    if (hit !== 'ok') issues.push('advance:' + hit);
    const mhit = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="mohen-ask-open"]') || document.querySelector('.mohen-askbtn'); if (!b) return 'no-btn'; const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return 'zero-size';
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return (b === t || b.contains(t)) ? 'ok' : 'covered';
    });
    if (mhit !== 'ok') issues.push('mohen:' + mhit);
    rows.push({ vp: vp.name, pass: issues.length === 0, issues });
    await page.close();
  }
  await browser.close();
  for (const r of rows) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.vp + (r.pass ? '' : '  -> ' + r.issues.join('; ')));
  console.log('汇总: ' + rows.length + ' 项, 失败 ' + rows.filter(r => !r.pass).length);
})().catch(e => { console.error('ERR', e); process.exit(1); });
