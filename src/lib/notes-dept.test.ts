import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { deptNotes } from "./notes-dept";
import { DEPT_REG, type DeptId } from "../data/regulation";
import { SPECIES } from "../data/species";

const DEPTS: DeptId[] = ["23", "36", "41"];
const espece = (id: string) => SPECIES.find((s) => s.id === id)!;

/**
 * `Fiche.tsx` affichait `dr.notes.slice(0, 2)`. Compté sur les données réelles :
 * 13 notes départementales, 7 jamais affichées — 1 sur 3 dans la Creuse, 4 sur 6
 * dans l'Indre, 2 sur 4 dans le Loir-et-Cher. Parmi les perdues, la note
 * black-bass de l'Indre, à l'indice 2, qui dit « Dans le doute, relâchez ».
 *
 * Le tri par pertinence remplace la troncature. Il ne peut donc jamais
 * supprimer : c'est l'invariant que ce fichier verrouille en premier.
 */
describe("deptNotes — aucune note n'est perdue", () => {
  it("chaque note du département ressort dans exactement un des deux groupes", () => {
    for (const d of DEPTS) {
      const notes = DEPT_REG[d].notes;
      for (const sp of SPECIES) {
        const r = deptNotes(notes, sp);
        expect([...r.espece, ...r.autres].sort(), `${sp.id} en ${d}`).toEqual([...notes].sort());
      }
    }
  });

  it("les 13 notes des trois départements sont toutes classées", () => {
    let vues = 0;
    for (const d of DEPTS) {
      const r = deptNotes(DEPT_REG[d].notes, espece("gardon"));
      vues += r.espece.length + r.autres.length;
    }
    expect(vues).toBe(13);
  });

  it("l'ordre d'origine est conservé à l'intérieur de chaque groupe", () => {
    const notes = ["a truite", "b brochet", "c truite", "d brochet"];
    const r = deptNotes(notes, espece("truite-fario"));
    expect(r.espece).toEqual(["a truite", "c truite"]);
    expect(r.autres).toEqual(["b brochet", "d brochet"]);
  });
});

/**
 * Le cas nommé par l'audit : dans l'Indre, la note black-bass est à l'indice 2.
 * Elle dit « Dans le doute, relâchez » — exactement le genre de phrase qu'une
 * app réglementaire n'a pas le droit de couper.
 */
describe("deptNotes — la note qui nomme l'espèce remonte", () => {
  it("l'Indre : la note black-bass est rattachée au black-bass", () => {
    const r = deptNotes(DEPT_REG["36"].notes, espece("black-bass"));
    expect(r.espece.join(" ")).toMatch(/Black-bass/);
    expect(r.espece.join(" ")).toMatch(/relâchez/i);
  });

  it("l'Indre : elle n'est pas noyée dans les autres notes", () => {
    const r = deptNotes(DEPT_REG["36"].notes, espece("black-bass"));
    expect(r.autres.join(" ")).not.toMatch(/Black-bass/);
  });

  it("l'Indre : la note brochet va au brochet, pas au black-bass", () => {
    const bb = deptNotes(DEPT_REG["36"].notes, espece("black-bass"));
    const br = deptNotes(DEPT_REG["36"].notes, espece("brochet"));
    expect(br.espece.join(" ")).toMatch(/Brochet no-kill/);
    expect(bb.espece.join(" ")).not.toMatch(/Brochet no-kill/);
  });

  it("le Loir-et-Cher : les deux notes carpe reviennent à la carpe", () => {
    const r = deptNotes(DEPT_REG["41"].notes, espece("carpe"));
    expect(r.espece.length).toBe(2);
    expect(r.espece.join(" ")).toMatch(/transporter les carpes vivantes/);
    expect(r.espece.join(" ")).toMatch(/Carpe de nuit/);
  });

  it("l'Indre : la note anguille revient à l'anguille", () => {
    const r = deptNotes(DEPT_REG["36"].notes, espece("anguille"));
    expect(r.espece.join(" ")).toMatch(/Anguille jaune/);
  });

  it("une espèce qu'aucune note ne nomme n'en reçoit aucune — mais les voit toutes", () => {
    const r = deptNotes(DEPT_REG["41"].notes, espece("gardon"));
    expect(r.espece).toEqual([]);
    expect(r.autres.length).toBe(4);
  });

  it("une note générale n'est attribuée à personne et reste lisible", () => {
    // « Pêche interdite sur le bassin du Cher » ne nomme aucune espèce : elle
    // vaut pour toutes, donc elle appartient au bloc commun, jamais à un poisson.
    const r = deptNotes(DEPT_REG["23"].notes, espece("brochet"));
    expect(r.autres.join(" ")).toMatch(/bassin du Cher/);
  });
});

/**
 * Le rattachement lit des noms d'espèces dans du texte libre. Il doit rester
 * timide : se tromper de poisson n'est pas grave ici (tout est affiché de toute
 * façon), mais accrocher n'importe quel mot rendrait le tri inutile.
 */
describe("deptNotes — le rattachement ne s'emballe pas", () => {
  it("ignore les mots trop courts ou trop génériques du nom", () => {
    // « Poisson-chat » ne doit pas capturer toute note qui contient « poisson ».
    const r = deptNotes(["Pêche du poisson mort manié interdite."], espece("poisson-chat"));
    expect(r.espece).toEqual([]);
  });

  it("ne rattache pas sur un qualificatif partagé", () => {
    // « commune » (carpe commune, brème commune) ne doit rien accrocher.
    const r = deptNotes(["Interdit sur les communes riveraines."], espece("carpe"));
    expect(r.espece).toEqual([]);
  });

  it("suit le pluriel et le féminin usuels", () => {
    expect(deptNotes(["Les brochets sont concernés."], espece("brochet")).espece.length).toBe(1);
    expect(deptNotes(["Les carpes sont concernées."], espece("carpe")).espece.length).toBe(1);
  });

  it("ignore les accents et la casse", () => {
    expect(deptNotes(["PECHE DU BROCHET"], espece("brochet")).espece.length).toBe(1);
  });

  it("ne rattache pas sur un fragment de mot", () => {
    expect(deptNotes(["Brochetons interdits"], espece("brochet")).espece).toEqual([]);
  });

  // Les trois rattachements faux trouvés en passant la fonction sur les données
  // réelles. Aucun n'était grave — la note reste affichée dans l'autre bloc —
  // mais chacun collait une phrase réglementaire sous le mauvais poisson.
  it("une couleur ne désigne pas une espèce (poisson rouge / pattes rouges)", () => {
    const r = deptNotes(DEPT_REG["23"].notes, espece("poisson-rouge"));
    expect(r.espece).toEqual([]);
    expect(r.autres.join(" ")).toMatch(/pattes blanches, rouges/);
  });

  it("« argentée » ne relie pas la carpe argentée à l'anguille argentée", () => {
    const r = deptNotes(DEPT_REG["36"].notes, espece("carpe-argentee"));
    expect(r.espece.join(" ")).not.toMatch(/Anguille/);
  });

  it("un lieu ne désigne pas une espèce (crapet de roche / Roche-au-Moine)", () => {
    const r = deptNotes(DEPT_REG["36"].notes, espece("crapet-de-roche"));
    expect(r.espece.join(" ")).not.toMatch(/Black-bass/);
  });
});

/**
 * La garde qui empêche la récidive : c'est une troncature en dur qui a fait
 * disparaître « dans le doute, relâchez ». Elle ne doit pas revenir par
 * distraction.
 */
describe("Fiche — plus aucune troncature des notes départementales", () => {
  it("Fiche.tsx ne coupe plus `notes` avec un slice", () => {
    const src = readFileSync("src/screens/Fiche.tsx", "utf8");
    expect(src).not.toMatch(/notes\s*\.slice\(/);
  });

  it("Fiche.tsx passe bien par deptNotes", () => {
    const src = readFileSync("src/screens/Fiche.tsx", "utf8");
    expect(src).toMatch(/deptNotes/);
  });
});
