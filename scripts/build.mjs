// Builds dist/house-walkthrough.html: one self-contained file (styles and every src/*.js inlined, three.js from the CDN through an import
// map) that can be published as a claude.ai artifact or opened anywhere. three.js is an ES module, so the app's classic code is held as
// text and run by the inlined boot module once THREE is ready; window.__APP_LINE0 tells Debug IDs which line of this file it starts on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="src/styles.css">', '<style>\n' + css.replace(/\s+$/, '') + '\n</style>');

const THREE_VER = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8')).version, CDN = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER;
html = html.replace(/<script type="importmap">[^\n]*<\/script>/, () => '<script type="importmap">' + JSON.stringify({ imports: { three: CDN + '/build/three.module.js', 'three/webgpu': CDN + '/build/three.webgpu.js', 'three/tsl': CDN + '/build/three.tsl.js', 'three/addons/': CDN + '/examples/jsm/' } }) + '</script>');
const bootTag = '<script type="module" src="src/three-boot.mjs"></script>\n';
if (!html.includes(bootTag)) throw new Error('No three-boot.mjs module tag in index.html');
html = html.replace(bootTag, '');
const tags = [...html.matchAll(/<script defer src="(src\/[^"]+\.js)"><\/script>\n?/g)];
if (!tags.length) throw new Error('No src/*.js script tags found in index.html');
const code = tags.map(m => fs.readFileSync(path.join(root, m[1]), 'utf8').replace(/\s+$/, '')).join('\n');
const first = tags[0].index, last = tags[tags.length - 1];
html = html.slice(0, first) + '<script type="text/plain" id="app-src">\n' + code + '\n</script>\n' + html.slice(last.index + last[0].length);
// the boot module, inlined after the app code (so its line numbers stay put), runs the app code once three.js has loaded
{ const tagLine = html.slice(0, html.indexOf('<script type="text/plain" id="app-src">')).split('\n').length;
  const boot = fs.readFileSync(path.join(root, 'src/three-boot.mjs'), 'utf8').replace(/\s+$/, '');
  const tail = html.lastIndexOf('</body>');
  html = html.slice(0, tail) + '<script>window.__APP_LINE0=' + tagLine + ';</script>\n<script type="module">\n' + boot + '\nconst __s = document.createElement(\'script\'); __s.textContent = document.getElementById(\'app-src\').textContent; document.body.appendChild(__s);\n</script>\n' + html.slice(tail); }

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
