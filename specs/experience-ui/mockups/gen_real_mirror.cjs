const fs = require('fs');
const base = 'D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0';
const css = fs.readFileSync(base + '/apps/web/app/experience/jinze-water-net/experience.css', 'utf8');
let html = fs.readFileSync(base + '/specs/experience-ui/mockups/verify_real_layout.html', 'utf8');
const reset = '*{box-sizing:border-box}html,body{margin:0;height:100%}';
const fresh = '<style>' + reset + '\n' + css + '</style>';
// 始终用最新 CSS 覆盖镜像里的首个 <style> 块（无论之前是 <link> 还是已内联的 <style>）
// 这样后续每次改 experience.css 重新生成都能生效，不会卡在首次内联的旧版本。
const linkRe = /<link[^>]*experience\.css[^>]*>/;
if (linkRe.test(html)) {
  html = html.replace(linkRe, fresh);
} else {
  html = html.replace(/<style>[\s\S]*?<\/style>/, fresh);
}
fs.writeFileSync(base + '/specs/experience-ui/mockups/verify_real_layout.html', html);
console.log('written, css length=' + css.length);
