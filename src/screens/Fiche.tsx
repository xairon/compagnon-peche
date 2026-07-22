import { useRef, useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { DEPARTEMENTS } from "../data/regulation";
import { Icon, ICONS, SEC_ICONS } from "../components/Icon";
import { Media, confusionMediaId } from "../components/Media";
import { ImgSlot } from "../components/ImgSlot";
import { Glossed } from "../components/Glossed";
import { season } from "../lib/season";
import { ratingFg, repere } from "../lib/helpers";
import { EDIBILITY } from "../data/edibility";
import { recipesForSpecies } from "../lib/recipes";
import { SPECIES_ENRICHMENT } from "../data/species-enrichment";

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
  const sp = SPECIES.find((s) => s.id === state.spId) || SPECIES[0];
  const seas = season(sp);
  const deptName = DEPARTEMENTS[state.dept].name;
  const scrollRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [explain, setExplain] = useState<string | null>(null);
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

  if (sp.ident) {
    sections.push({
      id: "ident",
      title: "Identification & confusions",
      sub: "Ne pas la confondre",
      render: () => (
        <>
          <p>{sp.ident!.summary}</p>
          {sp.ident!.traits.map((t, i) => (
            <div key={i} className="li">
              <span className="b">—</span>
              <span>{t}</span>
            </div>
          ))}
          {sp.ident!.conf.map((c, i) => {
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
    sections.push({
      id: "regle",
      title: "Réglementation locale",
      sub: `${deptName} · 2ᵉ catégorie`,
      render: () => (
        <>
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
        ed.status === "non"
          ? "Espèce protégée"
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
          {sp.protected && (
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
                  {r.origin} · {DIFF_LABEL[r.difficulty]} · {r.prep + r.cook} min
                  {r.year ? ` · ${r.year}` : ""}
                </div>
              </div>
              <span style={{ color: "#C9C3B4" }}>›</span>
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

  const mailleCm = parseInt(sp.maille) || 0;
  const seasonFg = seas.open ? "#1D6E42" : "#B33A2E";
  const seasonDot = seas.open ? "#2E9E5B" : "#B33A2E";

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

  const verdict: { k: string; v: string; fg: string; sub: string | null }[] = [
    {
      k: "Comestible",
      v: sp.rating || "à documenter",
      fg: sp.ratingCls ? ratingFg(sp.ratingCls) : "#8A8676",
      sub: null,
    },
    { k: "Maille", v: sp.maille, fg: "#1A201C", sub: sp.mailleSub },
    { k: "Quota", v: sp.quota, fg: sp.quota === "—" ? "#1A201C" : "#9A6A12", sub: sp.quotaSub },
  ];

  return (
    <div className="screen" ref={scrollRef} style={{ display: "block" }}>
      <div className="hero">
        <Media kind="species" id={sp.id} placeholder={`Photo réelle plein cadre — ${sp.name}`} dark />
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
          <div className="t">{sp.name}</div>
          <div className="latin">{sp.latin}</div>
        </div>
      </div>

      <div className="sommaire">
        {sections.map((sec) => {
          const open = !!state.open[sec.id];
          return (
            <button
              key={sec.id}
              className="sm-chip"
              style={{
                border: `1px solid ${open ? "#16281E" : "#E6E2D8"}`,
                background: open ? "#16281E" : "#fff",
                color: open ? "#FBFAF7" : "#3A3E36",
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
            <Icon d={ICONS.alert} size={19} stroke="#B33A2E" width={1.7} style={{ marginTop: 1 }} />
            <div className="txt">
              <b>Espèce protégée ou menacée</b> — à relâcher : ne la conservez pas. Selon l'espèce et
              le département, la pêche peut être restreinte ou interdite (l'esturgeon est totalement
              protégé). Vérifiez l'arrêté préfectoral.
            </div>
          </div>
        )}
        {sp.alert && (
          <div className="alert">
            <Icon d={ICONS.alert} size={19} stroke="#B33A2E" width={1.7} style={{ marginTop: 1 }} />
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
            <Icon d={ICONS.ruler} size={18} stroke="#4A5D52" />
            <div className="txt">
              Maille {sp.maille} — repère : {repere(mailleCm)}
            </div>
            <button className="link" onClick={() => nav("regle")}>
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
                  <Icon d={SEC_ICONS[sec.id] || SEC_ICONS.bio} size={20} stroke="#4A5D52" className="ic" />
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

        <div className="disclaimer">
          Outil d'aide — la réglementation applicable est celle de l'arrêté préfectoral en vigueur.
          Vérifiez-la avant de prélever.
        </div>
      </div>

      {/* v2: sticky decision CTA — enters the prise flow at the verdict step */}
      <div className="fiche-cta">
        <button
          onClick={() => nav("prise", { prise: { sp: sp.id, step: "statut" } })}
          style={{ fontSize: ui.fs, padding: ui.pad }}
        >
          <Icon d={ICONS.fish} size={18} stroke="#8fbfa4" width={1.7} />
          Que faire de ma prise ?
        </button>
      </div>
    </div>
  );
}
