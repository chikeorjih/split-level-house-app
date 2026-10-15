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
      "replaces": "living room sofa",
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
