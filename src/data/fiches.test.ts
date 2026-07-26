import { describe, it, expect } from "vitest";
import { FICHES, withFiche } from "./fiches";
import { BASE_SPECIES } from "./species-base";
import { SPECIES } from "./species";
import type { Species } from "../types";

/**
 * Une fiche n'ajoute QUE du descriptif. Elle ne doit jamais porter une maille,
 * un quota, une période ou un statut : ces valeurs viennent du générateur et
 * des modules de réglementation, et une seconde source pour une donnée légale
 * est exactement la fracture que cette app a mis longtemps à refermer.
 */
const INTERDITS = ["maille", "mailleSub", "quota", "quotaSub", "season", "protected", "invasive", "reg"];

describe("fiches — overlay descriptif", () => {
  it("aucune fiche ne porte de donnée réglementaire", () => {
    const fautes: string[] = [];
    for (const [id, f] of Object.entries(FICHES)) {
      for (const k of Object.keys(f)) {
        if (INTERDITS.includes(k)) fautes.push(`${id}.${k}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque fiche vise une espèce existante", () => {
    const ids = new Set(BASE_SPECIES.map((s) => s.id));
    const orphelines = Object.keys(FICHES).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });

  it("chaque fiche cite sa source", () => {
    const sans = Object.entries(FICHES)
      .filter(([, f]) => !f.ficheSrc || f.ficheSrc.trim() === "")
      .map(([id]) => id);
    expect(sans).toEqual([]);
  });

  it("une espèce enrichie ne reste pas étiquetée « base »", () => {
    for (const id of Object.keys(FICHES)) {
      const sp = SPECIES.find((s) => s.id === id)!;
      expect(sp.depth, `${id} ne doit plus être « base »`).toBeUndefined();
    }
  });

  it("l'overlay n'écrase jamais la réglementation de l'espèce", () => {
    for (const id of Object.keys(FICHES)) {
      const brut = BASE_SPECIES.find((s) => s.id === id)!;
      const sp = SPECIES.find((s) => s.id === id)!;
      expect(sp.maille).toBe(brut.maille);
      expect(sp.quota).toBe(brut.quota);
      expect(sp.season).toBe(brut.season);
      expect(sp.protected).toBe(brut.protected);
      expect(sp.invasive).toBe(brut.invasive);
    }
  });

  // Espèce synthétique, et non « la première du catalogue qui n'a pas de fiche » :
  // depuis que les 129 espèces « base » sont toutes couvertes, un tel candidat
  // n'existe plus dans les données réelles — c'est pour ça que ce test utilise
  // un objet fabriqué plutôt qu'un .find() sur BASE_SPECIES, qui renverrait
  // `undefined` et ferait planter le test au lieu de l'échouer proprement.
  it("withFiche laisse intacte une espèce sans overlay", () => {
    const inconnue: Species = {
      id: "espece-sans-fiche",
      name: "Espèce sans fiche",
      latin: "Testus absentis",
      group: "autres",
      maille: "—",
      mailleSub: "pas de maille nationale",
      quota: "—",
      quotaSub: "—",
      season: "toujours",
      depth: "base",
    };
    expect(withFiche(inconnue)).toEqual(inconnue);
  });

  // Le corollaire : plus aucune espèce « base » ne doit rester sans section
  // descriptive. C'est ce test qui dira qu'une régénération en a réintroduit une.
  it("chaque espèce « base » a reçu sa fiche", () => {
    const orphelines = BASE_SPECIES.filter((s) => !FICHES[s.id]).map((s) => s.id);
    expect(orphelines).toEqual([]);
  });

  /**
   * Sept des espèces curatées les plus emblématiques du catalogue — perche,
   * truite fario, carpe, gardon, barbeau, poisson-chat, black-bass — n'avaient
   * historiquement ni `fish`, ni `cook`, ni `bio` : seulement l'identification
   * et la santé. Un pêcheur ouvrant la fiche de la perche n'y trouvait ni où
   * la pêcher, ni comment la cuisiner, ni sa biologie. Ce test fige que ces
   * sept espèces — ordinaires, comestibles, sans raison de rester incomplètes
   * — ont bien les trois sections désormais.
   */
  it("les 7 espèces curatées historiquement incomplètes ont fish, cook et bio", () => {
    const ORDINAIRES = ["perche", "truite-fario", "carpe", "gardon", "barbeau", "poisson-chat", "black-bass"];
    for (const id of ORDINAIRES) {
      const sp = SPECIES.find((s) => s.id === id);
      expect(sp, `${id} doit exister`).toBeDefined();
      expect(sp?.fish, `${id}.fish`).toBeDefined();
      expect(sp?.cook, `${id}.cook`).toBeDefined();
      expect(sp?.bio, `${id}.bio`).toBeDefined();
    }
  });

  it("les confusions citées renvoient à des espèces réelles", () => {
    const noms = new Set(SPECIES.map((s) => s.name.toLowerCase()));
    const inconnues: string[] = [];
    for (const [id, f] of Object.entries(FICHES)) {
      for (const c of f.ident?.conf ?? []) {
        if (!noms.has(c.n.toLowerCase())) inconnues.push(`${id} → ${c.n}`);
      }
    }
    expect(inconnues).toEqual([]);
  });
});

/**
 * L'audit a montré que la garde précédente ne prouvait rien : elle vérifiait les
 * clés de premier niveau de `Fiche`, que TypeScript impose déjà. Elle n'a donc
 * pas vu qu'une fiche protégée portait une technique de pêche et une recette —
 * et c'était l'une des quatre fiches écrites comme exemple de référence.
 *
 * On teste désormais le RÉSULTAT servi à l'écran.
 */
describe("aucune technique de pêche sur une espèce qu'on ne doit pas pêcher", () => {
  it("aucune espèce protégée ne conserve de section « pêche » ou « cuisine »", () => {
    const fautes = SPECIES.filter((sp) => sp.protected && (sp.fish || sp.cook)).map((sp) => sp.id);
    expect(fautes).toEqual([]);
  });

  it("aucune espèce au régime spécial n'en conserve non plus", () => {
    const fautes = SPECIES.filter((sp) => sp.season === "special" && (sp.fish || sp.cook)).map(
      (sp) => sp.id,
    );
    expect(fautes).toEqual([]);
  });

  it("les espèces ordinaires gardent bien leurs sections", () => {
    const sandre = SPECIES.find((s) => s.id === "sandre")!;
    expect(sandre.fish).toBeDefined();
    expect(sandre.cook).toBeDefined();
  });
});

/**
 * Une fiche ne doit pas affirmer de règle de droit en texte libre : c'est une
 * seconde source pour une valeur légale, exactement la fracture que l'app a mis
 * longtemps à refermer — et l'audit en a trouvé une FAUSSE (« capture et
 * détention interdites » pour la lamproie de Planer, quand l'arrêté cité ne
 * protège que les œufs et les habitats).
 */
describe("aucune affirmation de droit dans le texte d'une fiche", () => {
  // Première version : une liste de tournures interdites. Elle a laissé passer
  // deux affirmations sur cinq, parce qu'il suffit d'écrire « pêche de l'adulte
  // fermée » au lieu de « pêche fermée » pour lui échapper. Chasser les
  // formulations est un jeu perdu d'avance.
  //
  // La vraie règle est structurelle : une fiche décrit un animal, pas son
  // régime juridique. Une ligne « Statut » dans la biologie n'a donc rien à y
  // faire — c'est là que les cinq se cachaient. La conservation (UICN, tendance
  // de population) reste légitime, sous son propre intitulé.
  it("aucune ligne « Statut » dans la biologie d'une fiche", () => {
    const fautes: string[] = [];
    for (const [id, f] of Object.entries(FICHES)) {
      for (const [k, v] of f.bio?.rows ?? []) {
        if (/^statut/i.test(k)) fautes.push(`${id} → ${k} : « ${v.slice(0, 60)}… »`);
      }
    }
    expect(fautes).toEqual([]);
  });

  const INTERDIT =
    /capture (et détention )?interdite|détention interdite|pêche[^.]{0,25}(fermée|interdite)|sous moratoire|remise à l'eau|protégée? par arrêté|quota|arrêté du \d/i;

  it("les sections descriptives ne prononcent pas d'interdiction", () => {
    const fautes: string[] = [];
    for (const [id, f] of Object.entries(FICHES)) {
      const textes = [
        f.ident?.summary,
        ...(f.ident?.traits ?? []),
        ...(f.ident?.conf ?? []).map((c) => c.how),
        ...(f.bio?.rows ?? []).map(([, v]) => v),
        f.cook?.note,
      ].filter(Boolean) as string[];
      for (const t of textes) {
        if (INTERDIT.test(t)) fautes.push(`${id} → « ${t.slice(0, 70)}… »`);
      }
    }
    expect(fautes).toEqual([]);
  });
});
