// Checks imported models inside the real app: their size against the product spec, and their fit in the floor plan.
//   npm run model:check                     every model in assets/models/manifest.json
//   npm run model:check -- <id>             just that model
//   npm run model:check -- --file <slug>.glb --spec 84x38x34 [--replaces "sofa"] [--place x,z,lv[,ryDeg]] [--turn deg]
//                          [--orient x,y,z] [--scale cm|m|mm|in|ft|<feet per unit>] [--id name]
//        tries a file before it goes in the manifest (spec is product width x depth x height in inches; file is relative to assets/models)
// Prints a report, saves a plan close-up and a 3/4 close-up of each model to test-results/models/, and exits 1 if any model fails.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf('--' + n); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const nums = s => s.split(/[x×,]/i).map(Number);

const file = opt('file'), spec = opt('spec'), replaces = opt('replaces'), place = opt('place'), turn = opt('turn'), orient = opt('orient'), scale = opt('scale'), idOpt = opt('id');
let manifest;
if (file) {
  const m = { id: idOpt || path.basename(file).replace(/\.(glb|gltf)$/i, ''), file };
  if (spec) { const [w, d, h] = nums(spec); m.spec = { w, d, h }; }
  if (replaces) m.replaces = replaces;
  m.place = {};
  if (place) { const [x, z, lv, ry] = nums(place); Object.assign(m.place, { x, z, lv }); if (!Number.isNaN(ry) && ry !== undefined) m.place.ry = ry; }
  if (turn) m.place.turn = Number(turn);
  if (orient) { const [x, y, z] = nums(orient); m.orient = { x, y, z }; }
  if (scale) m.scale = Number.isNaN(Number(scale)) ? scale : Number(scale);
  if (!fs.existsSync(path.join(root, 'assets/models', file))) throw new Error('No such file: assets/models/' + file);
  manifest = { models: [m] };
} else {
  const mp = path.join(root, 'assets/models/manifest.json');
  manifest = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : { models: [] };
  manifest.models = (manifest.models || []).filter(m => m.enabled !== false && (!args[0] || m.id === args[0]));
  if (!manifest.models.length) { console.log(args[0] ? `No enabled model "${args[0]}" in assets/models/manifest.json.` : 'No models in assets/models/manifest.json.'); process.exitCode = args[0] ? 1 : 0; }
}

if (manifest.models.length) {
  const port = 5176, server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), '--port', String(port), '--no-reload'], { stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; ; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch (e) {} if (i > 50) throw new Error('dev server did not start'); await new Promise(r => setTimeout(r, 200)); }
    browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (/^model /.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(m => { window.__MODEL_MANIFEST = m; try { localStorage.removeItem('panelMin'); } catch (e) {} }, manifest);
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => document.getElementById('ldEnter')?.disabled === false && MODELS_READY, null, { timeout: 120000 });
    await page.evaluate(() => document.getElementById('ldEnter').click());
    const report = await page.evaluate(() => { setQuality('fast'); for (const p of document.querySelectorAll('#top,#levels,#hud')) p.classList.add('min'); return modelReport(); });
    const outDir = path.join(root, 'test-results/models'); fs.mkdirSync(outDir, { recursive: true });
    const settle = () => page.waitForFunction(() => !CT && !PT && !ST.pending && !Object.keys(FTW).length && CLIPT.t >= CLIPT.dur, null, { timeout: 180000 }).then(() => page.waitForTimeout(700));
    for (const r of report) {
      await page.evaluate(r => { ST.level = r.place.lv; setView('plan'); }, r); await settle();
      await page.evaluate(r => { const f = r.footprint_ft; PLN.x = r.place.x; PLN.z = r.place.z; PLN.span = Math.max(f.x1 - f.x0, f.z1 - f.z0) * 2.5 + 10; dirty = true; }, r); await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(outDir, r.id + '-plan.png') });
      await page.evaluate(r => { setView('three'); }, r); await settle();
      await page.evaluate(r => { ORB.t.set(r.place.x, r.place.floorY + 1.5, r.place.z); ORB.d = 34; ORB.ph = .95; dirty = true; }, r); await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(outDir, r.id + '-3d.png') });
    }
    const f1 = v => (v === undefined || v === null) ? '—' : (Math.round(v * 10) / 10).toFixed(1);
    for (const r of report) {
      console.log(`\n${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  (${r.name}, ${r.file})`);
      console.log(`  scale     ${r.scale}; ${r.ftPerUnit} ft per model unit`);
      if (r.spec_in) for (const [k, n] of [['w', 'width '], ['d', 'depth '], ['h', 'height']]) console.log(`  ${n}    model ${f1(r.dims_in[k])}"   product ${f1(r.spec_in[k])}"   ${r.diff_in[k] >= 0 ? '+' : ''}${f1(r.diff_in[k])}"`);
      else console.log(`  size      ${f1(r.dims_in.w)}" W x ${f1(r.dims_in.d)}" D x ${f1(r.dims_in.h)}" H (no product spec)`);
      console.log(`  placed    level ${r.place.lv}, ${r.room || 'no room'}, centre x ${r.place.x} z ${r.place.z}, turned ${r.place.ryDeg}°, floor y ${r.place.floorY}`);
      console.log(`  plan      x ${f1(r.footprint_ft.x0)} to ${f1(r.footprint_ft.x1)}, z ${f1(r.footprint_ft.z0)} to ${f1(r.footprint_ft.z1)} ft; nearest wall ${r.nearestWall_in === null ? '—' : f1(r.nearestWall_in) + '"'}`);
      if (r.replaces) console.log(`  replaces  ${r.replaces.name}: was ${f1(r.replaces.old_in.w)} x ${f1(r.replaces.old_in.d)} x ${f1(r.replaces.old_in.h)}", now ${f1(r.replaces.new_in.w)} x ${f1(r.replaces.new_in.d)} x ${f1(r.replaces.new_in.h)}" (x by z by height)`);
      for (const i of r.issues) console.log('  ✗ ' + i);
      for (const n of r.notes) console.log('  • ' + n);
      console.log(`  images    test-results/models/${r.id}-plan.png, ${r.id}-3d.png`);
    }
    if (errors.length) console.log('\nPage messages:\n  ' + errors.join('\n  '));
    if (report.length < manifest.models.length) console.log(`\n${manifest.models.length - report.length} model(s) failed to load; see the page messages above.`);
    process.exitCode = report.every(r => r.ok) && report.length === manifest.models.length ? 0 : 1;
  } finally { if (browser) await browser.close(); server.kill(); }
}
