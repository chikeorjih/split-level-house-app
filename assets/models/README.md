# Imported models

Real furniture models (GLB, or glTF in a folder) replace or add to the modelled furniture. The import-model skill (`.claude/skills/import-model`) walks through finding them on Sketchfab, downloading them and checking their size. `src/13-models.js` loads them.

They load from the dev server (`npm run dev`) and in the single-file build, which embeds `.glb` files.

## manifest.json

```json
{
  "models": [
    {
      "id": "living-sofa",
      "name": "West Elm Harmony sofa, 82\"",
      "file": "westelm-harmony-sofa.glb",
      "spec": { "w": 82, "d": 39, "h": 34 },
      "specSource": "https://www.westelm.com/products/harmony-sofa-82-h2183/",
      "replaces": "four-seasons sofa",
      "place": { "turn": 0 },
      "orient": { "x": 0, "y": 0, "z": 0 },
      "credit": "\"Harmony Sofa\" by someone on Sketchfab, CC Attribution",
      "source": "westelm-harmony-sofa.source.json"
    }
  ]
}
```

- **`spec`:** the product's overall width, depth and height in inches, from the retailer's product page. Every check is measured against it.
- **`scale`** (optional): leave it out to detect the model's units from the spec. Otherwise give `"m"`, `"cm"`, `"mm"`, `"in"`, `"ft"`, or a number of feet per model unit.
- **`replaces`:** the name of the `T(...)` piece it stands in for (the sixth argument). That piece is hidden and its collisions are removed. Any position, level or rotation not given in `place` is taken from that piece.
  - It can also be a list, when one model stands in for several pieces, as the Drift sectional does for both halves of the old family-room sectional: `"replaces": ["sectional, window side", "sectional, wall side"]`. The first piece supplies the default place; every listed piece is hidden; the size report compares the model with all of them together.
- **`place`:**
  - `x`, `z`: footprint centre in feet.
  - `lv`: level 1–4.
  - `ry`: absolute turn in degrees, counterclockwise in plan.
  - `turn`: extra degrees added to the replaced piece's rotation.
  - `y` or `dy`: floor height, or an offset from it.
- **`orient`:** degrees to stand the model upright and face it forward before anything else is applied. Use `x: -90` for Z-up models and `y: 90` when width and depth are swapped.
- **`enabled: false`** turns a model off without deleting it, and **`collide: false`** stops it blocking the walk.

## Checking

- `npm run model:check` prints, for every model, its size against `spec` and its fit in the plan: the room it sits in, walls, door swings and other furniture. It also saves a plan close-up and a ¾ close-up to `test-results/models/`, and exits 1 if anything fails.
- `npm test` runs the same check on every model in this manifest.
- A model passes when width, depth and height are each within 0.5" or 2% of the spec, whichever is larger.

## Owner-supplied models without a product size

Some models arrive without a product size, and often not to scale. Give them a numeric `scale` (feet per model unit) that brings them to a typical size for the piece, leave out `spec`, and say in `note` that the size is an estimate. The fit check still runs; only the size comparison is skipped.

## Compacting a model

Every model here is compacted into a `.min.glb`, and the manifest points at that; the original stays alongside as the source. Furniture should end up under about 60k triangles and 1 MB. Two steps:

```bash
npm run model:textures -- assets/models/<name>.glb tmp.glb 1024    # textures to at most 1024 px (WebP stays WebP)
npx -y gltfpack@0.22.0 -i tmp.glb -o assets/models/<name>.min.glb -si 0.15 -c
```

- **`model:textures`** decodes each embedded image in Chrome, scales it down and re-encodes it. Run it on the uncompressed source; it refuses a meshopt-compressed file.
- **`-si`** keeps that share of the triangles: about 0.12–0.15 for the 300–400k-triangle sofas and chairs, 0.4–0.6 for 80–150k, nothing for small models.
- **`-c`** compresses the geometry (EXT_meshopt_compression). The app gives the loader three's `MeshoptDecoder` (`three-boot.mjs`, `13-models.js`); the single-file build loads it from the CDN.

Compaction keeps a model's size and placement: check with `npm run model:check -- <id>` and look at the close-ups. In October 2026 the nine model files went from 34 MB to 4.3 MB, and the single-file build from 45.7 MB to 7.1 MB, with every model's size within 0.1".

## The single-file build

`npm run build` embeds every `.glb` listed in the manifest. A published artifact must stay under 16 MB, and the build warns above 12 MB of models. Compact new models as above, or set `"enabled": false` on pieces the published version can do without.
