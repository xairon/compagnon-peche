// Proposes better free-licensed species photos from Wikimedia Commons.
// For every species in images.manifest.json it searches Commons by the Latin
// binomial, keeps only free-licensed landscape raster photos, scores them, and
// writes scripts/species-proposals.json (current vs. best candidate + preview
// URL). NOTHING is downloaded or applied here — review, then edit the manifest.
//
// Run: node scripts/curate-species-images.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "CompagnonPeche/1.0 (offline fishing companion; personal project)";

// ---- Build id -> Latin map from the species source files ----
function latinMap(ts, map) {
  // curated (unquoted keys): id: "x" ... latin: "Y"
  for (const m of ts.matchAll(/id:\s*["']([^"']+)["'][\s\S]{0,160}?latin:\s*["']([^"']+)["']/g))
    map[m[1]] ??= m[2];
  // generated JSON (quoted keys): "id": "x" ... "latin": "Y"
  for (const m of ts.matchAll(/"id":\s*"([^"]+)"[\s\S]{0,160}?"latin":\s*"([^"]+)"/g))
    map[m[1]] ??= m[2];
  return map;
}
const idLatin = {};
for (const f of ["src/data/species.ts", "src/data/species-base.ts"]) {
  try {
    latinMap(await readFile(join(root, f), "utf8"), idLatin);
  } catch {
    /* ignore */
  }
}

const manifest = JSON.parse(await readFile(join(root, "scripts/images.manifest.json"), "utf8"));

async function get(url, attempt = 0) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if ((res.status === 429 || res.status === 503) && attempt < 4) {
    await sleep(6000 * Math.pow(2, attempt));
    return get(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const stripHtml = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Free-license machine codes from extmetadata.License / LicenseShortName.
function freeLicense(md) {
  const code = (md?.License?.value || "").toLowerCase();
  const short = (md?.LicenseShortName?.value || "").toLowerCase();
  if (/(^|[^a-z])(cc0|cc-by|cc-by-sa|pdm)/.test(code)) return true;
  if (code === "pd" || code.startsWith("pd-")) return true;
  if (/public domain|cc0|cc by|no restrictions/.test(short)) return true;
  return false;
}
function licenseLabel(md) {
  const short = stripHtml(md?.LicenseShortName?.value);
  if (short) return short;
  const code = (md?.License?.value || "").toUpperCase();
  return code || "?";
}

const BAD = /(map|distribution|range|locator|stamp|drawing|illustration|skeleton|bone|scute|otolith|larva|egg|parasite|diagram|chart|logo|icon)/i;

function scoreCandidate(c, latin) {
  const ar = c.width / c.height;
  let s = 0;
  // Resolution (capped).
  s += Math.min(3, c.width / 900);
  // Landscape aspect close to 3:2 is ideal for a lateral fish shot.
  if (ar >= 1.15 && ar <= 2.8) s += 2 - Math.abs(ar - 1.55);
  else s -= 2;
  // Filename mentions the binomial → very likely a clean specimen shot.
  const genus = latin.split(" ")[0].toLowerCase();
  const species = (latin.split(" ")[1] || "").toLowerCase();
  const title = c.title.toLowerCase();
  if (title.includes(genus) && species && title.includes(species)) s += 1.5;
  else if (title.includes(genus)) s += 0.4;
  if (/\.jpg|\.jpeg/i.test(c.title)) s += 0.3;
  return s;
}

async function candidatesFor(latin) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=25" +
    `&gsrsearch=${encodeURIComponent(latin)}` +
    "&prop=imageinfo&iiprop=extmetadata|url|size|mime&iiurlwidth=480";
  const data = await get(url);
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const md = ii.extmetadata || {};
    if (!/image\/(jpeg|png)/.test(ii.mime || "")) continue;
    if (BAD.test(p.title)) continue;
    if (!freeLicense(md)) continue;
    if (!ii.width || ii.width < 700) continue;
    if (ii.width <= ii.height) continue; // portrait → skip
    out.push({
      title: p.title,
      width: ii.width,
      height: ii.height,
      author: stripHtml(md.Artist?.value) || "?",
      license: licenseLabel(md),
      descUrl: ii.descriptionurl,
      thumb: ii.thumburl,
    });
  }
  for (const c of out) c.score = scoreCandidate(c, latin);
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 4);
}

const proposals = [];
for (const it of manifest.species) {
  const latin = idLatin[it.id];
  if (!latin) {
    console.log(`? ${it.id}: pas de nom latin trouvé — ignoré`);
    continue;
  }
  try {
    const cands = await candidatesFor(latin);
    const best = cands[0] || null;
    const currentFile = it.filename.replace(/^File:/, "").replace(/ /g, "_");
    const bestFile = best ? best.title.replace(/^File:/, "").replace(/ /g, "_") : null;
    proposals.push({
      id: it.id,
      latin,
      current: { filename: it.filename, author: it.author, license: it.license },
      changed: bestFile && bestFile !== currentFile,
      best,
      alts: cands.slice(1),
    });
    console.log(
      `• ${it.id.padEnd(26)} ${best ? best.score.toFixed(1) : "—"}  ${best ? best.title.replace(/^File:/, "") : "(aucun candidat)"}`,
    );
    // Persist after each species so a mid-run stop still leaves usable output.
    await writeFile(join(root, "scripts/species-proposals.json"), JSON.stringify(proposals, null, 2), "utf8");
    await sleep(1000);
  } catch (e) {
    console.error(`✗ ${it.id}: ${e.message}`);
    await sleep(1500);
  }
}

await writeFile(join(root, "scripts/species-proposals.json"), JSON.stringify(proposals, null, 2), "utf8");
const changed = proposals.filter((p) => p.changed).length;
console.log(`\nÉcrit scripts/species-proposals.json — ${proposals.length} espèces, ${changed} avec un candidat différent.`);
