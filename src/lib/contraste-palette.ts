import { lireCouleur, ratioContraste, seuilRequis } from "./contraste";

/**
 * Garde-fou de non-régression sur les contrastes de `src/styles.css`.
 *
 * Le principe : chaque paire ci-dessous relit sa couleur DANS la feuille de
 * style (jeton de `:root`, ou déclaration d'une règle nommée). Retoucher la
 * palette change donc le résultat du test — c'est tout l'intérêt, sinon la
 * prochaine passe esthétique ramènera le problème sans que rien ne le dise.
 *
 * Sa limite, à dire plutôt qu'à cacher : ce fichier ne balaie PAS la feuille.
 * Il ne connaît que les paires écrites à la main ci-dessous, et surtout les
 * FONDS sont écrits à la main : aucune cascade n'est résolue, personne ne peut
 * déduire d'une feuille de style le fond hérité d'un élément. Une couleur neuve
 * ajoutée demain sur un fond neuf ne sera pas vue.
 */

/** Une couleur, soit écrite en clair, soit relue dans une règle de la feuille. */
export type Source = string | { regle: string; propriete: string };

export type Paire = {
  nom: string;
  texte: Source;
  fond: Source;
  /** Taille relevée à la main dans la règle (ou héritée du conteneur). */
  taillePx: number;
  gras?: boolean;
  /** Chevron, pastille, soulignement : 1.4.11, seuil 3:1 au lieu de 4,5:1. */
  nonTexte?: boolean;
  /** Où ça se voit, pour que l'échec soit actionnable sans relire la feuille. */
  ou: string;
};

/** Extrait les variables de `:root`. Les commentaires CSS sont retirés. */
export function variablesRacine(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const bloc = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!bloc) return vars;
  const corps = bloc[1].replace(/\/\*[\s\S]*?\*\//g, "");
  for (const decl of corps.split(";")) {
    const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

/**
 * Résout `var(--x)` et `var(--x, repli)`, en chaîne. Le repli n'est utilisé que
 * si la variable est absente : plusieurs règles de ce dépôt écrivent
 * `var(--brass-ink, #8a7a4e)` alors que le jeton existe — le repli est du code
 * mort, et mesurer le repli à la place du jeton donnerait un faux résultat.
 */
export function resoudreCouleur(
  valeur: string,
  vars: Record<string, string>,
  profondeur = 0,
): string | null {
  if (profondeur > 10) return null;
  const v = valeur.trim();
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+?)\s*)?\)$/.exec(v);
  if (!m) return v || null;
  const brut = vars[m[1]] ?? m[2];
  if (brut === undefined) return null;
  return resoudreCouleur(brut, vars, profondeur + 1);
}

/** Valeur brute d'une propriété dans une règle, repérée par son sélecteur exact. */
export function valeurDeclaree(
  css: string,
  regle: string,
  propriete: string,
): string | null {
  const blocs = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const b of blocs) {
    const sel = b[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim()
      .replace(/\s+/g, " ");
    if (sel !== regle) continue;
    const re = new RegExp(`(?:^|[;{\\s])${propriete}\\s*:\\s*([^;]+)`);
    const m = re.exec(b[2]);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Première couleur lisible d'une valeur CSS. Sert aux raccourcis comme
 * `border-bottom: 1px dotted #a9a597`. Sur un dégradé elle rendrait la première
 * borne, qui n'est pas forcément la plus défavorable : les dégradés sont donc
 * écrits en clair dans les paires, jamais relus par ce chemin.
 */
function premiereCouleur(valeur: string): string | null {
  if (lireCouleur(valeur)) return valeur.trim();
  const m = valeur.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/);
  return m && lireCouleur(m[0]) ? m[0] : null;
}

function resoudreSource(css: string, s: Source, vars: Record<string, string>): string {
  if (typeof s === "string") {
    const c = resoudreCouleur(s, vars);
    if (!c) throw new Error(`couleur non résolue : ${s}`);
    return c;
  }
  const brut = valeurDeclaree(css, s.regle, s.propriete);
  if (brut === null) {
    throw new Error(
      `règle « ${s.regle} » sans « ${s.propriete} » dans styles.css — ` +
        `la paire déclarée ne mesure plus rien`,
    );
  }
  const resolu = resoudreCouleur(brut, vars);
  const couleur = resolu && premiereCouleur(resolu);
  if (!couleur) throw new Error(`valeur non colorimétrique : ${s.regle} { ${s.propriete}: ${brut} }`);
  return couleur;
}

export function evaluerPaire(
  css: string,
  paire: Paire,
): { nom: string; texte: string; fond: string; ratio: number; seuil: number } {
  const vars = variablesRacine(css);
  const texte = resoudreSource(css, paire.texte, vars);
  const fond = resoudreSource(css, paire.fond, vars);
  return {
    nom: paire.nom,
    texte,
    fond,
    ratio: ratioContraste(texte, fond),
    seuil: seuilRequis(paire),
  };
}

/** Le dégradé des tuiles d'eau : on retient l'extrémité la plus sombre. */
const TUILE_EAU = "#eef4f6";
/** Fond des placards « toujours utile » (chronos, identification). */
const CREME = "#f6f1e4";

export const PAIRES: Paire[] = [
  // ————— Texte courant sur le papier —————
  { nom: "--body sur --paper", texte: "var(--body)", fond: "var(--paper)", taillePx: 14, ou: ".sec-body p, .li, .ing" },
  { nom: "--ink sur --paper", texte: "var(--ink)", fond: "var(--paper)", taillePx: 16, ou: ".search input, .h2, .tick-label" },
  { nom: "--ink-2 sur --paper", texte: "var(--ink-2)", fond: "var(--paper)", taillePx: 15, ou: ".sec-title, .card-row .t" },
  { nom: "--muted sur --paper", texte: "var(--muted)", fond: "var(--paper)", taillePx: 12, ou: ".h-sub, .muted, .sp-latin — 106 règles" },
  { nom: "--muted sur #fff", texte: "var(--muted)", fond: "#fff", taillePx: 12, ou: "cartes blanches (.dash-water, .verdict)" },
  { nom: "--muted sur --sand", texte: "var(--muted)", fond: "var(--sand)", taillePx: 10, ou: ".explain, cellule verdict active" },
  { nom: "--faint sur --paper", texte: "var(--faint)", fond: "var(--paper)", taillePx: 11, ou: ".source, .disclaimer, .field label" },
  { nom: "--faint sur #fff", texte: "var(--faint)", fond: "#fff", taillePx: 10, ou: ".verdict .sub" },
  { nom: "--faint sur --sand", texte: "var(--faint)", fond: "var(--sand)", taillePx: 10, ou: ".verdict .cell-active .sub" },
  { nom: "--green sur --paper", texte: "var(--green)", fond: "var(--paper)", taillePx: 13, ou: "tous les liens" },
  { nom: "--green sur #fff", texte: "var(--green)", fond: "#fff", taillePx: 13, ou: "liens dans les cartes blanches" },
  { nom: "--red sur --paper", texte: "var(--red)", fond: "var(--paper)", taillePx: 13, ou: ".persist-warn button, .bal-echue" },

  // ————— Ambre : c'est la couleur des avertissements —————
  { nom: "--amber sur --amber-bg", texte: "var(--amber)", fond: "var(--amber-bg)", taillePx: 12, ou: ".note, .ph-card-warn, .id-cand-statut.warn" },
  { nom: "--amber sur --paper", texte: "var(--amber)", fond: "var(--paper)", taillePx: 11, ou: ".ce-gps-msg, .brief-stale, .spot-row .go" },
  { nom: "--amber sur la tuile d'eau", texte: "var(--amber)", fond: TUILE_EAU, taillePx: 10.5, gras: true, ou: ".dash-wtile .s.stale" },
  { nom: "bouton « gardée » d'une prise", texte: { regle: ".ce-kept button.on-kept", propriete: "color" }, fond: { regle: ".ce-kept button.on-kept", propriete: "background" }, taillePx: 14, gras: true, ou: "Prise → gardée / relâchée" },
  { nom: "étiquette « gardée » du carnet", texte: { regle: ".pd-tag", propriete: "color" }, fond: { regle: ".pd-tag.kept", propriete: "background" }, taillePx: 12.5, gras: true, ou: "Carnet → détail d'une prise" },

  // ————— Laiton : les cartouches en capitales espacées —————
  { nom: "--brass-ink sur --paper", texte: "var(--brass-ink)", fond: "var(--paper)", taillePx: 11, gras: true, ou: ".label, .ac-kicker, .mr-kicker" },
  { nom: "--brass-ink sur la crème", texte: "var(--brass-ink)", fond: CREME, taillePx: 12, gras: true, ou: ".ot-timer .dur, .id-opt .cnt" },
  { nom: "--brass sur --paper (accent non textuel)", texte: "var(--brass)", fond: "var(--paper)", taillePx: 11, nonTexte: true, ou: "accent décoratif — ne pas employer pour du texte" },

  // ————— Le ⓘ : seul indice visuel qu'une cellule verdict est un bouton —————
  { nom: "ⓘ des cellules verdict sur #fff", texte: { regle: ".verdict .cell-i", propriete: "color" }, fond: "#fff", taillePx: 9, ou: "Fiche → barre de verdict" },
  { nom: "ⓘ des cellules verdict sur la cellule ouverte", texte: { regle: ".verdict .cell-i", propriete: "color" }, fond: "var(--sand)", taillePx: 9, ou: "Fiche → cellule verdict active" },
  { nom: "ⓘ de la pastille saison", texte: { regle: ".hero .season .season-i", propriete: "color" }, fond: "var(--paper)", taillePx: 11, ou: "Fiche → pastille saison (fond papier à 92 % sur la photo)" },
  { nom: "libellé des cellules verdict sur #fff", texte: { regle: ".verdict .k", propriete: "color" }, fond: "#fff", taillePx: 10, ou: "Fiche → barre de verdict" },
  { nom: "libellé des cellules verdict sur la cellule ouverte", texte: { regle: ".verdict .k", propriete: "color" }, fond: "var(--sand)", taillePx: 10, ou: "Fiche → cellule verdict active" },
  { nom: "fermeture de l'encart d'explication", texte: { regle: ".explain-x", propriete: "color" }, fond: "var(--sand)", taillePx: 13, ou: "Fiche → encart ⓘ, bouton ✕" },
  { nom: "texte de l'encart d'explication", texte: { regle: ".explain-t", propriete: "color" }, fond: "var(--sand)", taillePx: 13, ou: "Fiche → encart ⓘ" },

  // ————— Tuiles d'eau du tableau de bord (dégradé #f3f8fa → #eef4f6) —————
  { nom: "libellé de tuile d'eau", texte: { regle: ".dash-wtile .k", propriete: "color" }, fond: TUILE_EAU, taillePx: 10, gras: true, ou: "Accueil → carte de l'eau" },
  { nom: "unité de tuile d'eau", texte: { regle: ".dash-wtile .v .u", propriete: "color" }, fond: TUILE_EAU, taillePx: 12, gras: true, ou: "Accueil → carte de l'eau" },
  { nom: "valeur de tuile d'eau", texte: { regle: ".dash-wtile .v", propriete: "color" }, fond: TUILE_EAU, taillePx: 20, gras: true, ou: "Accueil → carte de l'eau" },
  { nom: "sous-titre de tuile d'eau", texte: { regle: ".dash-wtile .s", propriete: "color" }, fond: TUILE_EAU, taillePx: 10.5, ou: "Accueil → carte de l'eau" },
  { nom: "tendance stable", texte: { regle: ".dash-wtile .v .tr.stable", propriete: "color" }, fond: TUILE_EAU, taillePx: 15, ou: "Accueil → flèche de tendance" },
  { nom: "tendance en hausse", texte: { regle: ".dash-wtile .v .tr.rising", propriete: "color" }, fond: TUILE_EAU, taillePx: 15, ou: "Accueil → flèche de tendance" },
  { nom: "tendance en baisse", texte: { regle: ".dash-wtile .v .tr.falling", propriete: "color" }, fond: TUILE_EAU, taillePx: 15, ou: "Accueil → flèche de tendance" },

  // ————— Boutons colorés —————
  { nom: "bouton « ajouter un spot » sur la carte", texte: { regle: ".carte-spot-btn", propriete: "color" }, fond: { regle: ".carte-spot-btn", propriete: "background" }, taillePx: 14, gras: true, ou: "Carte → pastille flottante" },
  { nom: "bouton du bandeau de mise à jour", texte: { regle: ".update-toast button", propriete: "color" }, fond: { regle: ".update-toast button", propriete: "background" }, taillePx: 13, gras: true, ou: "bandeau « mise à jour disponible »" },

  // ————— Pastilles de comestibilité —————
  { nom: "pastille « réglementé »", texte: { regle: ".edible-status.réglementé", propriete: "color" }, fond: { regle: ".edible-status.réglementé", propriete: "background" }, taillePx: 13, gras: true, ou: "Fiche → consommation" },
  { nom: "pastille « oui »", texte: { regle: ".edible-status.oui", propriete: "color" }, fond: { regle: ".edible-status.oui", propriete: "background" }, taillePx: 13, gras: true, ou: "Fiche → consommation" },
  { nom: "pastille « non »", texte: { regle: ".edible-status.non", propriete: "color" }, fond: { regle: ".edible-status.non", propriete: "background" }, taillePx: 13, gras: true, ou: "Fiche → consommation" },

  // ————— Emplacements photo (les seuls textes sur fond gris) —————
  { nom: "légende d'emplacement photo clair", texte: { regle: ".img-slot", propriete: "color" }, fond: "#e1ddd0", taillePx: 11, ou: "vignettes sans photo (bande la plus sombre du damier)" },
  { nom: "légende d'emplacement photo sombre", texte: { regle: ".img-slot.dark", propriete: "color" }, fond: { regle: ".img-slot.dark", propriete: "background" }, taillePx: 11, ou: "héros sans photo" },
  { nom: "prise sans photo", texte: { regle: ".pd-noimg", propriete: "color" }, fond: "#dfe6e2", taillePx: 14, ou: "Carnet → détail d'une prise" },

  // ————— Gris de service —————
  { nom: "source de la réglementation écrevisses", texte: { regle: ".ecr-reg-src", propriete: "color" }, fond: "var(--paper)", taillePx: 11, ou: "Écrevisses → mention de source" },
  { nom: "suppression dans le gréement", texte: { regle: ".gr-del", propriete: "color" }, fond: "var(--paper)", taillePx: 14, ou: "Matériel → retirer une ligne" },
  { nom: "note approximative fédération", texte: { regle: ".fed-approx", propriete: "color" }, fond: "var(--paper)", taillePx: 13, gras: true, ou: "Fédérations → tarif approximatif" },
  { nom: "légende « spots » de la carte", texte: { regle: ".carte-legend .legend-spots", propriete: "color" }, fond: "var(--paper)", taillePx: 11.5, gras: true, ou: "Carte → légende" },
  { nom: "chevron d'accordéon", texte: { regle: ".sec-head .chev", propriete: "color" }, fond: "var(--paper)", taillePx: 17, nonTexte: true, ou: "sections dépliables" },
  { nom: "chevron de ligne de carte", texte: { regle: ".card-row .chev", propriete: "color" }, fond: "var(--paper)", taillePx: 17, nonTexte: true, ou: "listes de navigation" },
  { nom: "soulignement d'un terme de glossaire", texte: { regle: ".glossed", propriete: "border-bottom" }, fond: "var(--paper)", taillePx: 13, nonTexte: true, ou: "termes avec bulle d'explication" },
  { nom: "effacer la recherche", texte: { regle: ".search .clear", propriete: "color" }, fond: { regle: ".search .clear", propriete: "background" }, taillePx: 15, ou: "barre de recherche" },
  { nom: "note réglementaire écrevisses", texte: { regle: ".ecr-reg-note", propriete: "color" }, fond: { regle: ".ecr-reg-note", propriete: "background" }, taillePx: 12, ou: "Écrevisses → encart ambre" },

  // ————— Surfaces sombres (elles passent déjà : la paire les y garde) —————
  { nom: "--paper sur --fir", texte: "var(--paper)", fond: "var(--fir)", taillePx: 15.5, gras: true, ou: ".ac-prise, .ot-legal" },
  { nom: "--paper sur --green-dark", texte: "var(--paper)", fond: "var(--green-dark)", taillePx: 14, ou: ".cta-dark, .cook, .update-toast" },
  { nom: "sous-titre de CTA sombre", texte: { regle: ".cta-dark .s", propriete: "color" }, fond: "var(--green-dark)", taillePx: 12, ou: "Accueil → bouton principal" },
  { nom: "sous-titre de la CTA prise", texte: { regle: ".ac-prise .s", propriete: "color" }, fond: "var(--fir)", taillePx: 12, ou: "Accueil → « noter une prise »" },
  { nom: "chevron de la CTA prise", texte: { regle: ".ac-prise .chev", propriete: "color" }, fond: "var(--fir)", taillePx: 18, nonTexte: true, ou: "Accueil → « noter une prise »" },
  { nom: "cartouche des horaires légaux", texte: { regle: ".ot-legal-h", propriete: "color" }, fond: "var(--fir)", taillePx: 11, gras: true, ou: "Outils → horaires légaux" },
  { nom: "note des horaires légaux", texte: { regle: ".ot-legal-note", propriete: "color" }, fond: "var(--fir)", taillePx: 11.5, ou: "Outils → horaires légaux" },
  { nom: "libellés soleil & lune", texte: { regle: ".dash-sun-lbl", propriete: "color" }, fond: "#16281e", taillePx: 12, ou: "Accueil → carte astro" },
  { nom: "bulle d'explication", texte: { regle: ".tip-bubble", propriete: "color" }, fond: { regle: ".tip-bubble", propriete: "background" }, taillePx: 12.5, ou: "bulles de glossaire" },
];
