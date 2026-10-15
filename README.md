# Split-level house walkthrough

An interactive 3D model of the house with the planned four-seasons addition and new deck. Walk through it, cut it open level by level, read it as a floor plan, try different times of day, and rearrange the furniture.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer and [Visual Studio Code](https://code.visualstudio.com) with the Claude Code extension.

```bash
npm install          # also installs the browser used by the tests on first run: npx playwright install chromium
npm run dev          # open http://localhost:5173
```

Edit anything in `src/` and the page reloads by itself.

## Working with Claude Code

Open this folder in VS Code and start Claude Code. It reads `CLAUDE.md` automatically, so it already knows how the project fits together. Useful habits:

- **Point at things with Debug IDs.** Turn on Debug IDs in the app, tap the wall, window, floor or piece of furniture you want changed, press "Copy for Claude", and paste it into your request. Claude Code goes straight to the right line.
- **Rearrange, then bake.** Use Arrange mode to move furniture by eye, press "Copy all moves", and ask Claude Code to make them permanent.
- **Ask it to run the tests** after bigger changes (`npm test`).

## Folders

| Path | What it holds |
| --- | --- |
| `index.html` | Page shell and controls |
| `src/` | The app, split by system (layout data, geometry, house, furniture, site, rendering, debug, arrange, app shell) |
| `assets/reference/` | Floor plans, concept plans and photos the model is based on |
| `assets/textures/` | Drop real photo textures here (see its README) |
| `assets/hdri/` | Reserved for real sky photos (HDRIs) |
| `docs/` | Modelling notes and open questions |
| `scripts/` | Dev server, single-file build, three.js vendoring |
| `tests/` | Playwright smoke tests |
| `dist/` | The single-file build, ready to publish |

## Publishing back to Claude

`npm run build` writes `dist/house-walkthrough.html`, one self-contained file. Upload it in a Claude chat and ask to publish it as an artifact, or open it directly in a browser.
