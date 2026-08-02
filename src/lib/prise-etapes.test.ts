import { describe, it, expect } from "vitest";
import { etapesPour, etapesSautees, etapeSuivante } from "./prise-etapes";
import { SPECIES } from "../data/species";
import { effectiveMaille } from "./maille";
import { effectiveQuota } from "./quota";

const espece = (id: string) => SPECIES.find((s) => s.id === id)!;

/**
 * Le parcours « Ma prise » imposait les mêmes cinq étapes à toutes les espèces.
 * Pour une perche, `maille` et `quota` n'ont rien à instruire — pas de maille
 * nationale, et la perche ne figure pas dans les trois espèces de
 * QUOTA_CARNASSIERS. Elles s'affichaient quand même, avec un unique bouton
 * « Continuer ».
 *
 * Ce que ce fichier verrouille n'est pas le raccourci mais sa BORNE : une étape
 * ne disparaît que si l'app n'a vraiment rien à opposer. Se tromper dans ce
 * sens-là escamote une règle qui contraint, et le parcours existe pour dire ce
 * qui contraint.
 */
describe("etapesPour — l'espèce sans contrainte va droit au but", () => {
  it("la perche saute maille et quota", () => {
    expect(etapesPour(espece("perche"), "41")).toEqual(["statut", "choix", "kill", "consigner"]);
  });

  it("le brochet les traverse toutes", () => {
    expect(etapesPour(espece("brochet"), "41")).toEqual([
      "statut",
      "maille",
      "quota",
      "choix",
      "kill",
      "consigner",
    ]);
  });

  it("la saisie ferme toujours le parcours, du bon côté", () => {
    for (const id of ["perche", "brochet", "carpe", "gardon"]) {
      const g = etapesPour(espece(id), "41", "kill");
      const r = etapesPour(espece(id), "41", "release");
      expect(g[g.length - 1], id).toBe("consigner");
      expect(r[r.length - 1], id).toBe("consigner-rel");
    }
  });

  it("le mot de l'étape porte l'issue — c'est ce qui la rend rechargeable", () => {
    // Une seule étape « consigner » plus un booléen d'état aurait dû deviner, au
    // rechargement d'un lien, si la prise est gardée. Elle aurait deviné « oui »,
    // ce qui compte dans le quota du jour.
    const r = etapesPour(espece("brochet"), "41", "release");
    expect(r).toContain("consigner-rel");
    expect(r).not.toContain("consigner");
  });

  it("statut ouvre toujours le parcours", () => {
    for (const id of ["perche", "brochet", "carpe", "gardon"]) {
      expect(etapesPour(espece(id), "41")[0], id).toBe("statut");
    }
  });
});

/**
 * Les deux cas qui font que le critère ne peut pas être le chiffre seul. Chacun
 * est une règle qui CONTRAINT derrière une valeur numérique nulle ou absente.
 */
describe("etapesPour — une étape ne se saute pas sur un chiffre nul", () => {
  it("le saumon garde son étape maille : cm vaut 0, mais un moratoire le régit", () => {
    const sp = espece("saumon-atlantique");
    const m = effectiveMaille(sp, "41");

    // La prémisse du test, vérifiée et non supposée : pas de chiffre, un libellé.
    expect(m.cm).toBe(0);
    expect(m.label).not.toBeNull();

    expect(etapesPour(sp, "41")).toContain("maille");
  });

  it("la truite garde son étape quota dans le Loir-et-Cher, qui la plafonne", () => {
    const sp = espece("truite-fario");

    // Le national ne dit rien, l'arrêté départemental si.
    expect(sp.quota === "—" || !sp.quota).toBe(true);
    expect(effectiveQuota(sp, "41").text).not.toBeNull();

    expect(etapesPour(sp, "41")).toContain("quota");
  });

  it("aucune espèce du catalogue ne perd une étape que l'app sait remplir", () => {
    // Le filet le plus large : pour chaque espèce et chaque département, si
    // effectiveMaille ou effectiveQuota a quelque chose à dire, l'étape est là.
    for (const d of ["23", "36", "41"] as const) {
      for (const sp of SPECIES) {
        const e = etapesPour(sp, d);
        const m = effectiveMaille(sp, d);
        if (m.cm > 0 || m.label !== null) expect(e, `${sp.id}/${d}`).toContain("maille");
        if (effectiveQuota(sp, d).text !== null) expect(e, `${sp.id}/${d}`).toContain("quota");
      }
    }
  });
});

/**
 * Ce que le compteur annonce. Il disait « / 5 » depuis une table figée, et le
 * code admettait déjà qu'il ment sur les chemins courts.
 */
describe("etapesPour — le compteur ne peut plus mentir", () => {
  it("la perche annonce quatre écrans, le brochet six", () => {
    expect(etapesPour(espece("perche"), "41")).toHaveLength(4);
    expect(etapesPour(espece("brochet"), "41")).toHaveLength(6);
  });

  it("relâcher tient la même place que garder dans le compte", () => {
    const garde = etapesPour(espece("brochet"), "41");
    const relache = etapesPour(espece("brochet"), "41", "release");
    expect(relache).toHaveLength(garde.length);
    expect(relache).toContain("release");
    expect(relache).not.toContain("kill");
  });
});

/**
 * Les transitions étaient écrites en dur : « statut » menait à « maille », quelle
 * que soit l'espèce. C'est ce qui rendait le raccourci impossible sans récrire
 * chaque bouton.
 */
describe("etapeSuivante — les boutons demandent la suivante, pas une étape nommée", () => {
  it("sur une perche, statut mène directement à la décision", () => {
    expect(etapeSuivante(espece("perche"), "41", "statut")).toBe("choix");
  });

  it("sur un brochet, statut mène toujours à la maille", () => {
    expect(etapeSuivante(espece("brochet"), "41", "statut")).toBe("maille");
  });

  it("garder mène à la saisie, qui n'a pas de suivante", () => {
    expect(etapeSuivante(espece("brochet"), "41", "kill")).toBe("consigner");
    expect(etapeSuivante(espece("brochet"), "41", "consigner")).toBeNull();
  });

  it("une étape hors parcours renvoie à la décision plutôt qu'au vide", () => {
    // Le cas du lien reçu : `#/prise/perche/maille` nomme une étape que cette
    // espèce ne traverse pas. Deviner serait pire que revenir au tronc commun.
    expect(etapeSuivante(espece("perche"), "41", "maille")).toBe("choix");
  });

  it("suivre les suivantes reconstitue exactement le parcours", () => {
    for (const id of ["perche", "brochet", "carpe"]) {
      const sp = espece(id);
      const attendu = etapesPour(sp, "41");
      const parcouru = ["statut"];
      let e = etapeSuivante(sp, "41", "statut");
      while (e) {
        parcouru.push(e);
        e = etapeSuivante(sp, "41", e);
      }
      expect(parcouru, id).toEqual(attendu);
    }
  });
});

/**
 * Ce qui est sauté doit être DIT. L'étape maille écrivait « Aucune maille
 * nationale pour cette espèce — un arrêté local peut en fixer une : vérifiez ».
 * L'app refuse donc d'affirmer qu'aucune règle n'existe : elle ne connaît que le
 * socle national et les arrêtés de trois départements. La supprimer en silence
 * ferait cette affirmation à sa place.
 */
describe("etapesSautees — le silence serait une affirmation", () => {
  it("la perche : les deux sont nommées", () => {
    expect(etapesSautees(espece("perche"), "41")).toEqual(["maille", "quota"]);
  });

  it("le brochet : rien n'a été sauté", () => {
    expect(etapesSautees(espece("brochet"), "41")).toEqual([]);
  });

  it("le saumon : le quota seul, jamais la maille", () => {
    const s = etapesSautees(espece("saumon-atlantique"), "41");
    expect(s).not.toContain("maille");
  });

  it("le sauté et le traversé sont complémentaires, jamais les deux à la fois", () => {
    for (const sp of SPECIES) {
      const e = etapesPour(sp, "41");
      for (const saut of etapesSautees(sp, "41")) {
        expect(e, sp.id).not.toContain(saut);
      }
    }
  });
});
