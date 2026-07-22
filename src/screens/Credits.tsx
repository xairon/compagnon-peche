import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { KNOTS } from "../data/knots";
import { SPECIES_MEDIA } from "../data/media";
import { NAME_TO_ID, ALL_KNOT_MEDIA } from "../components/Media";

function nameForSpecies(id: string): string {
  return SPECIES.find((s) => s.id === id)?.name || idFallback(id);
}
function nameForKnot(id: string): string {
  return KNOTS.find((k) => k.id === id)?.name || id;
}
// Confusion-only species (grémille, carassin…) aren't in SPECIES; recover their
// display name from the confusion name map.
function idFallback(id: string): string {
  const hit = Object.entries(NAME_TO_ID).find(([, v]) => v === id);
  return hit ? hit[0] : id;
}

export function Credits() {
  const { back } = useStore();
  const speciesRows = Object.entries(SPECIES_MEDIA).map(([id, m]) => ({
    name: nameForSpecies(id),
    ...m,
  }));
  const knotRows = Object.entries(ALL_KNOT_MEDIA).map(([id, m]) => ({ name: nameForKnot(id), ...m }));

  const Row = (r: { name: string; author: string; license: string; sourceUrl: string }) => (
    <div key={r.name} style={{ padding: "12px 2px", borderBottom: "1px solid #ECE8DD" }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
      <div style={{ fontSize: 12.5, color: "#948F81", marginTop: 2, lineHeight: 1.5 }}>
        {r.author} — {r.license}
        {r.sourceUrl && (
          <>
            {" · "}
            <a href={r.sourceUrl} target="_blank" rel="noreferrer">
              Wikimedia Commons ↗
            </a>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Crédits photos</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        <div className="info" style={{ marginBottom: 16 }}>
          Toutes les photos sont sous licence libre (domaine public, CC BY ou CC BY-SA) et
          embarquées dans l'app. Merci à leurs auteurs.
        </div>

        {speciesRows.length > 0 && (
          <>
            <div className="label" style={{ margin: "4px 0 4px" }}>
              Poissons
            </div>
            {speciesRows.map(Row)}
          </>
        )}

        {knotRows.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 4px" }}>
              Nœuds & montages
            </div>
            {knotRows.map(Row)}
          </>
        )}

        {speciesRows.length === 0 && knotRows.length === 0 && (
          <div style={{ color: "#948F81", fontSize: 14 }}>
            Les images seront créditées ici une fois embarquées.
          </div>
        )}
      </div>
    </div>
  );
}
