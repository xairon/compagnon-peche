import { useId, useState } from "react";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";
import { etatBoutonDept, extraitsReg } from "../lib/dept-bouton";

/**
 * Le contrôle du département, posé sur l'Accueil.
 *
 * Ce n'est pas une préférence d'affichage : c'est le choix de l'arrêté
 * préfectoral que chaque verdict de l'app va citer. Le bouton le dit donc en
 * ces termes, et le sélecteur montre les chiffres qui changent d'un
 * département à l'autre — un pêcheur reconnaît sa maille truite bien avant de
 * reconnaître un numéro de département.
 *
 * Les valeurs réglementaires sont citées entières (voir extraitsReg) : sur la
 * Creuse, « 20 cm (cours listés…) sinon 23 cm » abrégé en « 20 cm » autoriserait
 * la conservation d'une truite illégale sur la majorité des cours d'eau.
 *
 * Cibles ≥ 44 px, l'app se pilote avec des gants mouillés.
 */
export function DeptBouton({
  dept,
  deptChosen,
  outOfZoneDept,
  onChoose,
  onVoirTout,
}: {
  dept: DeptId;
  deptChosen: boolean;
  outOfZoneDept: string | null;
  onChoose: (id: DeptId) => void;
  onVoirTout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const e = etatBoutonDept({ dept, deptChosen, outOfZoneDept });

  return (
    <div className={`deptb deptb--${e.ton}`}>
      <button
        type="button"
        className="deptb-main"
        style={{ minHeight: 56 }}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="deptb-blason" aria-hidden="true">
          {dept}
        </span>
        <span className="deptb-txt">
          <span className="deptb-titre">{e.titre}</span>
          <span className="deptb-nom">{e.nom}</span>
          <span className="deptb-detail">{e.detail}</span>
        </span>
        <span className="deptb-cta">{e.action}</span>
      </button>

      {open && (
        <div className="deptb-list" id={listId} role="listbox" aria-label="Département de pêche">
          {(Object.keys(DEPARTEMENTS) as DeptId[]).map((id) => {
            // Un défaut jamais confirmé n'est pas une réponse : ne rien cocher
            // tant que le pêcheur n'a pas répondu lui-même.
            const actif = deptChosen && id === dept;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={actif}
                className="deptb-opt"
                style={{ minHeight: 44 }}
                onClick={() => {
                  onChoose(id);
                  setOpen(false);
                }}
              >
                <span className="deptb-opt-nom">
                  {DEPARTEMENTS[id].name}
                  {actif && <span className="deptb-coche" aria-hidden="true">✓</span>}
                </span>
                {extraitsReg(id).map((x) => (
                  <span key={x.cle} className="deptb-opt-reg">
                    <span className="k">{x.label}</span>
                    <span className="v">{x.valeur}</span>
                  </span>
                ))}
              </button>
            );
          })}
          <button
            type="button"
            className="deptb-tout"
            style={{ minHeight: 44 }}
            onClick={() => {
              setOpen(false);
              onVoirTout();
            }}
          >
            Voir la réglementation complète ›
          </button>
        </div>
      )}
    </div>
  );
}
