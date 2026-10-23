# Photo textures

Real photo textures override the generated ones when the app runs from the dev server (`npm run dev`).

1. Put image files in this folder: colour (`map`), and optionally a normal map and a roughness map.
2. List them in `manifest.json`:

```json
{
  "textures": [
    { "material": "oak", "map": "oak_color.jpg", "normal": "oak_normal.jpg", "repeatFt": 8, "rotateDeg": 90 },
    { "material": "brick", "map": "brick_color.jpg", "normal": "brick_normal.jpg", "repeatFt": 4 }
  ]
}
```

- **`material`:** a key in `MAT`. The common architectural ones are `oak`, `brick`, `brickWhite`, `wall`, `slate`, `tileBath`, `subway`, `slateRoof`, `roof`, `metalRoof`, `deckOld`, `deckNew`, `stone`, `grass`, `concrete`, `drive` and `paver`. Turn on Debug IDs and tap a surface to see its materials.
- **`repeatFt`:** how many feet one copy of the image covers. Add `repeatFtY` if the height differs.

This works best for architectural surfaces, which use feet-based texture coordinates. Good free sources: Poly Haven and ambientCG (CC0).

## Photos on furniture (rugs and the like)

Furniture faces use 0–1 texture coordinates, so `"repeatFt": 1` lays the image once across a face. The two bedroom rugs work this way: their product photos are cropped to the rug and listed for `rugNurseryBig` (`rug_floral_charcoal_8x10.jpg`) and `rugCheck` (`rug_confetti_check_8x10.jpg`). Crop the photo to the piece and turn it so its long side matches the piece's long side; the material needs a plain fallback in `MAT` for the single-file build.

## What is here now

- **Poly Haven (CC0):** brick, roof slates, wood floor, deck planks, driveway gravel concrete, forest ground (the soil block and the bare earth in cutaways), laminate (lower-level floors), curly teddy (lower-level rugs). Each entry in `manifest.json` records its source and scale.
- **Owner-supplied:** the two bedroom rug photos.

The single-file build doesn't load these files, because published artifacts can't load outside images, so it shows the generated textures (and plain fallbacks for the rugs). Embedding them as data URIs is possible, but they are large: the 2k photo sets here total well over the 16 MB artifact limit.
