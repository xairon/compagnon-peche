# coindepeche.fr — ce que la source dit, et ce qu'elle ne dit pas

Collecte du **31/07/2026** : 96 fiches départementales, `sitemap-reglementation.xml`,
96 annoncées / 96 lues. `robots.txt` n'interdit que `/api/`. Générateur :
`scripts/scrape-coindepeche-reglementation.mjs` ; parseur testé sur charge utile réelle dans
`src/lib/coindepeche.ts` + `src/lib/__fixtures__/`.

## Ce que la source apporte réellement

**De la couverture, pas de la précision.** L'app connaissait l'arrêté de 3 départements
(23, 36, 41) et ne disait *rien* des 98 autres. Elle peut désormais en montrer 96, en
seconde main.

Variation mesurée sur les 96 fiches, par espèce :

| Bloc | Départements | Combinaisons distinctes (ouverture / fermeture / taille / quota) |
|---|---|---|
| Truite | 96 | **4** |
| Saumon | 17 | **5** |
| Carnassier | 96 | 1 |
| Ombre commun | 29 | 1 |
| Écrevisse | 84 | 1 |
| Anguille | 35 | 1 |

Autrement dit : hors truite et saumon, la « réglementation du département X » est un jeu de
valeurs **unique répété 96 fois**. C'est un socle national présenté par département. Le dire
autrement serait faire dire à la source ce qu'elle ne dit pas.

## Conflits avec les arrêtés que l'app connaît

Relevés bloc par bloc sur les fiches 23, 36 et 41. **C'est la raison pour laquelle
`origineReg()` refuse de servir cette source sur un département couvert.**

| Fait | App (arrêté vérifié) | coindepeche.fr | Sens de l'écart |
|---|---|---|---|
| Maille truite 41 | 25 cm | 23 cm | **moins protecteur** |
| Maille truite 23 | 20 cm sur cours listés, sinon 23 | 23 cm | perd la distinction |
| Quota salmonidés 36 | 6 dont **2 fario max** | « 6 » | perd le sous-quota |
| Quota salmonidés 23 | 6 dont **3 fario max** | « 6 » | perd le sous-quota |
| Brochet no-kill 36 (14/03–24/04) | présent | absent | perd une interdiction |
| Écrevisses indigènes 23 & 36 | fermées **toute l'année** | fenêtre 11/07–20/09 affichée | **moins protecteur** |

## Le piège du bloc « Carnassier »

Sur les **96 fiches sans exception**, le bloc « Carnassier » titre **Taille min. 50 cm**,
et sa note dit *« Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min. »*.

Le 50 cm de tête est la maille du **sandre**, servie comme si elle valait pour le bloc.
Un pêcheur qui garde un brochet de 52 cm sur ce chiffre est en infraction dans les trois
départements dont l'app connaît l'arrêté (60 cm partout).

`tailleDeTeteTrompeuse()` écarte donc ce chiffre — non pas en codant le nom « Carnassier »,
mais en constatant que la note énumère **au moins deux tailles distinctes**. Mesuré : c'est le
seul bloc dans ce cas sur les 357 relevés. L'écran affiche « voir la note » et rend la note
entière.

## Ce qui n'a pas été importé, et pourquoi

- **Le marqueur « Ouvert »** affiché à côté de chaque espèce. C'est l'état à l'heure où *la
  page* a été rendue, pas une règle. 12 blocs sur 357 n'en portaient d'ailleurs aucun.
  L'app calcule l'ouverture elle-même, à partir de dates.
- **Les dates converties en `Date`**. Le site écrit « 14 mars 2026 » sans dire si c'est le
  premier jour pêchable. On recopie sa chaîne ; on ne calcule pas à sa place.
- **« — » transformé en 0 ou en « illimité »**. 84 écrevisses et 35 anguilles servaient « — »
  au quota. L'écran écrit « non précisé » et explique que cela veut dire que la fiche ne le
  dit pas.

## Ce qui n'a pas été vérifié

- **Aucune valeur de coindepeche.fr n'a été recoupée avec l'arrêté préfectoral du département
  concerné**, hors les trois départements couverts. Le tableau des conflits ci-dessus ne dit
  donc pas si le site a tort ailleurs — seulement qu'il est plus grossier là où on peut le
  comparer.
- L'en-tête du site annonce « 101 départements » ; le sitemap en publie **96**. L'écart de 5
  n'a pas été expliqué. `CDP_FICHES_ANNONCEES` enregistre le compte du sitemap, et un test
  échoue si la collecte en lit moins.
- La périodicité de mise à jour du site est inconnue. `CDP_CONSULTE_LE` est la seule garantie :
  elle date la donnée, elle ne la garantit pas à jour.
