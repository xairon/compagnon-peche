import type { CoinEspeces, StationDuCoin } from "./especes-du-coin";

/**
 * Le relevé du coin, d'un lancement à l'autre.
 *
 * POURQUOI ON LE GARDE. Il coûte ~183 ko de réseau (mesuré au `curl` sur les
 * trois stations réellement retenues près de Blois, voir le commentaire de
 * `STATIONS_RETENUES` dans especes-du-coin.ts). Le refaire à chaque lancement
 * rendrait le filtre inutilisable là où il sert le plus — au bord de l'eau,
 * sans réseau.
 *
 * POURQUOI UNE CLÉ À PART, et non un champ de plus dans `carnet:prefs` : la
 * raison est déjà écrite dans prefs-accueil.ts, et elle vaut mot pour mot ici.
 * `store.tsx` écrit l'objet ENTIER à chaque changement de département —
 * `writePrefs({ dept, deptChosen, bigUI, theme })`. Tout ce qu'on ajouterait à
 * `Prefs` serait effacé au premier changement, silencieusement.
 *
 * POURQUOI localStorage ET NON IndexedDB : ~1 ko, et c'est cette valeur qui
 * décide du PREMIER rendu de l'écran Espèces. Une lecture asynchrone
 * afficherait les 129 fiches le temps d'une frame avant d'en masquer 95.
 */
export const CLE_COIN = "carnet:coin";

const RE_JOUR = /^\d{4}-\d{2}-\d{2}$/;

function chaines(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function stations(v: unknown): StationDuCoin[] {
  if (!Array.isArray(v)) return [];
  const out: StationDuCoin[] = [];
  for (const s of v) {
    if (typeof s !== "object" || s === null) continue;
    const r = s as Record<string, unknown>;
    // Sans code la station ne peut pas être réinterrogée ; sans distance
    // chiffrée l'écran ne peut pas avouer à quelle distance il extrapole ;
    // sans nom elle n'a pas de provenance à citer — sa raison d'être est
    // de dire d'où vient le relevé.
    if (typeof r.code !== "string" || !r.code) continue;
    if (typeof r.dist !== "number" || !Number.isFinite(r.dist)) continue;
    if (typeof r.nom !== "string" || !r.nom) continue;
    out.push({ code: r.code, nom: r.nom, dist: r.dist });
  }
  return out;
}

/**
 * Relit le relevé. Rend null plutôt qu'un objet à moitié lu.
 *
 * TROIS CHAMPS SONT ÉLIMINATOIRES, parce que sans eux l'écran mentirait :
 * sans station il n'a aucune provenance à citer, sans date il ne peut pas dire
 * de quand il parle, sans point il n'est rattaché à aucun coin. `ids` vide, en
 * revanche, est un résultat légitime — un relevé où rien n'a été apparié
 * existe, et le taire vaudrait moins que le dire.
 */
export function readCoin(): CoinEspeces | null {
  try {
    const brut = localStorage.getItem(CLE_COIN);
    if (!brut) return null;
    const p = JSON.parse(brut) as Record<string, unknown>;
    const st = stations(p.stations);
    if (!st.length) return null;
    if (typeof p.releveIso !== "string" || !RE_JOUR.test(p.releveIso)) return null;
    if (typeof p.lat !== "number" || !Number.isFinite(p.lat)) return null;
    if (typeof p.lon !== "number" || !Number.isFinite(p.lon)) return null;
    return {
      ids: chaines(p.ids),
      ecrevisses: chaines(p.ecrevisses),
      inconnus: chaines(p.inconnus),
      stations: st,
      lat: p.lat,
      lon: p.lon,
      releveIso: p.releveIso,
    };
  } catch {
    return null;
  }
}

/** Enregistre. Au mieux : un refus (mode privé, quota) ne doit pas casser
 *  l'écran — le pêcheur refera le relevé au prochain appui. */
export function writeCoin(c: CoinEspeces): void {
  try {
    localStorage.setItem(CLE_COIN, JSON.stringify(c));
  } catch {
    /* au mieux */
  }
}
