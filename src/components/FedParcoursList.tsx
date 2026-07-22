import { useMemo } from "react";
import { FED_PARCOURS, type FedParcours, type FedParcoursKind } from "../data/parcours-federation";

const DEPT_LABEL: Record<string, string> = {
  "23": "Creuse (23)",
  "36": "Indre (36)",
};
const KIND_LABEL: Record<FedParcoursKind, string> = {
  "no-kill": "Parcours no-kill",
  reserve: "Réserves de pêche",
  "carpe-nuit": "Carpe de nuit",
  parcours: "Parcours",
  "plan-eau": "Plans d'eau",
};
const KIND_ORDER: FedParcoursKind[] = ["no-kill", "parcours", "plan-eau", "carpe-nuit", "reserve"];

/** Sourced directory of the federation-published parcours (Creuse & Indre).
 *  Every item links to the federation page it was read from; items with honest
 *  coordinates can be located on the map. Nothing here is invented. */
export function FedParcoursList({
  onClose,
  onGo,
}: {
  onClose: () => void;
  onGo: (lat: number, lon: number, approx: boolean) => void;
}) {
  // Group: dept → kind → entries, in a stable order.
  const groups = useMemo(() => {
    const byDept = new Map<string, Map<FedParcoursKind, FedParcours[]>>();
    for (const p of FED_PARCOURS) {
      if (!byDept.has(p.dept)) byDept.set(p.dept, new Map());
      const byKind = byDept.get(p.dept)!;
      if (!byKind.has(p.kind)) byKind.set(p.kind, []);
      byKind.get(p.kind)!.push(p);
    }
    return byDept;
  }, []);

  const depts = [...groups.keys()].sort();

  return (
    <div className="carte-sheet fed-list">
      <div className="sheet-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sheet-title">Parcours des fédérations</div>
          <div className="sheet-sub">Creuse & Indre — publiés par les fédérations, sourcés</div>
        </div>
        <button className="sheet-x" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>

      <div className="sheet-body">
        {depts.map((dept) => {
          const byKind = groups.get(dept)!;
          const kinds = KIND_ORDER.filter((k) => byKind.has(k));
          return (
            <div key={dept} className="fed-dept">
              <div className="fed-dept-h">{DEPT_LABEL[dept] || dept}</div>
              {kinds.map((kind) => (
                <div key={kind} className="fed-kind">
                  <div className="fed-kind-h">{KIND_LABEL[kind]}</div>
                  {byKind.get(kind)!.map((p) => (
                    <div key={p.id} className="fed-item">
                      <div className="fed-item-main">
                        <div className="fed-item-n">{p.name}</div>
                        <div className="fed-item-s">
                          {[
                            p.river,
                            p.commune,
                            p.category ? `${p.category}ᵉ cat.` : "",
                            p.lengthM ? `${p.lengthM} m` : "",
                            p.posts ? `${p.posts} postes` : "",
                            p.techniques,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          {p.precision === "commune" && (
                            <span className="fed-approx"> · ≈ commune</span>
                          )}
                        </div>
                        {p.note && <div className="fed-item-note">{p.note}</div>}
                      </div>
                      <div className="fed-item-actions">
                        {p.lat != null && p.lon != null && (
                          <button
                            className="fed-go"
                            onClick={() => onGo(p.lat!, p.lon!, p.precision === "commune")}
                            aria-label="Voir sur la carte"
                          >
                            Carte ›
                          </button>
                        )}
                        <a
                          className="fed-src"
                          href={p.source}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Source ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}

        <div className="fed-foot">
          Données publiées par les fédérations de pêche de la Creuse et de l'Indre pour leurs
          pêcheurs. Les emplacements « ≈ commune » sont approximatifs (centre de la commune, pas le
          parcours exact) : vérifiez sur la carte officielle. Réglementation exacte et à jour :
          consultez la fédération.
        </div>
      </div>
    </div>
  );
}
