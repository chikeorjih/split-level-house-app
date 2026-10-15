// Writes box-84x38x34.glb: a plain box 84" wide, 38" deep, 34" tall, in metres like a typical Sketchfab download.
// The model tests use it to check that imported models are scaled, placed and measured correctly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IN = 0.0254, [w, d, h] = [84 * IN, 38 * IN, 34 * IN];
const x0 = -w / 2, x1 = w / 2, y0 = 0, y1 = h, z0 = -d / 2, z1 = d / 2;
const faces = [ // [normal, 4 corners]
  [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]], [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
  [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]], [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
  [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]], [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]]];
const pos = [], nor = [], idx = [];
faces.forEach(([n, c], f) => { for (const v of c) { pos.push(...v); nor.push(...n); } idx.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3); });
const P = Buffer.from(new Float32Array(pos).buffer), N = Buffer.from(new Float32Array(nor).buffer), I = Buffer.from(new Uint16Array(idx).buffer);
const bin = Buffer.concat([P, N, I, Buffer.alloc((4 - (P.length + N.length + I.length) % 4) % 4)]);
const json = { asset: { version: '2.0', generator: 'make-box-glb' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'box' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.75, 0.55, 0.35, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: P.length, target: 34962 }, { buffer: 0, byteOffset: P.length, byteLength: N.length, target: 34962 },
    { buffer: 0, byteOffset: P.length + N.length, byteLength: I.length, target: 34963 }],
  accessors: [{ bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [x0, y0, z0], max: [x1, y1, z1] },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' }, { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' }] };
let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(12); head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (buf, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(buf.length, 0); b.write(type, 4); return Buffer.concat([b, buf]); };
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'box-84x38x34.glb');
fs.writeFileSync(out, Buffer.concat([head, ch(js, 'JSON'), ch(bin, 'BIN\0')]));
console.log('Wrote', out);
