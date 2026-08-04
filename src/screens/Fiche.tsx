import { useEffect, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { SPECIES, chargerFiches } from "../data/species";
import { DetailIntrouvable, LIEN_AUTRE_VERSION } from "../components/DetailIntrouvable";
import { DEPARTEMENTS, DEPT_REG, localRegRows } from "../data/regulation";
import { Icon } from "../components/Icon";
import { ICONS, SEC_ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { confusionMediaId } from "../components/media-helpers";
import { Gallery } from "../components/Gallery";
import { ImgSlot } from "../components/ImgSlot";
import { Glossed } from "../components/Glossed";
import { season } from "../lib/season";
import { effectiveMaille } from "../lib/maille";
import { speciesAliasLabels } from "../lib/recherche";
import { speciesStatus } from "../lib/statut";
import { effectiveQuota } from "../lib/quota";
import { deptNotes } from "../lib/notes-dept";
import { ratingFg, repere } from "../lib/helpers";
import { EDIBILITY } from "../data/edibility";
import { IDENT } from "../data/identification";
import { recipesForSpecies } from "../lib/recipes";
import { SPECIES_ENRICHMENT } from "../data/species-enrichment";
import { GEAR_CARDS } from "../data/gear-cards";
import { CURATED_IDS } from "../data/species";
import { RegPerimeeWarning } from "../components/RegPerimeeWarning";

const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"];

const GROUP_LABEL: Record<string, string> = {
  carnassiers: "Carnassiers",
  cyprinides: "Cyprinidés",
  salmonides: "Salmonidés",
  migrateurs: "Migrateurs",
  autres: "Autres espèces",
};

// IUCN France Red List category labels (shown when enrichment is populated).
const REDLIST: Record<string, string> = {
  LC: "Préoccupation mineure",
  NT: "Quasi menacée",
  VU: "Vulnérable",
  EN: "En danger",
  CR: "En danger critique",
  RE: "Disparue de métropole",
  DD: "Données insuffisantes",
  NA: "Non applicable",
  NE: "Non évaluée",
};

// FISHMORPH trait codes → readable French labels (Brosse et al. 2021). `MBl` is a
// length in cm; the others are dimensionless morphological ratios. SpecCode is a
// FishBase id (not shown).
const MORPH_LABEL: Record<string, string> = {
  MBl: "Taille maximale",
  BEl: "Élongation du corps",
  BLs: "Aplatissement latéral",
  VEp: "Position de l'œil (hauteur)",
  REs: "Taille relative de l'œil",
  OGp: "Position de la bouche",
  RMl: "Longueur du maxillaire",
  PFv: "Position des pectorales",
  PFs: "Taille des pectorales",
  CPt: "Étranglement du pédoncule caudal",
};

const SM_LABEL: Record<string, string> = {
  ident: "Identifier",
  regle: "Règles",
  peche: "Pêcher",
  cuisine: "Cuisine",
  sante: "Santé",
  bio: "Biologie",
};

// Plain-language explanation for each verdict cell and the season pill (tap to reveal).
const EXPLAIN: Record<string, { title: string; text: string }> = {
  Comestible: {
    title: "Comestible",
    text: "Qualité gustative de la chair. « Interdit » signale une espèce à ne pas remettre vivante à l'eau (classée nuisible). Une alerte polluants (ANSES) peut s'appliquer même à une chair réputée bonne — voir la section Santé.",
  },
  Maille: {
    title: "Maille",
    text: "Taille légale minimale. En dessous, remise à l'eau immédiate obligatoire. « — » = pas de taille minimale au niveau national ; un arrêté préfectoral local peut en fixer une.",
  },
  Quota: {
    title: "Quota",
    text: "Nombre maximum que vous pouvez conserver par jour et par pêcheur. Carnassiers (sandre, brochet, black-bass) : 3 par jour cumulés, dont 2 brochets maximum. « — » = pas de quota national.",
  },
  saison: {
    title: "Saison de pêche",
    text: "Période de l'année où la pêche de l'espèce est autorisée. « Fermée » = remise à l'eau immédiate obligatoire si vous la capturez.",
  },
};

export function Fiche() {
  const { state, set, nav, back } = useStore();
  // Les hooks d'abord : l'espèce inconnue fait sortir tôt (plus bas), et React
  // interdit qu'un rendu en déclare moins que le précédent.
  //
  // Le catalogue LÉGER d'abord, l'enrichi dès qu'il arrive. Les 182 ko de
  // sections descriptives ne sont plus dans le premier chargement de tout le
  // monde, mais cet écran est le seul qui les lit — il les demande donc, et
  // rend d'abord la version sans elles.
  //
  // `cat` n'est PAS un état d'attente : l'en-tête, la maille, le quota, la
  // saison et la bannière « espèce protégée » viennent du catalogue léger et
  // sont exacts dès le premier rendu. Ce qui se complète ensuite, ce sont les
  // sections descriptives — jamais un verdict. Le chunk étant précaché, le
  // décalage est imperceptible hors ligne comme en ligne.
  const [cat, setCat] = useState(SPECIES);
  const [fichesKo, setFichesKo] = useState(false);
  useEffect(() => {
    let vivant = true;
    chargerFiches().then(
      (c) => vivant && setCat(c),
      // Un module qui ne se charge pas n'est pas « cette espèce n'a pas de
      // fiche » : le dire, plutôt que d'afficher un vide qui se lirait comme
      // une absence de contenu.
      () => vivant && setFichesKo(true),
    );
    return () => {
      vivant = false;
    };
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [explain, setExplain] = useState<string | null>(null);

  // Repliait sur `SPECIES[0]`. Un identifiant inconnu affichait donc la
  // première espèce du catalogue — sa maille, son quota, sa saison — sous
  // couvert d'être celle demandée. Un écran blanc se remarque, celui-là se
  // croyait ; et la barre du bas est masquée ici (App.tsx), donc rien ne
  // trahissait la substitution.
  //
  // La recherche porte sur `cat`, pas sur `SPECIES` : le catalogue léger porte
  // déjà tous les identifiants, donc le verdict « introuvable » est le même au
  // premier rendu qu'après l'arrivée des sections descriptives.
  const sp = cat.find((s) => s.id === state.spId) ?? null;
  if (!sp)
    return (
      <DetailIntrouvable
        titre="Espèce introuvable"
        message={"Cette espèce est introuvable." + LIEN_AUTRE_VERSION}
      />
    );

  const seas = season(sp);
  const deptName = DEPARTEMENTS[state.dept].name;
  const toggleExplain = (k: string) => setExplain((cur) => (cur === k ? null : k));

  const ui = state.bigUI
    ? { fs: "17.5px", pad: "21px" }
    : { fs: "15px", pad: "16px" };

  const sections: {
    id: string;
    title: string;
    sub: string;
    render: () => React.ReactNode;
  }[] = [];

  // Curated ident (species.ts) takes precedence; else the sourced overlay for
  // base species (identification.ts).
  const ident = sp.ident || IDENT[sp.id];
  if (ident) {
    sections.push({
      id: "ident",
      title: "Identification & confusions",
      sub: "Ne pas la confondre",
      render: () => (
        <>
          <p>{ident.summary}</p>
          {ident.traits.map((t, i) => (
            <div key={i} className="li">
              <span className="b">—</span>
              <span>{t}</span>
            </div>
          ))}
          {ident.conf.map((c, i) => {
            const confId = confusionMediaId(c.n);
            return (
              <div key={i} className="confusion">
                <div className="h">≠ {c.n}</div>
                <div className="pair">
                  <div className="col">
                    <div className="cim">
                      <Media kind="species" id={sp.id} placeholder={sp.name} />
                    </div>
                    <div className="cap">{sp.name}</div>
                  </div>
                  <div className="col">
                    <div className="cim">
                      {confId ? (
                        <Media kind="species" id={confId} placeholder={c.n} />
                      ) : (
                        <ImgSlot placeholder={c.n} />
                      )}
                    </div>
                    <div className="cap">{c.n}</div>
                  </div>
                </div>
                <div className="how">{c.how}</div>
              </div>
            );
          })}
        </>
      ),
    });
  }
  if (sp.reg) {
    const localRows = localRegRows(state.dept, sp.id);
    const dr = DEPT_REG[state.dept];
    // Les notes de l'arrêté étaient tronquées aux deux premières :
    // 7 des 13 notes des trois départements n'atteignaient jamais l'écran, dont
    // celle du black-bass de l'Indre — indice 2, « dans le doute, relâchez ».
    // On trie au lieu de couper : ce qui nomme l'espèce remonte, le reste suit.
    const notes = deptNotes(dr.notes, sp);
    // Une note qui nomme l'espèce EST une spécificité départementale, même
    // quand aucune ligne maille/quota ne l'est : le Loir-et-Cher n'a pas de
    // ligne « carpe » mais deux notes carpe, et la fiche affichait pourtant
    // « pas de spécificité départementale connue ».
    const aDuLocal = localRows.length > 0 || notes.espece.length > 0;
    sections.push({
      id: "regle",
      title: "Réglementation locale",
      sub: deptName,
      render: () => (
        <>
          {aDuLocal ? (
            <>
              <div className="dept-badge">Spécificités {deptName}</div>
              {localRows.map(([k, v], i) => (
                <div key={i} className="kv">
                  <span className="k">{k}</span>
                  <span className="v">{v}</span>
                </div>
              ))}
              {notes.espece.map((n, i) => (
                <div key={"e" + i} className="note">
                  {n}
                </div>
              ))}
            </>
          ) : (
            <div className="note">
              {/* Le département est déjà en sous-titre de la section. Le répéter
                  ici obligeait à coller un article en dur, qui rendait « dans le
                  Indre » et « dans le Creuse » — deux départements sur trois. */}
              Pas de spécificité départementale connue pour cette espèce —{" "}
              {notes.generales.length > 0
                ? "les règles générales ci-dessous et le socle national s'appliquent."
                : "le socle national ci-dessous s'applique."}{" "}
              Vérifiez l'arrêté préfectoral en vigueur.
            </div>
          )}
          {/* Seulement `generales` : les notes qui nomment un AUTRE poisson sont
              écartées. Elles ne sont pas perdues pour autant — chacune s'affiche
              sur la fiche du poisson qu'elle nomme, et celles qui nomment une
              écrevisse partent vers l'écran Écrevisses. Ce bloc déversait tout :
              six notes sur une fiche gardon dans l'Indre, dont aucune ne parlait
              d'un gardon. */}
          {notes.generales.length > 0 && (
            <>
              <div className="dept-sub">Règles générales — {deptName}</div>
              {notes.generales.map((n, i) => (
                <div key={"g" + i} className="note">
                  {n}
                </div>
              ))}
            </>
          )}
          <div className="source">Source : {dr.source}</div>
          <div className="dept-sub">Socle national</div>
          {sp.reg!.rows.map(([k, v], i) => (
            <div key={i} className="kv">
              <span className="k">{k}</span>
              <span className="v">{v}</span>
            </div>
          ))}
          {sp.reg!.note && <div className="note">{sp.reg!.note}</div>}
          <div className="source">Source : {sp.reg!.src}</div>
        </>
      ),
    });
  }
  if (sp.fish) {
    sections.push({
      id: "peche",
      title: "Où & comment le pêcher",
      sub: "Postes, leurres, techniques",
      render: () => (
        <>
          {sp.fish!.rows.map(([k, v], i) => (
            <div key={i} className="kv">
              <span className="k">{k}</span>
              <span className="v">
                <Glossed>{v}</Glossed>
              </span>
            </div>
          ))}
        </>
      ),
    });
  }
  // Dérivé de GEAR_CARDS, jamais stocké côté espèce (voir Global Constraints
  // du plan "liens-materiel-especes") : seulement les 25 espèces vedettes, et
  // seulement si au moins une fiche gear cite cette espèce.
  const recommendedGear = CURATED_IDS.has(sp.id)
    ? [...GEAR_CARDS.leurre, ...GEAR_CARDS.appat].filter((c) => c.species?.includes(sp.id))
    : [];
  if (recommendedGear.length > 0) {
    sections.push({
      id: "materiel",
      title: "Matériel recommandé",
      sub: "Leurres et appâts pour cette espèce",
      render: () => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {recommendedGear.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip chip-sm"
              onClick={() => nav("guide-materiel", { gearFocusId: c.id })}
            >
              {c.name}
            </button>
          ))}
        </div>
      ),
    });
  }
  const recipes = recipesForSpecies(sp.id);
  const ed = EDIBILITY[sp.id];
  if (ed) {
    const STATUS: Record<typeof ed.status, string> = {
      oui: "Comestible",
      réglementé: "Comestible — sous réglementation",
      non: "À ne pas consommer",
    };
    sections.push({
      id: "comestibilite",
      title: "Comestibilité",
      sub:
        // « non » n'est pas toujours une protection : les esturgeons d'élevage
        // échappés ne sont pas protégés, ils sont seulement indissociables d'une
        // espèce qui l'est. Écrire « Espèce protégée » sur leur fiche affirmait
        // un statut légal faux — le défaut même que ce champ sert à éviter.
        ed.status === "non"
          ? sp.protected
            ? "Espèce protégée"
            : "À ne pas consommer"
          : ed.status === "réglementé"
            ? "Selon la réglementation"
            : ed.bones
              ? `Arêtes : ${ed.bones}`
              : "Détails de préparation",
      render: () => (
        <>
          <div className={"edible-status " + ed.status}>{STATUS[ed.status]}</div>
          {ed.taste && <p>{ed.taste}</p>}
          {ed.bones && (
            <div className="li">
              <span className="b">—</span>
              <span>
                Arêtes intramusculaires : <b>{ed.bones}</b>
              </span>
            </div>
          )}
          {ed.prep && (
            <div className="li">
              <span className="b">—</span>
              <span>{ed.prep}</span>
            </div>
          )}
          {ed.anses && <div className="edible-anses">⚠️ {ed.anses}</div>}
          <div className="source">Source : {ed.source}</div>
        </>
      ),
    });
  }
  if (sp.cook || recipes.length) {
    sections.push({
      id: "cuisine",
      title: "Cuisine & recettes",
      sub: recipes.length ? `${recipes.length} recette(s) sourcée(s)` : "Préparation & conseils",
      render: () => (
        <>
          {/* `protected` seul laissait passer les migrateurs sous moratoire :
              depuis qu'aloses et lamproies sont en régime spécial plutôt que
              protégées, leur fiche cuisine ne portait plus aucun avertissement. */}
          {(sp.protected || sp.season === "special") && (
            <div className="cook-warn">
              Espèce protégée : à relâcher, ne pas conserver. Les préparations ci-dessous ont un
              intérêt patrimonial/historique et ne valent que là où l'espèce est légalement pêchable
              (moratoires variables par bassin — vérifiez l'arrêté).
            </div>
          )}
          {sp.cook && (
            <>
              <p>
                <Glossed>{sp.cook.note}</Glossed>
              </p>
              {sp.cook.prep.map((t, i) => (
                <div key={i} className="li">
                  <span className="b">—</span>
                  <span>
                    <Glossed>{t}</Glossed>
                  </span>
                </div>
              ))}
            </>
          )}
          {recipes.map((r) => (
            <button
              key={r.id}
              type="button"
              className="recipe-link"
              onClick={() => nav("recette", { recipeId: r.id })}
            >
              <div style={{ flex: 1 }}>
                <div className="t">{r.title}</div>
                <div className="s">
                  {/* `cook: 0` signale une cuisson volontairement non chiffrée (la
                      stérilisation des conserves, dont un barème approximatif expose au
                      botulisme). Additionner donnerait un total qui laisse croire que
                      cette étape est comprise dedans. */}
                  {r.origin} · {DIFF_LABEL[r.difficulty]} ·{" "}
                  {r.cook ? `${r.prep + r.cook} min` : `${r.prep} min de préparation`}
                  {r.year ? ` · ${r.year}` : ""}
                </div>
              </div>
              <span style={{ color: "var(--chev-ink)" }}>›</span>
            </button>
          ))}
        </>
      ),
    });
  }
  if (sp.sante) {
    sections.push({
      id: "sante",
      title: "Santé & polluants",
      sub: sp.sante.alert ? "Fréquence limitée (ANSES)" : "Consommation normale",
      render: () => (
        <>
          {sp.sante!.paras.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
          <div className="source">Source : ANSES, fiche « Poissons, conseils de consommation »</div>
        </>
      ),
    });
  }
  if (sp.bio) {
    sections.push({
      id: "bio",
      title: "Biologie",
      sub: "Habitat, régime, records",
      render: () => (
        <>
          {sp.bio!.rows.map(([k, v], i) => (
            <div key={i} className="kv">
              <span className="k">{k}</span>
              <span className="v">{v}</span>
            </div>
          ))}
        </>
      ),
    });
  }

  // Official conservation/taxonomy enrichment (INPN/FISHMORPH) — only present
  // once scripts/enrich-species.mjs has been run; otherwise this section is skipped.
  const enr = SPECIES_ENRICHMENT[sp.id];
  const hasStatus = !!(enr && (enr.redList || enr.protected));
  if (enr && (enr.redList || enr.protected || enr.morph)) {
    sections.push({
      id: "conservation",
      title: "Morphologie & conservation",
      sub: hasStatus ? "INPN/MNHN + FISHMORPH" : "FISHMORPH (traits morphologiques)",
      render: () => (
        <>
          {enr.redList && (
            <div className="kv">
              <span className="k">Liste Rouge France</span>
              <span className="v">
                {enr.redList} — {enr.redListLabel || REDLIST[enr.redList] || ""}
              </span>
            </div>
          )}
          {enr.protected && (
            <div className="kv">
              <span className="k">Protection nationale</span>
              <span className="v">Oui</span>
            </div>
          )}
          {enr.nameOfficial && (
            <div className="kv">
              <span className="k">Nom officiel (TaxRef)</span>
              <span className="v">{enr.nameOfficial}</span>
            </div>
          )}
          {enr.cdNom && (
            <div className="kv">
              <span className="k">cd_nom</span>
              <span className="v">{enr.cdNom}</span>
            </div>
          )}
          {enr.morph && (
            <>
              <div className="kv" style={{ marginTop: 8 }}>
                <span className="k" style={{ fontWeight: 600 }}>Morphologie (FISHMORPH)</span>
                <span className="v" />
              </div>
              {enr.morph!.MBl != null && (
                <div className="kv">
                  <span className="k">Taille maximale</span>
                  <span className="v">{enr.morph!.MBl} cm</span>
                </div>
              )}
              {Object.keys(enr.morph!).some((k) => MORPH_LABEL[k] && k !== "MBl") && (
                <div className="note" style={{ margin: "4px 0 2px", fontSize: 12 }}>
                  Indices morphométriques <b>relatifs</b> (sans unité, échelle FISHMORPH) — utiles pour
                  comparer les espèces, pas des mesures directes.
                </div>
              )}
              {Object.entries(enr.morph!)
                .filter(([k]) => MORPH_LABEL[k] && k !== "MBl")
                .map(([k, v]) => (
                  <div key={k} className="kv">
                    <span className="k">{MORPH_LABEL[k]}</span>
                    <span className="v">{typeof v === "number" ? v.toFixed(2) : v}</span>
                  </div>
                ))}
            </>
          )}
          <div className="note" style={{ marginTop: 10 }}>
            {enr.source}
            {enr.morphSource ? " · " + enr.morphSource : ""}
          </div>
        </>
      ),
    });
  }

  // Same resolution as « Ma prise », la règle et les grilles : une seule maille
  // dans toute l'app, celle de l'arrêté quand il est plus strict.
  const eff = effectiveMaille(sp, state.dept);
  const effQuota = effectiveQuota(sp, state.dept);
  const mailleCm = eff.cm;
  // La couleur suit le statut partagé, pas season().open : ce dernier répond
  // « y a-t-il une fermeture nationale » et vaut TRUE pour les espèces
  // protégées comme pour le régime spécial. La fiche de l'esturgeon — pêche
  // interdite partout — affichait donc un point vert « Ouverte toute l'année »
  // au-dessus de sa photo, en se contredisant elle-même plus bas.
  const statut = speciesStatus(sp);
  const seasonFg =
    statut.cls === "good" ? "var(--green)" : statut.cls === "warn" ? "var(--warn-ink)" : "var(--red)";
  const seasonDot =
    statut.cls === "good" ? "var(--season-good-dot)" : statut.cls === "warn" ? "var(--season-warn-dot)" : "var(--red)";

  const toggle = (id: string) => set((s) => ({ open: { ...s.open, [id]: !s.open[id] } }));

  const goSection = (id: string) => {
    set({ open: { [id]: true } });
    setTimeout(() => {
      const sc = scrollRef.current;
      const el = secRefs.current[id];
      if (sc && el) {
        // Offset by the sticky sommaire's real height so the section title clears it.
        const som = sc.querySelector<HTMLElement>(".sommaire");
        const offset = (som ? som.getBoundingClientRect().height : 58) + 10;
        sc.scrollTo({
          top: sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - offset,
          behavior: "smooth",
        });
      }
    }, 60);
  };

  // Comestible verdict: prefer a curated rating; else fall back to the sourced
  // edibility status so base species show a real verdict, not "à documenter".
  const edVerdict = ed
    ? { oui: "Comestible", réglementé: "Réglementé", non: "Ne pas consommer" }[ed.status]
    : null;
  const edFg = ed
    ? ed.status === "non"
      ? "var(--red)"
      : ed.status === "réglementé"
        ? "var(--warn-ink)"
        : "var(--green)"
    : "var(--neutral-ink)";
  const verdict: { k: string; v: string; fg: string; sub: string | null }[] = [
    {
      k: "Comestible",
      v: sp.rating || edVerdict || "à documenter",
      fg: sp.ratingCls ? ratingFg(sp.ratingCls) : edFg,
      sub: null,
    },
    {
      k: "Maille",
      v: eff.label ?? "—",
      fg: "var(--ink)",
      sub: eff.aboveNational ? `arrêté ${state.dept} — national ${sp.maille}` : sp.mailleSub,
    },
    {
      k: "Quota",
      v: effQuota.text ?? "—",
      fg: effQuota.text ? "var(--warn-ink)" : "var(--ink)",
      sub: effQuota.local ? `arrêté ${state.dept}` : sp.quotaSub,
    },
  ];

  return (
    <main className="screen" ref={scrollRef} style={{ display: "block" }}>
      <div className="hero">
        <Gallery id={sp.id} placeholder={`Photo réelle plein cadre — ${sp.name}`} dark />
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <button
          className="season"
          style={{ color: seasonFg }}
          onClick={() => toggleExplain("saison")}
          aria-label={`Saison : ${seas.label}. Explication`}
        >
          <span className="dot" style={{ background: seasonDot }} />
          {seas.label}
          <span className="season-i">ⓘ</span>
        </button>
        <div className="fade" />
        <div className="name">
          <div className="hero-kicker">{GROUP_LABEL[sp.group] || "Espèce"}</div>
          <h1 className="t">{sp.name}</h1>
          <div className="latin">{sp.latin}</div>
          {/* Les variétés sont des formes d'une MÊME espèce (écailles, robe) :
              on les nomme pour que le pêcheur qui les cherche se reconnaisse,
              sans laisser croire qu'il s'agit d'espèces distinctes.
              « Autres noms » plutôt que « Aussi appelée » : depuis que les
              alias couvrent aussi le toxostome, le huchon ou le flet, l'accord
              au féminin était faux une fois sur deux. */}
          {speciesAliasLabels(sp.id).length > 0 && (
            <div className="fiche-varietes">
              Autres noms : {speciesAliasLabels(sp.id).join(", ")} — même espèce.
            </div>
          )}
        </div>
      </div>

      {/* Un chargement raté n'est pas « cette espèce n'a pas de fiche ». Sans
          ce mot, les sections descriptives manqueraient en silence et se
          liraient comme une absence de contenu. */}
      {fichesKo && (
        <div className="ecr-warn" style={{ margin: "10px 18px 0" }}>
          Les sections détaillées (identification, pêche, cuisine) n'ont pas pu être chargées.
          Réglementation, maille et quota ci-dessus restent exacts. Réessayez une fois en ligne.
        </div>
      )}

      <div className="sommaire">
        {sections.map((sec) => {
          const open = !!state.open[sec.id];
          return (
            <button
              key={sec.id}
              className="sm-chip"
              aria-pressed={open}
              style={{
                border: `1px solid ${open ? "var(--green-dark)" : "var(--line-strong)"}`,
                background: open ? "var(--green-dark)" : "var(--card)",
                color: open ? "var(--on-accent-warm)" : "var(--body)",
              }}
              onClick={() => goSection(sec.id)}
            >
              {SM_LABEL[sec.id] || sec.title}
            </button>
          );
        })}
      </div>

      <div className="pad" style={{ paddingTop: 18, paddingBottom: 96 }}>
        {sp.protected && (
          <div className="alert">
            <Icon d={ICONS.alert} size={19} stroke="var(--red)" width={1.7} style={{ marginTop: 1 }} />
            <div className="txt">
              <b>Espèce protégée ou menacée</b> — à relâcher : ne la conservez pas. Selon l'espèce et
              le département, la pêche peut être restreinte ou interdite (l'esturgeon est totalement
              protégé). Vérifiez l'arrêté préfectoral.
            </div>
          </div>
        )}
        {sp.alert && (
          <div className="alert">
            <Icon d={ICONS.alert} size={19} stroke="var(--red)" width={1.7} style={{ marginTop: 1 }} />
            <div className="txt">
              <b>{sp.alert.title}</b> — {sp.alert.text}
            </div>
          </div>
        )}
        {sp.depth === "base" && (
          <div className="info" style={{ marginBottom: 14 }}>
            <b>Fiche en cours d'enrichissement.</b> Données de base vérifiées (taxonomie,
            réglementation, biologie). L'identification détaillée, les techniques et les recettes
            arrivent dans une prochaine mise à jour.
          </div>
        )}

        <div className="verdict">
          {verdict.map((v) => (
            <button
              key={v.k}
              type="button"
              className={"cell" + (explain === v.k ? " cell-active" : "")}
              aria-expanded={explain === v.k}
              onClick={() => toggleExplain(v.k)}
            >
              <div className="k">
                {v.k}
                <span className="cell-i">ⓘ</span>
              </div>
              <div className="v" style={{ color: v.fg }}>
                {v.v}
              </div>
              {v.sub && <div className="sub">{v.sub}</div>}
            </button>
          ))}
        </div>

        {explain && EXPLAIN[explain] && (
          <div className="explain" role="note">
            <div className="explain-h">
              <b>{EXPLAIN[explain].title}</b>
              <button className="explain-x" onClick={() => setExplain(null)} aria-label="Fermer">
                ✕
              </button>
            </div>
            <div className="explain-t">{EXPLAIN[explain].text}</div>
          </div>
        )}

        {mailleCm > 0 && (
          <div className="repere">
            <Icon d={ICONS.ruler} size={18} stroke="var(--icon-muted)" />
            <div className="txt">
              Maille {mailleCm} cm — repère : {repere(mailleCm)}
            </div>
            {/* L'espèce est passée EXPLICITEMENT : la table des routes ne
                déclare aucun contexte pour `regle`, donc `nav()` efface `spId`
                en chemin. Sans ça, ce lien — posé sous « Maille 60 cm » —
                ouvrait une règle qui mesurait une autre espèce. */}
            <button className="link" onClick={() => nav("regle", { spId: sp.id })}>
              Règle
            </button>
          </div>
        )}

        <div className="label" style={{ marginBottom: 10 }}>
          La fiche
        </div>
        <div className="section-list">
          {sections.map((sec) => {
            const open = !!state.open[sec.id];
            return (
              <div
                key={sec.id}
                className="sec"
                ref={(el) => {
                  secRefs.current[sec.id] = el;
                }}
              >
                <button
                  type="button"
                  className="sec-head"
                  onClick={() => toggle(sec.id)}
                  aria-expanded={open}
                >
                  <Icon d={SEC_ICONS[sec.id] || SEC_ICONS.bio} size={20} stroke="var(--icon-muted)" className="ic" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sec-title">{sec.title}</div>
                    <div className="sec-sub">{sec.sub}</div>
                  </div>
                  <span className="chev" style={{ transform: `rotate(${open ? "90deg" : "0deg"})` }}>
                    ›
                  </span>
                </button>
                {open && <div className="sec-body">{sec.render()}</div>}
              </div>
            );
          })}
        </div>

        {/* Au pied de la fiche, jamais dans une section : logée dans « Biologie »,
            elle disparaissait sur toute fiche qui n'en a pas. Cette app source ce
            qu'elle affirme — une fiche rédigée à la main ne fait pas exception. */}
        {sp.ficheSrc && <div className="fiche-src">Source du contenu : {sp.ficheSrc}</div>}

        {/* Sits next to the existing disclaimer, which says the arrêté prevails:
            this one says WHICH season's arrêté the figures above come from. */}
        <RegPerimeeWarning dept={state.dept} style={{ margin: "12px 0" }} />

        <div className="disclaimer">
          Outil d'aide — la réglementation applicable est celle de l'arrêté préfectoral en vigueur.
          Vérifiez-la avant de prélever.
        </div>
      </div>

      {/* v2: sticky decision CTA — enters the prise flow at the verdict step */}
      <div className="fiche-cta">
        <button
          onClick={() => nav("prise", { priseSp: sp.id, priseStep: "statut" })}
          style={{ fontSize: ui.fs, padding: ui.pad }}
        >
          <Icon d={ICONS.fish} size={18} stroke="#8fbfa4" width={1.7} />
          Que faire de ma prise ?
        </button>
      </div>
    </main>
  );
}
