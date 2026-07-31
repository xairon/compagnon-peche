// Lecture des fiches réglementation départementales de coindepeche.fr.
//
// Le parseur est pur et vit ici plutôt que dans le script de scraping, pour
// deux raisons : il se teste sur charge utile réelle et figée (voir
// __fixtures__), et le script qui interroge le site rejoue exactement le même
// code que les tests. Quand le gabarit du site changera, le script échouera
// bruyamment au lieu d'écrire des champs vides.
//
// Ce que ce module NE fait pas, délibérément :
//  · il n'importe pas le marqueur « Ouvert » affiché par le site — c'est l'état
//    à l'heure où LA PAGE a été rendue, pas une règle. 12 blocs sur 357 n'en
//    portaient d'ailleurs aucun le 31/07/2026.
//  · il ne convertit pas les dates en objets Date : le site écrit « 14 mars
//    2026 » sans dire s'il s'agit du 1ᵉʳ jour pêchable ni de quel fuseau. On
//    recopie sa chaîne, on ne calcule pas à sa place.
//  · il ne remplace pas « — » par 0 ou « illimité » : absence de valeur affichée
//    veut dire « le site ne le dit pas », troisième état à part entière.

export interface EspeceRegCdp {
  espece: string;
  ouverture: string | null;
  fermeture: string | null;
  tailleMin: string | null;
  quotaJour: string | null;
  note: string | null;
}

export interface RegDeptCdp {
  /** Code département tel qu'écrit dans le titre : « 36 », « 2A »… */
  code: string;
  nom: string;
  url: string;
  especes: EspeceRegCdp[];
}

const RE_TITRE = /<h1[^>]*>\s*Réglementation pêche\s*—\s*([^(<]+?)\s*\(([^)]+)\)\s*<\/h1>/;
const RE_BLOC = /<h3 class="px-3 py-1 rounded-full[^"]*">/g;
const RE_CHAMP =
  /uppercase tracking-wide mb-1">([^<]+)<\/div>\s*<div class="font-semibold">([^<]*)<\/div>/g;
const RE_NOTE = /<p class="mt-3 text-sm text-slate-600">([^<]*)<\/p>/;

/** Les seules entités rencontrées dans les 96 pages relevées le 31/07/2026, à
 *  l'intérieur des blocs espèce : &#039; et &copy;. Décodage volontairement
 *  minimal — une table générique inventerait des cas qu'on n'a pas observés. */
function decode(s: string): string {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** « — » (et la chaîne vide) signifient « non affiché », pas « aucun ». */
function valeur(s: string | undefined): string | null {
  const v = decode(s ?? "");
  return v === "" || v === "—" || v === "-" ? null : v;
}

/** Parse une fiche départementale. Renvoie null si la page n'a pas la forme
 *  attendue — mieux vaut aucune donnée qu'une fiche à moitié lue. */
export function parseRegCoindepeche(html: string, url: string): RegDeptCdp | null {
  const t = RE_TITRE.exec(html);
  if (!t) return null;
  const nom = decode(t[1]!);
  const code = decode(t[2]!);

  const especes: EspeceRegCdp[] = [];
  // On découpe sur l'ouverture du <h3> : chaque morceau porte le nom de
  // l'espèce puis sa grille de quatre champs et sa note éventuelle.
  const blocs = html.split(RE_BLOC).slice(1);
  for (const b of blocs) {
    const nomEsp = /^([^<]+)</.exec(b);
    if (!nomEsp) continue;
    const champs = new Map<string, string>();
    RE_CHAMP.lastIndex = 0;
    let m: RegExpExecArray | null;
    let lus = 0;
    while (lus < 4 && (m = RE_CHAMP.exec(b))) {
      champs.set(decode(m[1]!), m[2]!);
      lus++;
    }
    const note = RE_NOTE.exec(b);
    especes.push({
      espece: decode(nomEsp[1]!),
      ouverture: valeur(champs.get("Ouverture")),
      fermeture: valeur(champs.get("Fermeture")),
      tailleMin: valeur(champs.get("Taille min.")),
      quotaJour: valeur(champs.get("Quota / jour")),
      note: note ? decode(note[1]!) : null,
    });
  }
  if (especes.length === 0) return null;
  return { code, nom, url, especes };
}
