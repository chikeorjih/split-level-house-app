# WebGPU migration plan

Status: **not started**. Saved 2026-10-19, for an unattended (overnight) run later.

## Goal

Move the walkthrough from three.js **r128 (WebGL only)** to a current three.js release with the **WebGPU renderer**, keeping a WebGL fallback. Then, optionally, add a path-traced Ultra mode.

A straight port won't look noticeably better. It makes Ultra faster: room-light builds should go from about 5 s to about 1 s, and the shader-compile stalls go away. The large jump in quality comes from phase 3 (path tracing).

## Ground rules for the run

- **Work on a branch:** `webgpu-migration`, created from `main`. Never commit to `main`. Never push and never deploy. The owner reviews the branch in the morning.
- **Commit at checkpoints:** commit at the end of each step below with a clear message, so a bad step can be reverted on its own.
- **Read `CLAUDE.md` first.** Its architecture notes describe the current code: classic scripts, tags, buckets, `T(...)` furniture, Debug IDs and Arrange mode. The upgrade changes the r128-only rules in it; update `CLAUDE.md` as you go.
- **Keep data files out of it:** `02-spec.js` (house data), `07-furniture.js` and `13-models.js` placement, and the manifests in `assets/`. Don't change those, except where an API rename forces it.
- **Run the tests:** `npm test` after each step, and `npm run build` at the end of each phase. Record failures you can't fix in the log below; don't hide them.
- **Check visual parity with screenshots.** Before starting, capture reference shots from `main`; the scratch scripts used so far were Playwright, `chromium.launch` with `--use-angle=d3d11`. Shots to capture:
  - **Walk view:** living room at golden hour, kitchen at "Evening, cozy", family room in the afternoon.
  - **¾ view:** whole house in the afternoon; Main + Addition cut open at "Evening, cozy".
  - **Floor plan:** one shot.
  - **Back of the house:** straight on.

  Capture each in Fast, High and Ultra. After each phase, re-shoot and compare side by side. Note differences in the log.
- **Stop rather than guess** if a step needs a design decision that isn't covered here. Write the question in the log and move on to the next independent step.

## Phase 1: upgrade three.js on WebGL (3–5 days of work)

1. **Update three.js and its loading**
   - Bump the `three` dependency to the current release.
   - Update `scripts/vendor-three.mjs` and how `index.html` loads three and `GLTFLoader`. Current three ships as ES modules only, so add a small module entry that puts `THREE` and `GLTFLoader` on `window`. Keep the `src/*.js` files as classic scripts unless that proves impossible.
   - Update `scripts/build.mjs` (the single-file build) to match. Keep `<title>` on line 6 of `index.html`.
2. **Mechanical API changes**
   - Rename the colour-space settings: `outputEncoding` → `outputColorSpace`, `sRGBEncoding` → `SRGBColorSpace`, and `texture.encoding` → `colorSpace` (in `03`, `04`, `08` and `12`).
   - Rename geometry merging: `BufferGeometryUtils.mergeBufferGeometries` → `mergeGeometries`, wherever `05-geometry.js` merges.
   - Update `WebGLCubeRenderTarget`/`CubeCamera` usage, the `DataTexture3D` naming, and `PMREMGenerator` (`makeEnvs`, `envMap()`).
   - Remove `renderer.debug.checkShaderErrors` handling only if it no longer applies.
3. **Lighting units.** Current three uses physically based light units by default.
   - **Retune:** all five presets in `PRESETS` (sun `si`, `hemi`, `sky`, `exp`, `envE`, `envI`), the lamp pool (`buildLamps`/`LAMPV` strengths and decay), the kitchen lights, `LIGHT_HQ` and `ULTRA.fill`.
   - **Method:** match brightness against the reference shots preset by preset.
4. **Rewrite every shader patch** (the shader chunk names and contents changed). Current list:
   - `03-textures.js`: `physify` (clear coats, copies `onBeforeCompile`) and `antiTile`.
   - `08-site.js`: `farPatch` (the diorama's far-tree discard) and the grass blades shader (`gBase` uniforms).
   - `12-app.js`:
     - `washOf`/`washPatch`/`calmPatch` (site wash in level presentation);
     - `fadeMat` (copies patches onto faded clones);
     - `buildPaper` (blueprint unroll, `uRev`).
   - `09-look-pipeline.js`: `giPatch` (room-light probes). It hooks `lights_fragment_maps` and uses `irradiance`/`iblIrradiance`, which changed the most.
   - Keep the shared-uniform design: patches share uniform objects, so changing a setting never recompiles.
5. **Full-screen passes.** Check `SM(...)` materials and `SKY_MAT` against GLSL3 and the new `ShaderMaterial` defaults:
   - The passes: `AO_MAT`, `BRIGHT_MAT`, `BLUR_MAT`, `COMP_MAT`, `OUT_MAT`, `GI_MAT`, `SSR_MAT`, `VOL_MAT`, `FOCUS_MAT`, `SHP_MAT` and `DIL_MAT`.
   - Also check depth-texture formats and half-float targets.
6. **Re-verify behaviour that relies on r128 internals:**
   - **Shadow layers:** the shadow pass uses the *main camera's* layers in r128, which is why `SHADOW_PROXY` uses invisible materials rather than a layer. Re-check how the new version picks shadow casters.
   - **Shader cache keys:** `customProgramCacheKey` usage.
   - **Prewarm:** `renderer.compile` with a stand-in scene. Current three has `compileAsync`; prefer it.
   - **Light counts:** whether the light count still forces recompiles (it drove the lamp-pool design).
7. **Checkpoint**
   - `npm test` passes.
   - The reference shots match in Fast, High and Ultra.
   - Debug IDs, Arrange (incl. Save to code), model loading and `npm run build` all work.
   - Commit: "Phase 1: three.js upgrade on WebGL".

## Phase 2: WebGPU renderer (1–2 weeks of work)

1. **Switch renderers.** Use `WebGPURenderer` with its automatic WebGL 2 fallback. Keep **Fast** working on the fallback.
2. **Port the shaders to TSL/node materials.**
   - **Material patches:** wash/calm, anti-tiling, far trees, grass, paper reveal, room-light probes, clear coats and the clipping-based diorama/cutaway.
   - **Sky:** the sky shader, including the studio backdrop (`st`, `stc`) and the plan "paper" blend (`pm`).
   - **The High/Ultra pipeline,** as a node post-processing chain:
     - AO (two radii), bloom, composite, accumulation with jitter and depth of field;
     - SSR, single-bounce SSGI (from the current frame only, never the accumulation: that fed back and blew out the image);
     - sunbeams (indoor-only, using the room mask) and autofocus;
     - output: ACES, grade, chromatic aberration, vignette and dither.
   - **Use multiple render targets:** write colour, normal/gloss and albedo in one pass, replacing `encPass` and the albedo `overridePass`.
3. **Room-light probes.**
   - Move the SH reduction (`SHP_MAT`) and dilation (`DIL_MAT`) to compute shaders.
   - Use render bundles for the six-face captures, to cut draw-call overhead.
   - Keep the per-slice capture-state save and restore (`giSlice`), or replace it with a dedicated capture scene.
   - Keep the rules learned so far:
     - no exposure gain (it blew interiors out);
     - glowing fixtures captured dark;
     - room light off in the evening preset;
     - capture with ceilings on.
4. **Shadows and limits.** Lift the three-light cap on Ultra's room-light shadows if WebGPU's texture limits allow it (see `ultraLights`). If you raise it, avoid any scheme that uses negative light: it flashed black while refining.
5. **Checkpoint**
   - Parity shots in Chrome, plus Safari if available.
   - The WebGL fallback is tested by forcing it.
   - `npm test` and `npm run build` pass.
   - Commit: "Phase 2: WebGPU renderer".

## Phase 3 (optional): path-traced Ultra (2–3 weeks of work)

1. **Build the ray-intersection structure.** Build a BVH over the merged architecture buckets, the furniture groups and the imported models. Rebuild only the furniture part after Arrange moves.
2. **Write a progressive path tracer** in compute:
   - Lights and materials: sun, sky (from the preset), the lamp pool and kitchen lights as real emitters; PBR materials from `MAT`, including clear coat and glass.
   - Lights: next-event estimation for the lamps.
   - Denoising: a simple temporal denoiser plus an edge-aware spatial one while it refines.
3. **Fit it into the app.**
   - It replaces Ultra's raster refinement once the camera rests. Moving the camera shows the fast preview.
   - It respects cutaway clipping, fades and the diorama.
   - It renders the ¾ cutaway with the ceilings on (see `SHADOW_PROXY`).
4. **Checkpoint**
   - Side-by-side shots against phase 2 Ultra.
   - Time to a clean image noted per view.
   - Commit: "Phase 3: path-traced Ultra".

## Known traps (from the work so far)

- **Light count:** don't change the number of lights at runtime. It recompiled every shader on preset changes; hence the fixed lamp pool.
- **Clipping planes on clones:** `material.clone()` copies clipping planes by value, so re-share the `CLIPS` arrays on clones.
- **Live reload:** the dev server reloads only on real file changes (mtime/size), because Windows `fs.watch` fires on reads.
- **Night bounce:** room light that includes lamp bounce from lamps that aren't lit on screen looks wrong. Keep the evening rule.
- **Big compiles:** spread compiles over frames, or the browser shows "page unresponsive".

## Run log

(Append dated entries here: what was done, test results, parity notes, open questions.)

### 2026-10-19: Phase 1 (three.js r128 → r186, WebGL)

- **Branch and worktree:** `webgpu-migration`, checked out at `../split-level-house-webgpu`, so `main` and its folder are untouched. The branch dev server runs on port 5180.
- **Loading three:** three 0.186.1 loads as ES modules through an import map (`index.html`). `src/three-boot.mjs` imports it, applies the r128 compatibility settings and sets `window.THREE`. The classic `src/*.js` scripts run after it (`defer`). `scripts/vendor-three.mjs` copies the module builds (WebGL and WebGPU) and the add-ons into `vendor/three/`.
- **r128 look kept:**
  - `ColorManagement` off.
  - Shader chunks patched back to legacy light units: direct, hemisphere and ambient light × π, and the old smooth distance falloff.
  - Alpha-to-coverage restored to r128's behaviour.
  - Outdoor materials take the sky map explicitly. Since r163, a material that falls back to `scene.environment` ignores its `envMapIntensity`, and that was making the exterior hazy.
- **Code changes:**
  - Colour encoding: `.encoding = sRGBEncoding` → `.colorSpace = SRGBColorSpace`.
  - Renamed chunks: `output_fragment` → `opaque_fragment`, `encodings_fragment` → `colorspace_fragment`.
  - Map UVs: `vUv` → `vMapUv` in the anti-tiling, grass and blueprint patches.
  - Removed `isWebGL2` checks (WebGL 2 is always used now).
  - `PCFSoftShadowMap` → `PCFShadowMap`, since r186 removed the soft variant.
- **Single-file build:** the app code is held as `text/plain` and run by the inlined boot module once three has loaded. `window.__APP_LINE0` keeps Debug ID line numbers mapping to the built file; 400 of 400 elements were checked and map to the right line.
- **Parity:** the same four shots (¾ afternoon, walk afternoon, walk dusk, plan) were taken from `main` and from the branch, and the mean absolute pixel difference is out of 255.

  | Quality | Difference | Brightness | Notes |
  |---|---|---|---|
  | High | 0.9–4.7 | within 3% | |
  | Ultra | 0.9–2.7 | within 2% | |
  | Fast, interiors and plan | 0.8–5.1 | | |
  | Fast, ¾ exterior | 13 | lawn about 14% brighter | Not a lighting difference: r186 decodes sRGB textures on the GPU, so distant texture mips are averaged in linear space. That is the more correct result, so it is accepted. |

- **Speed:** the branch loads in about 18–20 s, against 33–35 s on `main` under the same headless GPU.
- **Open:** the single-file build is about 40 MB because of the 8 embedded GLB models. That is not caused by the migration (`main` has it too), but it is over the 16 MB artifact limit.

### 2026-10-19: Phase 2 started (WebGPU renderer), in progress

- **Done:**
  - `three-boot.mjs` loads both the WebGL and WebGPU builds. `?renderer=webgpu`, or `localStorage.renderer`, selects WebGPURenderer; **WebGL stays the default** until WebGPU matches it.
  - The light nodes are patched to r128 units: `AnalyticLightNode.update` and `HemisphereLightNode.update` × π, and the legacy distance falloff in the point and spot `setupDirect`.
  - Renderer creation is async (`await renderer.init()`), with `maxAniso()` and `maxTexSize()` helpers.
  - The sky is ported to a TSL node material sharing the same uniforms.
  - New `src/02b-nodes.js`: under WebGPU, `THREE.Mesh*Material` are node materials, and a small patch system (`npAdd` / `npApply` / `npU`) gives every GLSL `onBeforeCompile` patch a node equivalent. Ported so far: anti-tiling, Fresnel glass, far trees, grass base colour, wash and calm, blueprint reveal, fade clones.
- **Verified:**
  - WebGPU runs headless here with Playwright's bundled Chromium (`channel: 'chromium'`, on the NVIDIA GPU) and loads in about 5 s, against about 20 s on WebGL.
  - The WebGL path still matches `main` (High mean difference 0.9–4.7).
- **Key finding:** a classic material with a GLSL `onBeforeCompile` silently renders without its texture under WebGPU, so every patch needs a node version. Don't set `onBeforeCompile` to null: the renderer's cache key calls `toString()` on it.
- **Next:**
  1. **Fast mode parity.** WebGPU Fast is currently about 40% darker and cooler than WebGL, and leaf cards draw without their alpha cut. Check, in order: tone mapping and output colour space on WebGPURenderer, `envMapIntensity` on the PMREM maps, alphaTest / alphaToCoverage on node materials, and the CSS grade.
  2. **Remaining patches:** corduroy (13-models), the GI probe patch (09; skipped under WebGPU).
  3. **The High/Ultra pipeline** in TSL (`RenderPipeline` / `pass` / `mrt`), then the remaining steps in this plan.

### 2026-10-19: Phase 2, Fast, High and Ultra at parity on WebGPU

- **Done:**
  - Fast and High at parity (earlier commits on this branch).
  - Ultra ported to TSL in the new `src/08c-gpu-ultra.js`:
    - bounce light, reflections, sunbeams, autofocus and the normal/gloss pass
    - the probe light, as a hook on `PhysicalLightingModel.indirect` for materials marked `userData.gi`
    - SH projection, atlas dilation and the corduroy fabric
- **Parity, WebGPU against WebGL Ultra** (mean absolute pixel difference out of 255, and brightness):

  | View | Difference | Brightness, WebGL / WebGPU |
  |---|---|---|
  | ¾ afternoon | 4.6 | 93.2 / 91.2 |
  | walk afternoon | 8.4 | 45.8 / 44.4 |
  | walk dusk | 3.4 | 162.2 / 161.5 |
  | plan | 0.6 | 192.5 / 192.1 |

  The sheer curtains look slightly lighter and more see-through on WebGPU.
- **Key findings (WebGPU traps):**
  - **Bindings merge for good.** A pass's texture inputs are bound when it first compiles. Inputs that hold the *same* texture at that moment share one binding from then on. The composite first compiled in High, where its unused Ultra inputs borrowed the AO texture, so its AO taps later read the bounce-light texture and Ultra went nearly black. Fix: give every input its own texture and never alias two.
  - **Opaque node materials force alpha to 1.** Full-screen passes use `NoBlending`. Targets that are never drawn break later passes, so `setupPipe` clears them all. Depth runs 0..1. The full-screen quad is y-flipped and double-sided.
- **Next:**
  1. Photo for Gemini capture on WebGPU, plus a prewarm and compile pass.
  2. Debug IDs and Arrange checks.
  3. A Renderer switch in the UI.
  4. Make WebGPU the default when WebGPU is available.
  5. Phase 3.

### 2026-10-20: Phase 2 finished (WebGPU default) and Phase 3 (path-traced quality)

- **Phase 2, done:**
  - **Renderer choice:** `three-boot.mjs` asks for a WebGPU adapter before the app scripts load. The scripts are now `<script type="text/x-app">` tags that the boot loads in order.
    - WebGPU is the default where an adapter exists. Otherwise the app uses classic WebGL.
    - Headless Chromium lists `navigator.gpu` but has no adapter. WebGPURenderer would then run its own slow WebGL backend, which is why the adapter check is needed.
    - A **Renderer** menu (Auto / WebGPU / WebGL) is remembered in localStorage and reloads the page. `?renderer=` still overrides it.
  - **Device limits:** the device asks for the adapter's real storage-buffer limits, which the path tracer needs.
  - **Shadows:** WebGPU ignores `renderer.shadowMap.autoUpdate` and `needsUpdate`, and redraws every light's map every frame. The app's `needsUpdate` is passed on to each light's own shadow instead.
  - **Shadow material key:** on the shared shadow-pass material, alphaTest no longer bumps the material version. That bump rebuilt every object's cache key in every shadow pass and was the largest CPU cost.
  - **Sun shadow map:** capped at 4096 under WebGPU. A WebGPU shadow map carries a colour target as well, so 8192 meant over 500 MB redrawn every Ultra frame.
  - **Checked:** Photo for Gemini works on WebGPU, since `toDataURL` is taken in the same task as the render. Debug IDs and Arrange use CPU raycasts. Prewarm works, because `renderer.compile` is `compileAsync` there.
- **Phase 2, speed:** seconds for the image to settle on a warm view, Chromium on an NVIDIA Lovelace GPU.

  | View and quality | WebGPU | WebGL |
  |---|---|---|
  | walk, High | 1.1 | 1.1 |
  | walk, Ultra | 4.0 | 3.4 |
  | ¾, Ultra | 6.8 | 3.4 |

- **Phase 2, open:**
  - The first visit to a quality or view costs 6–12 s on WebGPU while pipelines compile, against 1–5 s on WebGL.
  - ¾ Ultra is CPU-bound on WebGPU's per-object cost: about 35 shadow renders a frame over roughly 700 objects.
- **Phase 2, not done:**
  - MRT for the guide passes, compute-shader SH and dilation, render bundles, and lifting the 3-light shadow cap. WebGPU's default is still 16 sampled textures per stage, so the cap has no room to grow.
  - None of these addresses the measured costs.
- **Phase 3, done:** a **Path** quality, WebGPU only, in `src/15-pathtrace.js`, using three-gpu-pathtracer 0.0.27 and three-mesh-bvh 0.9.16 (vendored, and on the CDN in the build).
  - **When it runs:** it traces once the camera rests, with the Ultra raster as the preview.
  - **Scene copy:** the trace uses a copy of the visible scene.
    - Quantised model attributes are unpacked to floats.
    - BVHs are built a few per frame, with CENTER splits for big meshes. The first build takes about 7 s without freezing the page.
    - A light change swaps the lights and sky. An Arrange move updates transforms.
  - **Lights and sky:**
    - The sun is a far spot light with a radius.
    - Lamps are point lights matched to the legacy falloff.
    - The sky shader is unwrapped to an equirect map.
    - Glass is invisible to shadow rays; otherwise interiors were dark and noisy.
  - **Cutaway:** camera rays start where they enter the space the clip planes keep, so the cutaway is lit with its ceilings on.
  - **Denoising:** an à-trous filter with the albedo divided out, guided by Ultra's normal and albedo passes. Cut-out foliage is included in those passes.
  - **Exposure:** matched to the raster image's log-average luminance.
  - **Raster fallback:** where no opaque surface is hit (the backdrop, ghost levels, faded trees), the raster image is shown.
  - **Time to a clean image:**

    | View | Samples per pixel | Seconds |
    |---|---|---|
    | walk | 160 | ~25 |
    | ¾ | 128 | ~20 |
    | plan | 128 | ~18 |

- **Phase 3, known differences:**
  - Windowless rooms in a cutaway (the garage) are nearly black, because the ceilings are on.
  - Ghost levels are lost where they sit in front of solid ground.
  - Vertex-coloured grass is traced at its average colour.
  - The app's node colour patches (wash, anti-tiling) are not traced.
- **WebGPU traps found:**
  - A pass output cannot go negative, so the log luminance is stored offset by 16.
  - Guide passes drawn in the same frame as the tracer's reset came out black, so they are drawn a frame later.
  - The library's cube-to-equirect generator uses a WebGL `ShaderMaterial`.

### 2026-10-20: faster WebGPU transitions; denoised path tracing

- **Transitions:** the measured pause (the longest frame) after each change. WebGPU, Chromium with the shader disk cache off, so these are worst-case first visits.

  | Change | Before | After |
  |---|---|---|
  | Preset (afternoon ↔ dusk) | 6–7 s | 25–60 ms |
  | Back to High | 5.8 s | 0.3–1.2 s |
  | Back to Fast | 5.7 s | 0.3–0.6 s |
  | Ultra again | 1.9 s | 0.4 s |
  | Plan, second visit | n/a | 60 ms |
  | First Ultra this session | 7.5 s | 3.7 s |
  | First plan this session | 10 s | 4.3 s |

- **What fixed them:**
  - **Constant light set.** The set of lights is built into every node material. The sky lights and probe lights now always stay in the scene under WebGPU and are switched off by strength, so a quality change no longer recompiles every material. A dark light's shadow is skipped outside Ultra. In Ultra it is not skipped, because the probe lights are lit only just before each draw; skipping them destroyed their shadow maps mid-frame.
  - **Shared environment node.** `scene.environmentNode` is the shared sky PMREM slot. Before, a new `scene.environment` texture per preset changed every object's cache key and rebuilt every node graph. Materials with their own environment map get their own PMREM node, whose texture is swapped in place.
  - **Shared guide-pass materials.** Ultra's normal/gloss materials read their values per draw through `materialReference`, and declare a patch key. They now share 4 builds instead of compiling about 54.
  - **Pipelines kept.** Pipelines and programs are never released, so a revisit reuses them.
  - **Prewarm:**
    - It compiles for both camera kinds (the plan's is orthographic) and into targets in the formats each pass uses.
    - It covers Ultra's guide materials.
    - It compiles objects against the real scene, with `renderer.compile(object, camera, scene)`. A stand-in scene built second shadow maps that destroyed the real ones, and the frames came out black.
- **Still open:** the first Ultra and first plan of a session, about 4 s each. Ultra builds new shader code for some materials, for a reason not yet found. The plan builds about 21 shadow-pass pipelines, which `compileAsync` cannot prewarm.
- **Path tracing with OIDN:**
  - The trace stops at 64 samples per pixel (walk) or 48 (other views), with 6 bounces. oidn-web 0.5.0 with `rt_hdr_alb_nrm_small.tza` (0.6 MB, Apache-2.0, from RenderKit/oidn-weights; SHA-256 checked) then gives the final image.
    - It is guided by the app's own albedo and normal passes, so the cutaway's clipped walls are right. The library's own guide render would draw them unclipped.
    - The weights live in `assets/weights` and are embedded in the single-file build.
    - If the denoiser fails to load, the trace falls back to 160/128 samples with the à-trous filter.
  - **Time to the final image:**

    | View | Before | Now |
    |---|---|---|
    | Walk | ~25 s | ~9.5 s |
    | ¾ | ~20 s | ~7 s |
    | Dusk walk | ~25 s | ~9.5 s |

    The denoise itself takes about 0.3 s.
- **Correction: memory.** Keeping the probe lights' shadows always on cost every object a shadow pass per cube face, about 500 MB of JS heap. Combined with a prewarm against the real scene, the tab ran out of memory: the user saw "Out of Memory" and a black first screen.
  - Probe shadows are Ultra-only again, and a change of quality no longer restarts the prewarm.
  - Heap is back to the last commit's levels: about 210 MB in High and about 970 MB in Ultra (the last commit: 207 and 956).
  - The cost is part of the transition gain. Back to High is now 2.6 s, Ultra again 1.8 s, and the first Ultra 6.4 s. Preset changes stay near-instant.
