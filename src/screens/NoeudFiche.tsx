import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import type { Knot } from "../types";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { KNOT_STEPS } from "../data/knot-steps.gen";
import { SCHEMAS } from "../components/schemas-montage";
import { DetailIntrouvable, LIEN_AUTRE_VERSION } from "../components/DetailIntrouvable";
import "./noeuds.css";

const DIFFICULTE: Record<Knot["difficulte"], string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

const FIL: Record<Knot["fils"][number], string> = {
  nylon: "Nylon",
  fluoro: "Fluoro",
  tresse: "Tresse",
};

export function NoeudFiche() {
  const { state, back, nav } = useStore();
  const knot = KNOTS.find((k) => k.id === state.knotId);
  if (!knot)
    return (
      <DetailIntrouvable
        titre="Nœud introuvable"
        message={"Ce nœud est introuvable." + LIEN_AUTRE_VERSION}
      />
    );

  // Une illustration, ou rien. Une fiche que ni Commons ni un schéma maison ne
  // couvre n'affiche aucun cadre : un cadre vide se lirait comme une image
  // cassée, et son texte se suffit.
  const media = ALL_KNOT_MEDIA[knot.id];
  const sequence = KNOT_STEPS[knot.id] ?? [];
  const Schema = SCHEMAS[knot.id];
  const liees = (knot.voirAussi ?? [])
    .map((id) => KNOTS.find((k) => k.id === id))
    .filter((k): k is Knot => !!k);

  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <h1 className="topbar-title">{knot.name}</h1>
          <div className="h-sub">{knot.use}</div>
        </div>
      </div>

      <div className="noeud-corps">
        <div className="noeud-pastilles">
          <span className={"pastille pastille-" + knot.difficulte}>
            {DIFFICULTE[knot.difficulte]}
          </span>
          <span className="pastille">{knot.duree}</span>
          <span className="pastille">{knot.fils.map((f) => FIL[f]).join(" · ")}</span>
          {knot.resistance && (
            <span className="pastille" data-testid="pastille-resistance">
              {knot.resistance}
            </span>
          )}
        </div>

        {Schema && (
          <div className="schema-cadre" data-testid="schema-montage">
            <Schema />
          </div>
        )}

        {/*
          Un schéma ou une séquence REMPLACE l'illustration unique, il ne s'y
          ajoute pas : la planche entière et ses propres vignettes montreraient
          deux fois la même leçon, et la planche est justement ce qu'on
          cherchait à quitter. Elle ne reste que là où rien ne l'a remplacée.
        */}
        {sequence.length === 0 && !Schema && media && (
          <div className="knot-illus" data-testid="illustration-unique">
            <img
              src={import.meta.env.BASE_URL + media.file}
              alt={`${knot.name} — ${knot.use}`}
              decoding="async"
            />
          </div>
        )}

        {knot.steps.map((s, i) => (
          <div key={i} className="knot-geste" data-testid="etape">
            {sequence[i] && (
              <img
                className="knot-geste-img"
                data-testid="image-etape"
                src={import.meta.env.BASE_URL + sequence[i].file}
                alt={`${knot.name}, étape ${i + 1} : ${s}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            )}
            <div className="knot-step">
              <div className="num">{i + 1}</div>
              <div className="cap">{s}</div>
            </div>
          </div>
        ))}

        <div className="noeud-erreur">
          <div className="noeud-erreur-titre">L'erreur qui fait casser</div>
          <p>{knot.erreur}</p>
        </div>

        <div className="info">
          <b>Quand l'utiliser :</b> {knot.when}
        </div>

        {liees.length > 0 && (
          <>
            <div className="label noeud-label">Voir aussi</div>
            {liees.map((k) => (
              <button
                key={k.id}
                type="button"
                className="tile"
                onClick={() => nav("knot", { knotId: k.id })}
              >
                <div className="grow-1">
                  <div className="noeud-tuile-nom">{k.name}</div>
                  <div className="noeud-tuile-usage">{k.use}</div>
                </div>
                <span className="noeud-chevron">›</span>
              </button>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
