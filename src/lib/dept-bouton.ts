import { DEPARTEMENTS, DEPT_REG, type DeptId, type DeptReg } from "../data/regulation";

// Ce que le bouton département de l'Accueil doit annoncer. Séparé du JSX parce
// que la règle n'est pas cosmétique : elle décide si l'app présente ses chiffres
// comme confirmés ou comme une hypothèse. Trois états, parce que la source en a
// trois — « choisi », « jamais demandé », « le GPS dit ailleurs ».

export type TonDept = "confirme" | "defaut" | "hors-zone";

export interface EtatBoutonDept {
  ton: TonDept;
  /** Le département dont la réglementation est réellement appliquée. */
  dept: DeptId;
  nom: string;
  /** Ce que le bouton annonce en tête — toujours la réglementation, jamais
   *  « préférence » : c'est une loi qu'on choisit, pas un affichage. */
  titre: string;
  /** Une phrase courte, honnête sur ce que l'app sait et ne sait pas. */
  detail: string;
  /** Libellé de l'action, à l'impératif : le bouton est un contrôle. */
  action: string;
}

export function etatBoutonDept({
  dept,
  deptChosen,
  outOfZoneDept,
}: {
  dept: DeptId;
  deptChosen: boolean;
  outOfZoneDept: string | null;
}): EtatBoutonDept {
  const nom = DEPARTEMENTS[dept].name;
  // Le hors-zone passe devant : « on ne vous a jamais demandé » est vrai, mais
  // « vous êtes ailleurs » est plus précis, et c'est le seul cas où l'app sait
  // positivement que ses chiffres ne sont pas les bons.
  if (outOfZoneDept) {
    return {
      ton: "hors-zone",
      dept,
      nom,
      titre: "Réglementation appliquée",
      detail: `Le GPS vous place dans le ${outOfZoneDept}, hors des départements couverts. Les chiffres affichés restent ceux du ${nom}.`,
      action: "Changer de département",
    };
  }
  if (!deptChosen) {
    return {
      ton: "defaut",
      dept,
      nom,
      titre: "Réglementation non confirmée",
      detail: `Faute de réponse, l'app applique le ${nom}. Tailles et quotas affichés peuvent ne pas être les vôtres.`,
      action: "Choisir mon département",
    };
  }
  return {
    ton: "confirme",
    dept,
    nom,
    titre: "Réglementation appliquée",
    detail: "Tailles, quotas et périodes affichés viennent de cet arrêté préfectoral.",
    action: "Changer de département",
  };
}

/** Champs de DEPT_REG montrés dans le sélecteur. Choisis pour que le pêcheur
 *  choisisse *par réglementation* : ce sont les deux valeurs qui séparent
 *  réellement les trois départements couverts (le brochet, le sandre et le
 *  black-bass y portent la même maille). Un test échoue si ce n'est plus vrai. */
const CHAMPS: { cle: keyof DeptReg & ("truiteMaille" | "salmonideQuota"); label: string }[] = [
  { cle: "truiteMaille", label: "Truite" },
  { cle: "salmonideQuota", label: "Quota salmonidés" },
];

export interface ExtraitReg {
  cle: "truiteMaille" | "salmonideQuota";
  label: string;
  valeur: string;
}

/** Extraits réglementaires d'un département, cités **entiers**. Tronquer
 *  « 20 cm (cours listés…) sinon 23 cm » à « 20 cm » ferait dire à l'arrêté le
 *  contraire de ce qu'il dit sur la majorité des cours d'eau. */
export function extraitsReg(id: DeptId): ExtraitReg[] {
  return CHAMPS.map(({ cle, label }) => ({ cle, label, valeur: DEPT_REG[id][cle] }));
}
