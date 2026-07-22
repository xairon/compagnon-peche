// Species enrichment pipeline — RUN THIS ON A MACHINE WITH NETWORK ACCESS.
//   node scripts/enrich-species.mjs
//
// It enriches the app's ~78 freshwater-fish species with OFFICIAL, sourced data:
//   - TaxRef v18 (MNHN)            : official cd_nom + French vernacular name
//   - BDC-Statuts (via TaxRef API) : Liste Rouge nationale (UICN France) + national protection
//   - FISHMORPH (Brosse et al. 2021, figshare) : morphological traits
// and writes src/data/species-enrichment.ts (consumed by the species fiche).
//
// Runs in Node (no browser -> no CORS constraint). The TaxRef API can be flaky
// (MNHN had an outage) - the script degrades gracefully and writes what it got.
// Licences: TaxRef/BDC-Statuts = Licence Ouverte/Etalab | FISHMORPH = CC-BY (cite the paper).
//
// NOTE: this could not be tested in the authoring sandbox (no network there).
// If a field name differs from the live API, adjust the marked spots and re-run.

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const UA = { headers: { "User-Agent": "compagnon-peche-enrich/1.0" } };
const TAXREF = "https://taxref.mnhn.fr/api";
const FIGSHARE_ARTICLE = "14891412"; // FISHMORPH database

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 1. Read the app's species (id, latin, cdNom) from the source files ----
function parseSpecies(rel) {
  const txt = readFileSync(join(ROOT, rel), "utf8");
  const idRe = /["']?id["']?\s*:\s*"([^"]+)"/g;
  const marks = [];
  let m;
  while ((m = idRe.exec(txt))) marks.push({ id: m[1], index: m.index });
  const out = [];
  for (let i = 0; i < marks.length; i++) {
    const chunk = txt.slice(marks[i].index, i + 1 < marks.length ? marks[i + 1].index : txt.length);
    const latin = /["']?latin["']?\s*:\s*"([^"]+)"/.exec(chunk)?.[1];
    const cdNom = /["']?cdNom["']?\s*:\s*"([^"]+)"/.exec(chunk)?.[1];
    if (latin) out.push({ id: marks[i].id, latin, cdNom });
  }
  return out;
}

function loadSpecies() {
  const byId = new Map();
  for (const rel of ["src/data/species-base.ts", "src/data/species.ts"]) {
    for (const sp of parseSpecies(rel)) byId.set(sp.id, { ...byId.get(sp.id), ...sp });
  }
  return [...byId.values()];
}

// ---- 2. TaxRef: resolve cd_nom + official name + statuses ----
async function jget(url) {
  const r = await fetch(url, UA);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function resolveCdNom(latin) {
  // ADJUST if the live shape differs: _embedded.taxa[].referenceId (cd_nom of valid taxon).
  const j = await jget(`${TAXREF}/taxa/search?scientificNames=${encodeURIComponent(latin)}&page=1&size=1`);
  const arr = j?._embedded?.taxa || j?._embedded?.taxons || j?.taxa || [];
  const t = arr[0];
  if (!t) return null;
  return { cdNom: String(t.referenceId ?? t.id ?? t.cdNom), name: t.frenchVernacularName || t.frenchName || "" };
}

async function fetchStatuses(cdNom) {
  // ADJUST: _embedded.status[] with statusTypeName / statusCode / statusName / locationName.
  const j = await jget(`${TAXREF}/taxa/${cdNom}/status/lines`);
  const lines = j?._embedded?.status || j?._embedded?.statusLines || [];
  let redList = null;
  let redListLabel = null;
  let protectedNat = false;
  for (const s of lines) {
    const type = (s.statusTypeName || s.statusType || "").toLowerCase();
    const loc = (s.locationName || s.locationAdminName || "").toLowerCase();
    const national = loc.includes("france") || loc.includes("national") || loc.includes("metropol") || loc.includes("métropol");
    if (type.includes("liste rouge") && national && !redList) {
      redList = s.statusCode || null;
      redListLabel = s.statusName || null;
    }
    if (type.includes("protection") && national) protectedNat = true;
  }
  return { redList, redListLabel, protected: protectedNat };
}

// ---- 3. FISHMORPH (figshare) ----
async function fetchFishmorph() {
  try {
    const art = await jget(`https://api.figshare.com/v2/articles/${FIGSHARE_ARTICLE}`);
    const files = art.files || [];
    const f = files.find((x) => /\.(csv|txt|tab|tsv)$/i.test(x.name)) || files[0];
    if (!f) return new Map();
    const txt = await (await fetch(f.download_url, UA)).text();
    return parseFishmorph(txt);
  } catch (e) {
    console.warn("  FISHMORPH unavailable:", e.message);
    return new Map();
  }
}

function parseFishmorph(txt) {
  const firstLine = txt.split(/\r?\n/)[0];
  // Detect delimiter by which one splits the header into the most columns.
  const cand = ["\t", ";", ","];
  const delim = cand.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = txt.split(/\r?\n/).filter(Boolean).map((l) => l.split(delim));
  const header = rows[0].map((h) => h.trim());
  const nameIdx = header.findIndex((h) => /species|binom|taxon|name/i.test(h));
  const byLatin = new Map();
  if (nameIdx < 0) return byLatin;
  for (const r of rows.slice(1)) {
    const latin = (r[nameIdx] || "").trim().replace(/_/g, " ");
    if (!latin) continue;
    const traits = {};
    header.forEach((h, i) => {
      if (i === nameIdx) return;
      const v = parseFloat(String(r[i]).replace(",", "."));
      if (!isNaN(v)) traits[h] = v;
    });
    byLatin.set(latin.toLowerCase(), traits);
  }
  return byLatin;
}

// ---- main ----
async function main() {
  const species = loadSpecies();
  console.log(`Loaded ${species.length} species from source.`);
  console.log("Fetching FISHMORPH...");
  const morphMap = await fetchFishmorph();
  console.log(`  FISHMORPH: ${morphMap.size} species.`);

  const enrichment = {};
  for (const sp of species) {
    const e = { source: "INPN/MNHN TaxRef v18 & BDC-Statuts (Licence Ouverte)" };
    try {
      let cdNom = sp.cdNom;
      let official = null;
      if (!cdNom) {
        const res = await resolveCdNom(sp.latin);
        if (res) {
          cdNom = res.cdNom;
          official = res.name;
        }
      }
      if (cdNom) {
        e.cdNom = String(cdNom);
        try {
          const t = await jget(`${TAXREF}/taxa/${cdNom}`);
          official = t.frenchVernacularName || official;
        } catch { /* ignore */ }
        if (official) e.nameOfficial = official;
        try {
          const st = await fetchStatuses(cdNom);
          if (st.redList) {
            e.redList = st.redList;
            if (st.redListLabel) e.redListLabel = st.redListLabel;
          }
          if (st.protected) e.protected = true;
        } catch (err) {
          console.warn(`  statuses ${sp.id}:`, err.message);
        }
      }
    } catch (err) {
      console.warn(`  taxref ${sp.id} (${sp.latin}):`, err.message);
    }
    const key = sp.latin.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
    const morph = morphMap.get(sp.latin.toLowerCase()) || morphMap.get(key);
    if (morph && Object.keys(morph).length) {
      e.morph = morph;
      e.morphSource = "FISHMORPH (Brosse et al. 2021, CC-BY)";
    }
    if (e.cdNom || e.redList || e.protected || e.morph) {
      enrichment[sp.id] = e;
      console.log(`  ok ${sp.id}: cd_nom=${e.cdNom || "?"} redList=${e.redList || "-"} morph=${e.morph ? "y" : "-"}`);
    }
    await sleep(120);
  }

  const out =
    "// GENERATED by scripts/enrich-species.mjs - do not edit by hand.\n" +
    "// Official conservation/taxonomy (INPN/MNHN, Licence Ouverte) + morphology (FISHMORPH, CC-BY).\n" +
    'import type { SpeciesEnrichment } from "../types";\n\n' +
    `export const SPECIES_ENRICHMENT: Record<string, SpeciesEnrichment> = ${JSON.stringify(enrichment, null, 2)};\n`;
  writeFileSync(join(ROOT, "src/data/species-enrichment.ts"), out);
  console.log(`\nWrote src/data/species-enrichment.ts with ${Object.keys(enrichment).length} enriched species.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
