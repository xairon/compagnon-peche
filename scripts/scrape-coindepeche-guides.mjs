// Aspire l'index des guides de coindepeche.fr et écrit
// src/data/guides-coindepeche.gen.ts.
//
//   node scripts/scrape-coindepeche-guides.mjs
//
// L'utilisateur a l'accord de l'administrateur du site ; robots.txt n'interdit
// que /api/ (relevé le 31/07/2026).
//
// Seuls le titre, le résumé du site, la catégorie, les dates et l'auteur
// déclaré sont repris. Le corps des articles reste chez lui : l'app renvoie
// vers la page, elle ne la republie pas.
//
// Comme pour les réglementations, le parseur vit dans src/lib/ et il est testé
// sur charge utile réelle figée ; ce script n'est que le tuyau.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

const SRC_PARSEUR = new URL("../src/lib/coindepeche-guides.ts", import.meta.url);
const js = transformSync(readFileSync(SRC_PARSEUR, "utf8"), { loader: "ts", format: "esm" }).code;
const tmp = join(mkdtempSync(join(tmpdir(), "cdpg-")), "guides.mjs");
writeFileSync(tmp, js);
const { parseGuideCoindepeche } = await import(pathToFileURL(tmp).href);

const SITEMAP = "https://www.coindepeche.fr/sitemap-guides.xml";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const DELAI_MS = 700;

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

async function texte(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.text();
}

const xml = await texte(SITEMAP);
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap : ${urls.length} guides annoncés`);

const guides = [];
const echecs = [];
for (const [i, url] of urls.entries()) {
  try {
    const g = parseGuideCoindepeche(await texte(url), url);
    if (g) guides.push(g);
    else echecs.push(`${url} — gabarit non reconnu`);
  } catch (e) {
    echecs.push(`${url} — ${e.message}`);
  }
  if (i % 10 === 0) process.stdout.write(`\r${i + 1}/${urls.length}`);
  await dodo(DELAI_MS);
}
console.log(`\nlus : ${guides.length} · échecs : ${echecs.length}`);
for (const e of echecs) console.log("  !! " + e);

guides.sort((a, b) => a.slug.localeCompare(b.slug, "fr"));

const j = (v) => JSON.stringify(v);
const auj = new Date();
const jjmmaaaa = `${String(auj.getDate()).padStart(2, "0")}/${String(auj.getMonth() + 1).padStart(2, "0")}/${auj.getFullYear()}`;

const cats = {};
for (const g of guides) cats[g.categorie ?? "(sans)"] = (cats[g.categorie ?? "(sans)"] ?? 0) + 1;

const sortie = `// GÉNÉRÉ par scripts/scrape-coindepeche-guides.mjs — ne pas éditer à la main.
//
// Source : coindepeche.fr, consulté le ${jjmmaaaa}. Publication avec l'accord de
// l'administrateur du site.
// ${guides.length} guides lus sur ${urls.length} annoncés par le sitemap.
// Répartition par catégorie : ${Object.entries(cats)
  .map(([k, v]) => `${k} ${v}`)
  .join(" · ")}.
//
// Seuls le titre affiché, le résumé que le site donne de lui-même, la catégorie,
// les dates et l'auteur DÉCLARÉ sont repris. Le corps des articles n'est pas
// embarqué : l'app renvoie vers la page. Un guide n'est donc pas consultable
// hors ligne, et l'écran doit le dire.

import type { GuideCdp } from "../lib/coindepeche-guides";

export const GUIDES_CONSULTE_LE = ${j(jjmmaaaa)};

/** Guides annoncés par le sitemap lors de la collecte. Écart avec
 *  GUIDES_COINDEPECHE.length = collecte incomplète, et il faut le dire. */
export const GUIDES_ANNONCES = ${urls.length};

export const GUIDES_COINDEPECHE: GuideCdp[] = [
${guides
  .map(
    (g) =>
      `  { slug:${j(g.slug)}, titre:${j(g.titre)}, description:${j(g.description)},` +
      ` categorie:${j(g.categorie)}, publieLe:${j(g.publieLe)}, modifieLe:${j(g.modifieLe)},` +
      ` auteur:${j(g.auteur)}, auteurType:${j(g.auteurType)}, url:${j(g.url)} },`,
  )
  .join("\n")}
];
`;

writeFileSync("src/data/guides-coindepeche.gen.ts", sortie);
console.log(`écrit src/data/guides-coindepeche.gen.ts (${guides.length} guides)`);
