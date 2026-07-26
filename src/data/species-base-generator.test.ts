import { describe, it, expect } from "vitest";
import { BASE_SPECIES } from "./species-base";
import { FICHES } from "./fiches";
import { EDIBILITY } from "./edibility";

/**
 * species-base.ts porte l'en-tête « GENERATED — do not edit by hand », et la
 * commande documentée pour le régénérer est `node scripts/build-base-species.mjs`.
 *
 * Or le fichier commité contenait neuf valeurs que le générateur ne reproduisait
 * pas : elles avaient été corrigées à la main dans la sortie. La première
 * régénération les effaçait en silence — et ce n'étaient pas des détails de
 * présentation :
 *
 *   · les trois aloses, les deux lamproies pêchables et le saumon atlantique
 *     repassaient de `special` à « ouverte », c'est-à-dire qu'une espèce sous
 *     moratoire de bassin réaffichait une pastille verte ;
 *   · la gambusie et le pseudorasbora perdaient `invasive`, donc l'interdiction
 *     de remise à l'eau vivante disparaissait de leur fiche ;
 *   · le cristivomer réaffirmait une maille « nationale » là où la base légale
 *     est à confirmer.
 *
 * Ces valeurs vivent désormais dans scripts/species-list/*.json et le générateur
 * les reproduit. Les tests ci-dessous fixent les invariants correspondants côté
 * données : si une régénération les casse à nouveau, elle échoue ici plutôt que
 * d'atteindre l'utilisateur.
 *
 * (Le générateur n'est pas exécuté ici — il écrit sur le disque. C'est sa SORTIE
 * commitée qui est vérifiée, ce qui est justement ce que la régression touchait.)
 */

const by = (id: string) => BASE_SPECIES.find((s) => s.id === id);

describe("socle généré — invariants perdus lors d'une régénération", () => {
  // Sous moratoire de bassin, il n'existe pas de période nationale simple : le
  // régime `special` est ce qui empêche la pastille d'annoncer « ouverte ».
  const SOUS_MORATOIRE = [
    "grande-alose",
    "alose-feinte-atlantique",
    "alose-feinte-mediterraneenne",
    "lamproie-marine",
    "lamproie-de-riviere",
    "saumon-atlantique",
  ];

  it.each(SOUS_MORATOIRE)("%s reste en régime « special »", (id) => {
    expect(by(id)?.season).toBe("special");
  });

  // La ligne « Période » garde la catégorie piscicole réelle : c'est une
  // information utile, et la mise en garde est portée par le statut, la pastille
  // et l'encart d'alerte — pas par l'effacement de cette ligne.
  it("la période affichée garde la catégorie, sans contredire le régime", () => {
    const periode = by("saumon-atlantique")?.reg?.rows.find(([k]) => k === "Période")?.[1];
    expect(periode).toMatch(/1ʳᵉ cat\./);
    // Ce qui rattrape la ligne « Période » : chaque espèce sous moratoire porte
    // l'encart d'alerte. C'est lui qui interdit de lire la catégorie comme une
    // autorisation.
    for (const id of SOUS_MORATOIRE) {
      expect(by(id)?.alert?.title, `${id} doit porter l'alerte migrateur`).toMatch(
        /[Mm]igrateur réglementé/,
      );
    }
  });

  it.each(["gambusie", "pseudorasbora"])(
    "%s garde son statut d'exotique envahissante et sa base légale propre",
    (id) => {
      const sp = by(id);
      expect(sp?.invasive).toBe(true);
      // Ni l'une ni l'autre n'est sur la liste R432-5 : citer R432-5 serait une
      // base légale fausse.
      expect(sp?.invasiveBasis).toMatch(/1143\/2014/);
      const statut = sp?.reg?.rows.find(([k]) => k === "Statut")?.[1];
      expect(statut).toMatch(/exotique envahissante/i);
      expect(statut).not.toMatch(/R432-5/);
    },
  );

  it("le cristivomer ne réaffirme pas une maille nationale non confirmée", () => {
    const maille = by("cristivomer")?.reg?.rows.find(([k]) => k === "Maille")?.[1];
    expect(maille).toMatch(/à confirmer|arrêté/i);
  });
});

/**
 * Les esturgeons d'élevage échappés. Ils ne sont pas protégés, mais la
 * littérature les dit indissociables de l'esturgeon européen sans comptage des
 * écussons — et le sturio est en danger critique. Les ajouter au catalogue sans
 * ce garde-fou aurait créé une fiche rassurante sous laquelle se cache
 * peut-être une espèce strictement protégée.
 */
describe("esturgeons d'élevage — sosies d'une espèce strictement protégée", () => {
  it.each(["esturgeon-siberien", "sterlet"])("%s existe au catalogue", (id) => {
    expect(by(id)).toBeDefined();
  });

  it.each(["esturgeon-siberien", "sterlet"])(
    "%s n'affiche jamais une pêche ouverte",
    (id) => {
      expect(by(id)?.season).toBe("special");
    },
  );

  it.each(["esturgeon-siberien", "sterlet"])(
    "%s n'est pas déclaré protégé — ce serait faux — mais son statut dit la confusion",
    (id) => {
      const sp = by(id);
      expect(sp?.protected).toBeUndefined();
      const statut = sp?.reg?.rows.find(([k]) => k === "Statut")?.[1];
      expect(statut).toMatch(/indissociable de l'esturgeon européen/i);
      expect(statut).toMatch(/remise à l'eau/i);
    },
  );

  it.each(["esturgeon-siberien", "sterlet"])("%s renvoie vers la déclaration", (id) => {
    const rows = by(id)?.fish?.rows.map((r) => r[1]).join(" ");
    expect(rows).toMatch(/sturio\.eu/);
  });
});

/**
 * Les quatre gobies ponto-caspiens. Le piège ici n'est pas l'espèce mais sa
 * base légale : contrairement au pseudorasbora et à la gambusie (règlement UE
 * 1143/2014), ces gobies sont considérés indigènes du sud-est de l'aire
 * biogéographique européenne et n'y figurent PAS. Leur interdiction
 * d'introduction relève d'un texte différent — art. L432-10 du code de
 * l'environnement + arrêté du 17 déc. 1985 (liste des espèces représentées).
 * Écrire « règlement UE 1143/2014 » sur leur fiche, par réflexe copié depuis
 * pseudorasbora/gambusie, serait une base légale fausse.
 */
describe("gobies ponto-caspiens — base légale distincte de pseudorasbora/gambusie", () => {
  const GOBIES = ["gobie-demi-lune", "gobie-de-kessler", "gobie-a-taches-noires", "gobie-fluviatile"];

  it.each(GOBIES)("%s existe au catalogue, en régime « toujours » capturable", (id) => {
    const sp = by(id);
    expect(sp).toBeDefined();
    expect(sp?.season).toBe("toujours");
    expect(sp?.protected).toBeUndefined();
  });

  it.each(GOBIES)("%s cite L432-10, jamais le règlement UE 1143/2014", (id) => {
    const statut = by(id)?.reg?.rows.find(([k]) => k === "Statut")?.[1] ?? "";
    expect(statut).toMatch(/L432-10/);
    expect(statut).not.toMatch(/1143\/2014/);
  });

  /**
   * La confusion qui compte vraiment dans ce lot : un gobie invasif ressemble
   * assez à un chabot protégé pour que la mauvaise identification joue dans
   * les deux sens. Le disque ventouse ventral (nageoires pelviennes soudées)
   * est le seul critère qui tranche à coup sûr — c'est ce que chaque fiche
   * gobie doit dire, et ce que les deux fiches chabot doivent dire en retour.
   */
  it.each(GOBIES)("%s mentionne le disque ventouse qui le distingue du chabot", (id) => {
    const fiche = FICHES[id];
    const chabot = fiche?.ident?.conf.find((c) => /chabot/i.test(c.n));
    expect(chabot, `${id} doit citer une confusion avec un chabot`).toBeDefined();
    expect(chabot?.how).toMatch(/ventouse/i);
  });

  it.each(["chabot-commun", "chabot-fluviatile"])(
    "%s mentionne en retour la confusion avec les gobies ponto-caspiens",
    (id) => {
      const fiche = FICHES[id];
      const gobie = fiche?.ident?.conf.find((c) => /gobie/i.test(c.n));
      expect(gobie, `${id} doit citer une confusion avec un gobie`).toBeDefined();
      expect(gobie?.how).toMatch(/ventouse/i);
    },
  );
});

/**
 * Espèces introduites établies (lot suivant). Trois pièges distincts, chacun
 * avec son propre test :
 *
 *  1. Le tête-de-boule est introduit par les seaux à vifs des pêcheurs eux-
 *     mêmes, non représenté sur la liste de l'arrêté du 17 déc. 1985 : même
 *     base légale (L432-10) que les gobies, à ne pas perdre par copier-coller
 *     inversé (cette fois le risque est d'oublier la citation, pas de la
 *     confondre avec 1143/2014).
 *  2. Les deux loches asiatiques (Misgurnus) ressemblent à la loche d'étang,
 *     déjà au catalogue et protégée — la confusion symétrique du couple
 *     gobie/chabot, mais sur un critère différent (patron de couleur, tache
 *     caudale, hauteur des crêtes adipeuses) : le disque ventouse ne
 *     s'applique pas ici, il ne faut pas généraliser le mauvais critère.
 *  3. La loche à grandes écailles n'a qu'un seul individu jamais recensé en
 *     France (2020, relâché). Sa fiche ne doit pas laisser croire à une
 *     population établie — contrairement à la loche asiatique, dont la
 *     population du Schadgraben (Alsace) EST établie depuis 2021.
 */
describe("introduites établies — trois pièges distincts", () => {
  it("le tête-de-boule cite L432-10, comme les gobies mais pour un autre motif (seau à vifs)", () => {
    const statut = by("tete-de-boule")?.reg?.rows.find(([k]) => k === "Statut")?.[1] ?? "";
    expect(statut).toMatch(/L432-10/);
    const fish = FICHES["tete-de-boule"]?.fish?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(fish).toMatch(/seau à vifs|vif/i);
  });

  it.each(["loche-asiatique", "loche-a-grandes-ecailles"])(
    "%s cite une confusion avec la loche d'étang, sur un critère de couleur — pas le disque ventouse",
    (id) => {
      const fiche = FICHES[id];
      const etang = fiche?.ident?.conf.find((c) => /loche d'étang/i.test(c.n));
      expect(etang, `${id} doit citer une confusion avec la loche d'étang`).toBeDefined();
      expect(etang?.how).toMatch(/protégée/i);
      expect(etang?.how).not.toMatch(/ventouse/i);
    },
  );

  it("la loche d'étang mentionne en retour les deux loches asiatiques introduites", () => {
    const fiche = FICHES["loche-d-etang"];
    const noms = (fiche?.ident?.conf ?? []).map((c) => c.n);
    expect(noms).toContain("Loche asiatique");
    expect(noms).toContain("Loche à grandes écailles");
  });

  it("la loche à grandes écailles ne laisse pas croire à une population établie", () => {
    const bio = FICHES["loche-a-grandes-ecailles"]?.bio?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(bio).toMatch(/un seul individu/i);
    expect(bio).toMatch(/inconnu/i);
  });

  it("la loche asiatique, elle, dit sa population établie (Schadgraben, 2021)", () => {
    const bio = FICHES["loche-asiatique"]?.bio?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(bio).toMatch(/établie/i);
    expect(bio).toMatch(/2021/);
  });
});

/**
 * Espèces estuariennes (lot suivant). Deux pièges :
 *
 *  1. L'app ne couvre QUE la réglementation eau douce (R436-18/21), même pour
 *     les migrateurs et espèces euryhalines — c'est un choix de périmètre
 *     assumé, pas un oubli. Le bar commun est réellement réglementé, mais par
 *     la pêche MARITIME (quotas européens révisés chaque année, hors
 *     périmètre) : sa fiche doit dire que cette réglementation existe et
 *     renvoyer vers elle, sans jamais citer de chiffre précis (taille, quota)
 *     que l'app ne maintient pas et qui deviendrait faux dès l'année
 *     suivante.
 *  2. Les deux gobies natifs (Pomatoschistus) sont eux-mêmes des Gobiidae :
 *     ils ont le même disque ventouse que les quatre gobies ponto-caspiens
 *     invasifs. Une confusion qui invoquerait ce critère ici serait fausse —
 *     ce qui sépare les deux groupes, c'est la taille et le lieu, pas
 *     l'anatomie pelvienne.
 */
describe("espèces estuariennes — deux pièges distincts", () => {
  it("le bar commun renvoie vers la réglementation maritime sans citer de chiffre précis", () => {
    const fish = FICHES["bar-commun"]?.fish?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(fish).toMatch(/pêche maritime/i);
    // Aucun chiffre précis : l'app ne maintient pas les quotas maritimes,
    // révisés chaque année — en citer un serait le condamner à devenir faux.
    expect(fish).not.toMatch(/\d\d? cm/);
    expect(fish).not.toMatch(/\d\/jour/);
  });

  it.each(["gobie-tachete", "gobie-des-sables"])(
    "%s cite une confusion avec un gobie ponto-caspien sur la taille/le lieu, jamais sur le disque ventouse",
    (id) => {
      const fiche = FICHES[id];
      const invasif = fiche?.ident?.conf.find((c) => /gobie/i.test(c.n));
      expect(invasif, `${id} doit citer une confusion avec un gobie invasif`).toBeDefined();
      expect(invasif?.how).toMatch(/ne distingue pas les deux groupes/i);
    },
  );

  it("le gobie de Kessler mentionne en retour les petits gobies natifs", () => {
    const fiche = FICHES["gobie-de-kessler"];
    const natif = fiche?.ident?.conf.find((c) => /gobie des sables|gobie tacheté/i.test(c.n));
    expect(natif, "gobie-de-kessler doit citer une confusion avec un gobie natif").toBeDefined();
  });
});

/**
 * Splits récents et cryptiques d'eau douce (lot suivant, cadré par la
 * décision de l'utilisateur : réglementation eau douce uniquement, même pour
 * les migrateurs). Quatre pièges :
 *
 *  1. Le chabot du Lez n'est pas qu'une lignée cryptique de plus : c'est un
 *     endémisme de 3 km de rivière, en danger critique. Sa fiche doit le dire
 *     en propre, pas comme une variation du texte générique des autres
 *     chabots régionaux.
 *  2. Les corégones (corégone blanc, palée) partagent leurs lacs et leur nom
 *     vernaculaire avec le corégone lavaret déjà catalogué. Toute confusion
 *     citée doit pointer vers le nom EXACT de l'espèce ("Corégone / lavaret /
 *     féra"), pas une forme raccourcie qui échouerait le test d'intégrité des
 *     confusions.
 *  3. Truite corse et ombre d'Auvergne sont fragiles (CR / huit populations)
 *     sans pour autant porter le flag `protected` — la comestibilité doit
 *     recommander la remise à l'eau malgré ce statut légal absent, sans
 *     jamais afficher "Espèce protégée" (ce serait un statut légal inventé).
 *  4. Le vairon italien n'a qu'un seul signalement français (2010) : comme la
 *     loche à grandes écailles, sa fiche ne doit porter ni `fish` ni `cook`
 *     (rien à cibler quand on ne sait pas si l'espèce est établie).
 */
describe("splits récents et cryptiques — quatre pièges distincts", () => {
  it("le chabot du Lez dit son endémisme à 3 km, pas seulement « lignée cryptique »", () => {
    const bio = FICHES["chabot-du-lez"]?.bio?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(bio).toMatch(/trois kilomètres/);
    expect(bio).toMatch(/danger critique/i);
  });

  it.each(["coregone-blanc", "palee"])(
    "%s cite le corégone lavaret par son nom exact (pas une forme raccourcie)",
    (id) => {
      const fiche = FICHES[id];
      const lavaret = fiche?.ident?.conf.find((c) => /corégone/i.test(c.n));
      expect(lavaret?.n).toBe("Corégone / lavaret / féra");
    },
  );

  it.each(["truite-corse", "ombre-d-auvergne"])(
    "%s reste non protégé légalement mais recommande la remise à l'eau",
    (id) => {
      const sp = by(id);
      expect(sp?.protected).toBeUndefined();
      expect(EDIBILITY[id]?.prep).toMatch(/remise à l'eau recommandée/i);
      expect(EDIBILITY[id]?.prep).not.toMatch(/espèce protégée/i);
    },
  );

  it("le vairon italien n'a ni fish ni cook — un seul signalement, statut de population inconnu", () => {
    const fiche = FICHES["vairon-italien"];
    expect(fiche?.fish).toBeUndefined();
    expect(fiche?.cook).toBeUndefined();
    const bio = fiche?.bio?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(bio).toMatch(/un seul individu/i);
  });
});

/**
 * Dernier lot pour boucler la liste de référence (129 espèces non éteintes).
 * Le piège : le saumon rose est le seul migrateur du catalogue dont la
 * consigne est de GARDER la capture plutôt que de la relâcher — l'inverse du
 * réflexe appliqué à tous les autres migrateurs (aloses, lamproies, esturgeons,
 * saumon atlantique). Un copier-coller de la section « conduite à tenir »
 * depuis une autre fiche migrateur inverserait silencieusement la consigne.
 */
describe("dernier lot — le saumon rose inverse la consigne de relâche", () => {
  it("dit explicitement de garder la capture, pas de la relâcher", () => {
    const fish = FICHES["saumon-rose"]?.fish?.rows.map((r) => r[1]).join(" ") ?? "";
    expect(fish).toMatch(/gardez la capture/i);
    expect(fish).not.toMatch(/relâchez|remise à l'eau/i);
  });

  it("l'édibilité le confirme et donne la procédure de signalement", () => {
    const ed = EDIBILITY["saumon-rose"];
    expect(ed?.prep).toMatch(/GARDER/);
    expect(ed?.prep).not.toMatch(/relâch/i);
  });

  it.each(["loche-d-espagne", "loche-leopard", "loche-du-lez"])(
    "%s cite la loche franche par son nom exact, en lignée cryptique",
    (id) => {
      const fiche = FICHES[id];
      const franche = fiche?.ident?.conf.find((c) => c.n === "Loche franche");
      expect(franche, `${id} doit citer « Loche franche » exactement`).toBeDefined();
    },
  );

  it("le chabot du Lez et la loche du Lez se renvoient l'un à l'autre malgré le nom partagé", () => {
    const chabot = FICHES["chabot-du-lez"]?.ident?.conf.find((c) => /loche du lez/i.test(c.n));
    const loche = FICHES["loche-du-lez"]?.ident?.conf.find((c) => /chabot du lez/i.test(c.n));
    expect(chabot, "chabot-du-lez doit citer la loche du Lez").toBeDefined();
    expect(loche, "loche-du-lez doit citer le chabot du Lez").toBeDefined();
  });
});

/**
 * Le flet et les trois mulets (déjà au catalogue) ont chacun un `note` sourcé
 * dans leur JSON qui pointe vers la réglementation maritime — mais ce texte
 * finit dans le `bio` GÉNÉRÉ, entièrement remplacé par le `bio` écrit à la
 * main de leur FICHE (`withFiche` fait `bio: f.bio ?? sp.bio`, un remplacement
 * complet, pas une fusion). Résultat : la mise en garde n'apparaissait nulle
 * part sur la fiche publiée. Corrigé en l'explicitant dans `fish.rows`,
 * comme pour bar-commun et mulet-sauteur ; ce test verrouille que les quatre
 * espèces déjà en production l'ont aussi.
 */
describe("flet et mulets — la réglementation maritime n'est plus silencieusement perdue", () => {
  it.each(["flet", "mulet-porc", "mulet-dore", "mulet-lippu"])(
    "%s explicite qu'il est régi par la pêche maritime, pas le socle eau douce",
    (id) => {
      const fish = FICHES[id]?.fish?.rows.map((r) => r[1]).join(" ") ?? "";
      expect(fish, `${id}.fish doit mentionner la pêche maritime`).toMatch(/pêche maritime/i);
      expect(fish).toMatch(/ne couvre pas/i);
    },
  );
});
