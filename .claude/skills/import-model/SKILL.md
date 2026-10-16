---
name: import-model
description: Find a real furniture model on Sketchfab (preferring Crate & Barrel, West Elm and Castlery pieces), download it, scale it to the product's real dimensions, place it in the house (usually replacing a T() piece), and verify its size and floor-plan fit. Use when the user wants to pull in, import, swap in or try a 3D model of a real product, or mentions Sketchfab.
---

# Import a furniture model from Sketchfab

The goal is a model that is the real product's size, placed where it will actually go, and proven to fit. Never call a model done until `npm run model:check` passes for it and you have looked at its two close-up images.

Everything here builds on project pieces described in `assets/models/README.md`:

| Piece | What it does |
|---|---|
| `scripts/sketchfab.mjs` | Search, inspect and download models |
| `assets/models/manifest.json` | The placed models: file, product `spec`, `replaces`, `place`, `orient`, `credit` |
| `src/13-models.js` | Loads, scales and places each model; `modelReport()` runs the checks |
| `scripts/model-check.mjs` (`npm run model:check`) | Runs the checks in the real app and saves close-ups to `test-results/models/` |

## 1. Pin down the piece

Get these from the user, or work them out and confirm them:

- **The product.** Brand, product name and the exact size variant, for example the 82" Harmony sofa rather than the 92" one. Preferred brands are **Crate & Barrel, West Elm and Castlery**.
- **Where it goes.** Usually it replaces an existing piece. Find that piece's `T(...)` call in `src/07-furniture.js`; a Debug ID the user pastes leads straight to it. If the call has no name (sixth argument), add a short one such as `'living room sofa'`, so the manifest can refer to it by a stable name.
- **The product's real dimensions.** Use overall width, depth and height in inches. Fetch the retailer's product page and read its dimensions section. Crate & Barrel and West Elm list inches; Castlery lists inches and cm. Record the page URL as `specSource`. If the page can't be fetched or is ambiguous, ask the user. Never guess dimensions from the model itself: the whole point is to check the model against an independent source.

## 2. Find a model

```
npm run sketchfab -- search "west elm harmony sofa" --brand "west elm"
npm run sketchfab -- search "crate and barrel lounge sofa" --brand "crate and barrel" --all
```

- **Brand accounts.** None of these brands has an official Sketchfab account, so every model is a third-party recreation. The `--brand` filter keeps results that mention the brand in their name, description or tags. Searches for "crate and barrel" also match actual barrels, so read the names.
- **Downloadable only by default.** Add `--all` to include store and view-only models.
- **Product name first.** Try the brand plus the product name, then the product name alone, then a generic description with the brand's style words, for example "track arm sofa".
- **Fallback.** If nothing close exists, tell the user. Offer a near match in the right style and size class, which the check will then scale to the real product's dimensions and report on, or keep the procedural piece.

Shortlist two or three candidates, then inspect each:

```
npm run sketchfab -- info <uid or URL>
```

Check these for each candidate:

- **Licence.**
  - CC Attribution: free, but needs credit.
  - CC Attribution-NonCommercial: fine for this personal house project.
  - Standard or Editorial: a store model. The user must buy it on sketchfab.com first.

  Never try to get around a paywall or a non-downloadable model.
- **Size.** Face count should be under about 150k and the file under about 10 MB. The published single-file build must stay under 16 MB in total.
- **The description.** Any dimensions written there are a second opinion on size.

Show the user the shortlist with licence, price and face count, and let them pick if it isn't clear-cut.

## 3. Download

```
npm run sketchfab -- download <uid> <slug>
```

- **Output.** This writes `assets/models/<slug>.glb` and `<slug>.source.json`, which records the author, licence and URL.
- **Token.** It needs the user's Sketchfab API token, from https://sketchfab.com/settings/password, as `SKETCHFAB_TOKEN=...` in `.env.local`. That file is gitignored. Never print the token, put it in a command line, or commit it.
- **No token or a store model.** The user can download the GLB on sketchfab.com themselves and save it as `assets/models/<slug>.glb`. Then carry on.
- **glTF folder only.** If Sketchfab offers only a glTF folder, it works in the dev app, but the single-file build can't embed it.

## 4. Check it before it goes in the manifest

```
npm run model:check -- --file <slug>.glb --spec 82x39x34 --replaces "four-seasons sofa"
```

`--spec` is width x depth x height in inches. Read the report:

- **Scale line.**
  - "true to scale in m" (or cm, and so on) is the good case: the model's own units already give the product's dimensions.
  - "turned 90°" means its width and depth are swapped. Add `--orient 0,90,0`.
  - "not to scale … fitted" means no standard unit matches, so the model was uniformly scaled to the spec. If width, depth or height still miss the spec after fitting, the model's proportions don't match the product. It is probably a different variant or a loose recreation. Say so plainly and suggest another candidate. Don't hide it by loosening the tolerance or scaling axes separately.
- **Width, depth and height.** Each must be within 0.5" or 2% of the spec.
- **Placement and fit.**
  - Room: the footprint must be inside the rooms of its level.
  - Walls: no wall or window may cut into it. If one does, the report gives the `place.x` or `place.z` that clears it. Pieces that stand against a wall should end up with "nearest wall" around 0–1".
  - Door swings must stay clear.
  - It must not overlap other furniture.
  - Size notes compare it with the piece it replaces.
- **Height hint.** "height matches a horizontal side" means the model is Z-up. Use `--orient -90,0,0`.

Then look at `test-results/models/<id>-plan.png` and `<id>-3d.png` with the Read tool:

- The model should sit on the floor.
- Its front should face into the room. If it doesn't, adjust `--turn 90`, `180` or `270`.
- Nothing should float or be sunk.

Iterate with `--place x,z,lv`, `--turn` and `--orient` until the report says PASS and the images look right.

## 5. Add it to the manifest

Add an entry to `assets/models/manifest.json`. The schema is in `assets/models/README.md`. Include:

- `id` and `name`
- `file`
- `spec` and `specSource`
- `replaces`
- `place` with whatever the check needed
- `orient`, if used
- `source` (the `.source.json` filename)
- for CC Attribution models, a `credit` line: `"<model name>" by <author> on Sketchfab, <licence>`

Then:

1. `npm run model:check -- <id>` must PASS.
2. `npm test` must pass. It re-checks every model in the manifest and the walking routes. A new collision box can block a walking route, so investigate any route failure.
3. `npm run build` reports the embedded size. Warn the user if it's over 12 MB.

## 6. Report back

Tell the user:

- which model you used: link, author, licence, and credit if needed
- the product dimensions and where you got them
- the check result as a short table: spec, model and difference for width, depth and height
- the room it's in, the nearest wall, and how it compares with the piece it replaced
- anything you adjusted to make it fit, and anything that still doesn't fit

If the real product doesn't fit the space, for example it runs into a wall or blocks a door, say so clearly. That is a useful finding about the house, not a modelling problem to paper over.
