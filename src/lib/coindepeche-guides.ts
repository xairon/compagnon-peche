// Lecture des fiches « guide » de coindepeche.fr.
//
// L'utilisateur a l'accord de l'administrateur du site. Ce que l'app reprend :
// le titre visible, le résumé que le site donne de lui-même, la catégorie qu'il
// affiche, ses dates, et son auteur DÉCLARÉ. Ce qu'elle ne reprend pas : le
// corps de l'article. Il reste chez lui, l'app y renvoie — d'où le fait que
// l'index des guides ne fonctionne qu'en ligne, et que l'écran le dise.
//
// Les 41 guides relevés le 31/07/2026 déclarent tous un auteur, et c'est une
// Organization (« Coin de Pêche »), jamais une personne. L'app cite donc une
// organisation ; en faire une signature humaine serait inventer un auteur.

export interface GuideCdp {
  slug: string;
  titre: string;
  description: string | null;
  categorie: string | null;
  publieLe: string | null;
  modifieLe: string | null;
  auteur: string | null;
  /** « Organization » ou « Person », tel que le JSON-LD le déclare. Conservé
   *  parce que l'attribution n'a pas le même sens dans les deux cas. */
  auteurType: string | null;
  url: string;
}

const RE_H1 = /<h1[^>]*>([\s\S]*?)<\/h1>/;
const RE_CAT =
  /<span class="text-xs px-2\.5 py-1 rounded-full [^"]*uppercase tracking-wide">([^<]+)<\/span>/;
const RE_LD = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

interface ArticleLd {
  "@type"?: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  author?: { "@type"?: string; name?: string };
}

function articleLd(html: string): ArticleLd | null {
  RE_LD.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_LD.exec(html))) {
    try {
      const o = JSON.parse(m[1]!) as ArticleLd;
      if (o["@type"] === "Article") return o;
    } catch {
      /* un bloc illisible n'est pas une absence d'article : on continue */
    }
  }
  return null;
}

/** Ne garde que la date, pas l'heure : le site publie « 2026-02-20T10:00:00 »,
 *  et l'heure de publication d'un article n'apporte rien à un pêcheur. */
function jour(iso: string | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1]! : null;
}

/** Parse une fiche guide. Renvoie null si la page n'a pas la forme attendue —
 *  mieux vaut aucune entrée qu'une entrée sans titre. */
export function parseGuideCoindepeche(html: string, url: string): GuideCdp | null {
  const h1 = RE_H1.exec(html);
  const ld = articleLd(html);
  if (!h1 || !ld) return null;
  const titre = decode(h1[1]!);
  if (!titre) return null;
  const cat = RE_CAT.exec(html);
  return {
    slug: url.split("/").pop() ?? url,
    // Le titre visible plutôt que le `headline` du JSON-LD : les deux
    // divergent (le second est écrit pour les moteurs), et c'est le premier
    // qu'un lecteur reconnaîtra en arrivant sur la page.
    titre,
    description: ld.description ? decode(ld.description) : null,
    categorie: cat ? decode(cat[1]!) : null,
    publieLe: jour(ld.datePublished),
    modifieLe: jour(ld.dateModified),
    auteur: ld.author?.name ?? null,
    auteurType: ld.author?.["@type"] ?? null,
    url,
  };
}
