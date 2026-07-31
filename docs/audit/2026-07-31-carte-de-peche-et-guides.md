# Carte de pêche & guides — ce qui a été repris, et ce qui a été écarté

Collecte du **31/07/2026** sur coindepeche.fr. Guides : accord de l'administrateur du site.
`robots.txt` n'interdit que `/api/`.

## Carte de pêche

### Le défaut corrigé : toutes les cartes n'ont pas la même durée

`fishingCardStatus()` ne connaissait qu'une carte annuelle : 1ᵉʳ janvier → 31 décembre. La FNPF
en vend aussi à la journée et à la semaine. Une carte journalière achetée le 31 juillet était donc
présentée comme **valide jusqu'au 31 décembre** — une fausse assurance sur exactement le document
qu'un garde demande.

`statutCarte()` prend maintenant le type. Fenêtres d'alerte : 30 j pour une annuelle (la FNPF ouvre
les ventes N+1 mi-novembre — le rappel est actionnable dès qu'il apparaît), 1 j pour une
hebdomadaire, le jour même pour une journalière.

### Deuxième défaut, trouvé en écrivant les tests

`fishingCardStatus(2027, 1ᵉʳ décembre 2026)` renvoyait **« valide »**, et un test l'exigeait. Une
carte 2027 ne prend effet que le 1ᵉʳ janvier 2027 : au 1ᵉʳ décembre 2026, son porteur n'est pas en
règle. Nouvel état **`pas-encore-valide`**, et le test corrigé le dit explicitement.

### Ce qui n'a PAS été repris : les tarifs

Les deux pages du site se contredisent sur **tous** les prix et **tous** les comptes de départements :

| | `/carte-de-peche` | `/guide/guide-carte-de-peche-2026` |
|---|---|---|
| Interfédérale | 100 € | ~110 € |
| Majeure / départementale | 83 € | ~80 € |
| Journalière | 17 € | ~15 € |
| Hebdomadaire | 34 € | ~35 € |
| EHGO | 37 dép. | 35 dép. |
| CHI | 39 dép. | 32 dép. |
| URNE | 14 dép. | 24 dép. |

Les deux pages divergent aussi sur ce que « découverte » et « mineure » désignent. Le site écrit
lui-même : *« La source officielle reste cartedepeche.fr. »*

Conséquence : **aucun tarif n'est embarqué**, et `phraseReciprocite()` n'annonce **aucun nombre de
départements**. Un test parcourt les six phrases et échoue si un chiffre y réapparaît.

### Réciprocité : déclarée, jamais déduite

L'app ne possède pas de table département → réseau digne de confiance. La réciprocité est donc un
champ que le pêcheur renseigne, avec « Je ne sais pas » comme réponse à part entière. Rien
n'apparaît tant qu'elle n'est pas renseignée : une réciprocité inconnue ne se devine pas.

### Paiement

L'app n'encaisse rien. `cartedepeche.fr` est le canal officiel FNPF ; l'app y renvoie, dans les
trois états (absente, expire bientôt, périmée).

## Guides

41 guides annoncés par `sitemap-guides.xml`, 41 lus. Répartition mesurée :
**Technique 18 · Guide département 10 · Guide espèce 7 · Comparatif 5 · Actualité 1**.

### Attribution

Les 41 guides déclarent un auteur dans leur JSON-LD `Article`, et c'est **une organisation**
(`{"@type":"Organization","name":"Coin de Pêche"}`) — **jamais une personne**. L'app cite donc
« Coin de Pêche ». Le champ `auteurType` est conservé précisément pour que personne ne transforme
plus tard cette mention en signature humaine.

Les dates affichées sont `dateModified` quand elle existe, sinon `datePublished`. Jamais la date de
collecte : elle ferait passer un article de janvier pour récent.

### Ce qui n'est pas embarqué

Le **corps des articles**. L'app reprend le titre affiché, le résumé que le site donne de lui-même,
la catégorie qu'il affiche, ses dates et son auteur déclaré. Un guide s'ouvre sur coindepeche.fr et
**n'est pas consultable hors ligne** — l'écran le dit en tête, parce qu'une app qui promet le
hors-ligne ne doit pas laisser croire que tout l'est.

Le titre retenu est celui du `<h1>`, pas le `headline` du JSON-LD : les deux divergent (le second
est écrit pour les moteurs), et c'est le premier qu'un lecteur reconnaîtra.

## Ce qui n'a pas été vérifié

- **Les tarifs FNPF réels n'ont pas été relevés sur cartedepeche.fr.** On sait que les deux pages de
  coindepeche.fr se contredisent ; on ne sait pas laquelle a raison, ni si l'une des deux a raison.
- **La composition réelle d'EHGO, CHI et URNE n'a pas été établie.** Aucune des deux listes du site
  n'a été recoupée avec les fédérations.
- Aucun guide n'a été relu au fond. Seules leurs métadonnées déclarées ont été reprises ; la
  justesse de leur contenu n'est pas engagée par l'app, et l'écran renvoie à la source.
- La périodicité de mise à jour du site est inconnue. `GUIDES_CONSULTE_LE` date la collecte, elle ne
  garantit pas que l'index soit à jour.
