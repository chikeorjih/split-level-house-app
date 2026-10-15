// Zero-dependency dev server with live reload.
//   npm run dev                -> http://localhost:5173
//   node scripts/serve.mjs --port 5174 --no-reload   (used by the tests)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : process.env.PORT || 5173);
const liveReload = !args.includes('--no-reload');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
};
const clients = new Set();
const reloadSnippet = '<script>(()=>{const es=new EventSource("/__reload");es.onmessage=()=>location.reload();})();</script>';

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 500\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  const file = path.normalize(path.join(root, url === '/' ? 'index.html' : url));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found: ' + url); }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html' && liveReload) data = Buffer.from(String(data).replace('</body>', reloadSnippet + '\n</body>'));
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

if (liveReload) {
  let timer = null;
  const ping = (_e, name) => {
    if (name && /(^|[\\/])\.|node_modules|dist[\\/]/.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => { for (const c of clients) c.write('data: reload\n\n'); }, 120);
  };
  for (const p of ['src', 'assets', 'index.html']) {
    const full = path.join(root, p);
    if (fs.existsSync(full)) fs.watch(full, { recursive: fs.statSync(full).isDirectory() }, ping);
  }
}

server.listen(port, () => console.log(`House app running at http://localhost:${port}${liveReload ? '  (live reload on)' : ''}`));
