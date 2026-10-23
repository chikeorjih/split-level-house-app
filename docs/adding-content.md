# Adding content

A short guide to the most common changes, for working on the project by hand. [`CLAUDE.md`](../CLAUDE.md) has the full architecture. Run `npm run dev` while you work: the page reloads on every save, and Debug IDs lead to the line that builds anything you tap.

## Coordinates

Everything is in feet:

- **x:** increases toward the north-east lot line ("east").
- **z:** increases toward Dunwoody Drive ("toward the street").
- **y:** up.

Floor heights are in `E` in `src/02-spec.js`:

| Level | Name | Floor height |
|---|---|---|
| `E[1]` | Lower level | -13.5 |
| `E[2]` | Family room level | -4.5 |
| `E[3]` | Main level | 0 |
| `E[4]` | Bedroom level | 4.5 |

Turn on Debug IDs and tap any surface to read its position and size.

## A piece of furniture

In `src/07-furniture.js`, each `T(tag, x, y, z, ry, 'name')` call creates one movable piece:

- **Pivot:** the piece pivots on its footprint centre.
- **Arguments:** `tag` is the level (`'1'` to `'4'`), `y` is usually that level's floor (`e1` to `e4`), and `ry` is the turn in radians.
- **Building the shape:** use the helpers on the returned piece: `p.b` (box), `p.r` (rounded box), `p.c` (cylinder) and `p.g` (any geometry). Add a collision box with `p.col`.
- **Name:** always give it a name (the sixth argument). Debug IDs, Arrange mode and imported models refer to pieces by name.

```js
{const p=T('2',3.0,e2,16.0,0,'oak side table');p.r('oakLight',0,1.9,0,1.8,.1,1.8,.04);p.c('oakLight',0,0,0,.12,.12,1.9,12);p.col(0,0,1.8,1.8,0,2);}
```

Fixed decor (art, curtains) uses `P(...)` instead and can't be moved in Arrange mode.

To place a piece by eye, move it in Arrange mode, then press **Save to code**, which rewrites the call.

## A wall, window or door

Walls are data: `W({...})` entries in `src/02-spec.js`.

- **Segment:** each entry gives a level (`lv`), a start and end point (`x0`, `z0`, `x1`, `z1`), a thickness (`t`) and a height range (`y0`, `y1`).
- **Openings:** listed in `ops`, using `win(...)`, `door(...)` and `op('slide'|'garage'|'open'|…)`.
- **Cladding:** `ext:{side, mat}` adds exterior cladding.
- **House states:** walls marked `isNew` exist only with the addition; `cur:{…}` overrides fields for the current house.

After changing walls, run `npm test`. Its walking routes catch blocked doorways and broken stairs.

## A material

Materials live in the `MAT` object (`src/03-textures.js` and `src/04-textures-living.js`), mostly as `std({...})` standard materials with generated textures.

- **Outdoor materials:** add the key to `EXT_MATS` in `src/09-look-pipeline.js`, so the material reflects the sky rather than a room.
- **Texture coordinates:** architectural surfaces use world-space coordinates in feet; furniture uses 0–1 per face.

## A photo texture

Put the image files in `assets/textures/` and list them in its `manifest.json` against a `MAT` key. See [assets/textures/README.md](../assets/textures/README.md). They load under `npm run dev` only.

## A real furniture model

Put the `.glb` in `assets/models/` and add an entry to its `manifest.json`: the product size, the piece it replaces, and where it goes. Then run `npm run model:check -- <id>`. See [assets/models/README.md](../assets/models/README.md), including how to slim a heavy model.

## A room name

Rooms (name, level and plan rectangle) are listed in `src/02-spec.js` alongside the walls. They drive the room labels, measurements, Jump to, and the "where am I" line in Walk view.
