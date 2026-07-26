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

function mailleRow(s) {
  const maille = s.maille || "—";
  const row = /^\d+\s*cm$/.test(maille)
    ? [maille, "national (R436-18)", `${maille} (national, R436-18)`]
    : maille === "—"
      ? ["—", "pas de maille nationale", "Aucune taille légale nationale"]
      : /sp[ée]ciale/i.test(maille)
        ? ["spéciale", "réglementation spéciale", "Réglementation spéciale (voir statut)"]
        : [maille, "voir réglementation", maille];
  // A species whose figure is in use without a clean national basis says so
  // rather than being announced as "national (R436-18)".
  if (s.maille_sub) row[1] = s.maille_sub;
  if (s.maille_desc) row[2] = s.maille_desc;
  return row;
}

const SEASON_DESC = {
  toujours: "2ᵉ cat. : ouverte toute l'année",
  cat1: "1ʳᵉ cat. : 2ᵉ samedi de mars → 3ᵉ dimanche de septembre",
  brochet: "Fermeture spécifique brochet (voir réglementation)",
  "invasive-year": "Ouverte toute l'année",
  // Sans cette entrée, une espèce en régime `special` retombait sur le libellé
  // « ouverte toute l'année » — le contraire de ce que le régime signifie.
  special: "Régime spécial — voir l'arrêté préfectoral / de bassin",
};

/**
 * Legal regimes, verified against the primary texts (audit 2026-07).
 *
 * `protected` now means ONE thing: a national text forbids KEEPING the animal.
 * That verdict is read by lib/prise as a red "RELÂCHER — ne pas conserver", so
 * it may only rest on a text that actually says so.
 *
 * The arrêté du 8 décembre 1988 does NOT say so. Its article 1 forbids exactly
 * two things — "la destruction ou l'enlèvement des oeufs" and "la destruction,
 * l'altération ou la dégradation des milieux particuliers, et notamment des
 * lieux de reproduction, désignés par arrêté préfectoral" — for a list that
 * also contains the pike, the trout and the grayling, all legally kept every
 * day. Habitats Annex II is a site-designation instrument, not a take ban.
 *
 * So those species are `encadre` instead: `season: "special"` + an alert, which
 * lib/statut and lib/prise render as "RÉGLEMENTATION SPÉCIALE — vérifiez
 * l'arrêté". Never a green light, never a false prohibition either.
 */
const NO_TAKE = {
  // Arrêté du 20 déc. 2004 (JORFTEXT000000259841), art. 1er & 3 — replaced the
  // arrêté du 25 janv. 1982, abrogated on 2005-01-07.
  "esturgeon-2004": {
    statut: "Capture, détention et transport interdits (arrêté 20 déc. 2004)",
    titre: "Capture et détention interdites",
    alerte:
      "L'arrêté du 20 décembre 2004 interdit la capture, l'enlèvement, la perturbation intentionnelle, le transport, la détention, la vente et l'achat de l'esturgeon européen. Toute capture accidentelle doit être remise à l'eau immédiatement.",
    src: "arrêté 20 déc. 2004",
  },
  // Directive 92/43/CEE annexe IV(a) : "toute forme de capture ou de mise à
  // mort intentionnelle" est interdite. Le seul poisson d'eau douce de France
  // métropolitaine concerné avec l'esturgeon. La transposition française
  // (arrêté 8 déc. 1988) ne couvre que les œufs et les frayères : le drapeau
  // est maintenu par prudence, l'incertitude est documentée dans l'audit.
  "habitats-an4": {
    statut: "Protection stricte — Directive Habitats an. IV (capture interdite)",
    titre: "Protection stricte",
    alerte:
      "Espèce inscrite à l'annexe IV de la directive Habitats (protection stricte : capture intentionnelle interdite) et à l'annexe II de la convention de Berne ; l'arrêté du 8 décembre 1988 y ajoute la protection des œufs et des frayères. En danger critique d'extinction : remise à l'eau immédiate de toute capture accidentelle.",
    src: "Directive Habitats an. IV · arrêté 8 déc. 1988",
  },
};

const ENCADRE = {
  "oeufs-1988": {
    statut:
      "Œufs et frayères protégés (arrêté 8 déc. 1988) — pas d'interdiction nationale de conserver l'adulte",
    titre: "Œufs et frayères protégés",
    alerte:
      "L'arrêté du 8 décembre 1988 interdit la destruction ou l'enlèvement des œufs et la dégradation des frayères ; il ne prononce aucune interdiction de capturer ou de conserver l'adulte. Mais l'arrêté préfectoral de votre département peut, lui, restreindre la conservation ou l'usage comme vif : vérifiez-le avant de garder la capture.",
    src: "arrêté 8 déc. 1988 (œufs/frayères)",
  },
  "habitats-an2": {
    statut:
      "Directive Habitats an. II (désignation de sites) — aucune interdiction nationale de capture",
    titre: "Espèce d'intérêt communautaire",
    alerte:
      "Inscrite à l'annexe II de la directive Habitats, qui impose de désigner des sites de conservation et non d'interdire la capture ; l'arrêté du 8 décembre 1988 ne la vise pas. Aucun texte national n'interdit donc de la conserver, mais l'espèce est rare et un arrêté préfectoral peut la protéger localement : vérifiez-le, et privilégiez la remise à l'eau.",
    src: "Directive Habitats an. II",
  },
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
  ["À savoir", "Espèce protégée ou réglementée — à ne pas cibler."],
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
  const [maille, mailleSub, mailleDesc] = mailleRow(s);
  // The declared season stays in the source list (it describes the water
  // category), but a species under moratorium, under a "regulated, not
  // no-take" regime, or a sosie of a strictly protected species must never
  // reach a plain green "PÊCHE OUVERTE" verdict: `special` is what lib/statut
  // and lib/prise read to say "vérifiez l'arrêté". Derived here rather than
  // written by hand in the generated file — that hand edit is exactly what a
  // regeneration silently reverted once before.
  //
  // Deux notions distinctes, et c'est volontaire :
  //   · `declaredSeason` = la catégorie piscicole réelle, ce que la ligne
  //     « Période » affiche (« 1ʳᵉ cat. : 2ᵉ samedi de mars → … » pour le saumon) ;
  //   · `season` = le régime que la logique applique, forcé à `special` pour
  //     que la pastille dise « Réglementée » et non « Ouverte ».
  const declaredSeason = s.season || "toujours";
  const season = s.moratoire || s.encadre || s.sosieDe ? "special" : declaredSeason;
  const inCarnassierQuota = CARNASSIER_QUOTA_IDS.has(s.id);
  const quotaText = !inCarnassierQuota
    ? "Aucun quota national spécifique"
    : BROCHET_QUOTA_IDS.has(s.id)
      ? "Compte dans les 3 carnassiers/jour (2 brochets max, R436-21)"
      : "Compte dans les 3 carnassiers/jour (R436-21)";
  // Exactly one regime applies, and each one names the text it rests on (see
  // NO_TAKE / ENCADRE above). `moratoire` = amphihaline migrator whose ADULTS
  // are legally fished under moratorium/quota by basin (aloses, lamproies
  // marine/rivière, saumon): not a blanket no-take either.
  const regime = s.protected
    ? NO_TAKE[s.no_take]
    : s.encadre
      ? ENCADRE[s.encadre]
      : undefined;
  if (s.protected && !regime) throw new Error(`${s.id}: "protected" sans "no_take" (base légale)`);
  if (s.encadre && !regime) throw new Error(`${s.id}: régime "encadre" inconnu — ${s.encadre}`);
  // `s.statut` est un échappatoire volontaire : le texte auto-généré pour une
  // invasive avec `invasive_basis` affirme "remise à l'eau vivante interdite",
  // vrai pour le règlement UE 1143/2014 (gambusie, pseudorasbora) mais FAUX
  // pour l'art. L432-10 (gobies ponto-caspiens, tête-de-boule) : ce texte
  // n'interdit que le déplacement, pas la remise à l'eau sur place. Sans cet
  // override, le générateur affirmerait une interdiction qui n'existe pas.
  const statut = s.statut
    ? s.statut
    : regime
      ? regime.statut
      : s.sosieDe
        ? `Non protégée, mais indissociable de ${s.sosieDe} (strictement protégé) — remise à l'eau et déclaration`
        : s.moratoire
          ? "Migrateur réglementé — pêche sous moratoire/quota selon le bassin"
          : s.invasive
            ? s.invasive_basis
              ? `Espèce exotique envahissante (${s.invasive_basis}) : remise à l'eau vivante interdite`
              : "Susceptible de déséquilibres (R432-5)"
            : "Aucun statut national particulier";
  const alert = regime
    ? { title: regime.titre, text: regime.alerte }
    : s.sosieDe
      ? {
          title: "À traiter comme une espèce protégée",
          text: `Cette espèce n'est pas protégée, mais on ne la distingue pas de ${s.sosieDe} sans expertise. Dans le doute, relâchez : se tromper dans l'autre sens tue un poisson en danger critique. Déclarez la capture sur sturio.eu.`,
        }
      : s.moratoire
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
    invasiveBasis: s.invasive_basis || undefined,
    alert,
    reg: {
      rows: [
        ["Maille", s.maille_desc || mailleDesc],
        [
          "Quota",
          quotaText,
        ],
        ["Statut", statut],
        // The declared season still describes the real period, even when the
        // effective regime is "special" (a chabot lives in 1ʳᵉ-catégorie water
        // whether or not its capture is regulated).
        ["Période", SEASON_DESC[declaredSeason] || SEASON_DESC.toujours],
      ],
      note: "Socle national ; un arrêté préfectoral peut être plus strict. Vérifiez localement.",
      src:
        "Legifrance R436-18 · R436-21" +
        (regime ? " · " + regime.src : "") +
        (s.moratoire ? " · statut migrateur (voir remarque)" : ""),
    },
    // A species nobody may simply keep gets no generic "how to fish it" block.
    // data/fiches strips it again for `special` — belt and braces, because the
    // stripped value is what once shipped a recipe under a red banner.
    fish: {
      rows:
        s.fish_rows ||
        (s.protected || s.encadre
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
