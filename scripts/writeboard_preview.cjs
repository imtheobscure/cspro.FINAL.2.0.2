// Regenerates writeboard_preview.html: full Writeboard (html+css+js) in one standalone page.
// Usage: node scripts/writeboard_preview.cjs
const esbuild = require('esbuild');
const fs = require('fs');

const src = fs.readFileSync('utils/html/writeboard.ts', 'utf8');
const out = esbuild.transformSync(src, { loader: 'ts', format: 'iife', globalName: '__WB__', target: 'es2020' }).code;
const get = new Function(out + '\nreturn __WB__.getWriteboardFeatures;')();
const wb = get();

const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Writeboard Preview</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>${wb.css}</style></head>
<body>
${wb.html}
<script>${wb.js}<\/script>
</body></html>`;

fs.writeFileSync('writeboard_preview.html', page);
console.log('writeboard_preview.html written:', (page.length / 1024).toFixed(0) + ' KB');
