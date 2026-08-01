# Filtre « espèces relevées dans mon coin » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à l'écran Espèces une bascule qui réduit la grille aux espèces réellement relevées par les stations de pêche scientifique les plus proches, établie une fois sur appui explicite puis utilisable hors-ligne.

**Architecture :** Un module pur + chargeur (`lib/especes-du-coin.ts`) orchestre deux fonctions Hub'Eau qui existent déjà (`stationsInBbox`, `speciesAtStation`) : il écarte les stations sans code, retient les trois plus proches, les lit **en série**, et apparie les taxons aux fiches par binôme latin corrigé d'une table de synonymes. Le résultat est persisté par `lib/prefs-coin.ts` (clé localStorage dédiée), et l'écran Espèces le croise avec le filtre de groupe existant.

**Tech Stack :** React 18 · TypeScript · Vite · Vitest (+ jsdom, @testing-library/react) · Hub'Eau `v1/etat_piscicole`

**Spec :** [`docs/superpowers/specs/2026-08-01-especes-du-coin-design.md`](../specs/2026-08-01-especes-du-coin-design.md)

## Global Constraints

- **Langue.** Tout le texte visible et tous les commentaires sont en **français**. Les commentaires disent **pourquoi**, pas quoi — c'est la convention du dépôt, tenue partout.
- **Le module n'écrit jamais le mot « rivière ».** Il parle de **stations relevées**, jamais du cours d'eau. Une station retenue peut être à 14 km sur un autre ruisseau.
- **Rien n'est inventé.** Un taxon non apparié est compté et annoncé, jamais deviné ni jeté en silence. Aucun repli sur le département.
- **Ne lève jamais.** `chargerEspecesDuCoin` et les deux fonctions de `prefs-coin` rendent une valeur de repli plutôt qu'une exception, sur le modèle de `lib/rivieres.ts` et `lib/prefs-accueil.ts`.
- **Lecture en série.** Hub'Eau rate-limite : la 9ᵉ requête rapprochée a rendu 299 o de HTML au lieu du JSON (mesuré le 01/08/2026). Jamais de `Promise.all` sur les stations.
- **Aucun nouvel appel réseau écrit à la main.** On réutilise `fetchT`/`lireJsonBorne` via `stationsInBbox` et `speciesAtStation` de `lib/hubeau.ts`.
- **Couleurs.** Uniquement des jetons `var(--…)` déjà existants. Les paires employées (`--muted` sur `--paper`, `--green` sur `--paper`) sont déjà déclarées dans `PAIRES` de `lib/contraste-palette.ts` — aucune paire à ajouter. Le CSS neuf va dans **`src/screens/especes.css`** (convention `accueil.css` / `recettes.css` / `noeuds.css`), donc hors du périmètre de `empreinte-couleurs.test.ts` qui ne lit que `src/styles.css` : **aucune empreinte à régénérer**.
- **Tests :** `npm test` (vitest). Fixtures sous `src/lib/__fixtures__/`, lues via `readFileSync(fileURLToPath(new URL(...)))` — voir `src/lib/rivieres.test.ts` pour le motif exact.
- **Fixtures déjà commitées** (commit `c64ad16`), à ne pas régénérer : `hubeau-piscicole-stations-blois.json`, `hubeau-piscicole-obs-04052025.json`, `hubeau-piscicole-obs-04052800.json`, `hubeau-piscicole-obs-04052600.json`.

## Vérité terrain (mesurée le 01/08/2026 autour de Blois, 47,586 / 1,336)

Ces nombres sont les valeurs attendues des tests. Ne pas les recalculer : ils viennent des fixtures figées.

| | |
|---|---|
| Binômes latins dans `SPECIES` | **129**, aucun doublon |
| Stations rendues par la bbox | 22, dont **6 sans `code_station` ni `libelle_station`** |
| Trois plus proches **valides** | `04052025` (3,37 km) · `04052800` (5,06 km) · `04052600` (7,63 km) |
| Union des taxons distincts | **39** |
| → espèces de `SPECIES` appariées | **34** (donc **95** masquées sur 129) |
| → écrevisses (fiche dans `data/ecrevisses.ts`) | **2** — `Procambarus clarkii`, `Faxonius limosus` |
| → réellement sans fiche | **3** — `Cyprinidae sp.`, `Lampetra spp`, `Hybride brème-gardon` |

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/especes-du-coin.ts` *(créer)* | Appariement pur + orchestration réseau. Rien d'autre. |
| `src/lib/especes-du-coin.test.ts` *(créer)* | Tests des deux, sur fixtures figées. |
| `src/lib/prefs-coin.ts` *(créer)* | Persistance du relevé. Une clé, un propriétaire. |
| `src/lib/prefs-coin.test.ts` *(créer)* | Relecture défensive. |
| `src/store.tsx` *(modifier)* | Un champ `coin: boolean` — l'état de la bascule. |
| `src/screens/Especes.tsx` *(modifier)* | Bascule, bandeau de provenance, compteur de masquées, états d'échec. |
| `src/screens/especes.css` *(créer)* | Les quatre règles du filtre. |
| `src/screens/Especes.test.tsx` *(créer)* | Tests d'écran. |

---

### Task 1 : `apparier()` — du taxon relevé à la fiche

**Files:**
- Create: `src/lib/especes-du-coin.ts`
- Test: `src/lib/especes-du-coin.test.ts`

**Interfaces:**
- Consumes: `binomial(latin: string): string` de `./hubeau` · `SPECIES` de `../data/species` · `ECREVISSES` de `../data/ecrevisses`
- Produces: `apparier(taxons: string[]): { ids: string[]; ecrevisses: string[]; inconnus: string[] }` — les trois tableaux sont **triés**, sans doublon.

- [ ] **Step 1: Write the failing test**

Créer `src/lib/especes-du-coin.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { apparier } from "./especes-du-coin";

/**
 * Apparier un taxon relevé à une fiche, mesuré le 01/08/2026 sur les trois
 * stations ASPE les plus proches de Blois : 39 taxons distincts, dont 2
 * seulement échouent à cause d'un SYNONYME. Dans un filtre qui masque, rater un
 * synonyme masque une espèce réellement présente — d'où la table, et d'où le
 * test de garde qui échouera quand une divergence nouvelle apparaîtra.
 */

describe("apparier", () => {
  it("retrouve le chevaine sous le nom que l'ASPE lui donne", () => {
    // ASPE écrit `Leuciscus cephalus` ; le dépôt écrit `Squalius cephalus`.
    expect(apparier(["Leuciscus cephalus"]).ids).toEqual(["chevesne"]);
  });

  it("retrouve la grémille malgré la terminaison du genre", () => {
    // ASPE écrit `cernua`, le dépôt `cernuus`.
    expect(apparier(["Gymnocephalus cernua"]).ids).toEqual(["gremille"]);
  });

  it("ne confond pas le chevaine et le mulet", () => {
    // LE piège de l'épithète : apparier sur `cephalus` seul rendrait le
    // chevaine pour un mulet. Les deux sont dans le catalogue.
    expect(apparier(["Mugil cephalus"]).ids).toEqual(["mulet-cabot"]);
  });

  it("range les écrevisses à part : elles ont une fiche, mais ailleurs", () => {
    // Les compter comme « sans fiche » serait faux — l'écran Écrevisses en a
    // une. Elles ne filtrent pas la grille pour autant : SPECIES ne les
    // contient pas.
    const r = apparier(["Procambarus clarkii", "Faxonius limosus"]);
    expect(r.ecrevisses).toEqual(["americaine", "louisiane"]);
    expect(r.ids).toEqual([]);
    expect(r.inconnus).toEqual([]);
  });

  it("ne devine pas un lot identifié au genre, à la famille, ni un hybride", () => {
    const r = apparier(["Cyprinidae sp.", "Lampetra spp", "Hybride brème-gardon"]);
    expect(r.ids).toEqual([]);
    expect(r.inconnus).toEqual(["Cyprinidae sp.", "Hybride brème-gardon", "Lampetra spp"]);
  });

  it("dédoublonne et trie, pour que deux relevés rendent le même ordre", () => {
    const r = apparier(["Sander lucioperca", "Esox lucius", "Sander lucioperca"]);
    expect(r.ids).toEqual(["brochet", "sandre"]);
  });

  it("ignore une chaîne vide sans la compter comme inconnue", () => {
    expect(apparier(["", "   "])).toEqual({ ids: [], ecrevisses: [], inconnus: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/especes-du-coin.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "./especes-du-coin"`.

- [ ] **Step 3: Write minimal implementation**

Créer `src/lib/especes-du-coin.ts` :

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/especes-du-coin.test.ts
```

Attendu : PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/especes-du-coin.ts src/lib/especes-du-coin.test.ts
git commit -m "Coin — le chevaine s'appelle Leuciscus chez l'ASPE, Squalius chez nous"
```

---

### Task 2 : `chargerEspecesDuCoin()` — écarter les stations muettes, lire en série

**Files:**
- Modify: `src/lib/especes-du-coin.ts` (ajout en fin de fichier)
- Test: `src/lib/especes-du-coin.test.ts` (ajout d'un `describe`)

**Interfaces:**
- Consumes: `apparier` (Task 1) · `stationsInBbox`, `speciesAtStation`, `type Station` de `./hubeau` · `boxAroundKm`, `distKm` de `./geo` · `isoDay` de `./helpers`
- Produces:
  - `PORTEE_COIN_KM: number` (= 15) · `STATIONS_RETENUES: number` (= 3)
  - `interface StationDuCoin { code: string; nom: string; dist: number }`
  - `interface CoinEspeces { ids: string[]; ecrevisses: string[]; inconnus: string[]; stations: StationDuCoin[]; lat: number; lon: number; releveIso: string }`
  - `chargerEspecesDuCoin(lat: number, lon: number, signal?: AbortSignal): Promise<CoinEspeces | null>`

**Contrat des cas limites** (à respecter exactement — les tests l'exigent) :

| Situation | Retour |
|---|---|
| La requête stations échoue | `null` — on ne sait rien |
| Stations OK, aucune valide à portée | `CoinEspeces` avec `stations: []` et `ids: []` — on sait qu'il n'y a rien |
| Stations OK, une partie des observations échoue | `CoinEspeces` ne listant que les stations qui ont répondu |
| Stations OK, **toutes** les observations échouent | `null` — nommer des stations sans espèce se lirait « aucun poisson ici » |

- [ ] **Step 1: Write the failing test**

Ajouter à la fin de `src/lib/especes-du-coin.test.ts` (et compléter la ligne d'import du haut) :

```ts
// Remplacer la ligne d'import existante par :
// import { readFileSync } from "node:fs";
// import { fileURLToPath } from "node:url";
// import { describe, it, expect, vi, afterEach } from "vitest";
// import {
//   apparier,
//   chargerEspecesDuCoin,
//   PORTEE_COIN_KM,
//   STATIONS_RETENUES,
// } from "./especes-du-coin";

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

const LAT = 47.586;
const LON = 1.336;

/** Les trois stations valides les plus proches de Blois, dans l'ordre. */
const PROCHES = ["04052025", "04052800", "04052600"];

afterEach(() => vi.unstubAllGlobals());

/** Répond par les charges réelles figées ; `absentes` fait échouer ces stations. */
function stub(absentes: string[] = []) {
  const appels: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      appels.push(u);
      if (u.includes("/stations?"))
        return new Response(JSON.stringify(fixture("hubeau-piscicole-stations-blois.json")), {
          status: 200,
        });
      const m = /code_station=(\d+)/.exec(u);
      if (!m) throw new Error("URL non prévue : " + u);
      if (absentes.includes(m[1])) throw new Error("réseau coupé");
      return new Response(JSON.stringify(fixture(`hubeau-piscicole-obs-${m[1]}.json`)), {
        status: 200,
      });
    }),
  );
  return appels;
}

describe("chargerEspecesDuCoin", () => {
  it("écarte les six stations sans code et retient les trois plus proches VALIDES", async () => {
    // 6 des 22 enregistrements de la boîte n'ont ni code ni libellé — que des
    // coordonnées — et la PLUS PROCHE de Blois (2,04 km) en fait partie.
    // `stationsInBbox` en fait la chaîne "null", qui est truthy : sans ce tri,
    // une requête sur trois partirait pour rien.
    const appels = stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.stations.map((s) => s.code)).toEqual(PROCHES);
    expect(appels.filter((u) => u.includes("code_station=null"))).toEqual([]);
  });

  it("une requête de stations, puis une par station retenue — pas plus", async () => {
    const appels = stub();

    await chargerEspecesDuCoin(LAT, LON);

    expect(appels).toHaveLength(1 + STATIONS_RETENUES);
  });

  it("rend les 34 espèces, les 2 écrevisses et les 3 taxons sans fiche", async () => {
    stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.ids).toHaveLength(34);
    expect(c!.ids).toContain("sandre");
    expect(c!.ids).toContain("chevesne"); // le synonyme, de bout en bout
    expect(c!.ecrevisses).toEqual(["americaine", "louisiane"]);
    expect(c!.inconnus).toEqual(["Cyprinidae sp.", "Hybride brème-gardon", "Lampetra spp"]);
  });

  it("garde une station à peine échantillonnée plutôt qu'une plus riche mais plus loin", async () => {
    // 04052025 ne rend que 2 taxons. C'est la plus proche : la remplacer par
    // une station mieux fournie plus loin, ce serait choisir la donnée qui
    // arrange plutôt que celle du coin.
    stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.stations[0].code).toBe("04052025");
    expect(c!.stations[0].dist).toBeCloseTo(3.37, 1);
  });

  it("date le relevé, pour que l'écran dise de quand il parle", async () => {
    stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.releveIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c!.lat).toBe(LAT);
    expect(c!.lon).toBe(LON);
  });

  it("ne lève pas quand une station tombe, et rend ce que les autres savent", async () => {
    stub(["04052600"]);

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.stations.map((s) => s.code)).toEqual(["04052025", "04052800"]);
    expect(c!.ids.length).toBeGreaterThan(20);
  });

  it("rend null quand la requête de stations échoue — on ne sait rien", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("hors-ligne");
      }),
    );

    await expect(chargerEspecesDuCoin(LAT, LON)).resolves.toBeNull();
  });

  it("rend null quand TOUTES les stations retenues se taisent", async () => {
    // Nommer trois stations sans pouvoir citer une seule espèce se lirait
    // « aucun poisson ici » — une affirmation qu'on n'a pas constatée.
    stub(PROCHES);

    await expect(chargerEspecesDuCoin(LAT, LON)).resolves.toBeNull();
  });

  it("rend un relevé vide, et non null, quand la boîte n'a aucune station", async () => {
    // Distinct du cas hors-ligne : ici la source a répondu, et sa réponse est
    // « rien ici ». L'écran doit pouvoir le dire.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ count: 0, data: [] }), { status: 200 }),
      ),
    );

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c).not.toBeNull();
    expect(c!.stations).toEqual([]);
    expect(c!.ids).toEqual([]);
  });

  it("ne demande pas une boîte plus large que la portée annoncée", async () => {
    const appels = stub();

    await chargerEspecesDuCoin(LAT, LON);

    // La portée est un plafond de CRÉDIBILITÉ : au-delà, la station ne parle
    // plus du coin où l'on pêche. Le coût, lui, est fixé par STATIONS_RETENUES.
    expect(PORTEE_COIN_KM).toBe(15);
    const bbox = /bbox=([\d.-]+),([\d.-]+),([\d.-]+),([\d.-]+)/.exec(appels[0])!;
    expect(Number(bbox[3]) - Number(bbox[1])).toBeLessThan(0.6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/especes-du-coin.test.ts
```

Attendu : ÉCHEC — `chargerEspecesDuCoin is not a function` (les 7 tests de la Task 1 passent toujours).

- [ ] **Step 3: Write minimal implementation**

Ajouter en tête de `src/lib/especes-du-coin.ts` :

```ts
import { stationsInBbox, speciesAtStation } from "./hubeau";
import { boxAroundKm, distKm } from "./geo";
import { isoDay } from "./helpers";
```

Puis à la fin du fichier :

```ts
/**
 * Rayon de la boîte demandée, en kilomètres.
 *
 * C'est un plafond de CRÉDIBILITÉ, pas un plafond de coût — le coût est fixé
 * par `STATIONS_RETENUES`, quelle que soit la portée. Une station à 14 km est
 * déjà une extrapolation, que l'écran doit avouer en la nommant avec sa
 * distance ; au-delà, elle ne parle plus du coin où l'on pêche.
 */
export const PORTEE_COIN_KM = 15;

/**
 * Combien de stations nourrissent un relevé.
 *
 * C'EST LUI QUI FIXE LA FACTURE. Mesuré le 01/08/2026 : 60 à 104 ko par
 * station, pour le seul champ `nom_latin_taxon` — l'API ne sait pas rendre des
 * taxons distincts, elle rend un enregistrement par lot, et une station bien
 * suivie en compte des milliers. Trois stations ≈ 237 ko, UNE FOIS, sur appui
 * explicite. À comparer aux 973 ko d'une classe Sandre que l'app télécharge
 * déjà (voir lib/net-bornes.ts).
 *
 * Pourquoi pas une seule : la station la plus proche de Blois ne rend que 2
 * taxons. Pourquoi pas dix : au-delà de trois on quitte le coin, et la facture
 * suit linéairement.
 */
export const STATIONS_RETENUES = 3;

/** Une station qui a nourri le relevé, nommée pour que l'écran puisse la citer. */
export interface StationDuCoin {
  code: string;
  nom: string;
  /** Kilomètres depuis le point demandé. */
  dist: number;
}

/** Ce que le coin retient. Sérialisable tel quel (voir lib/prefs-coin.ts). */
export interface CoinEspeces {
  /** Ids de fiches SPECIES, triés. */
  ids: string[];
  /** Ids de fiches d'écrevisses relevées ici. Elles ne filtrent pas la grille —
   *  SPECIES ne les contient pas — mais l'app les documente. */
  ecrevisses: string[];
  /** Taxons qu'aucune fiche ne reçoit : lots au genre ou à la famille, hybrides. */
  inconnus: string[];
  /** Les stations qui ont RÉPONDU, la plus proche d'abord. */
  stations: StationDuCoin[];
  lat: number;
  lon: number;
  /** yyyy-mm-dd du relevé. */
  releveIso: string;
}

/**
 * Un code de station exploitable.
 *
 * 6 des 22 enregistrements de la boîte de Blois n'ont ni `code_station` ni
 * `libelle_station` — seulement des coordonnées — et `stationsInBbox` les
 * traverse en `String(null)`, soit la CHAÎNE "null", qui est truthy. Tester la
 * chaîne, donc, et pas seulement la valeur falsy.
 */
function codeExploitable(code: string): boolean {
  return code !== "" && code !== "null" && code !== "undefined";
}

/**
 * Les espèces relevées autour d'un point, ou null quand on ne sait rien.
 *
 * NE LÈVE JAMAIS, sur le modèle de `chargerRivieres` : une station muette se
 * retire du lot, elle ne vide pas l'écran. Mais la distinction entre « la
 * source a dit qu'il n'y a rien » (relevé vide) et « on n'a pas pu demander »
 * (null) est tenue de bout en bout : l'écran n'a pas le droit de les confondre.
 *
 * EN SÉRIE, JAMAIS EN PARALLÈLE. Hub'Eau rate-limite : mesuré le 01/08/2026, la
 * 9ᵉ requête rapprochée rend 299 o de HTML au lieu du JSON attendu.
 */
export async function chargerEspecesDuCoin(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<CoinEspeces | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, PORTEE_COIN_KM);
  let brutes;
  try {
    brutes = await stationsInBbox(w, s, e, n, signal);
  } catch {
    return null;
  }

  const retenues = brutes
    .filter((st) => codeExploitable(st.code))
    .map((st) => ({ code: st.code, nom: st.nom, dist: distKm(lat, lon, st.lat, st.lon) }))
    .filter((st) => st.dist <= PORTEE_COIN_KM)
    // À égalité de distance, le code tranche : deux relevés du même point
    // doivent citer les mêmes stations dans le même ordre.
    .sort((a, b) => a.dist - b.dist || a.code.localeCompare(b.code))
    .slice(0, STATIONS_RETENUES);

  const taxons: string[] = [];
  const lues: StationDuCoin[] = [];
  for (const st of retenues) {
    try {
      const sp = await speciesAtStation(st.code, signal);
      // `latin` peut être vide quand la source ne publie qu'un nom commun.
      // On garde alors le nom commun : il finira en « inconnu », ce qui est
      // honnête — le jeter en silence ne l'aurait pas été.
      for (const x of sp) taxons.push(x.latin || x.fr);
      lues.push(st);
    } catch {
      /* une station muette se retire ; les autres restent */
    }
  }
  // Nommer des stations sans pouvoir citer une seule espèce se lirait « aucun
  // poisson ici ». Aucune station retenue, en revanche, est une réponse : la
  // boîte est vide, et l'écran doit pouvoir le dire.
  if (retenues.length > 0 && lues.length === 0) return null;

  return { ...apparier(taxons), stations: lues, lat, lon, releveIso: isoDay() };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/especes-du-coin.test.ts
```

Attendu : PASS, 17 tests (7 + 10).

- [ ] **Step 5: Commit**

```bash
git add src/lib/especes-du-coin.ts src/lib/especes-du-coin.test.ts
git commit -m "Coin — six stations sur vingt-deux n'ont pas de code, la plus proche non plus"
```

---

### Task 3 : `prefs-coin.ts` — ce que le relevé laisse derrière lui

**Files:**
- Create: `src/lib/prefs-coin.ts`
- Test: `src/lib/prefs-coin.test.ts`

**Interfaces:**
- Consumes: `type CoinEspeces` de `./especes-du-coin` (Task 2)
- Produces: `readCoin(): CoinEspeces | null` · `writeCoin(c: CoinEspeces): void` · `CLE_COIN: string` (= `"carnet:coin"`)

- [ ] **Step 1: Write the failing test**

Créer `src/lib/prefs-coin.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readPrefs, writePrefs } from "./prefs";
import { readCoin, writeCoin, CLE_COIN } from "./prefs-coin";
import type { CoinEspeces } from "./especes-du-coin";

// Le relevé du coin coûte ~237 ko de réseau. Le perdre à chaque lancement
// rendrait la fonctionnalité inutilisable au bord de l'eau — c'est justement
// hors-ligne qu'elle sert. D'où une clé à part : `store.tsx` réécrit
// `carnet:prefs` en ENTIER à chaque changement de département.

const COIN: CoinEspeces = {
  ids: ["brochet", "sandre"],
  ecrevisses: ["louisiane"],
  inconnus: ["Cyprinidae sp."],
  stations: [{ code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 }],
  lat: 47.586,
  lon: 1.336,
  releveIso: "2026-08-01",
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("readCoin", () => {
  it("part de rien : aucun relevé mémorisé", () => {
    expect(readCoin()).toBeNull();
  });

  it("relit ce qui a été écrit", () => {
    writeCoin(COIN);
    expect(readCoin()).toEqual(COIN);
  });

  it("n'est pas effacé quand le store réécrit les préférences d'appareil", () => {
    writeCoin(COIN);
    writePrefs({ ...readPrefs(), dept: "36", deptChosen: true });
    expect(readCoin()).toEqual(COIN);
  });

  it("survit à un contenu corrompu sans lever", () => {
    localStorage.setItem(CLE_COIN, "{pas du json");
    expect(readCoin()).toBeNull();
  });

  it("refuse un relevé sans station : il n'aurait aucune provenance à citer", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, stations: [] }));
    expect(readCoin()).toBeNull();
  });

  it("refuse un relevé sans date : l'écran ne pourrait pas dire de quand il parle", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, releveIso: "l'autre jour" }));
    expect(readCoin()).toBeNull();
  });

  it("refuse un relevé sans point : il ne serait rattaché à aucun coin", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, lat: "quarante-sept" }));
    expect(readCoin()).toBeNull();
  });

  it("écarte un id qui n'est pas une chaîne sans jeter le relevé", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, ids: ["brochet", 7, "", null] }));
    expect(readCoin()!.ids).toEqual(["brochet"]);
  });

  it("accepte un relevé où AUCUNE espèce n'a été appariée", () => {
    // Trois lots identifiés à la famille, et rien d'autre : c'est un relevé
    // valide, et le dire vaut mieux que faire comme s'il n'existait pas.
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, ids: [] }));
    expect(readCoin()!.ids).toEqual([]);
  });

  it("écarte une station sans code ou sans distance chiffrée", () => {
    localStorage.setItem(
      CLE_COIN,
      JSON.stringify({
        ...COIN,
        stations: [
          { code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 },
          { code: "", nom: "?", dist: 1 },
          { code: "04052600", nom: "BEUVRON", dist: "loin" },
        ],
      }),
    );
    expect(readCoin()!.stations).toEqual([
      { code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 },
    ]);
  });

  it("ne lève pas quand localStorage est indisponible (navigation privée)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => readCoin()).not.toThrow();
    expect(readCoin()).toBeNull();
  });
});

describe("writeCoin", () => {
  it("ne lève pas quand l'écriture est refusée", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeCoin(COIN)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/prefs-coin.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "./prefs-coin"`.

- [ ] **Step 3: Write minimal implementation**

Créer `src/lib/prefs-coin.ts` :

```ts
import type { CoinEspeces, StationDuCoin } from "./especes-du-coin";

/**
 * Le relevé du coin, d'un lancement à l'autre.
 *
 * POURQUOI ON LE GARDE. Il coûte ~237 ko de réseau (voir especes-du-coin.ts).
 * Le refaire à chaque lancement rendrait le filtre inutilisable là où il sert
 * le plus — au bord de l'eau, sans réseau.
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/prefs-coin.test.ts
```

Attendu : PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prefs-coin.ts src/lib/prefs-coin.test.ts
git commit -m "Coin — deux cent trente-sept kilo-octets ne se redemandent pas à chaque lancement"
```

---

### Task 4 : la bascule filtre la grille

**Files:**
- Modify: `src/store.tsx` (interface `AppState` ~ligne 113, `makeInitialState` ~ligne 180)
- Modify: `src/screens/Especes.tsx`
- Create: `src/screens/especes.css`
- Test: `src/screens/Especes.test.tsx`

**Interfaces:**
- Consumes: `readCoin`, `writeCoin` (Task 3) · `chargerEspecesDuCoin`, `PORTEE_COIN_KM`, `type CoinEspeces` (Task 2) · `locate`, `locateMessage` de `../lib/locate`
- Produces: `AppState.coin: boolean` — l'état de la bascule, lisible par tout écran.

**Pourquoi la bascule est dans le store et le relevé en local :** aller sur une fiche puis revenir doit garder le filtre allumé — `state.coin` survit à la navigation, un `useState` non. Le relevé, lui, se relit de `localStorage` en synchrone à chaque montage : le garder aussi dans le store ferait deux vérités.

- [ ] **Step 1: Write the failing test**

Créer `src/screens/Especes.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StoreProvider } from "../store";
import { Especes } from "./Especes";
import { CLE_COIN } from "../lib/prefs-coin";
import type { CoinEspeces } from "../lib/especes-du-coin";

// Le filtre masque — c'est ce qui a été demandé — mais il dit toujours combien,
// et il se défait en un appui. Les relevés ASPE ne sont pas exhaustifs :
// l'électro-pêche capture mal les gros silures et les carpes de fond.

const COIN: CoinEspeces = {
  ids: ["brochet", "sandre", "perche"],
  ecrevisses: ["louisiane"],
  inconnus: ["Cyprinidae sp."],
  stations: [{ code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 }],
  lat: 47.586,
  lon: 1.336,
  releveIso: "2026-08-01",
};

const poser = () => render(
  <StoreProvider>
    <Especes />
  </StoreProvider>,
);

beforeEach(() => localStorage.clear());
// `unstubAllGlobals` en plus de `restoreAllMocks` : sans lui, le `navigator`
// stubé par les deux derniers tests fuirait sur les suivants.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Especes — filtre du coin", () => {
  it("ne masque rien tant que le pêcheur n'a rien demandé", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();

    // Un relevé enregistré ne doit PAS allumer le filtre au lancement :
    // ouvrir l'app et trouver 95 espèces déjà masquées serait une surprise.
    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("masque les espèces hors relevé quand la bascule est allumée", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
    expect(screen.queryByLabelText("Fiche Ablette")).toBeNull();
  });

  it("dit combien d'espèces il cache, et les rend en un appui", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    const reste = screen.getByRole("button", { name: /126 autres espèces/i });
    fireEvent.click(reste);

    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("cite ses stations et la date du relevé", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    // La provenance n'est pas décorative : elle est ce qui permet au pêcheur
    // de juger si le relevé parle bien de son coin.
    expect(screen.getByText(/COSSON à CHAILLES/)).toBeTruthy();
    expect(screen.getByText(/5,1 km/)).toBeTruthy();
    expect(screen.getByText(/01\/08\/2026/)).toBeTruthy();
  });

  it("n'écrit jamais le mot « rivière »", () => {
    // Une station retenue peut être à 14 km sur un autre ruisseau. Dire
    // « votre rivière » affirmerait ce qui n'a pas été constaté.
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    const { container } = poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    expect(container.textContent).not.toMatch(/rivière/i);
  });

  it("se combine avec un groupe au lieu de le remplacer", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));
    fireEvent.click(screen.getByRole("button", { name: "Carnassiers" }));

    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
    // La perche est au relevé et carnassière ; le gardon n'est ni l'un ni
    // l'autre. Si le coin remplaçait le groupe, l'un des deux sortirait.
    expect(screen.getByLabelText("Fiche Perche")).toBeTruthy();
    expect(screen.queryByLabelText("Fiche Gardon")).toBeNull();
  });

  it("annonce les taxons sans fiche et les écrevisses, séparément", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    expect(screen.getByText(/1 taxon relevé n'a pas de fiche/)).toBeTruthy();
    expect(screen.getByText(/1 écrevisse relevée/)).toBeTruthy();
  });

  it("dit que la liste ne peut pas être établie hors-ligne, sans relevé", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("hors-ligne");
    }));
    // `navigator` n'est PAS étalé ici : ses propriétés vivent sur le prototype,
    // et `{...navigator}` rend un objet vide selon l'environnement. `locate()`
    // ne lit que `geolocation` — c'est tout ce qu'il faut fournir.
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 47.586, longitude: 1.336 } } as GeolocationPosition),
      },
    });
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() =>
      expect(screen.getByText(/Sans réseau, la liste des relevés/)).toBeTruthy(),
    );
    // Et surtout : la grille n'a pas été vidée.
    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("relaie le refus de géolocalisation tel quel", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, ko: PositionErrorCallback) =>
          ko({ code: 1 } as GeolocationPositionError),
      },
    });
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() => expect(screen.getByText(/Localisation refusée/)).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/screens/Especes.test.tsx
```

Attendu : ÉCHEC — `Unable to find role="button" and name /dans mon coin/i`.

- [ ] **Step 3a: Ajouter le champ au store**

Dans `src/store.tsx`, interface `AppState`, juste après `filter: string;` :

```ts
  /** La bascule « dans mon coin » de l'écran Espèces.
   *
   *  DANS LE STORE ET NON EN LOCAL : aller sur une fiche puis revenir doit
   *  garder le filtre allumé. Le RELEVÉ, lui, n'est pas ici — il se relit de
   *  localStorage à chaque montage (lib/prefs-coin.ts), et le dupliquer dans
   *  l'état ferait deux vérités.
   *
   *  NON PERSISTÉ, délibérément : ouvrir l'app et trouver 95 espèces déjà
   *  masquées sans l'avoir demandé serait une surprise, et le pêcheur qui
   *  cherche une fiche vue ailleurs ne comprendrait pas sa disparition. */
  coin: boolean;
```

Dans `makeInitialState`, juste après `filter: "tous",` :

```ts
    coin: false,
```

- [ ] **Step 3b: Écrire le CSS**

Créer `src/screens/especes.css` :

```css
/* Espèces — le filtre « dans mon coin ».
   Jetons uniquement : les paires --muted/--paper et --green/--paper sont déjà
   déclarées dans PAIRES (lib/contraste-palette.ts). */

.coin-rang {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

/* La provenance n'est pas décorative : c'est elle qui permet de juger si le
   relevé parle bien du coin où l'on pêche. */
.coin-src {
  margin-top: 9px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}
.coin-src .coin-maj {
  color: var(--green);
  font-weight: 550;
  text-decoration: underline;
}

/* L'aveu de ce que le filtre cache, en pied de grille. */
.coin-reste {
  padding: 2px 18px 26px;
  text-align: center;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}
```

- [ ] **Step 3c: Câbler l'écran**

Dans `src/screens/Especes.tsx` — ajouter aux imports :

```tsx
import { useState } from "react";
import { chargerEspecesDuCoin, PORTEE_COIN_KM, type CoinEspeces } from "../lib/especes-du-coin";
import { readCoin, writeCoin } from "../lib/prefs-coin";
import { locate, locateMessage } from "../lib/locate";
import "./especes.css";
```

Dans le corps de `Especes()`, après `const deptName = …` :

```tsx
  // Relu en synchrone au montage : ce relevé décide du premier rendu, et une
  // lecture asynchrone afficherait les 129 fiches le temps d'une frame avant
  // d'en masquer 95.
  const [coin, setCoin] = useState<CoinEspeces | null>(() => readCoin());
  // Trois états nommés plutôt qu'une chaîne libre : `"repos" | "charge" | string`
  // s'effondre en `string` pour TypeScript, et le test `typeof x === "string"`
  // serait toujours vrai. L'échec porte son message, il ne l'EST pas.
  const [coinEtat, setCoinEtat] = useState<
    { k: "repos" } | { k: "charge" } | { k: "err"; msg: string }
  >({ k: "repos" });
```

Remplacer le calcul de `list` par :

```tsx
  const list = SPECIES.filter(
    (sp) =>
      (state.filter === "tous" || sp.group === state.filter) &&
      matchSpecies(sp, state.q) &&
      (!state.coin || !coin || coin.ids.includes(sp.id)),
  );
  // Ce que le filtre cache, compté sur le catalogue entier et non sur la vue
  // courante : c'est le nombre que le pêcheur doit pouvoir contredire.
  const masquees = state.coin && coin ? SPECIES.length - coin.ids.length : 0;
```

Ajouter les deux fonctions, avant le `return` :

```tsx
  async function releverLeCoin() {
    setCoinEtat({ k: "charge" });
    try {
      const { lat, lon } = await locate();
      const c = await chargerEspecesDuCoin(lat, lon);
      if (!c) {
        // La source n'a pas répondu. Distinct de « il n'y a rien ici » : on ne
        // sait pas, et l'écran n'a pas le droit de confondre les deux.
        setCoinEtat({
          k: "err",
          msg: "Sans réseau, la liste des relevés ne peut pas être établie.",
        });
        return;
      }
      if (!c.stations.length) {
        // On a demandé, et la réponse est « rien ici ». Pas de repli sur le
        // département : aucune donnée de répartition départementale n'existe
        // dans le dépôt, et en inventer une pour boucher ce trou irait contre
        // la règle qui tient tout le reste.
        setCoinEtat({
          k: "err",
          msg: `Aucune station de pêche scientifique à moins de ${PORTEE_COIN_KM} km d'ici.`,
        });
        return;
      }
      writeCoin(c);
      setCoin(c);
      setCoinEtat({ k: "repos" });
      set({ coin: true });
    } catch (e) {
      // `locate()` rejette avec un code (`"denied"`…), pas une Error :
      // locateMessage en fait la phrase, et elle est déjà juste.
      setCoinEtat({ k: "err", msg: locateMessage(e) });
    }
  }

  function basculerCoin() {
    if (coin) set({ coin: !state.coin });
    else void releverLeCoin();
  }
```

Insérer le bloc juste **avant** la rangée `<div className="chips">` des groupes :

```tsx
        <div className="coin-rang">
          <button
            type="button"
            className={"chip" + (state.coin ? " chip-on" : "")}
            aria-pressed={state.coin}
            disabled={coinEtat.k === "charge"}
            onClick={basculerCoin}
          >
            {coinEtat.k === "charge" ? "Relevé en cours…" : "Dans mon coin"}
          </button>
        </div>

        {coinEtat.k === "err" && <div className="coin-src">{coinEtat.msg}</div>}

        {state.coin && coin && (
          <div className="coin-src">
            D'après {coin.stations.length}{" "}
            {coin.stations.length > 1 ? "stations Hub'Eau" : "station Hub'Eau"} —{" "}
            {coin.stations
              .map((s) => `${s.nom} (${s.dist.toFixed(1).replace(".", ",")} km)`)
              .join(", ")}{" "}
            · relevé le {coin.releveIso.split("-").reverse().join("/")}{" "}
            <button type="button" className="coin-maj link-inline" onClick={releverLeCoin}>
              actualiser
            </button>
            {coin.inconnus.length > 0 && (
              <>
                <br />
                {coin.inconnus.length} taxon{coin.inconnus.length > 1 ? "s" : ""} relevé
                {coin.inconnus.length > 1 ? "s" : ""} n'
                {coin.inconnus.length > 1 ? "ont" : "a"} pas de fiche : lots identifiés au genre
                ou à la famille, hybrides.
              </>
            )}
            {coin.ecrevisses.length > 0 && (
              <>
                <br />
                {coin.ecrevisses.length} écrevisse{coin.ecrevisses.length > 1 ? "s" : ""} relevée
                {coin.ecrevisses.length > 1 ? "s" : ""} ici — voir l'écran Écrevisses.
              </>
            )}
          </div>
        )}
```

Insérer enfin, juste **après** le `</div>` de fermeture de `.grid2` :

```tsx
      {masquees > 0 && (
        <div className="coin-reste">
          {/* Les relevés ne sont pas exhaustifs : l'électro-pêche capture mal
              les gros silures et les carpes de fond, et une station ne couvre
              qu'un point du cours d'eau. Le filtre masque, mais il dit combien,
              et il se défait en un appui. */}
          <button type="button" className="link-inline" onClick={() => set({ coin: false })}>
            {masquees} autres espèces ne sont pas dans les relevés d'ici — les voir
          </button>
        </div>
      )}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/screens/Especes.test.tsx
```

Attendu : PASS, 10 tests.

- [ ] **Step 5: Vérifier que rien d'autre n'a bougé**

```bash
npm test
```

Attendu : toute la suite au vert. Puis :

```bash
npm run lint
```

Attendu : aucune erreur. Puis le typage :

```bash
npx tsc -b --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/store.tsx src/screens/Especes.tsx src/screens/especes.css src/screens/Especes.test.tsx
git commit -m "Espèces — la grille se réduit au relevé du coin, et dit ce qu'elle cache"
```

---

### Task 5 : dire au README ce que l'app sait faire de plus

**Files:**
- Modify: `README.md` (section « Écrans » ~ligne 44, section « Carte & données réelles » ~ligne 52)

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1: Mettre à jour la liste des écrans**

Dans `README.md`, remplacer le début de la section « Écrans » :

```
Espèces (recherche + grille + identification guidée) ·
```

par :

```
Espèces (recherche + grille + **filtre « dans mon coin »** + identification guidée) ·
```

- [ ] **Step 2: Documenter la source**

Ajouter à la fin de la section « Carte & données réelles (couche hybride en ligne) » :

```markdown
Le même réseau ASPE nourrit le **filtre « dans mon coin »** de l'écran Espèces
(`src/lib/especes-du-coin.ts`) : sur appui explicite, l'app relève les espèces des trois stations
valides les plus proches (~237 ko, une seule fois), enregistre le résultat et réduit la grille à
ces espèces. Le relevé reste ensuite utilisable **hors-ligne**. Le filtre masque, mais il annonce
toujours combien d'espèces il cache et se défait en un appui : l'électro-pêche capture mal les
gros silures et les carpes de fond, et « absent des relevés » ne veut pas dire « absent de l'eau ».
```

- [ ] **Step 3: Vérifier que le test du README passe toujours**

Le dépôt teste son propre README (`src/data/readme.test.ts`).

```bash
npx vitest run src/data/readme.test.ts
```

Attendu : PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "README — le filtre du coin existe, et ce qu'il ne prouve pas est écrit"
```

---

## Vérification finale

- [ ] `npm test` — toute la suite au vert
- [ ] `npm run lint` — aucune erreur
- [ ] `npx tsc -b --noEmit` — aucune erreur
- [ ] `npm run build` — le bundle se construit
- [ ] À l'écran (`npm run dev`) : la bascule apparaît au-dessus des groupes ; sans relevé et sans réseau, elle affiche un message et ne vide pas la grille ; avec relevé, la grille se réduit, la provenance est citée avec ses distances, et « les voir » restaure les 129 fiches.
