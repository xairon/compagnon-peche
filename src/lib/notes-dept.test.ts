import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { deptNotes, notesEcrevisses } from "./notes-dept";
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
  it("chaque note du département ressort dans exactement un des trois groupes", () => {
    for (const d of DEPTS) {
      const notes = DEPT_REG[d].notes;
      for (const sp of SPECIES) {
        const r = deptNotes(notes, sp);
        const tous = [...r.espece, ...r.autresEspeces, ...r.generales];
        expect(tous.sort(), `${sp.id} en ${d}`).toEqual([...notes].sort());
      }
    }
  });

  it("les 13 notes des trois départements sont toutes classées", () => {
    let vues = 0;
    for (const d of DEPTS) {
      const r = deptNotes(DEPT_REG[d].notes, espece("gardon"));
      vues += r.espece.length + r.autresEspeces.length + r.generales.length;
    }
    expect(vues).toBe(13);
  });

  it("l'ordre d'origine est conservé à l'intérieur de chaque groupe", () => {
    const notes = ["a truite", "b brochet", "c truite", "d brochet"];
    const r = deptNotes(notes, espece("truite-fario"));
    expect(r.espece).toEqual(["a truite", "c truite"]);
    expect(r.autresEspeces).toEqual(["b brochet", "d brochet"]);
    expect(r.generales).toEqual([]);
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
    expect([...r.autresEspeces, ...r.generales].join(" ")).not.toMatch(/Black-bass/);
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

  it("une espèce qu'aucune note ne nomme n'en reçoit aucune", () => {
    // Les quatre notes du Loir-et-Cher nomment truite, brochet ou carpe : pour
    // un gardon, elles parlent toutes d'un autre poisson. Aucune n'est générale,
    // donc la fiche gardon n'affichera aucune note départementale.
    const r = deptNotes(DEPT_REG["41"].notes, espece("gardon"));
    expect(r.espece).toEqual([]);
    expect(r.autresEspeces.length).toBe(4);
    expect(r.generales).toEqual([]);
  });

  it("une note générale n'est attribuée à personne et reste lisible", () => {
    // « Pêche interdite sur le bassin du Cher » ne nomme aucune espèce : elle
    // vaut pour toutes, donc elle appartient au bloc commun, jamais à un poisson.
    const r = deptNotes(DEPT_REG["23"].notes, espece("brochet"));
    expect(r.generales.join(" ")).toMatch(/bassin du Cher/);
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
    expect(r.autresEspeces.join(" ")).toMatch(/pattes blanches, rouges/);
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
 * Le seul faux positif du classement, et celui qui rend le masquage possible.
 *
 * « Écrevisses à pattes blanches, rouges et grêles : pêche fermée toute
 * l'année » ne nomme aucun POISSON — les écrevisses vivent dans un catalogue
 * séparé. Tant que le vocabulaire de rattachement ignorait ce catalogue, la
 * note était promue « générale » et se serait affichée sur les 129 fiches
 * poisson dès qu'on a cessé de tout montrer : précisément le bruit que le
 * masquage doit supprimer.
 *
 * C'est la seule des 13 notes réelles dans ce cas. Les 11 autres nomment une
 * espèce du catalogue poisson, et « bassin du Cher » n'en nomme aucune à juste
 * titre.
 */
describe("deptNotes — une créature non-poisson reste une créature", () => {
  it("la note écrevisses de la Creuse n'est jamais une règle générale", () => {
    for (const sp of SPECIES) {
      const r = deptNotes(DEPT_REG["23"].notes, sp);
      expect(r.generales.join(" "), sp.id).not.toMatch(/Écrevisses à pattes/);
    }
  });

  it("elle est classée « autre espèce » — donc masquée sur une fiche poisson", () => {
    const r = deptNotes(DEPT_REG["23"].notes, espece("gardon"));
    expect(r.autresEspeces.join(" ")).toMatch(/Écrevisses à pattes/);
  });

  it("la Creuse ne garde qu'une seule règle vraiment générale", () => {
    const r = deptNotes(DEPT_REG["23"].notes, espece("gardon"));
    expect(r.generales.length).toBe(1);
    expect(r.generales[0]).toMatch(/bassin du Cher/);
  });
});

/**
 * Ce que l'écran Écrevisses vient chercher. La note ci-dessus quitte les fiches
 * poisson : sans ce point de sortie, une interdiction de pêche toute l'année
 * disparaîtrait de l'application.
 */
describe("notesEcrevisses — la note trouve son écran", () => {
  it("la Creuse rend la note écrevisses", () => {
    const r = notesEcrevisses(DEPT_REG["23"].notes);
    expect(r.length).toBe(1);
    expect(r[0]).toMatch(/Écrevisses à pattes/);
  });

  it("l'Indre et le Loir-et-Cher n'en ont aucune", () => {
    expect(notesEcrevisses(DEPT_REG["36"].notes)).toEqual([]);
    expect(notesEcrevisses(DEPT_REG["41"].notes)).toEqual([]);
  });

  it("une note qui nomme un poisson n'est pas prise pour une note écrevisse", () => {
    expect(notesEcrevisses(["Brochet no-kill du 14/03 au 24/04."])).toEqual([]);
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
