// Builds dist/house-walkthrough.html: one self-contained file (styles and every src/*.js inlined,
// three.js r128 from the CDN) that can be published as a claude.ai artifact or opened anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="src/styles.css">', '<style>\n' + css.replace(/\s+$/, '') + '\n</style>');

html = html.replace('<script src="vendor/three.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
html = html.replace(/<script>if\(!window\.THREE\)\{document\.write\('<script src="https:\/\/cdnjs[^\n]*<\/script>/,
  `<script>if(!window.THREE){document.write('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"><\\/script>')}</script>`);

html = html.replace('<script src="vendor/GLTFLoader.js"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>');

const tags = [...html.matchAll(/<script src="(src\/[^"]+\.js)"><\/script>\n?/g)];
if (!tags.length) throw new Error('No src/*.js script tags found in index.html');
const code = tags.map(m => fs.readFileSync(path.join(root, m[1]), 'utf8').replace(/\s+$/, '')).join('\n');
const first = tags[0].index, last = tags[tags.length - 1];
html = html.slice(0, first) + '<script>\n' + code + '\n</script>\n' + html.slice(last.index + last[0].length);

// imported models: embed the manifest and each GLB as a data URI, after the app code so Debug ID line numbers don't move
const manPath = path.join(root, 'assets/models/manifest.json');
if (fs.existsSync(manPath)) {
  const man = JSON.parse(fs.readFileSync(manPath, 'utf8')), files = {};let bytes = 0;
  man.models = (man.models || []).filter(m => m.enabled !== false);
  for (const m of man.models) {
    if (!/\.glb$/i.test(m.file)) { console.warn(`Model "${m.id}" is ${m.file}; only .glb files can be embedded, so the published build leaves it out.`); continue; }
    const buf = fs.readFileSync(path.join(root, 'assets/models', m.file));bytes += buf.length;
    files[m.file] = 'data:model/gltf-binary;base64,' + buf.toString('base64');
  }
  if (man.models.length) {
    const tail = html.lastIndexOf('</body>');
    html = html.slice(0, tail) + '<script>window.__MODEL_MANIFEST=' + JSON.stringify(man) + ';window.__MODEL_FILES=' + JSON.stringify(files) + ';</script>\n' + html.slice(tail);
    const mb = bytes * 4 / 3 / 1048576;
    console.log(`Embedded ${Object.keys(files).length} model(s), ${mb.toFixed(1)} MB as base64`);
    if (mb > 12) console.warn('Embedded models are over 12 MB; the published page must stay under 16 MB. Use smaller or decimated models.');
  }
}

const lines = html.split('\n');
if (!lines[5] || !lines[5].startsWith('<title>')) throw new Error('Keep <title> on line 6 of index.html: Debug IDs use it to map line numbers.');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/house-walkthrough.html'), html);
console.log(`Built dist/house-walkthrough.html (${(html.length / 1024).toFixed(0)} KB, ${tags.length} source files)`);
