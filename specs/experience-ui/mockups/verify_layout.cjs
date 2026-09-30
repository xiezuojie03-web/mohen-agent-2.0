const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file:///D:/work%20Buddy/2026-08-23-23-12-38/mohen-agent-2.0/specs/experience-ui/mockups/2026-09-27_jinze_button_abc_compare.html';
const opts = ['d', 'a', 'b', 'c'];
const viewports = [
  { name: 'desktop_land', w: 1280, h: 720 },
  { name: 'phone_port', w: 390, h: 844 },
  { name: 'phone_land', w: 844, h: 390 },
  { name: 'ipad_port', w: 768, h: 1024 },
  { name: 'short_land', w: 1024, h: 500 },
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const report = {};
  for (const vp of viewports) {
    for (const opt of opts) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
      await page.goto(FILE + '#' + opt, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 300));
      const data = await page.evaluate(() => {
        const get = sel => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom), display: cs.display, visible };
        };
        const iw = window.innerWidth, ih = window.innerHeight;
        const docOverflowX = document.documentElement.scrollWidth - iw;
        const docOverflowY = document.documentElement.scrollHeight - ih;
        return {
          iw, ih, docOverflowX, docOverflowY,
          app: get('.app'),
          hook: get('.hook'),
          primary: get('.primary'),
          strip: get('.strip'),
          rail: get('.rail'),
          railBtn: get('#rbtn'),
          bottomcta: get('#bcta'),
          dcta: get('#dcta'),
          bottombar: get('.bottombar'),
          meaning: get('.meaning'),
          mohenFoot: get('.mohen-foot'),
        };
      });
      report[vp.name + '_' + opt] = data;
      await page.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})().catch(e => { console.error('ERR', e); process.exit(1); });
