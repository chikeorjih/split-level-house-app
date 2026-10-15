// Smoke tests: the scene builds without errors, the walking routes still connect every level,
// Debug IDs point at the right source lines, and the single-file build works.
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

async function openApp(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => document.getElementById('loading')?.style.display === 'none', null, { timeout: 90_000 });
  return errors;
}

test('scene builds without errors', async ({ page }) => {
  const errors = await openApp(page);
  expect(errors).toEqual([]);
  const stats = await page.evaluate(() => ({ elements: REG.size, furniture: INSTS.length, walls: SPEC.walls.length, err: document.getElementById('err').textContent }));
  expect(stats.err).toBe('');
  expect(stats.elements).toBeGreaterThan(300);
  expect(stats.furniture).toBeGreaterThan(50);
});

const routes = [
  // name, start, heading (radians), distance (ft), expected room substring
  ['front porch into the house', { x: 22.3, z: 34.0, lv: 3, out: true }, 0, 12, 'main level'],
  ['main level down to the family room', { x: 21.5, z: 13.9, lv: 3 }, Math.PI / 2, 14, 'Family room'],
  ['family room down to the lower level', { x: 11, z: 17.7, lv: 2 }, -Math.PI / 2, 16.5, 'lower level'],
  ['main level up to the bedrooms', { x: 22, z: 17.7, lv: 3 }, Math.PI / 2, 9.5, 'bedroom level'],
  ['family room through the new door to the addition', { x: 5, z: 15.8, lv: 2 }, Math.PI / 2, 9, '(new)'],
  ['dining room out the slider to the new deck', { x: 40, z: 3.2, lv: 3 }, -Math.PI / 2, 10, 'New deck'],
  ['new deck down the stair to the lower deck', { x: 45.5, z: -2.0, lv: 3, out: true }, Math.PI / 2, 20, 'Deck'],
];
for (const [name, start, yaw, dist, expectWhere] of routes) {
  test(`walk: ${name}`, async ({ page }) => {
    await openApp(page);
    const where = await page.evaluate(({ start, yaw, dist }) => {
      ST.view = 'walk'; teleport({ ...start, yaw }); WLK.yaw = yaw; KEYS.KeyW = true;
      for (let t = 0; t < dist / 6.5 + 1.5; t += 1 / 60) stepWalk(1 / 60);
      KEYS.KeyW = false; for (let i = 0; i < 60; i++) stepWalk(1 / 60);
      return whereText();
    }, { start, yaw, dist });
    expect(where).toContain(expectWhere);
  });
}

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
  expect(html).toContain('three.js/r128/three.min.js');
  expect(html).not.toContain('src="src/');
  expect(html.split('\n')[5].startsWith('<title>')).toBeTruthy();
});
