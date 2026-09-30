const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file:///D:/work%20Buddy/2026-08-23-23-12-38/mohen-agent-2.0/specs/experience-ui/mockups/2026-09-27_jinze_consolidated_v03.html';
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
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const layoutRows = [];
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(FILE, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 250));
    const issues = [];
    const iw = vp.w, ih = vp.h;
    const docOx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const docOy = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    if (docOx > 1) issues.push('横向溢出' + docOx);
    if (docOy > 1) issues.push('纵向溢出' + docOy);
    const canvas = await get(page, '.canvas');
    const center = await get(page, '.center');
    const sitemap = await get(page, '.sitemap');
    const side = await get(page, '.side');
    const hook = await get(page, '.hook');
    const strip = await get(page, '.strip');
    const rail = await get(page, '.rail');
    const backBtn = await get(page, '.act');
    const mohen = await get(page, '#askBtn');
    for (const [n, el] of [['canvas', canvas], ['center', center], ['sitemap', sitemap], ['side', side], ['hook', hook], ['strip', strip], ['rail', rail], ['backBtn', backBtn], ['mohen', mohen]]) {
      if (!el) { issues.push(n + '缺失'); continue; }
      if (!el.visible) issues.push(n + '不可见');
      if (el.x < -1 || el.y < -1 || el.right > iw + 1 || el.bottom > ih + 1) issues.push(n + '越界');
    }
    // 用户痛点：钩子文字框 / 三张图 不得压在中央 sitemap 之上
    if (overlap(hook, sitemap)) issues.push('hook压住sitemap');
    if (overlap(strip, sitemap)) issues.push('strip压住sitemap');
    if (overlap(side, center)) issues.push('side与center重叠');
    layoutRows.push({ vp: vp.name, pass: issues.length === 0, issues });
    await page.close();
  }

  // 交互：右下「把时间拨回去」是否真生效（在桌面横屏 + 手机竖屏各跑一遍）
  const interRows = [];
  for (const vp of [{ name: 'desktop_land', w: 1280, h: 720 }, { name: 'phone_port', w: 390, h: 844 }]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(FILE, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));
    const when0 = await page.$eval('#when', e => e.textContent);
    // 点 5 次前进
    for (let k = 0; k < 5; k++) { await page.click('#backBtn'); await new Promise(r => setTimeout(r, 60)); }
    const whenEnd = await page.$eval('#when', e => e.textContent);
    const backDisabled = await page.$eval('#backBtn', e => e.disabled);
    const resetShown = await page.$eval('#resetBtn', e => getComputedStyle(e).display !== 'none');
    // 命中检测：backBtn 中心点最顶层是不是它自己
    const hit = await page.evaluate(() => {
      const b = document.querySelector('#backBtn'); const r = b.getBoundingClientRect();
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return b === t || b.contains(t) || (t && b.contains(t.closest('button')));
    });
    // 回今天
    await page.click('#resetBtn'); await new Promise(r => setTimeout(r, 60));
    const whenReset = await page.$eval('#when', e => e.textContent);
    const backEnabledAfter = await page.$eval('#backBtn', e => !e.disabled);
    // 墨痕卡
    await page.click('#askBtn'); await new Promise(r => setTimeout(r, 60));
    const dlgShown = await page.$eval('#dialog', e => e.classList.contains('show'));
    const ok = (when0.includes('今天')) && (whenEnd.includes('1260s')) && backDisabled && resetShown && hit && (whenReset.includes('今天')) && backEnabledAfter && dlgShown;
    interRows.push({ vp: vp.name, pass: ok, when0, whenEnd, backDisabled, resetShown, hit, whenReset, backEnabledAfter, dlgShown });
    await page.close();
  }
  await browser.close();

  for (const r of layoutRows) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.vp + (r.pass ? '' : '  -> ' + r.issues.join('; ')));
  console.log('布局汇总: ' + layoutRows.length + ' 项, 失败 ' + layoutRows.filter(r => !r.pass).length);
  for (const r of interRows) console.log((r.pass ? 'OK   ' : 'BAD  ') + r.vp + ' when0="' + r.when0 + '" end="' + r.whenEnd + '" backDisabled=' + r.backDisabled + ' resetShown=' + r.resetShown + ' hit=' + r.hit + ' resetTo="' + r.whenReset + '" backReEnabled=' + r.backEnabledAfter + ' dlgShown=' + r.dlgShown);
  console.log('交互汇总: ' + interRows.length + ' 项, 异常 ' + interRows.filter(r => !r.pass).length);
})().catch(e => { console.error('ERR', e); process.exit(1); });
