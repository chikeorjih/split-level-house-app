// Sketchfab helper for the import-model skill (.claude/skills/import-model).
//   node scripts/sketchfab.mjs search "<words>" [--brand "west elm"] [--all] [--count 24]
//        lists downloadable models (--all includes store and view-only ones); --brand keeps results that mention the brand
//   node scripts/sketchfab.mjs info <uid|url>
//        licence, author, size, formats, and any dimensions written in the description
//   node scripts/sketchfab.mjs download <uid|url> <slug>
//        saves assets/models/<slug>.glb (or a glTF folder) plus <slug>.source.json; needs SKETCHFAB_TOKEN in the
//        environment or in .env.local (your API token from https://sketchfab.com/settings/password)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.sketchfab.com/v3';
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf('--' + n); if (i < 0) return d; const v = rest[i + 1]; rest.splice(i, 2); return v; };
const bool = n => { const i = rest.indexOf('--' + n); if (i < 0) return false; rest.splice(i, 1); return true; };
const uidOf = s => { const m = String(s || '').match(/([0-9a-f]{32})/i); if (!m) throw new Error('Expected a Sketchfab model URL or 32-character uid, got: ' + s); return m[1].toLowerCase(); };
const token = () => {
  if (process.env.SKETCHFAB_TOKEN) return process.env.SKETCHFAB_TOKEN.trim();
  const f = path.join(root, '.env.local');
  if (fs.existsSync(f)) { const m = fs.readFileSync(f, 'utf8').match(/^\s*SKETCHFAB_TOKEN\s*=\s*"?([^"\r\n]+)"?/m); if (m) return m[1].trim(); }
  return null;
};
async function get(url, auth) {
  const r = await fetch(url, { headers: auth ? { Authorization: 'Token ' + auth } : {} });
  if (!r.ok) { const e = new Error(`${r.status} ${r.statusText} for ${url.replace(API, '')}`); e.status = r.status; e.body = await r.text().catch(() => ''); throw e; }
  return r.json();
}
const lic = m => (m.license && (m.license.label || m.license.slug)) || (m.isDownloadable ? 'unknown' : 'none (view only or store)');
// dimension-looking phrases in a description: 84"W x 38"D x 34"H, 213 x 97 x 86 cm, Width: 84 in ...
function dimsIn(text) {
  const out = new Set(), t = String(text || '');
  for (const re of [/\d+(?:\.\d+)?\s*(?:"|''|in\.?|inch(?:es)?|cm|mm|m)?\s*[WwDdHhLl]?\s*[x×X]\s*\d+(?:\.\d+)?\s*(?:"|''|in\.?|inch(?:es)?|cm|mm|m)?\s*[WwDdHhLl]?(?:\s*[x×X]\s*\d+(?:\.\d+)?\s*(?:"|''|in\.?|inch(?:es)?|cm|mm|m)?\s*[WwDdHhLl]?)?/g,
    /\b(?:width|depth|height|length|dimensions?|overall|seat height|W|D|H)\s*[:=]\s*\d+(?:\.\d+)?\s*(?:"|in\.?|inches|cm|mm|m)\b/gi]) for (const m of t.matchAll(re)) out.add(m[0].trim());
  return [...out];
}

async function main() {
if (cmd === 'search') {
  const brand = flag('brand'), count = flag('count', '24'), all = bool('all');
  const q = rest.filter(a => !a.startsWith('--')).join(' ');
  if (!q) throw new Error('search needs some words, e.g. search "west elm harmony sofa"');
  const u = `${API}/search?type=models&q=${encodeURIComponent(q)}&count=${count}${all ? '' : '&downloadable=true'}`;
  const j = await get(u);
  let res = j.results || [];
  if (brand) { const b = brand.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
    const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ');
    res = res.filter(m => norm([m.name, m.description, (m.tags || []).map(t => t.name).join(' ')].join(' ')).includes(b)); }
  if (!res.length) { console.log('No matches.' + (all ? '' : ' Try --all to include store and view-only models.')); return; }
  for (const m of res) console.log([m.uid, m.name, 'by ' + (m.user && m.user.username), lic(m), m.isDownloadable ? 'downloadable' : (m.price ? 'store $' + (m.price / 100).toFixed(2) : 'not downloadable'), (m.faceCount || 0).toLocaleString() + ' faces', m.viewerUrl].join(' | '));
} else if (cmd === 'info') {
  const uid = uidOf(rest[0]), m = await get(`${API}/models/${uid}`);
  const arch = m.archives ? Object.entries(m.archives).map(([k, v]) => `${k} ${v && v.size ? (v.size / 1048576).toFixed(1) + ' MB' : ''}`).join(', ') : 'n/a';
  console.log(JSON.stringify({ uid, name: m.name, author: m.user && m.user.username, authorUrl: m.user && m.user.profileUrl, license: lic(m), downloadable: !!m.isDownloadable,
    price: m.price ? '$' + (m.price / 100).toFixed(2) : null, faces: m.faceCount, vertices: m.vertexCount, archives: arch, url: m.viewerUrl,
    tags: (m.tags || []).map(t => t.name), dimensionsInDescription: dimsIn(m.description) }, null, 2));
  console.log('\nDescription:\n' + String(m.description || '(none)').slice(0, 2000));
} else if (cmd === 'download') {
  const uid = uidOf(rest[0]), slug = rest[1];
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('download needs a slug of lowercase letters, digits and dashes, e.g. download <uid> westelm-harmony-sofa');
  const t = token();
  if (!t) { console.error('No Sketchfab token. Put SKETCHFAB_TOKEN=<your API token> in .env.local (from https://sketchfab.com/settings/password), or download the model on sketchfab.com yourself and save the .glb as assets/models/' + slug + '.glb.'); process.exitCode = 2; return; }
  const m = await get(`${API}/models/${uid}`);
  let d;
  try { d = await get(`${API}/models/${uid}/download`, t); }
  catch (e) {
    if (e.status === 401) console.error('Sketchfab rejected the token (401). Check SKETCHFAB_TOKEN.');
    else if (e.status === 403 || e.status === 404) console.error(`This model can't be downloaded with your account (${e.status}). ${m.price ? 'It is a store model: buy it on sketchfab.com first, then run this again.' : 'Its author has not made it downloadable.'}`);
    else console.error(e.message, e.body);
    process.exitCode = 3; return;
  }
  const dir = path.join(root, 'assets/models'); fs.mkdirSync(dir, { recursive: true });
  const fetchTo = async (url, file) => { const r = await fetch(url); if (!r.ok) throw new Error('download failed: ' + r.status); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); };
  let file;
  if (d.glb && d.glb.url) { file = slug + '.glb'; await fetchTo(d.glb.url, path.join(dir, file)); }
  else if (d.gltf && d.gltf.url) {
    const zip = path.join(dir, slug + '.zip'), out = path.join(dir, slug); await fetchTo(d.gltf.url, zip); fs.mkdirSync(out, { recursive: true });
    execFileSync('tar', ['-xf', zip, '-C', out]); fs.unlinkSync(zip);
    const g = fs.readdirSync(out).find(f => /\.gltf$/i.test(f)); file = slug + '/' + g;
    console.warn('Only a glTF archive was offered. It works in the dev app, but the single-file build can only embed .glb files.');
  } else throw new Error('Sketchfab offered no glb or gltf archive: ' + Object.keys(d).join(', '));
  const src = { site: 'sketchfab', uid, url: m.viewerUrl, name: m.name, author: m.user && m.user.username, authorUrl: m.user && m.user.profileUrl,
    license: lic(m), licenseUrl: m.license && m.license.url, downloaded: new Date().toISOString().slice(0, 10), file };
  fs.writeFileSync(path.join(dir, slug + '.source.json'), JSON.stringify(src, null, 2) + '\n');
  const size = fs.statSync(path.join(dir, file)).size;
  console.log(`Saved assets/models/${file} (${(size / 1048576).toFixed(1)} MB) and ${slug}.source.json. Licence: ${src.license}.`);
  console.log(`Credit line: "${m.name}" by ${src.author} on Sketchfab, ${src.license}`);
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 9).join('\n'));
  process.exitCode = cmd ? 1 : 0;
}
}
await main();
