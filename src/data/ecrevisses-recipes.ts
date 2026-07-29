import type { Recipe } from "../types";

// Recettes d'écrevisses. Même type que les recettes de poisson (src/data/recipes.ts),
// tableau séparé parce que `species[]` référence ici ECREVISSES, pas SPECIES — un
// test dédié (ecrevisses-recipes.test.ts) garde cette séparation.
//
// Les trois espèces pêchables (louisiane, américaine, signal — jamais les trois
// espèces fermées) sont interchangeables dans ces recettes : ce sont des recettes
// de préparation, pas d'espèce précise. Sources vérifiées par recherche (pas de
// citation inventée) : les trois plats sont documentés chez Escoffier, Le Guide
// culinaire (1903), qui reste la référence la plus ancienne et la plus solide
// qu'on ait pu confirmer pour chacun — comme Menon (1746) sert de référence à la
// matelote d'anguille dans recipes.ts.
export const CRAYFISH_RECIPES: Recipe[] = [
  {
    id: "bisque-d-ecrevisses",
    species: ["louisiane", "americaine", "signal"],
    title: "Bisque d'écrevisses",
    origin: "France (tradition)",
    author: "Auguste Escoffier",
    source: "Le Guide culinaire, 1903 (« Bisque ou coulis d'écrevisses »)",
    year: 1903,
    difficulty: 3,
    prep: 40,
    cook: 45,
    tools: ["Mixeur plongeant", "Chinois fin", "Grande casserole"],
    safety:
      "Les carapaces sont prêtes à infuser dès qu'elles rougissent uniformément au contact du beurre chaud. Réservez les queues décortiquées à part et ne les replongez qu'en toute fin de cuisson, hors ébullition : leur chair doit rester opaque et ferme, jamais grise ni filandreuse. Passez la bisque au chinois fin en pressant bien les carapaces pour n'en laisser aucun fragment dans l'assiette.",
    intro:
      "La bisque tire son goût des carapaces plus que de la chair : pilées et revenues avec une mirepoix, elles infusent leur iode et leur umami dans le fond avant d'être mixées puis passées au chinois pour ne garder que le liquide. Escoffier codifie la « bisque ou coulis d'écrevisses » dans son Guide culinaire (1903) ; c'est la référence la plus ancienne et la plus solide qu'on ait pu vérifier pour cette recette précise, la technique de la bisque elle-même étant plus ancienne et diffuse dans la cuisine des crustacés, sans attribution unique fiable trouvée.",
    ing: [
      "1 kg d'écrevisses vivantes (louisiane, américaine ou signal), triées et rincées",
      "80 g de beurre",
      "1 carotte, 1 oignon, 1 échalote, en petite brunoise",
      "1 branche de céleri",
      "2 gousses d'ail",
      "3 c. à soupe de concentré de tomate",
      "1 petit verre de cognac ou d'eau-de-vie",
      "150 ml de vin blanc sec",
      "1 L de fumet de poisson ou de fond blanc",
      "20 cl de crème fraîche épaisse",
      "1 bouquet garni (thym, laurier, tiges de persil)",
      "Sel, poivre, une pointe de piment de Cayenne (facultatif)",
    ],
    steps: [
      "Décortiquez à vif une dizaine d'écrevisses, réservez les queues au frais ; gardez toutes les carapaces et les têtes, ainsi que celles des écrevisses restantes une fois mangées ou concassées.",
      "Faites revenir les carapaces concassées dans le beurre chaud à feu vif jusqu'à ce qu'elles rougissent uniformément.",
      "Ajoutez la brunoise de légumes et l'ail, laissez suer 5 min.",
      "Flambez au cognac, ajoutez le concentré de tomate, mouillez au vin blanc et laissez réduire de moitié.",
      "Mouillez au fumet, ajoutez le bouquet garni, salez, poivrez ; laissez mijoter 30 min à petits frémissements.",
      "Mixez finement au mixeur plongeant, carapaces comprises, puis passez au chinois fin en pressant fort pour extraire tout le suc.",
      "Remettez sur le feu doux, liez à la crème, rectifiez l'assaisonnement.",
      "Pochez les queues réservées 2 à 3 min dans la bisque chaude, hors ébullition, jusqu'à ce que leur chair devienne opaque et ferme ; servez aussitôt.",
    ],
  },
  {
    id: "ecrevisses-a-la-nage",
    species: ["louisiane", "americaine", "signal"],
    title: "Écrevisses à la nage",
    origin: "France (tradition)",
    author: "Auguste Escoffier",
    source: "Le Guide culinaire, 1903 (« Écrevisses à la nage »)",
    year: 1903,
    difficulty: 1,
    prep: 20,
    cook: 10,
    bivouac: true,
    tools: ["Grande casserole", "Écumoire"],
    safety:
      "Avant cuisson, retirez le boyau central : pincez le milieu de la nageoire caudale et tirez d'un coup sec, l'intestin sort d'un bloc — sans quoi il donne un goût amer et terreux. Les écrevisses sont cuites quand leur carapace est rouge vif sur toute la longueur et que la chair de la queue, une fois décortiquée, est opaque et ferme, jamais translucide. Cuisez-les par petites quantités pour que le bouillon ne retombe pas en dessous du frémissement.",
    intro:
      "La nage est un court-bouillon aromatique dans lequel on pêche les écrevisses et qu'on sert avec elles, contrairement au court-bouillon simple qu'on jette après cuisson : c'est le service le plus rapide et le plus direct pour l'écrevisse, qui met en avant sa chair plutôt que de la transformer. Escoffier la codifie dans son Guide culinaire (1903) ; je n'ai pas trouvé de rattachement fiable à une région précise au-delà de cette source, la technique étant un classique diffus de la cuisine française plutôt qu'une spécialité locale identifiée. La louisiane, la plus grosse des trois espèces pêchables (jusqu'à 15 cm), se prête particulièrement bien à ce service où l'écrevisse entière se mange à la main ; américaine et signal conviennent tout autant, en plus petit.",
    ing: [
      "24 écrevisses vivantes (louisiane, américaine ou signal), 4 à 6 par personne selon la taille",
      "1 L d'eau",
      "250 ml de vin blanc sec",
      "2 carottes en fines rondelles",
      "1 oignon émincé",
      "2 échalotes",
      "1 bouquet garni (thym, laurier, tiges de persil)",
      "1 c. à café de grains de poivre",
      "Sel",
      "Persil plat pour le service",
    ],
    steps: [
      "Retirez le boyau central de chaque écrevisse (nageoire caudale pincée, tirée d'un coup sec).",
      "Préparez le court-bouillon : eau, vin blanc, carottes, oignon, échalotes, bouquet garni, poivre et sel ; portez à ébullition puis laissez infuser 10 min à petits frémissements.",
      "Plongez les écrevisses par petites quantités dans le bouillon frémissant, pour ne pas le faire retomber en dessous du frémissement.",
      "Cuisez 4 à 6 min selon la taille, jusqu'à ce que la carapace soit rouge vif sur toute la longueur.",
      "Retirez les écrevisses à l'écumoire, réservez-les au chaud le temps de cuire le reste.",
      "Répartissez les écrevisses dans des assiettes creuses, nappez d'un peu de bouillon et de sa garniture de légumes, parsemez de persil.",
      "Servez aussitôt, avec rince-doigts et pain de campagne pour saucer.",
    ],
  },
  {
    id: "gratin-d-ecrevisses-sauce-nantua",
    species: ["louisiane", "americaine", "signal"],
    title: "Gratin d'écrevisses (sauce Nantua)",
    origin: "Nantua (Ain)",
    author: "Auguste Escoffier",
    source: "Le Guide culinaire, 1903 (préparations « à la Nantua »)",
    year: 1903,
    difficulty: 3,
    prep: 45,
    cook: 40,
    tools: ["Casserole à béchamel", "Plat à gratin", "Mixeur plongeant", "Chinois"],
    safety:
      "Incorporez les queues d'écrevisses hors du feu, en toute fin de préparation : leur chair doit rester opaque et ferme, une recuisson prolongée au four la rend caoutchouteuse. Sortez le gratin quand il est bouillonnant sur toute la surface et bien doré — c'est le repère que la sauce et la garniture sont chaudes à cœur.",
    intro:
      "La sauce doit son nom à Nantua (Ain), au bord d'un lac où l'écrevisse à pattes rouges abondait autrefois — au point d'être associée aux quenelles de brochet de la ville. Cette espèce est aujourd'hui fermée à la pêche (voir ecrevisses.ts) ; cette recette utilise donc les trois espèces envahissantes pêchables en lieu et place de l'espèce d'origine, comme le veut cette app pour toute recette d'écrevisse. L'attribution de la sauce au cuisinier Carême, souvent répétée en ligne, n'a pas de source primaire vérifiée ; ce qu'on peut confirmer, c'est la codification par Escoffier des préparations « à la Nantua » dans son Guide culinaire (1903). La richesse de la sauce — béchamel, bisque, crème, cognac — est le point du plat : elle habille une chair délicate d'un gratin généreux.",
    ing: [
      "500 g de queues d'écrevisses décortiquées (louisiane, américaine ou signal), carapaces réservées",
      "40 g de beurre, 40 g de farine (base béchamel)",
      "500 ml de lait",
      "200 ml de bisque d'écrevisses (voir recette Bisque d'écrevisses, ou fumet de poisson corsé aux carapaces)",
      "10 cl de crème fraîche épaisse",
      "1 petit verre de cognac",
      "1 gousse d'ail, 1 échalote",
      "80 g de gruyère ou de comté râpé",
      "Muscade, sel, poivre, une pointe de piment de Cayenne",
    ],
    steps: [
      "Préparez ou réchauffez une bisque d'écrevisses avec les carapaces réservées ; réservez-en 200 ml.",
      "Faites un roux blond avec le beurre et la farine, mouillez au lait chaud petit à petit en fouettant, pour une béchamel lisse.",
      "Ajoutez la bisque, la crème, le cognac, l'ail et l'échalote hachés ; laissez épaissir à feu doux 10 min en remuant.",
      "Assaisonnez de muscade, sel, poivre et d'une pointe de cayenne.",
      "Incorporez les queues d'écrevisses hors du feu ; leur chair doit rester opaque et ferme.",
      "Versez dans un plat à gratin, parsemez de fromage râpé.",
      "Passez au four à 200 °C pendant 15 à 20 min, jusqu'à ce que le gratin soit bouillonnant et bien doré en surface.",
    ],
  },
];
