import { SPECIES } from "../data/species";
import { ECREVISSES } from "../data/ecrevisses";
import { binomial } from "./hubeau";

/**
 * Des taxons relevés par les pêches scientifiques aux fiches de l'app.
 *
 * POURQUOI UNE TABLE DE SYNONYMES. Mesuré le 01/08/2026 sur les trois stations
 * ASPE les plus proches de Blois : sur 39 taxons distincts, 34 retrouvent une
 * fiche par leur seul binôme latin. Deux échouent parce que les deux
 * référentiels n'écrivent pas le même nom — et ces deux-là sont des poissons
 * très communs. Dans un filtre qui MASQUE, rater un synonyme cache une espèce
 * réellement présente sous les pieds du pêcheur.
 *
 * POURQUOI PAS PLUS MALIN QUE ÇA :
 *  · apparier sur l'épithète seule est faux — `Mugil cephalus` (le mulet) est
 *    au catalogue, et `cephalus` seul le confondrait avec le chevaine ;
 *  · il n'y a pas de jointure par code — `code_taxon` d'Hub'Eau est un code
 *    Sandre APT (2038 pour l'anguille, `id.eaufrance.fr/apt/2038`), pas le
 *    `cdNom` TAXREF (66832) que portent nos fiches.
 *
 * La table ne prétend donc pas être nationale : elle couvre ce qui a été VU.
 * `especes-du-coin.test.ts` échoue dès qu'une charge utile figée contient un
 * taxon non apparié en dehors des lots genre/famille listés nommément.
 */
const SYNONYMES_ASPE: Record<string, string> = {
  // ASPE garde le genre historique ; le dépôt suit la révision.
  "leuciscus cephalus": "squalius cephalus", // chevaine
  // Simple accord de genre sur l'épithète.
  "gymnocephalus cernua": "gymnocephalus cernuus", // grémille
};

const PAR_BINOME = new Map(SPECIES.map((s) => [binomial(s.latin), s.id]));
const ECREVISSE_PAR_BINOME = new Map(ECREVISSES.map((e) => [binomial(e.latin), e.id]));

/**
 * Trie les taxons relevés en trois tas, sans jamais en perdre un en silence.
 *
 * Les écrevisses ne sont pas des inconnues : l'app a leur fiche, dans un autre
 * écran. Les compter comme « sans fiche » dirait au pêcheur que l'app ignore
 * une espèce qu'elle documente.
 */
export function apparier(taxons: string[]): {
  ids: string[];
  ecrevisses: string[];
  inconnus: string[];
} {
  const ids = new Set<string>();
  const ecrevisses = new Set<string>();
  const inconnus = new Set<string>();
  for (const t of taxons) {
    const brut = binomial(t);
    // Une chaîne vide n'est pas un taxon : la compter en « inconnue »
    // gonflerait l'aveu affiché à l'écran sans qu'aucun poisson soit en cause.
    if (!brut.trim()) continue;
    const cle = SYNONYMES_ASPE[brut] ?? brut;
    const id = PAR_BINOME.get(cle);
    if (id) {
      ids.add(id);
      continue;
    }
    const ecr = ECREVISSE_PAR_BINOME.get(cle);
    if (ecr) {
      ecrevisses.add(ecr);
      continue;
    }
    inconnus.add(t);
  }
  // Triés : deux relevés du même coin doivent rendre le même tableau, sinon
  // l'écran se réordonne tout seul d'une session à l'autre.
  return {
    ids: [...ids].sort(),
    ecrevisses: [...ecrevisses].sort(),
    inconnus: [...inconnus].sort(),
  };
}
