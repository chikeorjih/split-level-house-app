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

This works best for architectural surfaces, which use feet-based texture coordinates. Furniture uses per-face coordinates, so ask Claude Code to wire up furniture textures individually. Good free sources: Poly Haven and ambientCG (CC0).

The single-file build doesn't load these files, because published artifacts can't load outside images. Ask Claude Code to embed them as data URIs if you want them in the published version.
