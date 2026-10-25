// Smoke tests: the scene builds without errors, the walking routes still connect every level,
// Debug IDs point at the right source lines, and the single-file build works.
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

async function openApp(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  // the loading screen's guide stays up until "Enter the house", which opens once the first view is drawn
  await page.waitForFunction(() => document.getElementById('ldEnter')?.disabled === false, null, { timeout: 90_000 });
  await page.evaluate(() => document.getElementById('ldEnter').click());
  await page.waitForFunction(() => document.getElementById('loading')?.style.display === 'none', null, { timeout: 60_000 });   // (it hides on a short timer, slow under software rendering)
  return errors;
}

test('scene builds without errors', async ({ page }) => {
  const errors = await openApp(page);
  expect(errors).toEqual([]);
  const stats = await page.evaluate(() => ({ elements: REG.size, furniture: INSTS.length, walls: SPEC.walls.length, err: document.getElementById('err').textContent }));
  expect(stats.err).toBe('');
  expect(stats.elements).toBeGreaterThan(300);
  expect(stats.furniture).toBeGreaterThan(40);   // 47 pieces after the owner's removals (was > 50)
});

test('the loading screen shows the guide, names each start-up stage, and opens on Enter the house', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading .ld-load')).toContainText('Getting the house ready');
  await expect(page.locator('#loading .ld-guide')).toContainText('Controls');
  await expect(page.locator('#loading .ld-ctl[data-for="mouse"]')).toBeVisible();   // the test browser has a mouse
  await page.waitForFunction(() => document.getElementById('ldEnter')?.disabled === false, null, { timeout: 90_000 });
  const stages = await page.evaluate(() => [...document.querySelectorAll('.ld-stages li')].map(l => l.dataset.k + ':' + l.classList.contains('ok')));
  for (const k of ['engine', 'house', 'shaders']) expect(stages).toContain(k + ':true');
  await page.click('#ldEnter');
  await page.waitForFunction(() => document.getElementById('loading').style.display === 'none', null, { timeout: 60_000 });
});

test('on a phone the panels live in a bottom sheet with tabs', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = await openApp(page);
  expect(errors).toEqual([]);
  const lay = await page.evaluate(() => ({ phone: document.documentElement.classList.contains('phone'), sheet: !document.getElementById('sheet').hidden,
    top: getComputedStyle(document.getElementById('top')).display, levelsIn: !!document.querySelector('#sheet .sh-pane #levels'), lookIn: !!document.querySelector('#sheet .sh-pane .barend') }));
  expect(lay).toEqual({ phone: true, sheet: true, top: 'none', levelsIn: true, lookIn: true });
  // a tab opens the sheet on its pane, and again closes it; a level button inside works as before
  await page.tap('.sh-tabs button[data-pane="levels"]');
  await expect(page.locator('#sheet')).toHaveClass(/open/);
  await page.tap('#sheet .lvl[data-lv="1"]');
  await page.waitForFunction(() => ST.levels.includes(1));
  await page.tap('.sh-tabs button[data-pane="levels"]');
  await expect(page.locator('#sheet')).not.toHaveClass(/open/);
  // the move pad sits above the sheet in Walk view
  await page.evaluate(() => setView('walk'));
  const gap = await page.evaluate(() => document.getElementById('sheet').getBoundingClientRect().top - document.getElementById('joy').getBoundingClientRect().bottom);
  expect(gap).toBeGreaterThan(0);
  await ctx.close();
});

const routes = [
  // name, start, heading (radians), distance (ft), expected room substring[, house state: 'c' = as it stands]
  ['front porch into the house', { x: 22.3, z: 34.0, lv: 3, out: true }, 0, 12, 'main level'],
  ['main level down to the family room', { x: 21.5, z: 13.9, lv: 3 }, Math.PI / 2, 14, 'Family room'],
  ['family room down to the lower level', { x: 11, z: 17.7, lv: 2 }, -Math.PI / 2, 16.5, 'lower level'],
  ['main level up to the bedrooms', { x: 22, z: 17.7, lv: 3 }, Math.PI / 2, 9.5, 'bedroom level'],
  ['family room through the new door to the addition', { x: 5, z: 15.8, lv: 2 }, Math.PI / 2, 9, '(new)'],
  ['dining room out the slider to the new deck', { x: 40, z: 3.2, lv: 3 }, -Math.PI / 2, 10, 'New deck'],
  ['new deck down the stair to the lower deck', { x: 45.5, z: -2.0, lv: 3, out: true }, Math.PI / 2, 20, 'Deck'],
  ['as it stands: family room out onto the balcony', { x: 5, z: 4.4, lv: 2 }, Math.PI / 2, 9, 'Balcony', 'c'],
  ['as it stands: lower hall through the double doors to the sitting room', { x: 24, z: 15.5, lv: 1 }, 0, 6, 'Sitting room', 'c'],
  ['as it stands: lower hall into the closet', { x: 26, z: 14.6, lv: 1 }, -Math.PI / 2, 4, 'Closet', 'c'],
];
for (const [name, start, yaw, dist, expectWhere, state] of routes) {
  test(`walk: ${name}`, async ({ page }) => {
    await openApp(page);
    const where = await page.evaluate(({ start, yaw, dist, state }) => {
      if (state) { setHouseState(state); setHouseState(state); }   // (the second call finishes the wipe)
      ST.view = 'walk'; teleport({ ...start, yaw }); WLK.yaw = yaw; KEYS.KeyW = true;
      for (let t = 0; t < dist / 6.5 + 1.5; t += 1 / 60) stepWalk(1 / 60);
      KEYS.KeyW = false; for (let i = 0; i < 60; i++) stepWalk(1 / 60);
      return whereText();
    }, { start, yaw, dist, state });
    expect(where).toContain(expectWhere);
  });
}

test('the Current / Addition switch shows one state at a time', async ({ page }) => {
  const errors = await openApp(page);
  const seen = await page.evaluate(() => {
    const shown = () => { const o = { a: 0, c: 0 }; for (const t in TAGS) { const p = tagPh(t); if (p) o[p] += meshesOf(t).filter(m => m.visible).length; } return o; };
    const a = shown(), roomsA = SPEC.rooms.map(r => r.name);
    document.querySelector('button[data-state="c"]').click(); setHouseState('c');
    const c = shown(), roomsC = SPEC.rooms.map(r => r.name), pressed = document.querySelector('button[data-state="c"]').getAttribute('aria-pressed');
    return { a, c, pressed, stored: localStorage.getItem('houseState'), suiteA: roomsA.includes('Four-seasons room'), suiteC: roomsC.includes('Four-seasons room'), balconyC: roomsC.includes('Balcony') };
  });
  expect(errors).toEqual([]);
  expect(seen.a.a).toBeGreaterThan(0); expect(seen.a.c).toBe(0);
  expect(seen.c.c).toBeGreaterThan(0); expect(seen.c.a).toBe(0);
  expect(seen).toMatchObject({ pressed: 'true', stored: 'current', suiteA: true, suiteC: false, balconyC: true });
});

test('Debug IDs point at the code that builds each element', async ({ page }) => {
  await openApp(page);
  const refs = await page.evaluate(() => [...REG.values()].filter(e => e.loc && ['wall', 'floor', 'ceiling', 'furniture'].includes(e.kind))
    .map(e => ({ id: e.id, kind: e.kind, file: e.loc.file, line: e.loc.line, col: e.loc.col })));
  expect(refs.length).toBeGreaterThan(150);
  const want = { wall: 'W(', floor: 'F(', ceiling: 'C(', furniture: 'T(' };
  const cache = {};
  for (const r of refs) {
    expect(r.file.startsWith('src/')).toBeTruthy();
    cache[r.file] ??= fs.readFileSync(r.file, 'utf8').split('\n');
    const text = cache[r.file][r.line - 1].slice(r.col - 1, r.col + 1);
    expect(text, `${r.id} at ${r.file}:${r.line}:${r.col}`).toBe(want[r.kind]);
  }
});

test('single-file build works', async ({ page }) => {
  execSync('node scripts/build.mjs');
  const html = fs.readFileSync('dist/house-walkthrough.html', 'utf8');
  expect(html).toContain('cdn.jsdelivr.net/npm/three@');
  expect(html).toContain('id="app-src"');
  expect(html).not.toContain('src="src/');
  expect(html.split('\n')[5].startsWith('<title>')).toBeTruthy();
});

test('imported models are scaled to their product size, placed, and checked', async ({ page }) => {
  // the fixture is a plain 84" x 38" x 34" box in metres, placed against the living room's west wall
  await page.addInitScript(() => { window.__MODEL_MANIFEST = { models: [{ id: 'fixture', file: '../../tests/fixtures/box-84x38x34.glb',
    spec: { w: 84, d: 38, h: 34 }, place: { x: 16.05, z: 7, lv: 3, ry: 90 } }] }; });
  const errors = await openApp(page);
  await page.waitForFunction(() => MODELS_READY, null, { timeout: 60_000 });
  expect(errors).toEqual([]);
  const [r] = await page.evaluate(() => modelReport());
  expect(r.scale).toBe('true to scale in m');
  expect(r.issues).toEqual([]);
  expect(r.place).toMatchObject({ lv: 3, ryDeg: 90 });
  expect(r.room).toBe('Living room');
});

test('models in assets/models/manifest.json match their product dimensions and fit the plan', async ({ page }) => {
  const man = fs.existsSync('assets/models/manifest.json') ? JSON.parse(fs.readFileSync('assets/models/manifest.json', 'utf8')) : { models: [] };
  test.skip(!(man.models || []).some(m => m.enabled !== false), 'no models in the manifest yet');
  test.setTimeout(240_000);   // (loading every model in the software-rendered test browser takes about two minutes)
  await openApp(page);
  // fast rendering: the test browser renders in software, where each high-quality frame takes seconds and starves the model loader
  await page.evaluate(() => setQuality('fast'));
  await page.waitForFunction(() => MODELS_READY, null, { timeout: 90_000 });
  const report = await page.evaluate(() => modelReport());
  expect(report.map(r => r.id).sort()).toEqual(man.models.filter(m => m.enabled !== false).map(m => m.id).sort());
  // a model sized by hand (an explicit scale in the manifest) has no product dimensions to check, by choice
  const manual = new Set(man.models.filter(m => m.scale !== undefined && !m.spec).map(m => m.id));
  for (const r of report) expect(r.issues.filter(i => !(manual.has(r.id) && /no product dimensions/.test(i))), `${r.id}: run npm run model:check -- ${r.id}`).toEqual([]);
});

test('Debug Delete removes exactly the code that builds an element', async () => {
  const { removeElement, removeOpening } = await import('../scripts/src-edit.mjs');
  const src = [
    'function buildFurniture(){',
    "  // dining",
    "  rug('3','rugDining',37.6,e3,5.4,10.2,7.6);",
    "  {const p=T('3',1,e3,2,0,'a');chair(p);} {const p=T('3',3,e3,4,0,'b');chair(p);}",
    "  for(const x of [1,2]){for(const z of [3,4]){const p=T('3',x,e3,z,0);stool(p);}}",
    "  table(T('3',5,e3,6,0),6.8,3.3);",
    "  W({lv:2,x0:0,z0:0,x1:14,z1:0,ops:[win(7,8,E2,1,7,5),door(2,3,E2)]});",
    '}'].join('\n');
  const col = (line, s) => src.split('\n')[line - 1].indexOf(s) + 1;
  expect(removeElement(src, 3, col(3, 'rug(')).text).not.toContain('rug(');
  expect(removeElement(src, 3, col(3, 'rug(')).text).toContain('// dining');
  const b = removeElement(src, 4, col(4, "T('3',3"));
  expect(b.removed).toBe("{const p=T('3',3,e3,4,0,'b');chair(p);}");
  expect(b.text.split('\n')[3]).toBe("  {const p=T('3',1,e3,2,0,'a');chair(p);}");
  expect(removeElement(src, 5, col(5, 'T(')).removed).toBe("for(const x of [1,2]){for(const z of [3,4]){const p=T('3',x,e3,z,0);stool(p);}}");
  expect(removeElement(src, 6, col(6, 'T(')).removed).toBe("table(T('3',5,e3,6,0),6.8,3.3);");
  expect(removeOpening(src, 7, col(7, 'W('), 1).text).toContain('ops:[win(7,8,E2,1,7,5)]');
  expect(removeOpening(src, 7, col(7, 'W('), 0).text).toContain('ops:[door(2,3,E2)]');
  expect(() => removeElement('const p=T(1);\nuse(p);', 1, 9)).toThrow(/outside a block/);
});
