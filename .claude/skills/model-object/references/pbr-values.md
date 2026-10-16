# PBR values for this renderer (three.js r128, ACES tone mapping)

All materials go in `MAT` (`src/03-textures.js`, or `04-textures-living.js` for soft furnishings).

- `std({...})` makes a `MeshStandardMaterial` with clipping set.
- For clear-coat, sheen or transmission, use `new THREE.MeshPhysicalMaterial({...,clippingPlanes:CLIPS})`.
- Colours are sRGB hex. three.js converts them, so pick them from a photo directly.
- Exterior materials go in `EXT_MATS` (`09-look-pipeline.js`) so they reflect the sky, not the room.

## Core values

| Material | colour (sRGB) | roughness | metalness | extras |
|---|---|---|---|---|
| Brushed stainless | `#c4c7ca` | 0.28–0.35 | 0.9 | `map: brushedTex()` (streaks) |
| Polished chrome | `#e8e9ea` | 0.05–0.12 | 1.0 | |
| Brushed brass or gold | `#b48b4c` | 0.3–0.4 | 0.85 | |
| Matte black metal | `#232426` | 0.45–0.6 | 0.6 | |
| Aluminium, satin | `#bfc2c5` | 0.4 | 0.9 | |
| Painted cabinet, satin | as photographed | 0.35–0.5 | 0 | `cabGap` backer behind reveals |
| Lacquer, high gloss | as photographed | 0.15 | 0 | Physical: `clearcoat:1, clearcoatRoughness:.05` |
| Quartz or marble | `#efeeea` | 0.2–0.3 | 0 | Physical: `clearcoat:.6, clearcoatRoughness:.1`; faint veining map |
| Ceramic, glazed | `#f1efe9` | 0.15–0.35 | 0 | |
| Glass, clear | `#ffffff` | 0.02–0.05 | 0 | Physical: `transmission:.95` (r128 has no thickness or IOR control); or `transparent, opacity .2` (cheap) |
| Glass, tinted cabinet | `#2b3034` | 0.04 | 0.1 | `transparent, opacity .3, depthWrite:false` |
| Leather, aniline | tan `#8a5a3a` | 0.45–0.6 | 0 | pores normal map (strength 1–1.5) |
| Leather, worn | as above | 0.55–0.7 | 0 | roughness map: lighter on arms and seat fronts |
| Linen or cotton weave | as photographed | 0.85–0.95 | 0 | Physical `sheen` ≈ a lighter tint of the colour; weave normal map (1–2) |
| Velvet | as photographed | 0.7 | 0 | Physical `sheen` (a Color in r128) bright; deep base colour |
| Boucle or knit | as photographed | 0.95 | 0 | loop normal map (2.5–3.5) |
| Oak or walnut, oiled | grain map | 0.5–0.6 | 0 | grain normal map (1–1.6) |
| Wood, lacquered | grain map | 0.25 | 0 | Physical clearcoat 0.6 |
| Rubber or plastic, matte | as photographed | 0.7–0.9 | 0 | |
| Plastic, gloss | as photographed | 0.2 | 0 | |
| Concrete or plaster | `#b2afa7` | 0.9–1 | 0 | low-contrast noise normal map |

## Rules of thumb

- **Metal vs non-metal:** metalness is 0 or about 0.9. Avoid in-between values except for dirty or painted metal.
- **Reflectivity:** non-metals reflect through low roughness, not through metalness.
- **Highlights:** under about 0.3 roughness, highlights are crisp and Ultra's reflections show the room. Above about 0.6, surfaces are matte.
- **Normal maps:** build a grayscale height canvas (light = raised), make a texture with `tex(canvas,ftW,ftH)`, and pass it through `normalFrom(tex,strength,invert)`. Use strength 1–1.5 for fine grain, 2–3.5 for weave and loops.
  - Architectural materials use feet-based UVs, so a repeat in feet works.
  - Furniture uses 0–1 UVs per face, so set `repeat` per material: about 4–8 for weave on a cushion.
- **Roughness maps:** grayscale, white = rough. Keep the base `roughness:1` so the map rules; photo-texture overrides use `roughnessValue:1` for this.
- **Colour:** keep albedo under about `#f2f2f2` and above about `#1a1a1a`, or bounce light and AO look wrong.
- **Cheap form AO:** darken the colour map 10–25% where parts meet (under cushions, inside joints) rather than adding geometry.
- **Photo textures:** for wood, stone or fabric, a CC0 Poly Haven set in `assets/textures/manifest.json` beats a procedural map. Record its real size and check the scale.
