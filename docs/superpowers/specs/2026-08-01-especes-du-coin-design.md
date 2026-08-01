# Filtrer les espèces sur celles relevées dans le coin

> « Faudrait améliorer la section poisson avec la possibilité de filtrer par les espèces de la
> rivière connues, genre le coin où on pêche on peut voir de toute façon a priori que ces espèces
> là. »

L'écran **Espèces** montre les 129 fiches à tout le monde, partout. Au bord de l'eau, le pêcheur
n'en a qu'une trentaine devant lui. Ce document décrit le filtre qui réduit la grille aux espèces
que les pêches scientifiques ont réellement relevées autour du point où il se trouve.

## 1. Ce que le filtre affirme, et ce qu'il n'affirme pas

Le filtre ne dit **pas** « voici les espèces de votre rivière ». Il dit « voici les espèces relevées
par les stations de pêche scientifique les plus proches ». La nuance n'est pas rhétorique :

- une station retenue peut être à 12 km, sur un autre ruisseau que celui où l'on pêche ;
- l'électro-pêche capture mal les gros silures et les carpes de fond — leur absence d'un relevé ne
  prouve pas leur absence de l'eau ;
- une station couvre un point du cours d'eau, pas son linéaire.

D'où la règle qui gouverne toute l'interface : **le filtre masque, mais il dit toujours combien et
il se défait en un appui.** Le mot « rivière » n'est jamais écrit par ce module.

## 2. Mesures — 01/08/2026, autour de Blois

Boîte `bbox=1.1,47.4,1.6,47.7` (≈ 37 × 33 km), API `v1/etat_piscicole`, `fields` réduits au strict
nécessaire. Toutes les tailles sont des `size_download` réels.

### 2.1 Les pistes écartées, et pourquoi

| Piste | Mesure | Verdict |
|---|---|---|
| `/observations?bbox=…`, toutes années | 34 226 observations ; l'API plafonne la **profondeur d'accès à 20 000** enregistrements | impossible |
| idem `&date_operation_min=2015-01-01` | 17 591 obs., **689 731 o**, 45 taxons | trop lourd pour un appui au bord de l'eau |
| Sondage tronqué, `size=300&sort=desc` par station | **15 taxons sur 29** (station 04052750) ; 12 500 o | **écarté** : sous-déclarer, dans un filtre qui masque, revient à cacher une espèce présente |
| Fenêtre temporelle par station | 04053000 et 04052800 n'ont **aucun** lot antérieur à 2010 ; sur 04052750, `2015+` fait passer 104 055 → 78 811 o et **29 → 27 taxons** | ~7 % gagnés contre des taxons perdus : inutile |

La saturation des taxons distincts est trop lente pour qu'un sondage suffise : sur la boîte entière,
les 100 lots les plus récents donnent 10 taxons, les 1 000 en donnent 29, les 5 000 en donnent 39 —
pour 45 au total. `sort=desc` regroupe par opération, donc par station : un préfixe n'est pas un
échantillon représentatif.

### 2.2 La piste retenue

```
/stations?bbox=…&size=300&fields=code_station,libelle_station,…   22 stations    3 036 o
/observations?code_station=04052750&size=20000&fields=nom_latin_taxon  2 642 lots  104 055 o  29 taxons
/observations?code_station=04053000&…                                 1 779 lots   69 923 o  32 taxons
/observations?code_station=04052800&…                                 1 538 lots   59 918 o  28 taxons
──────────────────────────────────────────────────────────────────── 4 requêtes ≈ 237 ko
```

Ces trois stations ont été prises **au hasard** dans les 22 de la boîte, pour mesurer un coût
typique — ce ne sont pas « les trois plus proches de Blois ». C'est le coût par station qui compte
ici (60–104 ko), pas l'identité des stations.

**Pourquoi 15 km.** La boîte mesurée ci-dessus fait ≈ 37 × 33 km et contient 22 stations : de quoi
en trouver trois bien au-delà de ce qu'un pêcheur appellerait « son coin ». `PORTEE_COIN_KM = 15`
est un plafond de crédibilité, pas un plafond de coût — le coût est fixé par
`STATIONS_RETENUES = 3`, quelle que soit la portée. Une station à 14 km est déjà une extrapolation
que l'écran doit avouer en la nommant avec sa distance ; au-delà, elle ne parle plus du même coin.

**Une seule fois, sur appui explicite, puis jamais.** À comparer à ce que l'app télécharge déjà :
972 708 o pour une classe Sandre, 537 206 o pour 300 occurrences GBIF (voir `lib/net-bornes.ts`).
L'écran Espèces, lui, reste gratuit tant que le pêcheur n'a pas appuyé.

### 2.3 Hub'Eau limite le débit de requêtes

La 9ᵉ requête rapprochée a rendu **299 o de HTML** au lieu du JSON attendu. Conséquences portées par
le design : les stations sont lues **en série**, jamais en parallèle ; une station qui échoue se
retire du lot sans vider le résultat ; les trois qui échouent rendent `null`, et le coin déjà
enregistré reste actif.

### 2.4 L'appariement taxon → fiche fuit

Sur les 38 taxons distincts des trois stations, 34 retrouvent une fiche par leur binôme latin.
Les quatre échecs ne sont pas de même nature :

| Taxon ASPE | Nature | Traitement |
|---|---|---|
| `Cyprinidae sp.` | lot identifié à la **famille** | échec correct — on ne devine pas |
| `Lampetra spp` | lot identifié au **genre** | échec correct |
| `Leuciscus cephalus` | **synonyme** — le dépôt écrit `Squalius cephalus` (chevaine) | à corriger |
| `Gymnocephalus cernua` | **synonyme** — le dépôt écrit `cernuus` (grémille) | à corriger |

Deux pièges vérifiés, qui ferment les solutions faciles :

- **Apparier sur l'épithète seule est faux.** `Mugil cephalus` (le mulet) existe dans
  `species-base.ts` : `cephalus` seul confondrait le chevaine et le mulet.
- **Il n'y a pas de jointure par code.** `code_taxon` d'Hub'Eau est un code Sandre APT
  (`2038` pour l'anguille, `uri_taxon` = `id.eaufrance.fr/apt/2038`), pas le `cdNom` TAXREF
  (`66832`) que portent nos fiches.

Décision : **table de synonymes écrite à la main**, courte et sourcée, doublée d'un test qui rejoue
les charges utiles figées et échoue bruyamment dès qu'un taxon non apparié apparaît. On ne couvre
que ce qu'on a vu — mais on le sait, et le test le dira quand la liste s'allongera.

## 3. Architecture

### 3.1 `src/lib/especes-du-coin.ts` — nouveau

Un module, deux responsabilités séparées : une fonction pure qui apparie, un chargeur qui parle au
réseau.

```ts
export const PORTEE_COIN_KM = 15;
export const STATIONS_RETENUES = 3;

/** Une station qui a nourri le relevé, nommée pour que l'écran puisse la citer. */
export interface StationDuCoin {
  code: string;
  nom: string;
  dist: number;
}

/** Ce que le coin retient. Sérialisable tel quel dans localStorage. */
export interface CoinEspeces {
  /** Ids de fiches, ordre stable (alphabétique) — jamais l'ordre du réseau. */
  ids: string[];
  /** Taxons relevés qu'aucune fiche ne reçoit. Comptés, jamais jetés en silence. */
  inconnus: string[];
  stations: StationDuCoin[];
  lat: number;
  lon: number;
  /** Date du relevé (yyyy-mm-dd), pour que l'écran dise de quand il parle. */
  releveIso: string;
}

export function apparier(taxons: string[]): { ids: string[]; inconnus: string[] };

export async function chargerEspecesDuCoin(
  lat: number, lon: number, signal?: AbortSignal,
): Promise<CoinEspeces | null>;
```

`chargerEspecesDuCoin` réutilise `stationsInBbox()` et `speciesAtStation()` de `lib/hubeau.ts` —
aucun nouvel appel réseau n'est écrit, seulement une orchestration. Il **ne lève jamais**, sur le
modèle exact de `chargerRivieres` : une source muette retire ses données, elle ne vide pas l'écran.

`apparier` s'appuie sur `binomial()` (déjà exporté par `lib/hubeau.ts`, déjà utilisé par la Carte)
plus une table :

```ts
/** Binômes ASPE que nos fiches écrivent autrement. Mesuré le 01/08/2026 sur les
 *  3 stations les plus proches de Blois — 2 divergences sur 36 taxons identifiés
 *  à l'espèce. La liste ne prétend pas être nationale : `especes-du-coin.test.ts`
 *  échoue dès qu'une charge utile figée contient un taxon non apparié. */
const SYNONYMES_ASPE: Record<string, string> = {
  "leuciscus cephalus": "squalius cephalus",   // chevaine
  "gymnocephalus cernua": "gymnocephalus cernuus", // grémille
};
```

### 3.2 `src/lib/prefs-coin.ts` — nouveau

Clé localStorage `carnet:coin`, lecture synchrone, `read`/`write` qui ne lèvent jamais (navigation
privée). Même forme et mêmes garde-fous que `lib/prefs-accueil.ts`, dont la raison d'être vaut ici
mot pour mot : **une clé, un propriétaire**. Un champ de plus dans `carnet:prefs` serait effacé au
premier changement de département.

La relecture valide champ par champ et rejette l'objet entier s'il est incohérent : un `CoinEspeces`
sans `ids`, sans `releveIso` ou sans station ne peut rien afficher d'honnête.

Pourquoi localStorage et pas IndexedDB : ~1 ko, et c'est cette valeur qui décide du **premier
rendu** de l'écran Espèces.

### 3.3 `src/screens/Especes.tsx` — modifié

**Le filtre est orthogonal aux groupes.** Pas une 7ᵉ puce dans la rangée `GROUPS` : « Carnassiers
**dans mon coin** » doit être possible. Donc un `state.coin: boolean` à côté de `state.filter`, et
une bascule présentée à part de la rangée taxonomique.

**La bascule ne survit pas à la session, le relevé si.** `state.coin` naît à `false` à chaque
lancement, comme `state.q` et `state.filter` ; c'est `carnet:coin` qui persiste. Ouvrir l'app et
trouver 95 espèces déjà masquées sans l'avoir demandé serait une surprise, et le pêcheur qui
cherche une fiche vue ailleurs ne comprendrait pas pourquoi elle a disparu.

La liste devient :

```ts
const list = SPECIES.filter(
  (sp) =>
    (state.filter === "tous" || sp.group === state.filter) &&
    matchSpecies(sp, state.q) &&
    (!state.coin || !coin || coin.ids.includes(sp.id)),
);
```

## 4. Ce que l'écran dit, état par état

| Situation | Ce qui s'affiche |
|---|---|
| Filtre actif | Bandeau : « D'après 3 stations Hub'Eau — Cosson à Chailles (2,1 km), Loire à Chaumont-sur-Loire (8,4 km)… · relevé le 01/08/2026 » + « actualiser » *(libellés et distances illustratifs — l'écran affiche ce que la source rend)* |
| Filtre actif, espèces masquées | Pied de grille : « 95 autres espèces ne sont pas dans les relevés d'ici — **les voir** » (un appui désactive) |
| Premier appui, chargement | La bascule passe en attente ; la grille ne bouge pas tant que rien n'est établi |
| Géoloc refusée / indisponible | Le message de `locateMessage()`, tel quel — il existe déjà et il est juste |
| Hors-ligne, aucun coin enregistré | « Sans réseau, la liste des relevés ne peut pas être établie. » |
| Hors-ligne, coin enregistré | **Le filtre marche**, et la date du relevé le dit |
| Aucune station à portée | « Aucune station de pêche scientifique à moins de 15 km d'ici. » — pas de repli sur le département |
| Taxons sans fiche | « 4 taxons relevés n'ont pas de fiche dans l'app. » |

Chaque état est distinct : un écran qui confondrait « hors-ligne » et « aucune station » affirmerait
une absence qu'il n'a pas constatée.

## 5. Tests

`src/lib/especes-du-coin.test.ts`, sur charges utiles **réelles et figées** dans
`src/lib/__fixtures__/` — la convention du dépôt (voir `coindepeche.test.ts`) :

- `apparier` retrouve le chevaine depuis `Leuciscus cephalus` et la grémille depuis
  `Gymnocephalus cernua` ;
- `Mugil cephalus` **n'est pas** apparié au chevaine — le piège de l'épithète ;
- `Cyprinidae sp.` et `Lampetra spp` ressortent en `inconnus`, jamais devinés ;
- **le test de garde** : aucun taxon des fixtures ne doit rester non apparié en dehors des lots
  genre/famille listés nommément. Il échoue quand une divergence nouvelle apparaît ;
- une station en échec ne vide pas le résultat ; les trois en échec rendent `null` ;
- `ids` est trié — deux appels rendent le même ordre.

`src/lib/prefs-coin.test.ts` : stockage absent, tronqué, JSON invalide, champs du mauvais type →
défaut, jamais de levée. Miroir de `prefs-accueil.test.ts`.

`src/screens/Especes` (test d'écran) : la bascule masque, le compteur annonce le bon nombre, un
appui sur « les voir » restaure la grille entière, et le filtre se combine avec un groupe.

## 6. Hors périmètre, délibérément

- **L'identification guidée et les confusions de fiche ne sont pas filtrées.** Restreindre les
  confusions aux espèces relevées ferait manquer précisément la confusion qu'on cherche à éviter.
- **Aucun repli sur le département.** Aucune donnée de répartition départementale n'existe dans le
  dépôt ; en inventer une pour boucher un trou irait contre la règle « rien n'est inventé ».
- **Pas de rattachement à la rivière désignée dans l'Accueil.** Les stations ASPE ne publient pas
  de `code_cours_eau` exploitable (`libelle_cours_eau` est absent des réponses mesurées), donc le
  croisement serait fait au jugé. À reconsidérer si la source évolue.
- **Pas de préchargement dans le service worker.** Le coin est propre à un point ; le précacher
  n'aurait pas de sens avant que le pêcheur ait désigné ce point.
