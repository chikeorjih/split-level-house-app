---
name: model-object
description: Model a piece of furniture, a fixture, an appliance or decor from scratch in this project's procedural three.js code, from a description or a reference image, in two passes (a proportion-accurate blockout, then fine detail with PBR materials and normal maps). Use when the user asks to model, build, add or recreate an object, or to make an existing T() piece more detailed or realistic. For downloading a ready-made model, use import-model instead.
---

# Model an object in two passes

The aim is an object that is the right size, reads as the real thing from any angle, and holds up close in High quality and Ultra, built for as few tokens as possible.

| Read when | File |
|---|---|
| Choosing geometry for a part | `references/builder-cookbook.md` |
| Setting any material value | `references/pbr-values.md` |
| A reference image is attached | `references/image-blockout.md` |

Scope: `T(...)` pieces in `src/07-furniture.js` (furniture, fixtures, appliances, decor). Architectural parts (walls, windows, trim) follow their own data-driven builders; adapt the same two passes there only if asked.

## Token rules (apply throughout)

- **Measure once.** Pass 0 turns the description or image into numbers. After that, work from those numbers, not from the image.
- **One render per pass.** Use `node scripts/model-shot.mjs`, which puts four views in one image. Never re-render just to look again. Add `--hq` only in Pass 2.
- **Don't re-read big files.** Grep for an anchor, read about 30 lines around it, edit surgically, and keep the file's dense one-line style.
- **Reuse before writing.** `roundedGeo`, `superBox`, `lathe`, `rotE` and the P methods cover most shapes. If a shape will recur, add a small named helper beside the others, not inline one-offs.
- **Budget.** Aim for about 20k triangles per object. The shot script reports the count.

## Pass 0: spec (text only, before any code)

Write a compact block in your reply, at most about 20 lines:

1. **Size:** overall W × D × H in inches, from the description, or from the image using `image-blockout.md` (scale from a known reference, never a blind guess). Give the source.
2. **Part tree:** primary masses, then secondary forms, then tertiary detail. For example, sofa: base, seat cushions, back cushions, arms; then legs, piping, seams; then stitching, weave, creases.
3. **Key ratios:** 3–6 numbers that define the silhouette (seat height/H, arm width/W, leg height, back rake angle, and so on).
4. **Materials:** a name and PBR values for each, from `pbr-values.md`. Reuse a `MAT` entry when one fits, and list new ones.
5. **Placement:** room, level, `T()` position, facing (local +z is the front), and what it replaces, if anything.

## Pass 1: blockout

- **Primary masses only:** usually 5–15 primitives, at the Pass 0 dimensions. Rounded boxes rather than sharp boxes, even here.
- **Build it as a named piece:** `{const p=T(tag,x,e,z,ry,'name');buildFn(p,...);}` with `buildFn(p,...)` beside the similar builders, and `p.col(...)` for its footprint.
- **Materials:** existing or flat new `MAT` entries (colour plus roughness), with no maps yet.
- **Check:** run `node scripts/model-shot.mjs --name "name"` and read the one image:
  - Silhouette and proportions should match the key ratios within about 5%.
  - The printed W/D/H should match the spec within 0.5" or 2%.
  - It should sit on the floor.
  - The front should face into the room.

  Fix the masses now: detail never rescues wrong proportions.

## Pass 2: detail and materials

Work from the outside in, in this order:

1. **Secondary forms in geometry:**
   - edge radii on every part
   - cushion crown and sag (`superBox` with pinch)
   - panel reveals and gaps (0.02–0.04 ft over a dark backer)
   - piping, welts, tapered legs (`lathe`)
   - hardware on real standoffs
   - seams as shallow grooves
2. **Tertiary detail in materials, not polygons:**
   - weave, grain, stitching, pores, brushing: a canvas height pattern turned into a normal map with `normalFrom()`
   - wear and smudges: a roughness map
   - crevice darkening: vertex colours or a baked darkening in the colour map
3. **PBR pass, by `pbr-values.md`:**
   - Metals: metalness 0.9–1, with the tint carried by colour.
   - Non-metals: metalness 0, with reflectivity coming from roughness alone.
   - Lacquer, stone and gloss: clear-coat. Fabric: sheen. Glass: transmission. All use `MeshPhysicalMaterial`.
   - Pick the colour from the real material, in sRGB.
   - Add outdoor materials to `EXT_MATS`.
4. **Check:** run `node scripts/model-shot.mjs --name "name" --hq`. That gives the sheet plus a close High quality ¾ render; use `--ultra` for chrome, steel, glass or lacquer. Compare against the reference for material read (gloss, highlights, texture scale) and small forms.
5. **Stop rule:** at most two detail iterations. Then report what still differs and why: for example, needs a photo texture, or needs a sculpted shape beyond these primitives.

## Report

Give the user:
- the spec table: target size and the modelled size
- the key ratios
- the materials and their PBR values
- the triangle count
- the two shot images' paths
- anything left unmatched

Run `npm test` only if the piece changes walking routes (large pieces near doors or stairs).
