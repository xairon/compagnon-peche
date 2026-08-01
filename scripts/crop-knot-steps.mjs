// Découpe les planches libres de Wikimedia Commons en une image par geste, et
// génère src/data/knot-steps.gen.ts. Run: node scripts/crop-knot-steps.mjs
//
// L'auteur, la licence et l'URL source de la planche mère sont recopiés sur
// CHAQUE vignette : l'attribution doit survivre à la découpe, c'est une
// obligation des licences CC BY et CC BY-SA, et l'écran Crédits en dépend.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(join(root, "scripts/knot-steps.manifest.json"), "utf8"));

const UA = "CompagnonPeche/1.0 (offline fishing companion; personal project)";

// Même calcul d'URL que scripts/fetch-images.mjs : le nom de fichier donne le
// chemin CDN par son MD5, donc aucun appel d'API et aucun risque de quota.
// Wikimedia n'autorise qu'une liste de largeurs — 1280 en fait partie, pas 900.
function thumbUrl(filename, width) {
  const name = filename.replace(/^File:/, "").replace(/ /g, "_");
  const md5 = createHash("md5").update(name).digest("hex");
  const dir = `${md5[0]}/${md5.slice(0, 2)}`;
  const enc = encodeURI(name).replace(/[?#]/g, (c) => "%" + c.charCodeAt(0).toString(16));
  const suffix = name.toLowerCase().endsWith(".svg") ? ".png" : "";
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${enc}/${width}px-${enc}${suffix}`;
}

// Repli exponentiel sur 429/503, comme fetch-images.mjs : le CDN limite le
// débit, et une découpe interrompue à mi-parcours laisse un knot-steps.gen.ts
// incomplet que le test « autant d'images que de gestes » signalerait à tort
// comme une erreur de découpage.
async function download(filename, attempt = 0) {
  const res = await fetch(thumbUrl(filename, 1280), {
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  if (res.status === 429 || res.status === 503) {
    if (attempt >= 4) throw new Error(`HTTP ${res.status} pour ${filename}, après relances`);
    const wait = Math.min(60000, 8000 * Math.pow(2, attempt));
    console.log(`  … ${res.status}, nouvelle tentative dans ${Math.round(wait / 1000)} s`);
    await sleep(wait);
    return download(filename, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${filename}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Une vignette : fond blanc aplati, jamais agrandie, bornée à 900 px de large. */
async function ecrire(pipeline, outPath) {
  await pipeline
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 88 })
    .toFile(outPath);
}

const outDir = join(root, "public/assets/knots-steps");
await mkdir(outDir, { recursive: true });
const steps = {};

for (const p of manifest.planches) {
  const attribution = { author: p.author, license: p.license, sourceUrl: p.sourceUrl };
  const entries = [];

  if (p.files) {
    // Déjà une image par geste : rien à découper, seulement à convertir.
    for (let i = 0; i < p.files.length; i++) {
      const file = `assets/knots-steps/${p.id}-${i + 1}.webp`;
      const outPath = join(root, "public", file);
      if (!existsSync(outPath)) {
        await ecrire(sharp(await download(p.files[i]), { density: 200 }), outPath);
        console.log(`✓ ${p.id}-${i + 1}  (${p.license})`);
        await sleep(3000);
      } else console.log(`• ${p.id}-${i + 1}  (déjà présent)`);
      entries.push({ file, ...attribution });
    }
  } else {
    const buf = await download(p.filename);
    const meta = await sharp(buf, { density: 200 }).metadata();
    // `box` recadre AVANT la grille. Deux planches portent un bandeau de titre
    // en pied et un cadre de couleur : sans ce recadrage, la dernière ligne de
    // la grille emporterait le titre et chaque vignette une bande colorée.
    const b = p.box ?? { left: 0, top: 0, width: 1, height: 1 };
    const zone = {
      left: Math.round(b.left * meta.width),
      top: Math.round(b.top * meta.height),
      width: Math.round(b.width * meta.width),
      height: Math.round(b.height * meta.height),
    };
    const { cols, rows } = p.grid;
    const cw = Math.floor(zone.width / cols);
    const ch = Math.floor(zone.height / rows);
    const drop = new Set(p.drop ?? []);
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (drop.has(r * cols + c)) continue;
        n++;
        const file = `assets/knots-steps/${p.id}-${n}.webp`;
        const outPath = join(root, "public", file);
        if (!existsSync(outPath)) {
          await ecrire(
            sharp(buf, { density: 200 }).extract({
              left: zone.left + c * cw,
              top: zone.top + r * ch,
              width: cw,
              height: ch,
            }),
            outPath,
          );
          console.log(`✓ ${p.id}-${n}  (${p.license})`);
        } else console.log(`• ${p.id}-${n}  (déjà présent)`);
        entries.push({ file, ...attribution });
      }
    }
    await sleep(3000);
  }
  steps[p.id] = entries;
}

const body = `// GENERATED by scripts/crop-knot-steps.mjs — do not edit by hand.
// Une image par geste, dans l'ordre des \`steps\` de src/data/knots.ts.
// Chaque vignette porte l'auteur, la licence et la page source de sa planche mère :
// l'attribution doit survivre à la découpe.
import type { MediaEntry } from "./media";

export const KNOT_STEPS: Record<string, MediaEntry[]> = ${JSON.stringify(steps, null, 2)};
`;
await writeFile(join(root, "src/data/knot-steps.gen.ts"), body, "utf8");
console.log(`\nÉcrit src/data/knot-steps.gen.ts — ${Object.keys(steps).length} séquences.`);
