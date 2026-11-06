# Asset credits and licences

Every third-party asset used in the game is listed here with its source, author and licence.
If you add a model, add a row. Raw downloaded packs live in `art-source/` (git-ignored); only
optimised, compressed GLB files are committed, in `public/models/`.

## Packs

| Pack | Author | Source | Licence | Attribution required? |
|---|---|---|---|---|
| Nature Kit | Kenney | https://kenney.nl/assets/nature-kit | CC0 1.0 | No (credit appreciated) |
| City Kit (Suburban) | Kenney | https://kenney.nl/assets/city-kit-suburban | CC0 1.0 | No (credit appreciated) |
| City Kit (Commercial) | Kenney | https://kenney.nl/assets/city-kit-commercial | CC0 1.0 | No (credit appreciated) |
| Car Kit | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 | No (credit appreciated) |
| Universal Animation Library (Standard) | Quaternius | https://quaternius.com/packs/universalanimationlibrary.html | CC0 1.0 | No (credit appreciated) |

Licence text for each pack was read from the `License.txt` inside the downloaded zip.

## Models used (updated as each step lands)

_Filled in per step: model file in `public/models/` → source file in the pack → what we changed._

## Our own models (no third-party source)

Anything not listed above (for example the supplies kiosk, registration canopy, fountain, benches,
lamps and all signs/banners) is built in code or drawn by us for this game.

## Notes

- All brands, logos, signage and institutions in the game are fictional.
- Mixamo animations, if ever used, are not CC0. They are free to use in games under Adobe's
  terms (login required). Record each file here if added.

## Where each pack is used (public/models/)

| Folder | Pack | Used for |
|---|---|---|
| ground/, trees/ | Kenney Nature Kit | grass tufts, flowers, bushes, rocks, palms and shade trees (colours remapped from aqua to leaf green in code) |
| buildings/, props/ | Kenney City Kit (Commercial) | lecture theatre, admin block, library, hostel block, small blocks, awning, parasols |
| vehicles/danfo.glb | Kenney Car Kit (van) | the danfo bus; blue paint recoloured to yellow (scripts/make-danfo.mjs) |
| characters/male, female | Quaternius Universal Base Characters (Standard) | player and NPCs; slimmed to ~3.3k triangles, clothes coloured in code |
| characters/anims.glb | Quaternius Universal Animation Library (Standard) | idle, walk, jog, talking, interact (5 of 43 clips) |

Kenney City Kit (Suburban) is downloaded but not used yet. Not from any pack (our own models): gate pillars, perimeter wall,
kiosk, registration canopy, fountain, benches, lamps, signs.
