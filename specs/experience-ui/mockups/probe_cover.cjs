const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://localhost:3000/experience/jinze-water-net';
const vps = [{ name: 'phone_land', w: 844, h: 390 }, { name: 'short_land', w: 1024, h: 500 }];
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server', '--proxy-bypass-list=<-loopback>'] });
  for (const vp of vps) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3500));
    const info = await page.evaluate(() => {
      const desc = (el) => el ? (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.getAttribute && el.getAttribute('data-testid') ? ' [' + el.getAttribute('data-testid') + ']' : '')) : 'null';
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) }; };
      const btn = document.querySelector('[data-testid="mohen-ask-open"]') || document.querySelector('.mohen-askbtn');
      const br = rect(btn);
      let atCenter = null;
      if (btn) { const r = btn.getBoundingClientRect(); atCenter = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); }
      return {
        mohen: { rect: br, desc: desc(btn), cs: btn ? { pos: getComputedStyle(btn).position, z: getComputedStyle(btn).zIndex, disp: getComputedStyle(btn).display } : null },
        atCenter: desc(atCenter),
        side: { rect: rect(document.querySelector('.exp-canvas__side')), } ,
        sideActions: { rect: rect(document.querySelector('.exp-side-actions')), cs: (function(){ const e=document.querySelector('.exp-side-actions'); return e?{disp:getComputedStyle(e).display, pos:getComputedStyle(e).position, z:getComputedStyle(e).zIndex}:null; })() },
        rail: { rect: rect(document.querySelector('.exp-rail')), cs: (function(){ const e=document.querySelector('.exp-rail'); return e?{pos:getComputedStyle(e).position, z:getComputedStyle(e).zIndex, bottom:getComputedStyle(e).bottom}:null; })() },
      };
    });
    console.log('=== ' + vp.name + ' (' + vp.w + 'x' + vp.h + ') ===');
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
