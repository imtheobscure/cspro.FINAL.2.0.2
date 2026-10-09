// Generates two static test pages from the writeboard source:
//  1. writeboard_ribbon_test.html      — ribbon markup + CSS only, self-measuring
//  2. writeboard_ribbon_resp_test.html — embeds (1) at several widths via iframes
const esbuild = require('esbuild');
const fs = require('fs');

const src = fs.readFileSync('utils/html/writeboard.ts', 'utf8');
const out = esbuild.transformSync(src, { loader: 'ts', format: 'iife', globalName: '__WB__', target: 'es2020' }).code;
const get = new Function(out + '\nreturn __WB__.getWriteboardFeatures;')();
const wb = get();

// Extract the ribbon block from the generated HTML (starts at wbRibbon, ends at wb-main)
const start = wb.html.indexOf('<div class="wb-toolbar wb-ribbon"');
const end = wb.html.indexOf('<div class="wb-main">');
if (start < 0 || end < 0) { console.error('ribbon block not found'); process.exit(1); }
const ribbonHtml = wb.html.slice(start, end);

const ribbonPage = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>body{margin:0}#overlay{display:block;position:relative;inset:auto}
${wb.css}</style></head><body>
<div id="whiteboard-overlay" style="display:flex;position:relative;height:auto">${ribbonHtml}</div>
<script>
window.addEventListener('load', function(){
  var rb = document.getElementById('wbRibbon');
  var pane = rb.querySelector('.wb-ribbon-pane.show');
  var tabs = rb.querySelector('.wb-ribbon-tabs');
  var qat = rb.querySelector('.wb-qat');
  var search = rb.querySelector('.wb-ribbon-search');
  var res = {
    ribbonH: rb.offsetHeight,
    paneH: pane.offsetHeight,
    wrappedRows: Math.round(pane.offsetHeight / 92),
    overflowX: pane.scrollWidth > pane.clientWidth + 1,
    tabsH: tabs.offsetHeight,
    tabsW: Math.round(tabs.getBoundingClientRect().width),
    qatH: qat.offsetHeight,
    searchW: Math.round(search.getBoundingClientRect().width)
  };
  window.__RESULT = res;
  var el = document.createElement('pre');
  el.id = 'measure';
  el.textContent = JSON.stringify(res);
  document.body.appendChild(el);
});
</script></body></html>`;
fs.writeFileSync('writeboard_ribbon_test.html', ribbonPage);

const widths = [1370, 1100, 900, 700, 480];
const respPage = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ribbon Responsive Test</title>
<style>body{font-family:system-ui;margin:10px}iframe{border:1px solid #999;display:block;margin:10px 0}
button{padding:6px 14px}#out{white-space:pre;font-size:12px;background:#f6f8fb;padding:10px;border-radius:8px}</style></head><body>
<button onclick="run()">Run measurements</button>
<div id="out">click Run…</div>
${widths.map(w => `<iframe data-w="${w}" style="width:${w}px;height:300px" src="writeboard_ribbon_test.html"></iframe>`).join('\n')}
<script>
function run(){
  var out = [];
  document.querySelectorAll('iframe').forEach(function(f){
    try {
      var m = f.contentDocument.getElementById('measure');
      out.push('w=' + f.dataset.w + ' ' + (m ? m.textContent : 'NO MEASURE'));
    } catch(e) { out.push('w=' + f.dataset.w + ' ERR ' + e.message); }
  });
  document.getElementById('out').textContent = out.join('\\n');
}
</script></body></html>`;
fs.writeFileSync('writeboard_ribbon_resp_test.html', respPage);
console.log('test pages written');
