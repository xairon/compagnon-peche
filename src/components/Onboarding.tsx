import { usePwa } from "../lib/pwa";
import { useStore } from "../store-hooks";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";

// A field-guide frontispiece, not a SaaS splash: serif plate, a real specimen
// photograph, a roman-numeral table of contents. Built from the app's own
// identity (Source Serif 4, paper + forest-green palette, species photography).

const CONTENTS: { n: string; t: string }[] = [
  { n: "I", t: "Espèces & identification" },
  { n: "II", t: "Réglementation au bord de l'eau" },
  { n: "III", t: "Carte vivante — niveau, météo, accès" },
  { n: "IV", t: "Carnet, spots & statistiques" },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { installable, promptInstall } = usePwa();
  const { state, set } = useStore();
  // The full-size photos left the precache (see vite.config globIgnores), so a
// fresh offline install has none. The thumbnail IS precached — use it here,
// where this is the very first screen a new install renders.
  const plate = `${import.meta.env.BASE_URL}assets/species-sm/brochet.webp`;

  return (
    <div className="onb2">
      <div className="onb2-sheet">
        <div className="onb2-kicker">Édition hors-ligne · Eau douce — France</div>
        <h1 className="onb2-title">Compagnon de pêche</h1>
        <p className="onb2-lede">Le carnet et le guide de terrain du pêcheur.</p>

        <figure className="onb2-plate">
          <div className="onb2-frame">
            <img src={plate} alt="Brochet (Esox lucius)" />
          </div>
          <figcaption>
            <span className="sci">Esox lucius</span>
            <span className="pl">Pl. I</span>
          </figcaption>
        </figure>

        <div className="onb2-toc">
          <div className="onb2-toc-h">Au sommaire</div>
          {CONTENTS.map((c) => (
            <div className="onb2-toc-row" key={c.n}>
              <span className="rn">{c.n}</span>
              <span className="lt">{c.t}</span>
            </div>
          ))}
        </div>

        <div className="onb2-rule" />

        {/* Asked here because every verdict the app gives — maille, quota,
            ouverture — comes from one département's arrêté préfectoral, and
            assuming Loir-et-Cher for an Indre angler quotes a salmonid quota
            more permissive than their actual law. Never a gate: the CTA below
            stays live, and DeptDefautWarning covers whoever skips. */}
        <div className="onb2-dept">
          <div className="onb2-dept-h">Où pêchez-vous ?</div>
          <div className="onb2-dept-row">
            {(Object.keys(DEPARTEMENTS) as DeptId[]).map((id) => (
              <button
                key={id}
                type="button"
                className="onb2-dept-btn"
                aria-pressed={state.deptChosen && state.dept === id}
                onClick={() => set({ dept: id, deptChosen: true })}
              >
                {DEPARTEMENTS[id].name}
              </button>
            ))}
          </div>
          <p className="onb2-dept-hint">
            {state.deptChosen
              ? "Modifiable à tout moment dans Réglementation."
              : "Vous pourrez le choisir plus tard dans Réglementation."}
          </p>
        </div>

        <p className="onb2-foot">Sans compte · Carnet 100 % local · Fiches hors-ligne</p>
        <p className="onb2-hint">
          Mains mouillées ou gantées ? Le bouton gant, en bas à droite, agrandit toutes les
          commandes d'un seul geste.
        </p>

        <button className="onb2-cta" onClick={onDone}>
          Ouvrir le carnet
        </button>
        {installable && (
          <button className="onb2-install" onClick={() => promptInstall()}>
            Installer l'application sur l'appareil
          </button>
        )}
      </div>
    </div>
  );
}
