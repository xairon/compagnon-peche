// Downloads free-licensed images from Wikimedia Commons (verified by research),
// resizes them to a mobile-friendly WebP, and generates src/data/media.ts with
// attribution. Run: node scripts/fetch-images.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(join(root, "scripts/images.manifest.json"), "utf8"));

const UA = "CompagnonPeche/1.0 (offline fishing companion; personal project)";

async function get(url, attempt = 0) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (res.status === 429 || res.status === 503) {
    if (attempt >= 4) throw new Error(`HTTP ${res.status} after retries`);
    const wait = Math.min(60000, 8000 * Math.pow(2, attempt));
    console.log(`  … ${res.status}, nouvelle tentative dans ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    return get(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

// Compute the CDN thumbnail URL directly from the filename's MD5 — no API call,
// so no rate-limiting. Served by upload.wikimedia.org (a CDN). SVGs get a .png thumb.
function thumbUrl(filename, width) {
  const name = filename.replace(/^File:/, "").replace(/ /g, "_");
  const md5 = createHash("md5").update(name).digest("hex");
  const dir = `${md5[0]}/${md5.slice(0, 2)}`;
  const enc = encodeURI(name).replace(/[?#]/g, (c) => "%" + c.charCodeAt(0).toString(16));
  const isSvg = name.toLowerCase().endsWith(".svg");
  const thumbName = `${width}px-${enc}${isSvg ? ".png" : ""}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${enc}/${thumbName}`;
}

async function download(filename, width) {
  const res = await get(thumbUrl(filename, width));
  return Buffer.from(await res.arrayBuffer());
}

async function processGroup(items, kind, subdir) {
  const outDir = join(root, "public/assets", subdir);
  await mkdir(outDir, { recursive: true });
  const media = {};
  for (const it of items) {
    const file = `assets/${subdir}/${it.id}.webp`;
    const outPath = join(root, "public", file);
    // Idempotent: keep already-processed images so re-runs resume after a throttle.
    if (existsSync(outPath)) {
      media[it.id] = { file, author: it.author, license: it.license, sourceUrl: it.file_page_url };
      console.log(`• ${kind}/${it.id}  (déjà présent)`);
      continue;
    }
    // Knots are labelled diagrams (fit inside); everything else is a photo (cover-crop).
    const isDiagram = kind === "knot";
    try {
      // Wikimedia only serves an allow-listed set of thumbnail widths (960 & 1280 are valid).
      const buf = await download(it.filename, isDiagram ? 1280 : 960);
      let img = sharp(buf, { density: 200 }).rotate();
      if (!isDiagram) {
        // Photos: crop to a consistent 4:3 thumbnail (species, dishes, techniques).
        img = img.resize({ width: 900, height: 648, fit: "cover", position: "centre" });
      } else {
        // Knot diagrams: never crop labels — fit inside on a white background.
        img = img
          .resize({ width: 1000, height: 750, fit: "inside", withoutEnlargement: true })
          .flatten({ background: "#ffffff" });
      }
      await img.webp({ quality: 84 }).toFile(outPath);
      media[it.id] = {
        file,
        author: it.author,
        license: it.license,
        sourceUrl: it.file_page_url,
      };
      console.log(`✓ ${kind}/${it.id}  (${it.license})`);
      await sleep(3000); // be polite to Wikimedia between downloads
    } catch (e) {
      console.error(`✗ ${kind}/${it.id}: ${e.message}`);
    }
  }
  return media;
}

// Species support MULTIPLE photos (adult + juvenile…) for a gallery: each entry
// may carry an `extra` array of {filename, author, license, file_page_url, caption}.
// Files are <id>.webp, <id>-2.webp, … and SPECIES_MEDIA maps id -> MediaEntry[].
async function processSpecies(items) {
  const outDir = join(root, "public/assets/species");
  await mkdir(outDir, { recursive: true });
  const media = {};
  for (const it of items) {
    const photos = [
      { filename: it.filename, author: it.author, license: it.license, file_page_url: it.file_page_url, caption: it.caption },
      ...(it.extra || []),
    ].filter((p) => p.filename);
    const entries = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const file = `assets/species/${it.id}${i === 0 ? "" : "-" + (i + 1)}.webp`;
      const outPath = join(root, "public", file);
      if (!existsSync(outPath)) {
        try {
          const buf = await download(p.filename, 960);
          await sharp(buf, { density: 200 })
            .rotate()
            .resize({ width: 900, height: 648, fit: "cover", position: "centre" })
            .webp({ quality: 84 })
            .toFile(outPath);
          console.log(`✓ species/${it.id}${i ? "-" + (i + 1) : ""}  (${p.license})`);
          await sleep(3000);
        } catch (e) {
          console.error(`✗ species/${it.id}#${i + 1}: ${e.message}`);
          continue;
        }
      } else {
        console.log(`• species/${it.id}${i ? "-" + (i + 1) : ""}  (déjà présent)`);
      }
      const e = { file, author: p.author, license: p.license, sourceUrl: p.file_page_url };
      if (p.caption) e.caption = p.caption;
      entries.push(e);
    }
    if (entries.length) media[it.id] = entries;
  }
  return media;
}

const speciesMedia = await processSpecies(manifest.species || []);
const knotMedia = await processGroup(manifest.knots || [], "knot", "knots");
const recipeMedia = await processGroup(manifest.recipes || [], "recipe", "recipes");
const techMedia = await processGroup(manifest.techniques || [], "technique", "techniques");

const body = `// GENERATED by scripts/fetch-images.mjs — do not edit by hand.
// Each entry points to a locally-embedded image plus its licence attribution.
// Only free licences are accepted (CC0 / Public domain / CC BY / CC BY-SA).

export interface MediaEntry {
  file: string; // path under public/, e.g. "assets/species/sandre.webp"
  author: string;
  license: string;
  sourceUrl: string;
  caption?: string; // e.g. "Adulte" / "Juvénile" (shown in the species gallery)
}

// Species carry an ARRAY of photos (adult, juvenile…) for a gallery.
export const SPECIES_MEDIA: Record<string, MediaEntry[]> = ${JSON.stringify(speciesMedia, null, 2)};

export const KNOT_MEDIA: Record<string, MediaEntry> = ${JSON.stringify(knotMedia, null, 2)};

export const RECIPE_MEDIA: Record<string, MediaEntry> = ${JSON.stringify(recipeMedia, null, 2)};

export const TECHNIQUE_MEDIA: Record<string, MediaEntry> = ${JSON.stringify(techMedia, null, 2)};
`;

await writeFile(join(root, "src/data/media.ts"), body, "utf8");
console.log(
  `\nWrote src/data/media.ts — ${Object.keys(speciesMedia).length} species, ${Object.keys(knotMedia).length} knots, ${Object.keys(recipeMedia).length} recipes, ${Object.keys(techMedia).length} techniques.`,
);
