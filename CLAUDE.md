# CLAUDE.md

Guidance for Claude Code when working in this repository.

**Start with `docs/CONTEXT.md`:** it holds the work in progress, the owner's recent decisions and a log of recent changes. Keep it updated as you work.

## What this is

An interactive 3D walkthrough of a real split-level house in St. Louis, plus two planned projects: a four-seasons room and primary suite addition on the west side, and a new deck off the dining room. It runs in the browser on three.js **r186** (branch `webgpu-migration`; `main` is still on r128) with no framework and no bundler, on the WebGPU renderer where the browser supports it and WebGL otherwise. It has three views (Walk, ¾ cutaway, Floor plan), a high-quality render pipeline, a path-traced quality on WebGPU, a Debug IDs mode and an Arrange mode for furniture.

## Commands

- `npm install`: installs three 0.186.1 and Playwright, and copies three's module builds (WebGL and WebGPU) and the add-ons the app imports into `vendor/three/`, so the app works offline.
- `npm run dev`: serves the app at http://localhost:5173 with live reload. Saving any file in `src/`, `assets/` or `index.html` reloads the page.
- `npm test`: Playwright smoke tests (scene builds, walking routes, Debug ID line mapping, single-file build). Run this after every change.
- `npm run build`: writes `dist/house-walkthrough.html`, a single self-contained file for publishing as a claude.ai artifact. It embeds the `.glb` models listed in `assets/models/manifest.json`.
- `npm run sketchfab -- search|info|download …` and `npm run model:check`: find, download and size-check imported furniture models. The `import-model` skill (`.claude/skills/import-model`) is the workflow.
- `npm run model:shot -- --name "<piece name>" [--hq|--ultra] [--in-place]`: renders one furniture piece alone (four views in one sheet, size and triangle count) to `test-results/shots/`. The `model-object` skill (`.claude/skills/model-object`) is the two-pass workflow for modelling an object from scratch.

## Architecture: read this before editing

- **Plain classic scripts sharing one global scope.** `index.html` lists `src/00-boot.js` … `src/16-tour.js` as `<script type="text/x-app" src>` tags. The module `src/three-boot.mjs` imports three.js through the import map in `index.html`, picks the renderer, exposes three as the global `THREE`, and then loads those scripts in order and starts the app. A new source file needs its own `text/x-app` tag (the single-file build finds them by it). Top-level `const`/`let`/`function` declarations are visible across files. Do **not** convert files to ES modules or add `import` statements unless you are deliberately migrating the whole project. Load order matters only for top-level code that runs immediately; functions are called later from `start()` in `12-app.js`.
- **three.js r186, used as the global `THREE`.** `src/three-boot.mjs` keeps the look the app was tuned for under r128: `ColorManagement` is off (hex colours are used as given), and the shader chunks are patched back to r128's legacy light units (direct, hemisphere and ambient light x PI, and the old smooth distance falloff for point and spot lights) and its alpha-to-coverage. Textures use `colorSpace = THREE.SRGBColorSpace`. Material patches hook the r186 chunk names (`opaque_fragment`, `colorspace_fragment`; map UVs are `vMapUv`). Outdoor materials take the sky map explicitly (a material that falls back to `scene.environment` ignores its `envMapIntensity`). New add-ons go through the import map (`three/addons/...`) in `three-boot.mjs`, and `scripts/vendor-three.mjs` must copy them.
- **Units and axes.** Feet. `x` increases toward the northeast lot line (call it east); `z` increases toward Dunwoody Drive (south-east, "toward the street"); `y` is up. Floor elevations live in `E` in `02-spec.js`: lower level `E[1]=-13.5`, family-room level `E[2]=-4.5`, main level `E[3]=0`, bedroom level `E[4]=4.5`. Ceilings are in `CEIL`.
- **Tags drive visibility.** Every piece of geometry has a tag: `'1'`–`'4'` (level), `'S'` (stair core and shared walls), `'X'` (foundations, chimney), `'roof'`, `'C1'`–`'C4'` (ceilings), `'site'`, `'trees'`, `'grass'`, `'frontOpen'`/`'frontClosed'` (front doors). `setVis()` and `fadeTarget()` in `12-app.js` decide what each view shows; cutaways fade other levels and slide the clipping plane `CLIP_TOP`.
- **Two house states.** The top bar's Current / Addition switch (`setHouseState()` in `12-app.js`, `HOUSE.ph` `'c'` or `'a'`, kept in localStorage and `?state=current`). Anything built while `PH` is set (`PH='a'; … PH=null;` or `phase('c',()=>…)`) belongs to that state only: its tag gets a suffix (`'2+'` addition only, `'2-'` current only; `tagBase()` strips it), and the collision boxes, walkable tops, plan pieces, doors, caps, lamps and rooms recorded meanwhile carry `.ph`. A wall with `cur:{…}` is built once per state, the `cur` fields overriding for Current. `isNew` walls and rooms are addition only. `SPEC.rooms` lists the shown state's rooms; `SPEC.allRooms` both. **The addition has two floor plans** (`HOUSE.plan` '1' suite, '2' office; `setHousePlan()`, the Suite plan / Office plan switch, `?plan=`): `.ph` can also be '1', '2' (that plan only) or 'c1' (current and plan 1: the family-room level's existing bedroom, the primary bath in plan 2), with tags ending `@1`, `@2`, `@c1`; `phKey()` is the shown state and `phIn(p,k)` tests one. A wall with `p2:{…}` is built once for plan 1 and once for plan 2. The switch wipes the house down and back up on `CLIP_PH`, a clip plane every house material has (site materials use `CLIPS_SITE` without it).
- **Merged buckets.** For speed, architectural geometry is merged per tag and material (`box()`, `addGeo()`, `quadSlab()` in `05-geometry.js`). Meshes are created from the buckets in `buildScene()`.
- **Furniture instances.** Each `T(tag, x, y, z, ry, 'name')` call in `07-furniture.js` creates one movable piece: its own `THREE.Group` pivoting on its footprint centre, with its own collision boxes and any lamp light. Arrange mode moves these groups. Things built with `P(...)` instead of `T(...)` (wall art, curtains, fixed decor) are not movable.
- **Walls come from data.** `W({...})` entries in `02-spec.js` describe each wall segment, its openings (`win`, `door`, `slide`, `garage`, `open`, …) and its cladding (`ext:{side, mat}`). `wallBuild()` turns them into geometry, collisions, trim and the plan poché.
- **Materials.** All in the `MAT` object (`03-textures.js`, `04-textures-living.js`). Textures are generated on canvases at start-up; `addRelief()` derives normal maps from them. Architectural surfaces use world-space UVs in feet. Furniture uses per-face 0–1 UVs.
- **Two renderers.** `three-boot.mjs` picks WebGPU (`three/webgpu`, `window.GPU` true) when the browser hands out a WebGPU adapter, else WebGL; `?renderer=webgl|webgpu|auto` or the Renderer menu (localStorage) overrides it. Under WebGPU every material is a node material: GLSL `onBeforeCompile` patches do nothing there, so each patch also has a node version (`npAdd` in `02b-nodes.js`), the pipeline's passes are TSL (`08b-gpu-passes.js`, `08c-gpu-ultra.js`, built by `SMG()` with the same uniform names as the GLSL ones), and clipping planes become a `maskNode`. WebGPU traps found so far are listed in `docs/webgpu-migration-plan.md` (run log); the worst: a pass's texture inputs are bound when it first compiles, so two inputs must never hold the same texture then, and a pass output cannot go negative.
- **Rendering.** `09-look-pipeline.js` holds the sky shader, the five light presets, and the high-quality pipeline: scene → AO → bloom → composite → accumulation → tone map. It needs WebGL 2 (or WebGPU) and falls back to `renderFast()` automatically.
- **Path tracing.** `15-pathtrace.js`: the "Path" quality (WebGPU only) is Ultra plus three-gpu-pathtracer, which traces a copy of the visible scene once the camera rests (sun as a soft spot light, lamps as point lights, the sky shader unwrapped to an equirect map), then an edge-aware denoiser guided by Ultra's normal and albedo passes, an exposure matched to the raster image, and the same output pass. The copy is rebuilt only when what is shown changes; light changes swap lights and sky, and Arrange moves update transforms.
- **Imported models.** `13-models.js` loads the models in `assets/models/manifest.json` after start-up. It scales each to its product `spec` (inches), places it on its level's floor, and hides the named `T(...)` piece it `replaces`. `modelReport()` checks its size and fit. Model materials go into `MAT` as `model:<id>:<n>`, so lighting presets reach them. Give any `T(...)` piece a model might replace a name.
- **Photo for Gemini.** `14-photo.js`: a walk-view button that re-shoots the view (24 mm, level camera with lens shift, no depth of field) at 2048 x 1365 with the full Ultra pipeline, copies the PNG and writes "shot notes". The matching Gemini skill is `docs/gemini-skill/house-photoreal/SKILL.md`.
- **Tour.** `16-tour.js`: the top bar's Tour button plays a 90 s flythrough. `TOUR_SEGS` lists its parts (view, light preset, house state, cut levels, then camera keys: position, look-at point, flight and rest times, caption, an action such as the Addition wipe); each part is set up behind a fade to black. `frame()` in `12-app.js` calls `tourStep()`, and walking (with its collisions) is off while it plays. To change a shot, edit its key.
- **Collisions and walking.** `COLS` (boxes) and `WALKS` (floor and stair-tread tops) in `05-geometry.js`, used by `stepWalk()` in `12-app.js`.

## Working from a Debug ID

The user will often paste something like:

`FU1 (shag rug, family room level) at src/07-furniture.js line 177:12 — {const p=T('2',8.0,…`

Go straight to that file, line and column; the snippet confirms you are in the right place. ID prefixes: `W` walls (`W46.1` is the first opening in wall W46), `F` floors, `C` ceilings, `FU` furniture, `R` roofs and dormers, `ST` stairs and railings, `X` other parts. IDs are assigned in build order, so they can change after edits. Line numbers always reflect the current files.

Debug mode's **Delete** button removes an element for good. Under `npm run dev`, the dev server deletes the build statement from `src/` (`scripts/src-edit.mjs`), or for an opening, its entry in the wall's `ops` list. The deletion is syntax-checked and can be undone once from the page. A request like "Please delete FU21 …" means the user wasn't on the dev server: remove that piece's code yourself.

Arrange mode's "Copy move for Claude" gives a move in feet along x and z and a rotation in degrees, counterclockwise in plan, around the piece's footprint centre. To bake it in, adjust that `T(...)` call's position (and its `ry`, or the coordinates inside it) so the piece lands there. The user can then press "Reset all" in Arrange mode, since saved moves live in their browser's localStorage.

## Conventions

- Keep the dense one-line style already used in each file. Keep changes surgical.
- New furniture: build it with `T(...)` and give it a name (6th argument) so Debug IDs and Arrange show something readable.
- New materials: add them to `MAT`. If the material is used outdoors, add its key to `EXT_MATS` in `09-look-pipeline.js` so it reflects the sky rather than the interior room environment.
- Keep `<title>` on line 6 of `index.html`. The single-file build uses it to map Debug ID line numbers.
- After changing the house shape, re-run `npm test`. The walking-route tests catch blocked doorways and broken stairs.

## Reference material

`assets/reference/` holds the floor plans, the addition and deck concept plans, the listing photos, the street-view concept and the family-room style photo. `docs/model-notes.md` records modelling assumptions and open questions.
