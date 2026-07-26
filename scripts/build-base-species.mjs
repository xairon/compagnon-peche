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
  // Sans cette entrée, une espèce en régime `special` retombait sur le libellé
  // « ouverte toute l'année » — le contraire de ce que le régime signifie.
  special: "Réglementation spéciale — vérifiez l'arrêté avant toute conservation",
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

// `sosie` = espèce NON protégée, mais qu'on ne sait pas distinguer sur le terrain
// d'une espèce strictement protégée.
//
// Le cas qui l'a imposé : les esturgeons d'élevage échappés (A. baerii, sterlet).
// La littérature donne deux consignes opposées — l'esturgeon européen doit être
// relâché et déclaré, l'esturgeon sibérien introduit « ne doit en aucun cas être
// relâché » — et la distinction entre les deux « est une affaire de spécialistes »
// (nombre d'écussons dorsaux, latéraux et ventraux).
//
// L'asymétrie des conséquences tranche : tuer un Acipenser sturio en le prenant
// pour un baerii est irréversible et frappe une espèce en danger critique ;
// relâcher un baerii est une incertitude écologique. La fiche dit donc « relâchez
// et déclarez », et l'espèce prend le régime `special` pour que la pastille
// n'affiche jamais un vert « ouverte ».
const FISH_SOSIE = (protegee) => [
  ["À savoir", `Indissociable de ${protegee} sans expertise — ne pas cibler.`],
  ["Bon geste", "Relâchez immédiatement, mains mouillées, sans sortir le poisson de l'eau plus que nécessaire."],
  ["Déclaration", "Notez taille, poids, date et lieu ; si le poisson porte une marque, laissez-la et notez le numéro. Déclarez sur sturio.eu."],
];

// Base species that count toward the R436-21 3-carnassier daily limit. Mirrors
// QUOTA_CARNASSIERS in src/lib/helpers.ts for the base tier (the main predators
// are curated in species.ts). BROCHET_QUOTA_IDS are those that also count in the
// 2-brochets-max sub-limit. Kept in sync so a fiche's quota row never contradicts
// the Prise decision engine.
const CARNASSIER_QUOTA_IDS = new Set(["black-bass-petite-bouche", "brochet-aquitain"]);
const BROCHET_QUOTA_IDS = new Set(["brochet-aquitain"]);

function toBase(s) {
  const [maille, mailleSubAuto, mailleDesc] = mailleRow(s.maille || "—");
  // Override ponctuel : le cristivomer a une maille nationale de 35 cm mais ne
  // vit que dans quelques grands lacs, où l'arrêté préfectoral fait foi. Dire
  // « national (R436-18) » tout court y était trompeur.
  const mailleSub = s.mailleSub || mailleSubAuto;
  // Un migrateur sous moratoire n'a PAS de période nationale simple : c'est la
  // définition même du régime `special` (voir SeasonRule dans src/types.ts), et
  // c'est ce qui empêche la pastille d'afficher un vert « ouverte » là où
  // l'arrêté de bassin dit l'inverse.
  //
  // Cette ligne était appliquée à la main dans le fichier généré : la première
  // régénération l'effaçait en silence, et six espèces sous moratoire — les
  // trois aloses, les deux lamproies pêchables, le saumon — repassaient
  // « ouvertes ». Elle vit ici désormais.
  //
  // Deux notions distinctes, et c'est volontaire :
  //   · `declaredSeason` = la catégorie piscicole réelle, ce que la ligne
  //     « Période » affiche (« 1ʳᵉ cat. : 2ᵉ samedi de mars → … » pour le saumon) ;
  //   · `season` = le régime que la logique applique, forcé à `special` sous
  //     moratoire pour que la pastille dise « Réglementée » et non « Ouverte ».
  // Les confondre effacerait l'information de catégorie ; les fusionner dans
  // l'autre sens rouvrirait les espèces sous moratoire.
  const declaredSeason = s.season || "toujours";
  const season = s.moratoire ? "special" : declaredSeason;
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
    : s.sosieDe
      ? `Non protégée, mais indissociable de ${s.sosieDe} (strictement protégé) — remise à l'eau et déclaration`
      : s.moratoire
        ? "Migrateur réglementé — pêche sous moratoire/quota selon le bassin"
        : s.invasive
          ? // Toutes les invasives ne relèvent pas de R432-5 : la gambusie et le
            // pseudorasbora sont des espèces exotiques envahissantes au sens du
            // règlement UE 1143/2014, pas de la liste R432-5. Citer R432-5 pour
            // elles serait une base légale fausse — d'où `invasive_basis`.
            s.invasive_basis
            ? `Espèce exotique envahissante (${s.invasive_basis})`
            : "Susceptible de déséquilibres (R432-5)"
          : "Aucun statut national particulier";
  const alert = s.moratoire
    ? {
        title: "Migrateur réglementé",
        text: "Pêche sous moratoire ou quota selon le bassin (souvent fermée). Ne conservez la capture que si l'arrêté préfectoral l'autorise ; sinon remise à l'eau soignée.",
      }
    : s.sosieDe
      ? {
          title: "À traiter comme une espèce protégée",
          text: `Cette espèce n'est pas protégée, mais on ne la distingue pas de ${s.sosieDe} sans expertise. Dans le doute, relâchez : se tromper dans l'autre sens tue un poisson en danger critique. Déclarez la capture sur sturio.eu.`,
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
    invasiveBasis: s.invasive_basis || undefined,
    alert,
    reg: {
      rows: [
        ["Maille", s.maille_desc || mailleDesc],
        [
          "Quota",
          quotaText,
        ],
        ["Statut", s.statut || statut],
        ["Période", SEASON_DESC[declaredSeason] || SEASON_DESC.toujours],
      ],
      note: "Socle national ; un arrêté préfectoral peut être plus strict. Vérifiez localement.",
      src:
        "Legifrance R436-18 · R436-21" +
        (s.protected ? " · statut de protection (voir remarque)" : "") +
        (s.moratoire ? " · statut migrateur (voir remarque)" : ""),
    },
    fish: {
      rows:
        s.fish_rows ||
        (s.protected
          ? FISH_PROTECTED
          : s.sosieDe
            ? FISH_SOSIE(s.sosieDe)
            : FISH_BY_GROUP[s.group] || FISH_BY_GROUP.autres),
    },
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
