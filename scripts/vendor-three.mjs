// Copies three.js (ES modules: the core, the WebGL and WebGPU builds, and the add-ons the app imports) from node_modules into
// vendor/three/, keeping the package's own layout so their relative imports resolve. Runs after `npm install`; index.html's import map
// points at these files, so the app runs offline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'node_modules/three');
if (!fs.existsSync(path.join(pkg, 'build/three.module.js'))) { console.warn('three not installed yet; the app will load it from the CDN instead.'); process.exit(0); }
const out = path.join(root, 'vendor/three');
fs.rmSync(out, { recursive: true, force: true });
const copy = rel => { const d = path.join(out, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(path.join(pkg, rel), d); };
for (const f of ['three.core.js', 'three.module.js', 'three.webgpu.js', 'three.webgpu.nodes.js', 'three.tsl.js']) copy('build/' + f);
// add-ons: the GLTF loader and what it imports
for (const f of ['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js', 'postprocessing/Pass.js']) copy('examples/jsm/' + f);
copy('package.json');
// the path tracer (Ultra's "Path traced" mode, WebGPU only) and the BVH library it traces with: their ES module sources
for (const name of ['three-mesh-bvh', 'three-gpu-pathtracer']) { const src = path.join(root, 'node_modules', name), dst = path.join(root, 'vendor', name);
  if (!fs.existsSync(src)) { console.warn(name + ' not installed; path tracing will be unavailable offline.'); continue; }
  fs.rmSync(dst, { recursive: true, force: true }); fs.cpSync(path.join(src, 'src'), path.join(dst, 'src'), { recursive: true, filter: f => !/\.d\.ts$|\.md$/.test(f) }); fs.copyFileSync(path.join(src, 'package.json'), path.join(dst, 'package.json')); }
console.log('Copied three.js ' + JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).version + ' (module builds and add-ons) to vendor/three/');
