// Copies three.js r128 from node_modules into vendor/ so the app runs offline. Runs after `npm install`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/three/build/three.min.js');
if (!fs.existsSync(src)) { console.warn('three not installed yet; the app will load it from the CDN instead.'); process.exit(0); }
fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
fs.copyFileSync(src, path.join(root, 'vendor/three.min.js'));
console.log('Copied three.js r128 to vendor/three.min.js');
