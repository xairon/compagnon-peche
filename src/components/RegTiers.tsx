import { useId, useState } from "react";
import type { RegDeptCdp } from "../lib/coindepeche";
import { tailleDeTeteTrompeuse } from "../lib/reg-tiers";

/**
 * Réglementation des départements que l'app ne couvre pas, d'après
 * coindepeche.fr.
 *
 * C'est un gain de couverture, pas de précision : l'app connaît l'arrêté de
 * trois départements, ce panneau en montre 96 de plus mais en seconde main. La
 * provenance est donc écrite en toutes lettres — « coindepeche.fr, consulté le
 * JJ/MM/AAAA » — et jamais promue en « arrêté préfectoral ». Le site lui-même
 * qualifie ses fiches d'indicatives.
 */
export function RegTiers({
  fiches,
  consulteLe,
  codeInitial,
}: {
  fiches: RegDeptCdp[];
  consulteLe: string;
  codeInitial: string;
}) {
  const [code, setCode] = useState(codeInitial);
  const selId = useId();
  const fiche = fiches.find((f) => f.code === code) ?? null;

  return (
    <div className="rgt">
      <label className="label" htmlFor={selId} style={{ display: "block", margin: "0 0 8px" }}>
        Autre département
      </label>
      <select
        id={selId}
        className="rgt-sel"
        style={{ minHeight: 44 }}
        value={code}
        onChange={(ev) => setCode(ev.target.value)}
      >
        {/* Le département détecté peut ne pas figurer dans la collecte : garder
            une option pour lui, sinon le select afficherait silencieusement un
            autre département que celui demandé. */}
        {!fiche && <option value={code}>Département {code}</option>}
        {fiches.map((f) => (
          <option key={f.code} value={f.code}>
            {f.nom} ({f.code})
          </option>
        ))}
      </select>

      {!fiche ? (
        <div className="ecr-warn" style={{ marginTop: 10 }}>
          Pas de fiche collectée pour le département {code}. L'app n'a rien à en dire — consultez
          l'arrêté préfectoral et la fédération de pêche du département.
        </div>
      ) : (
        <>
          <div className="rgt-list">
            {fiche.especes.map((e) => {
              const trompeuse = tailleDeTeteTrompeuse(e);
              return (
                <div key={e.espece} className="rgt-esp">
                  <div className="rgt-esp-nom">{e.espece}</div>
                  <div className="rgt-grid">
                    <div>
                      <span className="k">Ouverture</span>
                      <span className="v">{e.ouverture ?? "non précisé"}</span>
                    </div>
                    <div>
                      <span className="k">Fermeture</span>
                      <span className="v">{e.fermeture ?? "non précisé"}</span>
                    </div>
                    <div>
                      <span className="k">Taille min.</span>
                      {/* Le chiffre de tête d'un bloc qui regroupe plusieurs
                          espèces n'est la maille d'aucune : le montrer seul
                          ferait garder un brochet de 52 cm sur un « 50 cm » qui
                          est en réalité celui du sandre. */}
                      <span className="v">
                        {trompeuse ? "voir la note" : (e.tailleMin ?? "non précisé")}
                      </span>
                    </div>
                    <div>
                      <span className="k">Quota / jour</span>
                      <span className="v">{e.quotaJour ?? "non précisé"}</span>
                    </div>
                  </div>
                  {e.note && <p className="rgt-note">{e.note}</p>}
                </div>
              );
            })}
          </div>

          <div className="rgt-src">
            Source : <a href={fiche.url} target="_blank" rel="noreferrer">coindepeche.fr — {fiche.nom} ↗</a>, consulté le {consulteLe}.
            Ce n'est pas l'arrêté préfectoral : le site présente ces valeurs à titre indicatif.
            « Non précisé » veut dire que la fiche ne le dit pas, pas qu'il n'y a pas de limite.
          </div>
        </>
      )}
    </div>
  );
}
