/**
 * La réserve hors-ligne : les 221 illustrations que la découpe du précache a
 * sorties de l'installation bloquante (voir `precache-decoupe.ts` pour les
 * chiffres et le raisonnement).
 *
 * Sorties du précache, elles ne sont PAS abandonnées : ce module les
 * retélécharge après l'activation du service worker, dans le cache que la route
 * CacheFirst de `vite.config.ts` interroge. L'app reste donc utilisable hors
 * ligne en entier — la différence est que le noyau (2 728 Kio) suffit désormais
 * à activer le service worker, au lieu d'attendre les 7 860 Kio.
 *
 * Trois choses que le précache workbox ne sait pas faire et qu'on gagne ici :
 *
 * 1. **Un échec n'emporte pas le reste.** `PrecacheController.install()` annule
 *    l'activation entière si une seule des 246 entrées échoue.
 * 2. **Le parallélisme.** Le précache télécharge une entrée à la fois ; sur un
 *    lien mobile, 221 allers-retours en série coûtent plus en latence qu'en
 *    octets. Ici, quatre de front.
 * 3. **L'état est lisible.** On peut dire « 84 illustrations sur 221 » au lieu
 *    de laisser croire que le hors-ligne est prêt.
 *
 * Ce qu'on perd, et comment c'est rendu : le précache versionnait chaque
 * fichier par sa `revision`, alors que les images de `public/` n'ont pas de hash
 * dans leur nom. Sous CacheFirst, une image corrigée ne remplacerait jamais
 * l'ancienne. La réserve range donc l'identité du build à côté des fichiers et
 * revalide tout quand elle change — avec `cache: "no-cache"`, donc à coup de
 * 304 pour ce qui n'a pas bougé.
 */

import {
  CACHE_RESERVE,
  PREFIXES_RESERVE,
  estDansLaReserve,
  MOTIF_RESERVE,
} from "./precache-decoupe";
import { APP_VERSION, COMMIT } from "./build";
import { thumbOf } from "./thumbs";
import {
  SPECIES_MEDIA,
  KNOT_MEDIA,
  CRAYFISH_MEDIA,
  GEAR_MEDIA,
  RECIPE_MEDIA,
  TECHNIQUE_MEDIA,
} from "../data/media";
import { LOCAL_KNOT_MEDIA, ALL_KNOT_STEP_MEDIA } from "../data/knot-diagrams";

/** Combien de téléchargements de front. Assez pour ne pas payer 221 latences
 *  l'une après l'autre, assez peu pour ne pas monopoliser le lien de quelqu'un
 *  qui est en train de consulter la carte. */
const DE_FRONT = 4;

/** Clé où l'identité du build est rangée, dans le cache de la réserve. Ce n'est
 *  pas un fichier de la réserve : le ménage ne doit pas l'emporter. */
const CLE_BUILD = "reserve:build";

export interface EtatReserve {
  /** Fichiers que la réserve doit contenir. */
  total: number;
  /** Fichiers réellement présents dans le cache. */
  presents: number;
  /** Fichiers dont le téléchargement a échoué au dernier passage. */
  echecs: number;
  /** Une préparation est en cours. */
  enCours: boolean;
  /** Tout est là. Faux par défaut : on ne promet pas le hors-ligne avant. */
  complete: boolean;
}

const VIDE: EtatReserve = { total: 0, presents: 0, echecs: 0, enCours: false, complete: false };

let etat: EtatReserve = VIDE;
let enVol: Promise<EtatReserve> | null = null;
const auditeurs = new Set<(e: EtatReserve) => void>();

function poser(p: Partial<EtatReserve>): void {
  etat = { ...etat, ...p };
  etat.complete = etat.total > 0 && etat.presents === etat.total;
  auditeurs.forEach((a) => a(etat));
}

/** S'abonner à l'avancement de la réserve. Se déclenche tout de suite avec
 *  l'état courant, pour qu'un écran monté en cours de route sache où on en est. */
export function onReserve(a: (e: EtatReserve) => void): () => void {
  auditeurs.add(a);
  a(etat);
  return () => auditeurs.delete(a);
}

/** Base d'URL de l'app. En test comme dans un worker, `location` peut manquer. */
function base(): string {
  const racine =
    typeof location !== "undefined" && location.href ? location.href : "http://localhost/";
  return new URL(import.meta.env.BASE_URL ?? "/", racine).href;
}

/** URL absolue d'un fichier de la réserve — la même que celle que le navigateur
 *  demandera pour l'`<img>`, sans quoi la clé de cache ne correspondrait pas. */
export function urlDe(fichier: string): string {
  return new URL(fichier, base()).href;
}

let liste: string[] | null = null;

/**
 * Les fichiers de la réserve, déduits du catalogue de médias que l'app embarque
 * déjà — jamais d'une liste tenue à la main, qui dériverait du contenu de
 * `public/`. Un test confronte le résultat au disque.
 */
export function listerReserve(): string[] {
  if (liste) return liste;
  const vus = new Set<string>();
  const ajouter = (f: string | undefined) => {
    if (f && estDansLaReserve(f)) vus.add(f.replace(/^\.?\//, ""));
  };
  // Les photos d'espèces pleine taille ne sont pas dans la réserve (elles ont
  // leur propre route, à l'ouverture d'une fiche) : ce sont leurs vignettes
  // 400 px qui y sont, et ce sont elles que les grilles et les listes affichent.
  for (const arr of Object.values(SPECIES_MEDIA)) for (const m of arr) ajouter(thumbOf(m.file));
  for (const m of Object.values(KNOT_MEDIA)) ajouter(m.file);
  for (const m of Object.values(LOCAL_KNOT_MEDIA)) ajouter(m.file);
  for (const arr of Object.values(ALL_KNOT_STEP_MEDIA)) for (const m of arr) ajouter(m.file);
  for (const m of Object.values(CRAYFISH_MEDIA)) ajouter(m.file);
  for (const m of Object.values(GEAR_MEDIA)) ajouter(m.file);
  for (const m of Object.values(RECIPE_MEDIA)) ajouter(m.file);
  for (const m of Object.values(TECHNIQUE_MEDIA)) ajouter(m.file);
  // Rangé par urgence, pas par ordre de déclaration : PREFIXES_RESERVE porte le
  // classement, et une coupure en route doit laisser manquer les recettes, pas
  // les planches d'identification.
  const rang = (f: string) => {
    const i = PREFIXES_RESERVE.findIndex((p) => f.startsWith(p));
    return i === -1 ? PREFIXES_RESERVE.length : i;
  };
  liste = [...vus].sort((a, b) => rang(a) - rang(b) || (a < b ? -1 : a > b ? 1 : 0));
  return liste;
}

/** Identité du build en cours : ce qui décide si la réserve est encore valable. */
function buildCourant(): string {
  return `${APP_VERSION}-${COMMIT}`;
}

async function ouvrir(): Promise<Cache | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(CACHE_RESERVE);
  } catch {
    return null; // pas de Cache API (mode privé, WebView ancienne) : pas de réserve
  }
}

/**
 * Ce que le cache contient réellement — pas ce qu'on a demandé, pas ce qu'on
 * espère. Sans Cache API, `total` reste connu mais `presents` vaut 0 : l'app ne
 * doit jamais annoncer un hors-ligne qu'elle n'a pas.
 */
export async function etatReserve(): Promise<EtatReserve> {
  const fichiers = listerReserve();
  const cache = await ouvrir();
  let presents = 0;
  if (cache) {
    for (const f of fichiers) if (await cache.match(urlDe(f))) presents++;
  }
  poser({ total: fichiers.length, presents });
  return etat;
}

/** Supprime du cache ce qui n'appartient plus à la réserve (fichier renommé,
 *  illustration retirée d'une version à l'autre). Le pendant de
 *  `cleanupOutdatedCaches`, que workbox n'applique qu'au précache. */
async function menage(cache: Cache, attendus: Set<string>): Promise<void> {
  for (const req of await cache.keys()) {
    if (req.url.endsWith(CLE_BUILD)) continue;
    if (!MOTIF_RESERVE.test(req.url) || !attendus.has(req.url)) await cache.delete(req);
  }
}

/**
 * La préparation a-t-elle le droit de partir ?
 *
 * La réserve pèse 5 132 Kio. La lancer pendant que le service worker installe
 * encore le noyau (2 730 Kio) disputerait la bande passante à la seule chose
 * qui décide de l'activation — exactement ce que la découpe cherche à
 * accélérer. L'absence de contrôleur est le signal disponible : tant que le
 * service worker n'a pas pris la page, le précache n'est pas fini.
 *
 * `force` est le cas d'`onOfflineReady` : l'appelant SAIT que le précache
 * vient d'aboutir, le contrôleur peut encore manquer d'un battement de cil.
 */
export function doitPreparer(ctx: {
  enLigne: boolean;
  controleParSW: boolean;
  force: boolean;
}): boolean {
  // Hors ligne, 221 échecs ne remplissent rien et brûlent la batterie.
  if (!ctx.enLigne) return false;
  return ctx.force || ctx.controleParSW;
}

export interface OptionsPreparation {
  signal?: AbortSignal;
  /** Identité du build. Injectable pour les tests ; sinon celle de `build.ts`. */
  build?: string;
}

/**
 * Remplit la réserve. Reprend là où elle en est : ce qui est déjà en cache
 * n'est pas redemandé, ce qui rend une coupure au bord de l'eau rattrapable.
 * Ne rejette jamais — un échec réseau est un état, pas une exception.
 */
export function preparerReserve(opts: OptionsPreparation = {}): Promise<EtatReserve> {
  // Deux préparations en parallèle se disputeraient le même lien pour le même
  // résultat. La seconde attend la première.
  if (enVol) return enVol;
  enVol = executer(opts).finally(() => {
    enVol = null;
    poser({ enCours: false });
  });
  return enVol;
}

async function executer(opts: OptionsPreparation): Promise<EtatReserve> {
  const fichiers = listerReserve();
  poser({ total: fichiers.length, enCours: true, echecs: 0 });
  const cache = await ouvrir();
  if (!cache) return etat;

  const build = opts.build ?? buildCourant();
  const stocke = await cache.match(urlDe(CLE_BUILD));
  const perime = !stocke || (await stocke.text()) !== build;

  await menage(cache, new Set(fichiers.map(urlDe)));

  let presents = 0;
  let echecs = 0;
  const file = [...fichiers];

  const travailler = async (): Promise<void> => {
    for (;;) {
      const f = file.shift();
      if (f === undefined || opts.signal?.aborted) return;
      const url = urlDe(f);
      try {
        // Périmé : on redemande, mais avec `no-cache` — un 304 ne coûte pas
        // les octets du fichier. À jour : ce qui est là est bon, on passe.
        if (!perime && (await cache.match(url))) {
          presents++;
          poser({ presents });
          continue;
        }
        const res = await fetch(new Request(url, perime ? { cache: "no-cache" } : {}));
        // Un 404 mis en cache serait servi hors ligne à la place de l'image :
        // pire que l'absence, parce qu'il ne se rattrape plus.
        if (!res.ok) throw new Error(String(res.status));
        await cache.put(url, res);
        presents++;
        poser({ presents });
      } catch {
        echecs++;
        poser({ echecs });
      }
    }
  };

  await Promise.all(Array.from({ length: DE_FRONT }, travailler));
  if (presents === fichiers.length) await cache.put(urlDe(CLE_BUILD), new Response(build));
  poser({ presents, echecs });
  return etat;
}

/** Remet le module à zéro. Réservé aux tests : l'état est un singleton parce
 *  qu'il décrit un cache unique, partagé par tous les écrans. */
export function reinitialiserReservePourTest(): void {
  etat = { ...VIDE };
  enVol = null;
  liste = null;
  auditeurs.clear();
}

export { CACHE_RESERVE, PREFIXES_RESERVE };
