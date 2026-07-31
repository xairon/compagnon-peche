// Aspire les 96 fiches réglementation départementales de coindepeche.fr et
// écrit src/data/reglementation-coindepeche.gen.ts.
//
//   node scripts/scrape-coindepeche-reglementation.mjs
//
// Autorisé : robots.txt du site n'interdit que /api/ (relevé le 31/07/2026),
// et l'utilisateur a l'accord de l'administrateur du site.
//
// Le parseur n'est PAS ici : il vit dans src/lib/coindepeche.ts et il est testé
// sur charge utile réelle figée. Ce script n'est que le tuyau — liste des URL,
// requêtes espacées, écriture du fichier. S'il se met à produire des fiches
// vides, c'est le parseur qui a cessé de reconnaître le gabarit, et les tests
// de src/lib/coindepeche.test.ts le diront sur les fixtures.
//
// La provenance voyage avec la donnée : chaque fiche porte son URL, et le
// fichier porte la date de consultation. Aucune de ces valeurs n'est un arrêté
// préfectoral — le site lui-même écrit « données à titre indicatif ».

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

// Le parseur est écrit en TypeScript, et Node 20 ne sait pas le lire. On le
// transpile à la volée plutôt que d'en recopier une version JS ici : une copie
// dériverait, et ce sont les tests de src/lib/coindepeche.test.ts qui garantissent
// que ce code-là lit correctement le gabarit du site.
const SRC_PARSEUR = new URL("../src/lib/coindepeche.ts", import.meta.url);
const js = transformSync(readFileSync(SRC_PARSEUR, "utf8"), {
  loader: "ts",
  format: "esm",
}).code;
const tmp = join(mkdtempSync(join(tmpdir(), "cdp-")), "coindepeche.mjs");
writeFileSync(tmp, js);
const { parseRegCoindepeche } = await import(pathToFileURL(tmp).href);

const SITEMAP = "https://www.coindepeche.fr/sitemap-reglementation.xml";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const DELAI_MS = 700; // requêtes espacées : on est invité, pas en charge

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

async function texte(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.text();
}

const xml = await texte(SITEMAP);
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap : ${urls.length} fiches départementales annoncées`);

const fiches = [];
const echecs = [];
for (const [i, url] of urls.entries()) {
  try {
    const fiche = parseRegCoindepeche(await texte(url), url);
    if (fiche) fiches.push(fiche);
    else echecs.push(`${url} — gabarit non reconnu`);
  } catch (e) {
    echecs.push(`${url} — ${e.message}`);
  }
  if (i % 10 === 0) process.stdout.write(`\r${i + 1}/${urls.length}`);
  await dodo(DELAI_MS);
}
console.log(`\nlues : ${fiches.length} · échecs : ${echecs.length}`);
for (const e of echecs) console.log("  !! " + e);

// Tri par code département, pour que deux exécutions successives produisent le
// même fichier et qu'un diff ne montre que les vrais changements.
fiches.sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }));

const j = (v) => JSON.stringify(v);
const auj = new Date();
const jjmmaaaa = `${String(auj.getDate()).padStart(2, "0")}/${String(auj.getMonth() + 1).padStart(2, "0")}/${auj.getFullYear()}`;

const lignes = fiches.map(
  (f) =>
    `  { code:${j(f.code)}, nom:${j(f.nom)}, url:${j(f.url)}, especes:[\n` +
    f.especes
      .map(
        (e) =>
          `    { espece:${j(e.espece)}, ouverture:${j(e.ouverture)}, fermeture:${j(e.fermeture)},` +
          ` tailleMin:${j(e.tailleMin)}, quotaJour:${j(e.quotaJour)}, note:${j(e.note)} },`,
      )
      .join("\n") +
    `\n  ] },`,
);

const sortie = `// GÉNÉRÉ par scripts/scrape-coindepeche-reglementation.mjs — ne pas éditer à la main.
//
// Source : coindepeche.fr, consulté le ${jjmmaaaa}.
// ${fiches.length} fiches départementales lues sur ${urls.length} annoncées par le sitemap.
//
// Ce ne sont PAS des arrêtés préfectoraux. Le site écrit lui-même, au bas de
// chaque fiche : « Ces informations sont données à titre indicatif pour la
// saison 2026. Consultez l'arrêté préfectoral de votre département. »
// Tout affichage de ces valeurs doit citer coindepeche.fr et cette date.

import type { RegDeptCdp } from "../lib/coindepeche";

/** Date de consultation, au format JJ/MM/AAAA, telle qu'elle doit être citée. */
export const CDP_CONSULTE_LE = ${j(jjmmaaaa)};

/** Nombre de fiches annoncées par le sitemap au moment de la collecte. Écart
 *  avec REG_COINDEPECHE.length = fiches non lues, et il faut le dire. */
export const CDP_FICHES_ANNONCEES = ${urls.length};

export const REG_COINDEPECHE: RegDeptCdp[] = [
${lignes.join("\n")}
];
`;

writeFileSync("src/data/reglementation-coindepeche.gen.ts", sortie);
console.log(`écrit src/data/reglementation-coindepeche.gen.ts (${fiches.length} départements)`);
