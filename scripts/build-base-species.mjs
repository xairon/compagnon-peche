// Pipeline: reads the verified species lists (scripts/species-list/*.json),
// drops species already curated by hand, and generates src/data/species-base.ts —
// "base" fiches (taxonomy + regulation-by-rule + a bio stub) for full national coverage.
// Run: node scripts/build-base-species.mjs
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const binomial = (latin) => latin.toLowerCase().split(/\s+/).slice(0, 2).join(" ");

// Derive the curated ids + binomials from species.ts itself (the CURATED array),
// so adding a curated fiche never requires editing this script (no manual drift).
const speciesSrc = await readFile(join(root, "src/data/species.ts"), "utf8");
const curatedBlock = speciesSrc.slice(
  speciesSrc.indexOf("const CURATED"),
  speciesSrc.indexOf("export const SPECIES"),
);
if (!curatedBlock) throw new Error("Could not locate the CURATED array in species.ts");
const CURATED_IDS = new Set([...curatedBlock.matchAll(/^\s{4}id: "([^"]+)"/gm)].map((m) => m[1]));
const CURATED_BINOMIALS = new Set(
  [...curatedBlock.matchAll(/^\s{4}latin: "([^"]+)"/gm)].map((m) => binomial(m[1])),
);
console.log(`Curées détectées : ${CURATED_IDS.size} ids, ${CURATED_BINOMIALS.size} binômes.`);

function mailleRow(maille) {
  if (/^\d+\s*cm$/.test(maille)) return [maille, "national (R436-18)", `${maille} (national, R436-18)`];
  if (maille === "—") return ["—", "pas de maille nationale", "Aucune taille légale nationale"];
  if (/sp[ée]ciale/i.test(maille)) return ["spéciale", "réglementation spéciale", "Réglementation spéciale (voir statut)"];
  return [maille, "voir réglementation", maille];
}

const SEASON_DESC = {
  toujours: "2ᵉ cat. : ouverte toute l'année",
  cat1: "1ʳᵉ cat. : 2ᵉ samedi de mars → 3ᵉ dimanche de septembre",
  brochet: "Fermeture spécifique brochet (voir réglementation)",
  "invasive-year": "Ouverte toute l'année",
};

// Generic technique per group, so every fiche has a "Pêcher" section.
const FISH_BY_GROUP = {
  carnassiers: [
    ["Techniques", "Leurres (souples, poissons-nageurs, cuiller), pêche au vif"],
    ["Postes", "Cassures, obstacles immergés, herbiers, veines de courant"],
    ["Moment", "Souvent plus actif à l'aube et au crépuscule"],
  ],
  cyprinides: [
    ["Techniques", "Pêche au coup, feeder, à l'anglaise, avec amorçage"],
    ["Appâts", "Asticot, ver, graines, maïs, pain"],
    ["Postes", "Eaux calmes, bordures, fonds nourriciers"],
  ],
  salmonides: [
    ["Techniques", "Pêche à la mouche, au toc, petits leurres (cuiller, vairon)"],
    ["Milieu", "Eaux vives, fraîches et oxygénées (1ʳᵉ catégorie)"],
    ["Éthique", "Souvent no-kill / quotas stricts — vérifiez localement"],
  ],
  migrateurs: [
    ["Techniques", "Selon l'espèce ; pêche souvent très réglementée ou fermée"],
    ["Rappel", "Nombreux migrateurs protégés ou sous quota — vérifiez l'arrêté"],
  ],
  autres: [
    ["Statut", "Petite espèce, rarement ciblée ; parfois utilisée comme vif"],
    ["Postes", "Fonds et bordures des rivières et ruisseaux"],
  ],
};

const FISH_PROTECTED = [
  ["À savoir", "Espèce protégée ou menacée — à ne pas cibler."],
  ["Bon geste", "Relâchez immédiatement toute capture accidentelle, mains mouillées."],
];

// Base species that count toward the R436-21 3-carnassier daily limit. Mirrors
// QUOTA_CARNASSIERS in src/lib/helpers.ts for the base tier (the main predators
// are curated in species.ts). BROCHET_QUOTA_IDS are those that also count in the
// 2-brochets-max sub-limit. Kept in sync so a fiche's quota row never contradicts
// the Prise decision engine.
const CARNASSIER_QUOTA_IDS = new Set(["black-bass-petite-bouche", "brochet-aquitain"]);
const BROCHET_QUOTA_IDS = new Set(["brochet-aquitain"]);

function toBase(s) {
  const [maille, mailleSub, mailleDesc] = mailleRow(s.maille || "—");
  const season = s.season || "toujours";
  const inCarnassierQuota = CARNASSIER_QUOTA_IDS.has(s.id);
  const quotaText = !inCarnassierQuota
    ? "Aucun quota national spécifique"
    : BROCHET_QUOTA_IDS.has(s.id)
      ? "Compte dans les 3 carnassiers/jour (2 brochets max, R436-21)"
      : "Compte dans les 3 carnassiers/jour (R436-21)";
  // The arrêté du 8 déc. 1988 protects eggs/spawning grounds, not adult capture —
  // and not every protected species is on it (some are Habitats/CITES). Keep the
  // status honest and general; the per-species `note` carries the exact instrument.
  // `moratoire` = amphihaline migrator whose ADULTS are legally fished under
  // moratorium/quota by basin (aloses, lamproies marine/rivière): not a blanket
  // no-take, so it must NOT get the strict "protégée — remise à l'eau" treatment
  // (which would contradict the "réglementé" comestibilité panel on the same fiche).
  const statut = s.protected
    ? "Espèce protégée / menacée — remise à l'eau"
    : s.moratoire
      ? "Migrateur réglementé — pêche sous moratoire/quota selon le bassin"
      : s.invasive
        ? "Susceptible de déséquilibres (R432-5)"
        : "Aucun statut national particulier";
  const alert = s.moratoire
    ? {
        title: "Migrateur réglementé",
        text: "Pêche sous moratoire ou quota selon le bassin (souvent fermée). Ne conservez la capture que si l'arrêté préfectoral l'autorise ; sinon remise à l'eau soignée.",
      }
    : undefined;
  return {
    id: s.id,
    name: s.name,
    latin: s.latin,
    group: s.group,
    family: s.family,
    cdNom: s.cd_nom || undefined,
    maille,
    mailleSub,
    quota: "—",
    quotaSub: inCarnassierQuota ? "carnassiers cumulés" : "—",
    season,
    depth: "base",
    protected: s.protected || undefined,
    invasive: s.invasive || undefined,
    alert,
    reg: {
      rows: [
        ["Maille", mailleDesc],
        [
          "Quota",
          quotaText,
        ],
        ["Statut", statut],
        ["Période", SEASON_DESC[season] || SEASON_DESC.toujours],
      ],
      note: "Socle national ; un arrêté préfectoral peut être plus strict. Vérifiez localement.",
      src:
        "Legifrance R436-18 · R436-21" +
        (s.protected ? " · statut de protection (voir remarque)" : "") +
        (s.moratoire ? " · statut migrateur (voir remarque)" : ""),
    },
    fish: { rows: s.protected ? FISH_PROTECTED : FISH_BY_GROUP[s.group] || FISH_BY_GROUP.autres },
    bio: { rows: [["Famille", s.family || "—"], ["Remarque", s.note || "—"]] },
  };
}

const dir = join(root, "scripts/species-list");
// Only species-list arrays are inputs. Files prefixed "_" are reference data
// (verified rosters / edibility) — objects, not arrays — so they are skipped.
const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
const seen = new Set();
const seenIds = new Set();
const base = [];
let skipped = 0;
for (const f of files) {
  const arr = JSON.parse(await readFile(join(dir, f), "utf8"));
  for (const s of arr) {
    if (!s.id || !s.latin) {
      console.warn(`  ! ligne ignorée (id/latin manquant) dans ${f}`);
      continue;
    }
    const bin = binomial(s.latin);
    // Skip curated species (by id or binomial) and any already-emitted id/binomial.
    if (
      CURATED_IDS.has(s.id) ||
      CURATED_BINOMIALS.has(bin) ||
      seen.has(bin) ||
      seenIds.has(s.id)
    ) {
      skipped++;
      continue;
    }
    seen.add(bin);
    seenIds.add(s.id);
    base.push(toBase(s));
  }
}

base.sort((a, b) => a.name.localeCompare(b.name, "fr"));

const body = `// GENERATED by scripts/build-base-species.mjs — do not edit by hand.
// "Base" coverage: taxonomy + regulation-by-rule + bio stub for species not yet
// hand-curated. Merged after the curated SPECIES so the whole national list appears.
import type { Species } from "../types";

export const BASE_SPECIES: Species[] = ${JSON.stringify(base, null, 2)};
`;

await writeFile(join(root, "src/data/species-base.ts"), body, "utf8");
console.log(`Wrote src/data/species-base.ts — ${base.length} base species (${skipped} skipped as curated/dupes).`);
