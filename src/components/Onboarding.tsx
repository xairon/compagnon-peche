import { usePwa } from "../lib/pwa";

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
  const plate = `${import.meta.env.BASE_URL}assets/species/brochet.webp`;

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
