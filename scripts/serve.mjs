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

// Debug mode's Delete button: remove what an element's build call makes, straight from src/ (dev server only, same-origin JSON only).
// Every delete is kept so /__edit/undo can put the last one back while the file hasn't been changed since.
const UNDO = [];
const reply = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const body = req => new Promise((ok, fail) => { let b = ''; req.on('data', d => { b += d; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { fail(e); } }); });
const readText = f => { const raw = fs.readFileSync(f, 'utf8'), crlf = raw.includes('\r\n'); return { text: crlf ? raw.replace(/\r\n/g, '\n') : raw, crlf }; };
const writeText = (f, text, crlf) => fs.writeFileSync(f, crlf ? text.replace(/\n/g, '\r\n') : text);
async function edit(req, res, url) {
  if (url === '/__edit/status') return reply(res, 200, { ok: true, undo: UNDO.length ? { file: UNDO.at(-1).file, removed: UNDO.at(-1).removed } : null });
  if (req.method !== 'POST' || !/application\/json/.test(req.headers['content-type'] || '') ||
    (req.headers.origin && req.headers.origin !== `http://localhost:${port}` && req.headers.origin !== `http://127.0.0.1:${port}`)) return reply(res, 403, { error: 'not allowed' });
  const { removeElement, removeOpening } = await import('./src-edit.mjs?' + Date.now());
  try {
    const q = await body(req);
    if (url === '/__edit/undo') {
      const u = UNDO.at(-1);
      if (!u) return reply(res, 400, { error: 'nothing to undo' });
      const abs = path.join(root, u.file), cur = readText(abs);
      if (cur.text !== u.after) return reply(res, 409, { error: u.file + ' has changed since the delete, so it was not undone; use git to restore it' });
      writeText(abs, u.before, cur.crlf); UNDO.pop();
      return reply(res, 200, { ok: true, file: u.file, restored: u.removed });
    }
    if (url !== '/__edit/delete') return reply(res, 404, { error: 'unknown edit' });
    let file, out;
    if (q.model) { // an imported model: drop its manifest entry (its file stays in assets/models)
      file = 'assets/models/manifest.json';
      const cur = readText(path.join(root, file)), man = JSON.parse(cur.text), m = (man.models || []).find(x => x.id === q.model);
      if (!m) return reply(res, 404, { error: 'no model "' + q.model + '" in the manifest' });
      man.models = man.models.filter(x => x !== m);
      out = { text: JSON.stringify(man, null, 2) + '\n', removed: JSON.stringify(m), line: null, cur };
    } else {
      file = String(q.file || '');
      if (!/^src\/[\w.-]+\.js$/.test(file) || !fs.existsSync(path.join(root, file))) return reply(res, 400, { error: 'only files in src/ can be edited' });
      const cur = readText(path.join(root, file)), line = Number(q.line), col = Number(q.col);
      const r = Number.isInteger(q.op) ? removeOpening(cur.text, line, col, q.op, file) : removeElement(cur.text, line, col, file);
      out = { ...r, cur };
    }
    if (!q.dry) { writeText(path.join(root, file), out.text, out.cur.crlf); UNDO.push({ file, before: out.cur.text, after: out.text, removed: out.removed }); }
    reply(res, 200, { ok: true, file, line: out.line, removed: out.removed, done: !q.dry });
  } catch (e) { reply(res, 422, { error: e.message }); }
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 500\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (url.startsWith('/__edit/')) { if (!liveReload) return reply(res, 404, { error: 'editing is only available from npm run dev' }); edit(req, res, url); return; }
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
