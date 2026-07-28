# Écrevisses — identification, espèces manquantes et base légale — design

_Conception validée le 28 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

Le module Écrevisses de l'app sait chronométrer une séance de balances et compter les
captures, mais son fichier d'espèces tient en quatre champs par écrevisse (nom, latin,
`pechable` oui/non, une phrase de consigne) et **ne dit jamais comment reconnaître
laquelle on tient**. Tout l'édifice réglementaire — trois espèces pêchables, deux
interdites — ne sert à rien si le pêcheur ne sait pas les distinguer au bord de l'eau. Or
elles se confondent réellement, et l'erreur est légalement coûteuse : prendre une pattes
blanches pour une signal et la tuer, c'est détruire une espèce dont la capture est
interdite.

Ce chantier ajoute l'identification (traits, confusions, photos), complète la liste
d'espèces, et corrige la base légale que l'app énonce actuellement de travers.

## Ce que la recherche a établi (et qui change le contenu)

Recherche menée le 28 juillet 2026 sur les textes primaires (Légifrance, arrêtés
préfectoraux 2026 de la Creuse et de l'Indre lus directement) et le *Guide d'identification
des écrevisses en France métropolitaine* (Fédérations Lorraine Pêche / FDAAPPMA 54, 2011).

### La base légale actuelle de l'app est fausse

L'app écrit « Espèce protégée » pour les pattes blanches et les pattes rouges. Le mécanisme
réel est autre :

- L'**arrêté du 21 juillet 1983** ne protège que **l'habitat** (« interdit d'altérer et de
  dégrader sciemment les milieux particuliers à l'espèce ») et ne vise que trois espèces :
  pattes blanches, pattes rouges, des torrents. Il n'interdit pas la capture par lui-même,
  et **ne couvre pas les pattes grêles**.
- L'interdiction de capture vient de **R436-10**, qui autorise la pêche des quatre espèces
  (pattes rouges, des torrents, pattes blanches, pattes grêles) « pendant une période de
  dix jours consécutifs commençant le quatrième samedi de juillet ». C'est un **plafond**,
  pas une permission : l'ouverture effective demande que l'arrêté préfectoral annuel fixe
  des dates dans cette fenêtre.
- Dans l'Indre et la Creuse, les arrêtés 2026 ouvrent **zéro jour** : « interdite toute
  l'année », 1ʳᵉ et 2ᵉ catégorie.

L'app doit donc dire « pêche fermée toute l'année par l'arrêté préfectoral (fenêtre légale
possible : 10 jours max, R436-10 — non ouverte ici) », pas « espèce protégée ».

Pour les trois envahissantes, la base **R432-5** et l'interdiction de remise à l'eau vivante
et de transport vivant sont confirmées par les tableaux des arrêtés 2026 eux-mêmes.

### Deux corrections de liste d'espèces

- **Pattes grêles (*Astacus leptodactylus*) : à ajouter.** La DREAL Centre-Val de Loire la
  compte parmi les cinq espèces de la région (« espèce introduite considérée désormais
  comme autochtone »). Elle est absente de l'app.
- **Écrevisse des torrents (*Austropotamobius torrentium*) : ne pas ajouter en fiche.**
  Confinée à l'Alsace, la Moselle et la Haute-Savoie. Si elle figure sur le document de la
  fédération 36, c'est parce que chaque arrêté départemental recopie la liste nationale de
  R436-10, pas parce qu'elle y vit. Elle mérite une ligne légale, pas une page
  d'identification.
- **Pattes rouges (*Astacus astacus*) : garder, mais requalifier.** La DREAL Centre ne la
  compte pas parmi les espèces régionales, et GBIF n'a aucun relevé postérieur à 1990 sur
  les trois départements ; son aire d'origine est le quart nord-est. Mais elle reste nommée
  dans les arrêtés locaux : un pêcheur peut encore être sanctionné pour en avoir gardé une.
  Décision retenue : **la conserver avec une mention de présence incertaine**, jamais la
  supprimer. Le sens sûr est d'avertir, pas de taire.

Aucune autre envahissante n'est ajoutée : calicot (Bas-Rhin), *F. juvenilis* (Doubs),
marbrée (Moselle, Mayenne), *Cherax* (Finistère) — aucune n'a de présence documentée près
des départements couverts.

### Ce qui reste à vérifier

- L'**arrêté 2026 du Loir-et-Cher (41)** n'a pas pu être récupéré directement. La fermeture
  y est déduite de la cohérence nationale (Creuse, Indre, Somme identiques) et confirmée
  par des sources secondaires pour les seules pattes blanches. À marquer « à vérifier »
  dans l'app, pas à affirmer au même niveau que 23 et 36.
- L'arrêté 2026 de la Creuse **est lui-même mal rédigé** sur cette ligne : il fusionne
  « grêles des torrents » en un seul libellé avec le mauvais binôme latin. Si l'app cite un
  jour cet arrêté mot pour mot, en tenir compte.

## Modèle de données

`Crayfish` (`src/data/ecrevisses.ts`) évolue :

```ts
export interface Crayfish {
  id: string;
  name: string;
  latin: string;
  /** true = pêchable (envahissante) ; false = fermée toute l'année ici. Reste la
   *  réponse pratique « puis-je la garder ? » — le mécanisme légal vit dans `statut`. */
  pechable: boolean;
  note: string;
  /** NOUVEAU — la base légale réelle, en une phrase. Pas « espèce protégée » quand
   *  ce n'est pas le mécanisme. */
  statut: string;
  /** NOUVEAU — présence locale quand elle est douteuse (pattes rouges). Absent
   *  quand l'espèce est banalement présente. */
  presence?: string;
  /** NOUVEAU — calqué sur Species.ident, même vocabulaire dans toute l'app. */
  ident?: {
    summary: string;
    traits: string[];
    conf: { n: string; how: string }[];
  };
}
```

`pechable` est conservé : c'est la réponse pratique au bord de l'eau, et il est déjà
consommé par `PECHABLES`, par la bascule « J'ai relevé une espèce protégée » du bilan et par
les tests. Le mécanisme légal s'ajoute à côté plutôt que de le remplacer.

Photos : nouveau `kind: "crayfish"` sur le composant `Media` et `CRAYFISH_MEDIA` généré par
le pipeline existant (`scripts/images.manifest.json` + `fetch-images.mjs`), exactement comme
`GEAR_MEDIA` l'a été.

## Contenu d'identification

Le tri universel, à donner en tête d'écran parce qu'il tranche six espèces d'un coup :
**le carpopodite** (segment juste avant la grosse pince) porte-t-il une épine interne ?
Oui → Cambaridae, envahissante nord-américaine (américaine, Louisiane). Non → Astacidae
(pattes blanches, pattes rouges, pattes grêles… et signal, envahissante malgré tout).

Les trois confusions qui comptent, chacune avec **le seul critère à vérifier si on n'en
vérifie qu'un** :

| Confusion | Critère décisif | Pourquoi celui-là |
|---|---|---|
| Pattes blanches (fermée) vs signal (pêchable) | **La tache blanc-turquoise à l'articulation de la pince** du signal | Marque discrète et franche ; le dessous des pinces (blanc vs rouge) marche aussi mais se juge mal sur un animal boueux |
| Pattes rouges (fermée) vs Louisiane (pêchable) | **L'épine interne du carpopodite** (présente chez la Louisiane, jamais chez les pattes rouges) | Binaire, indépendant de la lumière et de la couleur — la Louisiane varie du bordeaux à l'olive — et marche sur les juvéniles |
| Pattes grêles vs pattes rouges | **La proportion des pinces** (longues et effilées) | Honnêteté requise : il n'existe pas de repère anatomique net entre ces deux-là, même famille, même nombre de crêtes post-orbitaires. À présenter comme un jugement, pas comme un test |

Mise en garde à conserver dans le texte, relevée dans une source d'identification suisse :
les critères sont moins fiables sur les juvéniles et la couleur varie au sein d'une même
population — ne jamais trancher sur la seule couleur quand la décision est légale.

## Photos

Six photos Commons vérifiées **en les regardant**, pas d'après leur description (règle
maison acquise après deux incidents : une photo de leurre avec marque visible, une source
en panorama dont le recadrage centré supprimait le sujet) :

| Espèce | Fichier | Auteur | Licence |
|---|---|---|---|
| Pattes blanches | `File:Austropotamobius pallipes.jpg` | David Gerke | CC BY-SA 3.0 |
| Pattes grêles | `File:Astacus leptodactylus 02.jpg` | Bjoertvedt | CC BY-SA 3.0 |
| Pattes rouges | `File:European crayfish (Astacus astacus).jpg` | Anna N Chapman | CC0 |
| Signal | `File:Signal crayfish female Pacifastacus leniusculus.JPG` | Astacoides | CC BY-SA 3.0 |
| Américaine | `File:Kamberkrebs Faxonius limosus syn Orconectes limosus.jpg` | Holger Krisp | CC BY 4.0 |
| Louisiane | `File:Procambarus clarkii.jpg` | MikeMurphy | Domaine public |

La photo du signal montre nettement la tache claire à l'articulation — c'est-à-dire le
critère décisif de la confusion la plus grave. C'est elle qui justifie le plus l'ajout des
photos.

## Écrans

**Nouvel écran « Reconnaître les écrevisses »** (`Screen` : `"ecrevisses-ident"`), en
lazy-import comme les autres écrans non critiques au démarrage. Il présente le tri
carpopodite en tête, puis une fiche par espèce : photo, nom, latin, statut légal, traits,
confusions. Les espèces fermées se distinguent visuellement (la classe `.ecr-sp.protegee`
existe déjà).

**Deux accès, parce que le moment qui compte est l'écrevisse dans la main :**
1. Depuis l'écran Écrevisses, au-dessus du bloc réglementaire existant (`.ecr-reg`).
2. Depuis le bilan de séance (`BilanEcrevisses`), là où on saisit déjà « laquelle j'ai
   relevée » — c'est précisément là que la question se pose.

## Saisonnalité

L'arrêté 36 donne, pour les trois pêchables : 1ʳᵉ catégorie 14/03 → 20/09, 2ᵉ catégorie
toute l'année. L'app **ne sait pas** sur quelle catégorie d'eau se trouve l'utilisateur —
même mur que la truite arc-en-ciel. Elle affichera donc les deux cas explicitement dans le
bloc réglementaire, jamais un feu vert ou rouge calculé qui serait faux une fois sur deux.

## Tests

`src/data/ecrevisses.test.ts` existe et **fige la liste à cinq espèces**. Il devra être mis
à jour délibérément pour en refléter six — jamais assoupli. À ajouter :
- chaque espèce fermée porte un `statut` qui cite R436-10 ou l'arrêté préfectoral, et
  n'emploie pas « espèce protégée » comme base de l'interdiction de capture ;
- chaque espèce a un `ident` avec au moins deux traits ;
- chaque confusion citée nomme une espèce réellement présente dans `ECREVISSES` ;
- chaque photo référencée existe sur le disque (même garde que celle posée récemment pour
  les nœuds et le matériel).

## Critères de réussite

- Six espèces, dont les pattes grêles ; l'écrevisse des torrents mentionnée dans le texte
  légal sans page d'identification.
- Depuis une séance en cours ou son bilan, l'écran « Reconnaître » est atteignable en un
  geste.
- Les trois confusions décisives sont énoncées avec leur critère unique.
- Plus aucune occurrence de « espèce protégée » présentée comme la base de l'interdiction
  de capture.
- `npx tsc -b`, `npx eslint src`, `npx vitest run`, `npm run build` verts.
