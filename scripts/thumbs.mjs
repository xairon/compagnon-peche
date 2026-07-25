// Generate small species thumbnails from the full-size photos.
//
// Why: the grids (Espèces, Carnet, Accueil, confusions) show a photo at ~120-180
// CSS px, but were served the same 900 px file the fiche hero uses. Precaching
// all of them cost ~11 MB — the bulk of a 13.7 MB first install, over 4G at the
// water's edge. The thumbnails (~1.9 MB total) are precached instead, so lists
// stay fully offline, and the full photos are cached on first view.
//
// Run: npm run thumbs   (output is committed, like scripts/enrich-species.mjs)

import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "public/assets/species";
const OUT = "public/assets/species-sm";
const WIDTH = 400; // ~2-3x the largest grid tile
const QUALITY = 78;

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith(".webp"));
let before = 0;
let after = 0;

for (const f of files) {
  before += statSync(join(SRC, f)).size;
  await sharp(join(SRC, f))
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(join(OUT, f));
  after += statSync(join(OUT, f)).size;
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + " Mo";
console.log(`${files.length} vignettes — ${mb(before)} → ${mb(after)}`);
