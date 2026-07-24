# Module Écrevisses — séance de balances chronométrée

_Conception validée le 24 juillet 2026._

## Intention

Piloter une séance de pêche aux écrevisses au bord de l'eau : poser jusqu'à 10 balances,
être alerté quand chacune arrive à échéance, et enregistrer le total capturé en fin de
séance dans le carnet.

Le module remplace le chrono « Relève des balances » d'`OutilsTerrain`, qui n'est qu'un
compte à rebours unique de 30 min et ne sait rien de la batterie de balances.

## Principe retenu : une horloge par balance

En pratique les balances sont posées les unes après les autres — deux à trois minutes
d'écart, le temps d'amorcer et de marcher jusqu'au poste suivant. Un cycle global unique
ferait sonner les six balances sur la même échéance, alors qu'on ne peut en relever qu'une
à la fois : l'app mettrait le pêcheur en retard dès la première.

Chaque balance porte donc **son propre horodatage de pose**. Les échéances se décalent
naturellement dans l'ordre où les balances ont été posées, avec les mêmes écarts, ce qui
absorbe tout seul le temps de manipulation. L'intervalle de trempe est commun à la séance
par défaut, mais **surchargeable balance par balance** (une balance éloignée qu'on relève
moins souvent).

### État recalculé, jamais décrémenté

L'état d'une balance n'est pas un compteur qu'on fait descendre : il se **recalcule à
chaque affichage depuis les horodatages absolus**. C'est la décision structurante du
module.

Conséquences :

- L'app peut être fermée, le téléphone verrouillé ou gelé par Android : à la réouverture
  les états sont exacts, rien n'a « perdu le fil ».
- La logique est testable sans horloge réelle ni attente : on lui passe l'instant courant
  en paramètre.

Trois états, dérivés de `poseeA` et de l'intervalle :

| État | Condition | Affichage |
|---|---|---|
| `vide` | `poseeA === null` | « Poser » |
| `trempe` | `maintenant < poseeA + intervalle` | compte à rebours |
| `echue` | `maintenant >= poseeA + intervalle` | « À relever depuis X min », en rouge |

## Modèle de données

Ajouts à `src/types.ts`, persistés en IndexedDB sous la clé `carnet:crayfish`
(`src/lib/db.ts`), 100 % local comme le reste du carnet — rien n'est transmis.

```ts
/** Une balance à écrevisses dans une séance. */
export interface Balance {
  id: string;          // id local stable
  n: number;           // numéro affiché (1…N)
  label?: string;      // libellé libre ("sous le saule")
  intervalMin: number; // trempe propre à cette balance (initialisée au défaut de la séance)
  poseeA: number | null; // horodatage ms de la mise à l'eau ; null = pas encore posée
  releves: number;     // nombre de relèves effectuées (indicatif, affiché sur la carte)
}

/** Total capturé pour une espèce, saisi au bilan de fin de séance. */
export interface CrayfishTally {
  spId: string; // id dans data/ecrevisses.ts
  count: number;
}

/** Une séance de pêche aux écrevisses. Une seule "en cours" à la fois. */
export interface CrayfishSession {
  id: string;
  iso: string;            // yyyy-mm-dd
  date: string;           // date affichable (frDate)
  debut: number;          // horodatage ms
  fin: number | null;     // null tant que la séance est en cours
  lieu: string;           // texte libre
  spotId?: string;        // spot personnel rattaché
  intervalMin: number;    // intervalle de trempe par défaut de la séance
  balances: Balance[];
  tally: CrayfishTally[]; // rempli au bilan
  note?: string;
}
```

`AppState` gagne `crayfish: CrayfishSession[]` (historique, la séance en cours étant celle
dont `fin === null`). Persistance par un effet dédié dans `StoreProvider`, sur le modèle
exact des `catches` / `spots` / `recipes` existants, y compris la garde `hydrated &&
loadOk` qui suspend l'écriture après une erreur de lecture.

Actions ajoutées au store : `startSession`, `poseBalance`, `poseAllBalances`,
`releveBalance`, `updateBalance`, `removeBalance`, `endSession`, `updateSession`,
`removeSession`.

## Écrans et parcours

### Entrées

- Tuile « Écrevisses » dans la boîte à outils de l'Accueil (`TOOLS`, `src/screens/Accueil.tsx`).
- Le preset `balances` d'`OutilsTerrain` navigue désormais vers le module au lieu de lancer
  un compte à rebours de 30 min (il faisait double emploi).
- Segment « Écrevisses » dans le Carnet, pour l'historique.

Nouvel écran `"ecrevisses"` dans le type `Screen` du store.

### Préparation

Visible quand aucune séance n'est en cours.

- Nombre de balances : défaut **6**, plafond **10**.
- Intervalle de trempe : 25 / 30 / 45 / 60 min, ou saisie libre.
- Lieu : texte libre, ou choix parmi les spots personnels existants.
- Rappel réglementaire (voir plus bas).
- Bouton « Démarrer la séance ».

### Séance en cours

En-tête : durée écoulée depuis le début, et prochaine échéance (« balance 2 dans 6 min »).

Grille de cartes, une par balance : numéro, libellé, état, compte à rebours en gros
caractères. Les balances échues remontent en tête et passent en rouge.

Gestes :

- **Tap sur une carte** — balance vide : elle est posée, horodatée maintenant. Balance
  échue : elle est relevée **et reposée dans le même geste** (`releves + 1`, nouveau
  `poseeA`). Balance en trempe : le tap n'agit pas directement — il déplie la carte et
  propose « relever maintenant », pour qu'un tap malheureux ne remette pas un compte à
  rebours à zéro.
- **Appui long** — feuille d'options : laisser vide après relève, changer l'intervalle de
  cette balance, la renommer, la retirer de la séance.
- **« Poser toutes »** — bouton large, pose d'un coup toutes les balances vides.
- **Interrupteur « garder l'écran allumé »** — voir Alertes.
- **« Terminer la séance »** — ouvre le bilan.

Le composant `HoldButton` existant sert de base à l'appui long.

### Bilan

- Total par espèce, au **stepper** (+ / −, grandes cibles tactiles, utilisable les mains
  mouillées). Les trois espèces pêchables sont proposées d'emblée.
- Rappel contextuel selon l'espèce saisie (voir Réglementation).
- Lieu (pré-rempli), note libre.
- « Enregistrer » clôt la séance (`fin` horodatée) et renvoie vers l'historique.

Une séance terminée reste modifiable depuis l'historique (correction d'un total oublié).

### Séance oubliée

Une séance dont le début remonte à plus de 12 h et qui est toujours ouverte déclenche, à
l'entrée du module, un bandeau « Séance du 23/07 toujours en cours — la terminer ? ». Sans
cela, une séance qu'on a quitté sans clôturer bloquerait le démarrage de la suivante (une
seule séance en cours à la fois). Le bandeau propose de la terminer ou de la reprendre ;
aucune clôture automatique, qui ferait perdre le bilan.

### Historique

Troisième segment du Carnet, à côté de « Prises » et « Spots » : date, lieu, durée, nombre
de balances, total par espèce. Une ligne par séance, dépliable.

Le modèle `Catch` n'est **pas** touché : il est fait pour un poisson = une ligne avec une
taille et une photo, où « 43 écrevisses » ne rentre pas. Les séances ne sont donc pas
comptabilisées dans l'écran Statistiques, qui reste l'analyse des prises unitaires.

## Alertes

Trois canaux complémentaires, du plus fiable au plus pratique.

### 1. Rattrapage à la réouverture — le socle

Puisque l'état se recalcule depuis les horodatages, tout retour dans l'app (montage de
l'écran, `visibilitychange` → visible) affiche immédiatement les balances échues, triées
par ancienneté : « balance 3 — à relever depuis 4 min ». Ce canal ne peut pas échouer,
même après un gel de trois quarts d'heure.

### 2. Notification système — le canal nominal

- Permission demandée **au démarrage de la première séance**, jamais au lancement de l'app.
- Une notification par balance échue, `tag` = id de la balance pour qu'elles se remplacent
  au lieu de s'empiler, plus vibration.
- Envoi via `registration.showNotification()` (le service worker est déjà en place,
  `vite-plugin-pwa` en mode `generateSW`).

**Limite assumée et documentée dans l'app :** l'API `Notification Triggers`
(`TimestampTrigger`), qui permettrait de programmer une notification à l'avance, n'a jamais
quitté le stade expérimental et exige encore un flag Chrome. Sans serveur de push — exclu,
il casserait la promesse « 100 % hors-ligne, aucune donnée transmise » — une PWA ne peut
pas garantir une alerte quand la page a été gelée par Android. La notification part de
façon fiable tant que l'app est vivante, y compris écran éteint dans les premières minutes ;
au-delà, l'alerte arrive au rattrapage.

### 3. Interrupteur « garder l'écran allumé » — l'alerte garantie

Dans l'écran de séance, **désactivé par défaut**. Actif, il maintient un WakeLock : le
compte à rebours reste visible et l'alerte tombe à la seconde près. Mode « téléphone posé
sur la glacière ».

`src/lib/wakelock.ts` est généralisé pour l'occasion : il expose `requestWake()` /
`releaseWake()`, réacquiert le verrou au retour de visibilité (le système le relâche quand
la page passe en arrière-plan), et `enterCuisine` / `exitCuisine` deviennent de fines
enveloppes au-dessus — le mode cuisine ne change pas de comportement.

### Repli

Si la permission est refusée ou l'API indisponible : bandeau dans l'app, vibration
(`navigator.vibrate`, déjà utilisée par `OutilsTerrain`), et mise en avant de
l'interrupteur écran allumé.

## Réglementation

Dans le ton du reste de l'app : le repère national d'abord, le renvoi à l'arrêté
préfectoral ensuite — jamais un feu vert sec.

**Écran de préparation :** 6 balances par pêcheur au niveau national, jusqu'à 10 dans
certains départements ; diamètre maximal 30 cm. Source : Code de l'environnement
R436-23 à R436-29.

**Bilan — la distinction qui compte.** Cinq espèces dans `src/data/ecrevisses.ts` :

| Espèce | Latin | Statut |
|---|---|---|
| Écrevisse américaine | _Faxonius limosus_ | Pêchable · ni remise à l'eau vivante ni transport vivant |
| Écrevisse signal | _Pacifastacus leniusculus_ | Pêchable · ni remise à l'eau vivante ni transport vivant |
| Écrevisse de Louisiane | _Procambarus clarkii_ | Pêchable · ni remise à l'eau vivante ni transport vivant |
| Écrevisse à pattes blanches | _Austropotamobius pallipes_ | Protégée · remise à l'eau immédiate |
| Écrevisse à pattes rouges | _Astacus astacus_ | Protégée · remise à l'eau immédiate |

Déclarer une espèce protégée au bilan bascule la carte sur l'avertissement au lieu du
simple compteur.

**Nuance à traiter avec soin :** la maille de 9 cm listée dans `src/data/regulation.ts`
vise l'écrevisse à pattes rouges au titre de R436-18, alors que les arrêtés des
départements couverts (23 · 36 · 41) la protègent — cf. la note existante « Écrevisses à
pattes blanches/rouges protégées ; seules américaine/signal/Louisiane pêchables ». La
maille est donc affichée **avec** cette nuance, jamais comme une autorisation.

## Découpage des fichiers

### Nouveaux

| Fichier | Rôle |
|---|---|
| `src/lib/ecrevisses.ts` | Logique métier **pure** : état d'une balance à un instant donné, prochaine échéance, retard, agrégation du bilan. Aucune lecture d'horloge interne — l'instant est un paramètre. |
| `src/lib/ecrevisses.test.ts` | Tests unitaires de la logique, sans attente réelle. |
| `src/lib/notify.ts` | Permission de notification, envoi via le service worker, repli vibration. |
| `src/data/ecrevisses.ts` | Les 5 espèces + les textes réglementaires et leurs sources. |
| `src/screens/Ecrevisses.tsx` | Écran séance : préparation et séance en cours. |
| `src/components/BalanceCard.tsx` | Carte d'une balance (état, compte à rebours, gestes). |
| `src/components/BilanEcrevisses.tsx` | Écran de bilan et steppers par espèce. |

Le découpage en trois composants évite qu'un fichier d'écran devienne un pavé, dans la
ligne des composants existants (`CatchEditor`, `FedParcoursList`).

### Modifiés

`src/types.ts` (les trois interfaces) · `src/lib/db.ts` (`loadCrayfish` / `saveCrayfish`) ·
`src/store.tsx` (état, hydratation, persistance, actions, écran `"ecrevisses"`) ·
`src/lib/wakelock.ts` (généralisation) · `src/screens/Carnet.tsx` (segment historique) ·
`src/screens/Accueil.tsx` (tuile) · `src/screens/OutilsTerrain.tsx` (le preset renvoie au
module) · `src/App.tsx` (routage) · `src/styles.css`.

## Tests

La logique de `src/lib/ecrevisses.ts` étant pure et paramétrée par l'instant, elle se teste
intégralement en millisecondes, dans le style de `prise.test.ts` et `astro.test.ts` :

- État d'une balance non posée, en trempe, échue — aux bornes exactes de l'échéance.
- Retard calculé correctement après un « saut » de 45 minutes (app gelée puis rouverte).
- Intervalle propre à une balance qui prime sur celui de la séance.
- Tri des balances : échues d'abord, par ancienneté de retard.
- Prochaine échéance parmi un lot de balances posées à des instants différents.
- Relève : `poseeA` réhorodaté, `releves` incrémenté.
- Agrégation du bilan par espèce, et fusion de deux saisies pour la même espèce.
- Plafond du nombre de balances.

## Hors périmètre

Explicitement écartés, faute de contrepartie sur le terrain :

- **Rendement par balance** et **par heure** : imposeraient de saisir les captures à chaque
  relève, mains mouillées. Le besoin exprimé est le total de séance.
- **Durée de trempe optimale** : demanderait de faire varier les intervalles et de
  comparer les séances — sans intérêt tant que le détail par relève n'est pas saisi.
- **Photos par séance** : le carnet couvre déjà le besoin d'illustration pour les prises
  remarquables.
