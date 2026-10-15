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

const tags = [...html.matchAll(/<script src="(src\/[^"]+\.js)"><\/script>\n?/g)];
if (!tags.length) throw new Error('No src/*.js script tags found in index.html');
const code = tags.map(m => fs.readFileSync(path.join(root, m[1]), 'utf8').replace(/\s+$/, '')).join('\n');
const first = tags[0].index, last = tags[tags.length - 1];
html = html.slice(0, first) + '<script>\n' + code + '\n</script>\n' + html.slice(last.index + last[0].length);

const lines = html.split('\n');
if (!lines[5] || !lines[5].startsWith('<title>')) throw new Error('Keep <title> on line 6 of index.html: Debug IDs use it to map line numbers.');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/house-walkthrough.html'), html);
console.log(`Built dist/house-walkthrough.html (${(html.length / 1024).toFixed(0)} KB, ${tags.length} source files)`);
