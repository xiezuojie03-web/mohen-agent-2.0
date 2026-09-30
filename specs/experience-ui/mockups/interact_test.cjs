const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file:///D:/work%20Buddy/2026-08-23-23-12-38/mohen-agent-2.0/specs/experience-ui/mockups/2026-09-27_jinze_button_abc_compare.html';
const opts = ['d', 'a', 'b', 'c'];
const viewports = [{ name: 'desktop_land', w: 1280, h: 720 }, { name: 'phone_port', w: 390, h: 844 }, { name: 'phone_land', w: 844, h: 390 }];

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const results = [];
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(FILE + '#a', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));
    for (const opt of opts) {
      // 点击切换按钮
      await page.click('#b' + opt);
      await new Promise(r => setTimeout(r, 120));
      const r = await page.evaluate((opt) => {
        const app = document.getElementById('app');
        const clsOk = app.className === 'app frame t-' + opt;
        // 找前进按钮
        let btn = null;
        if (opt === 'a' || opt === 'c') btn = document.getElementById('rbtn');
        else if (opt === 'b') btn = document.querySelector('#bcta .fwd-btn');
        else btn = document.querySelector('#dcta .fwd-btn'); // d
        if (!btn) return { opt, clsOk, btnFound: false, hit: false, hitTag: '' };
        const rb = btn.getBoundingClientRect();
        const cx = rb.x + rb.width / 2, cy = rb.y + rb.height / 2;
        const top = document.elementFromPoint(cx, cy);
        const hit = btn === top || btn.contains(top) || (top && btn.contains(top.closest('button')));
        return { opt, clsOk, btnFound: true, x: Math.round(rb.x), y: Math.round(rb.y), w: Math.round(rb.width), h: Math.round(rb.height), hit, hitTag: top ? top.tagName + '.' + (top.className || '') : 'null', inViewport: rb.right <= window.innerWidth && rb.bottom <= window.innerHeight && rb.x >= 0 && rb.y >= 0 };
      }, opt);
      results.push({ vp: vp.name, ...r });
    }
    await page.close();
  }
  await browser.close();
  for (const x of results) {
    const ok = x.clsOk && x.btnFound && x.hit && x.inViewport;
    console.log((ok ? 'OK   ' : 'BAD  ') + x.vp + ' ' + x.opt + ' clsOk=' + x.clsOk + ' btnFound=' + x.btnFound + ' hit=' + x.hit + ' inVp=' + x.inViewport + (x.hitTag ? ' top=' + x.hitTag : ''));
  }
  const bad = results.filter(x => !(x.clsOk && x.btnFound && x.hit && x.inViewport));
  console.log('\n交互汇总: ' + results.length + ' 项, 异常 ' + bad.length);
})().catch(e => { console.error('ERR', e); process.exit(1); });
