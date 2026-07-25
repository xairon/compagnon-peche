import { describe, it, expect } from "vitest";
import { FICHES, withFiche } from "./fiches";
import { BASE_SPECIES } from "./species-base";
import { SPECIES } from "./species";

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

  it("withFiche ne change rien au contenu d'une espèce sans overlay ni statut", () => {
    const sans = BASE_SPECIES.find((s) => !FICHES[s.id] && !s.protected && s.season !== "special")!;
    const apres = withFiche(sans);
    expect(apres.ident).toEqual(sans.ident);
    expect(apres.fish).toEqual(sans.fish);
    expect(apres.cook).toEqual(sans.cook);
    expect(apres.bio).toEqual(sans.bio);
    expect(apres.maille).toBe(sans.maille);
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
  const INTERDIT =
    /capture (et détention )?interdite|détention interdite|pêche (est )?(fermée|interdite)|sous moratoire|remise à l'eau (immédiate )?obligatoire|protégée? par arrêté|quota/i;

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
