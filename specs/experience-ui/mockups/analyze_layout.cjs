const fs = require('fs');
const R = JSON.parse(fs.readFileSync('D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/specs/experience-ui/mockups/layout_report.json', 'utf8'));

function within(v, el, name, issues) {
  if (!el) { issues.push(name + ': 缺失'); return; }
  if (!el.visible) { issues.push(name + ': 不可见(display=' + el.display + ')'); return; }
  if (el.x < -1) issues.push(name + ': 左越界 x=' + el.x);
  if (el.y < -1) issues.push(name + ': 上越界 y=' + el.y);
  if (el.right > v.iw + 1) issues.push(name + ': 右越界 right=' + el.right + '>iw=' + v.iw);
  if (el.bottom > v.ih + 1) issues.push(name + ': 下越界 bottom=' + el.bottom + '>ih=' + v.ih);
}
function overlap(a, b) {
  if (!a || !b || !a.visible || !b.visible) return false;
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}

const out = [];
for (const key of Object.keys(R)) {
  const v = R[key];
  const [vp, opt] = key.split('_');
  const issues = [];
  // 全局
  if (v.docOverflowX > 1) issues.push('横向溢出 ' + v.docOverflowX + 'px');
  if (v.docOverflowY > 1) issues.push('纵向溢出 ' + v.docOverflowY + 'px');
  if (Math.abs(v.app.w - v.iw) > 1 || Math.abs(v.app.h - v.ih) > 1) issues.push('app未占满视口 ' + v.app.w + 'x' + v.app.h + ' vs ' + v.iw + 'x' + v.ih);
  // 通用元素
  within(v, v.hook, 'hook', issues);
  within(v, v.primary, 'primary', issues);
  within(v, v.strip, 'strip', issues);
  within(v, v.meaning, 'meaning', issues);
  within(v, v.bottombar, 'bottombar', issues);
  // 各方案的前进控件
  if (opt === 'd') {
    if (!v.dcta || !v.dcta.visible) issues.push('D: 前进区 dcta 不可见');
    else within(v, v.dcta, 'dcta', issues);
    if (v.bottomcta && v.bottomcta.visible) issues.push('D: bottomcta 应隐藏却可见');
  } else if (opt === 'a' || opt === 'c') {
    if (!v.rail || !v.rail.visible) issues.push(opt + ': 右栏 rail 不可见');
    else {
      within(v, v.rail, 'rail', issues);
      within(v, v.railBtn, 'railBtn', issues);
      if (overlap(v.primary, v.rail)) issues.push(opt + ': primary 与 rail 重叠');
    }
    if (v.bottomcta && v.bottomcta.visible) issues.push(opt + ': bottomcta 应隐藏却可见');
  } else if (opt === 'b') {
    if (!v.bottomcta || !v.bottomcta.visible) issues.push('B: 底部前进 bottomcta 不可见');
    else within(v, v.bottomcta, 'bottomcta', issues);
    if (v.rail && v.rail.visible) issues.push('B: rail 应隐藏却可见');
  }
  out.push({ key, pass: issues.length === 0, issues });
}
for (const o of out) {
  console.log((o.pass ? 'PASS ' : 'FAIL ') + o.key + (o.pass ? '' : '  -> ' + o.issues.join('; ')));
}
const fails = out.filter(o => !o.pass);
console.log('\n汇总: ' + out.length + ' 项, 通过 ' + (out.length - fails.length) + ', 失败 ' + fails.length);
