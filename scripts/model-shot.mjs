// Renders one furniture piece by itself, for the model-object skill: a single contact sheet with front, side, top and 3/4 views on a
// neutral studio floor with a 1 ft grid and a 6 ft scale figure, plus its measured size and triangle count.
//   node scripts/model-shot.mjs --name "club chair"        a T() piece by its name (6th T() argument)
//   node scripts/model-shot.mjs --id FU12                  a T() piece by Debug ID
//   node scripts/model-shot.mjs --model living-sofa        an imported model by manifest id
//   add --hq (or --ultra) for a close High quality (or Ultra) 3/4 render too, and --in-place to make that render in the room
//   (its level cut open) instead of in the studio. Images go to test-results/shots/.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i < 0 ? undefined : args[i + 1]; }, has = n => args.includes('--' + n);
const sel = { name: opt('name'), id: opt('id'), model: opt('model') };
if (!sel.name && !sel.id && !sel.model) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 8).join('\n')); process.exit(1); }
const quality = has('ultra') ? 'ultra' : has('hq') ? 'high' : null, inPlace = has('in-place');
const slug = (sel.name || sel.id || sel.model).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const outDir = path.join(root, 'test-results/shots'); fs.mkdirSync(outDir, { recursive: true });

const port = 5179, server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), '--port', String(port), '--no-reload'], { stdio: 'ignore' });
let browser;
try {
  for (let i = 0; ; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch (e) {} if (i > 50) throw new Error('dev server did not start'); await new Promise(r => setTimeout(r, 200)); }
  // --gpu: the installed Chrome on the real GPU (much faster where SwiftShader takes minutes to start the app), still on WebGL
  browser = has('gpu') ? await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--enable-gpu'] })
    : await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { try { localStorage.removeItem('house-arrange-v1'); localStorage.removeItem('panelMin'); } catch (e) {} });
  await page.goto(`http://localhost:${port}/` + (has('gpu') ? '?renderer=webgl' : ''));
  await page.waitForFunction(() => document.getElementById('ldEnter')?.disabled === false && MODELS_READY, null, { timeout: 180000 });
  await page.evaluate(() => document.getElementById('ldEnter').click());

  // find the piece, measure it in its own frame, isolate it in a studio and draw the four views into one sheet
  const res = await page.evaluate(sel => {
    setQuality('fast'); for (const p of document.querySelectorAll('#top,#levels,#hud')) p.classList.add('min');
    ST.levels = []; ST.level = 'all'; setView('three'); setVis(true);
    let inst = null;
    if (sel.model) inst = INSTS.find(i => i.isModel && i.model.m.id === sel.model);
    else if (sel.id) { const e = [...REG.values()].find(e => e.id === sel.id); inst = e && INSTS.find(i => i.okey === e.key); }
    else inst = INSTS.find(i => { const e = REG.get(i.okey); return e && e.label === sel.name; });
    if (!inst || !inst.group) return { error: 'not found', names: INSTS.map(i => i.isModel ? 'model ' + i.model.m.id : (REG.get(i.okey) || {}).label).filter(Boolean) };
    const g = inst.group, f = (inst.isModel ? inst.rybase : inst.ry0) + inst.ry, cf = Math.cos(f), sf = Math.sin(f), P0 = new THREE.Vector3(inst.pivot0.x + inst.dx, inst.pivot0.y, inst.pivot0.z + inst.dz);
    // local frame: undo the piece's turn about its pivot (x across the width, z front-back, +z its front)
    g.updateMatrixWorld(true);let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], tris = 0;const v = new THREE.Vector3();
    g.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position; tris += (o.geometry.index ? o.geometry.index.count : pa.count) / 3;
      for (let k = 0; k < pa.count; k += Math.max(1, Math.floor(pa.count / 20000))) { v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld).sub(P0);
        const L = [v.x * cf - v.z * sf, v.y, v.x * sf + v.z * cf]; for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], L[a]); mx[a] = Math.max(mx[a], L[a]); } } });
    const W = mx[0] - mn[0], H = mx[1] - mn[1], D = mx[2] - mn[2], lc = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    const toW = (x, y, z) => new THREE.Vector3(x * cf + z * sf, y, -x * sf + z * cf);
    const C = P0.clone().add(toW(lc[0], lc[1], lc[2])), R = Math.hypot(W, H, D) / 2, floorY = P0.y + mn[1];
    // studio: hide every other drawable, add floor, grid and a 6 ft figure
    const hidden = [], under = o => { for (let q = o; q; q = q.parent) if (q === g) return true; return false; };
    scene.traverse(o => { if ((o.isMesh || o.isLine || o.isPoints || o.isSprite) && o.visible && !under(o)) { o.visible = false; hidden.push(o); } });
    const studio = new THREE.Group(), side = toW(1, 0, 0), sz = Math.ceil(R * 2 + 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xd9d7d2, roughness: .95 })); floor.rotation.x = -Math.PI / 2; floor.position.set(C.x, floorY - .002, C.z); floor.receiveShadow = true;
    const grid = new THREE.GridHelper(sz, sz, 0xb3b0aa, 0xc6c3bd); grid.position.set(C.x, floorY + .003, C.z); grid.rotation.y = f;
    const figM = new THREE.MeshStandardMaterial({ color: 0x8f969c, roughness: .8 }), fig = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 5.2, 16), figM); body.position.y = 2.6; const head = new THREE.Mesh(new THREE.SphereGeometry(.33, 16, 12), figM); head.position.y = 5.6;
    fig.add(body, head); fig.position.copy(C).addScaledVector(side, -(W / 2 + 1.4)).add(toW(0, 0, -(D / 2 + 1.4))); fig.position.y = floorY;
    studio.add(floor, grid, fig); scene.add(studio);
    const bg0 = scene.background, fog0 = scene.fog; scene.background = new THREE.Color(0xe9e7e2); scene.fog = null;
    // sun shadow fitted to the piece
    const sp0 = sun.position.clone(), st0 = sun.target.position.clone(), sc = sun.shadow.camera, sc0 = [sc.left, sc.right, sc.top, sc.bottom, sc.near, sc.far];
    sun.target.position.copy(C); sun.position.copy(C).addScaledVector(LOOK.sunDir, 80); sun.target.updateMatrixWorld();
    Object.assign(sc, { left: -R * 2.2, right: R * 2.2, top: R * 2.2, bottom: -R * 2.2, near: 1, far: 200 }); sc.updateProjectionMatrix(); renderer.shadowMap.needsUpdate = true;
    window.__SHOT = { hidden, studio, bg0, fog0, sp0, st0, sc0, C, R, f, toW };
    // the four views, drawn into quadrants of the canvas and read back at once
    const cv0 = renderer.domElement, cw = cv0.clientWidth, ch = cv0.clientHeight, cam = new THREE.PerspectiveCamera(30, (cw / 2) / (ch / 2), .1, 500), dist = R / Math.sin(15 * Math.PI / 180) * 1.02;
    const views = [['Front', toW(0, .18, 1)], ['Side', toW(1, .18, 0)], ['Top', toW(0, 1, .002)], ['3/4', toW(.75, .5, .9)]];
    const P = PRESETS[LOOK.preset]; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = P.exp; renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    views.forEach(([n, d], k) => { const x = (k % 2) * cw / 2, y = (k < 2 ? ch / 2 : 0); renderer.setViewport(x, y, cw / 2, ch / 2); renderer.setScissor(x, y, cw / 2, ch / 2);
      cam.position.copy(C).addScaledVector(d.normalize(), dist); cam.up.set(0, 1, 0); if (n === 'Top') cam.up.copy(toW(0, 0, -1)); cam.lookAt(C); cam.updateMatrixWorld(); renderer.render(scene, cam); });
    renderer.setScissorTest(false); renderer.setViewport(0, 0, cw, ch);
    const o2 = document.createElement('canvas'); o2.width = cv0.width; o2.height = cv0.height; const g2 = o2.getContext('2d'); g2.drawImage(cv0, 0, 0);
    const s = cv0.width / cw; g2.font = `${13 * s}px system-ui`; g2.fillStyle = 'rgba(40,40,40,.85)';
    views.forEach(([n], k) => g2.fillText(n, ((k % 2) * cw / 2 + 10) * s, ((k < 2 ? 0 : ch / 2) + 20) * s));
    const fmt = v => (v * 12).toFixed(1) + '"';
    g2.fillText(`${W ? fmt(W) : '?'} W x ${fmt(D)} D x ${fmt(H)} H   ${Math.round(tris).toLocaleString()} triangles   grid 1 ft, figure 6 ft`, 10 * s, (ch - 10) * s);
    PIPE.n = PIPE.max; dirty = false;
    const e = REG.get(inst.okey);
    return { png: o2.toDataURL('image/png'), label: inst.isModel ? 'model ' + inst.model.m.id : (e ? e.id + ' ' + (e.label || '') : '?'), lv: /^[1-4]$/.test(inst.tag) ? +inst.tag : 3,
      W: W * 12, D: D * 12, H: H * 12, tris: Math.round(tris), floorY, loc: e && e.loc ? `${e.loc.file}:${e.loc.line}` : null };
  }, sel);
  if (res.error) { console.log(`No piece found for ${JSON.stringify(sel)}. Named pieces:\n  ` + res.names.join('\n  ')); process.exitCode = 1; }
  else {
    const sheet = path.join(outDir, slug + '-sheet.png'); fs.writeFileSync(sheet, Buffer.from(res.png.split(',')[1], 'base64'));
    console.log(`${res.label}${res.loc ? '  (' + res.loc + ')' : ''}\n  size      ${res.W.toFixed(1)}" W x ${res.D.toFixed(1)}" D x ${res.H.toFixed(1)}" H  (W across, D front to back, as built)`);
    console.log(`  triangles ${res.tris.toLocaleString()}${res.tris > 20000 ? '  (over the ~20k budget)' : ''}\n  sheet     ${path.relative(root, sheet)}`);
    if (quality) {
      // a close 3/4 render through the real pipeline: in the studio, or in place with its level cut open
      await page.evaluate(([q, inPlace, lv]) => { const S = window.__SHOT;
        if (inPlace) { for (const o of S.hidden) o.visible = true; S.studio.parent.remove(S.studio); scene.background = S.bg0; scene.fog = S.fog0; sun.position.copy(S.sp0); sun.target.position.copy(S.st0); sun.target.updateMatrixWorld();
          const sc = sun.shadow.camera; [sc.left, sc.right, sc.top, sc.bottom, sc.near, sc.far] = S.sc0; sc.updateProjectionMatrix(); ST.levels = [lv]; ST.level = lv; setVis(true); }
        LOOK.dof = 0; setQuality(q); PIPE.max = q === 'ultra' ? 64 : 40;
        const d = S.toW(.75, .45, .9).normalize(); ORB.t.copy(S.C); ORB.th = Math.atan2(d.x, d.z); ORB.ph = Math.acos(d.y); ORB.fov = 30; ORB.d = S.R / Math.sin(15 * Math.PI / 180) * .8;
        renderer.shadowMap.needsUpdate = true; dirty = true; }, [quality, inPlace, res.lv]);
      await page.waitForTimeout(400);
      await page.waitForFunction(() => PIPE.n >= PIPE.max - 1, null, { timeout: 900000 });
      const hq = path.join(outDir, slug + '-' + quality + (inPlace ? '-in-place' : '') + '.png'); await page.screenshot({ path: hq });
      console.log(`  ${quality.padEnd(9)} ${path.relative(root, hq)}`);
    }
  }
  if (errors.length) console.log('Page errors:\n  ' + errors.join('\n  '));
} finally { if (browser) await browser.close(); server.kill(); }
