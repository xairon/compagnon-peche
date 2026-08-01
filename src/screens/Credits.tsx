import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { KNOTS } from "../data/knots";
import {
  SPECIES_MEDIA,
  GEAR_MEDIA,
  CRAYFISH_MEDIA,
  RECIPE_MEDIA,
  TECHNIQUE_MEDIA,
} from "../data/media";
import { licenceUrl } from "../lib/licences";
import { RECIPES } from "../data/recipes";
import { TECHNIQUES } from "../data/techniques";
import { GEAR_CARDS } from "../data/gear-cards";
import { NAME_TO_ID, ALL_KNOT_MEDIA } from "../components/media-helpers";
import { crayfishById } from "../data/ecrevisses";

function nameForSpecies(id: string): string {
  return SPECIES.find((s) => s.id === id)?.name || idFallback(id);
}
function nameForKnot(id: string): string {
  return KNOTS.find((k) => k.id === id)?.name || id;
}
function nameForCrayfish(id: string): string {
  return crayfishById(id)?.name || id;
}
// Confusion-only species (grémille, carassin…) aren't in SPECIES; recover their
// display name from the confusion name map.
function idFallback(id: string): string {
  const hit = Object.entries(NAME_TO_ID).find(([, v]) => v === id);
  return hit ? hit[0] : id;
}
function nameForGear(id: string): string {
  for (const cards of Object.values(GEAR_CARDS)) {
    const hit = cards.find((c) => c.id === id);
    if (hit) return hit.name;
  }
  return id;
}
function nameForRecipe(id: string): string {
  return RECIPES.find((r) => r.id === id)?.title || id;
}
function nameForTechnique(id: string): string {
  return TECHNIQUES.find((t) => t.id === id)?.name || id;
}

export function Credits() {
  const { back } = useStore();
  // One credit row per photo (species may have several: adult, juvenile…).
  const speciesRows = Object.entries(SPECIES_MEDIA).flatMap(([id, photos]) =>
    photos.map((m, i) => ({
      name: nameForSpecies(id) + (m.caption ? ` (${m.caption})` : photos.length > 1 ? ` (${i + 1})` : ""),
      author: m.author,
      license: m.license,
      sourceUrl: m.sourceUrl,
    })),
  );
  // Une illustration par nœud, donc une ligne par nœud illustré.
  const knotRows = Object.entries(ALL_KNOT_MEDIA).map(([id, m]) => ({
    name: nameForKnot(id),
    ...m,
  }));
  const gearRows = Object.entries(GEAR_MEDIA).map(([id, m]) => ({ name: nameForGear(id), ...m }));
  const crayfishRows = Object.entries(CRAYFISH_MEDIA).map(([id, m]) => ({ name: nameForCrayfish(id), ...m }));
  // Recipe and technique photos ship in the app and are displayed by
  // Recette, Techniques and CarnetRecettes — they were never credited here,
  // which for the CC BY-SA ones is a licence breach, not an omission.
  const recipeRows = Object.entries(RECIPE_MEDIA).map(([id, m]) => ({ name: nameForRecipe(id), ...m }));
  const techniqueRows = Object.entries(TECHNIQUE_MEDIA).map(([id, m]) => ({ name: nameForTechnique(id), ...m }));

  const Row = (r: { name: string; author: string; license: string; sourceUrl: string }) => (
    <div key={r.name} style={{ padding: "12px 2px", borderBottom: "1px solid #ECE8DD" }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>
        {r.author} —{" "}
        {/* CC licences require the terms to be linked, not merely named. */}
        {licenceUrl(r.license) ? (
          <a href={licenceUrl(r.license) as string} target="_blank" rel="noreferrer">
            {r.license}
          </a>
        ) : (
          r.license
        )}
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
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">Crédits photos</h1>
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

        {gearRows.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 4px" }}>
              Matériel
            </div>
            {gearRows.map(Row)}
          </>
        )}

        {crayfishRows.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 4px" }}>
              Écrevisses
            </div>
            {crayfishRows.map(Row)}
          </>
        )}

        {recipeRows.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 4px" }}>
              Recettes
            </div>
            {recipeRows.map(Row)}
          </>
        )}

        {techniqueRows.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 4px" }}>
              Techniques
            </div>
            {techniqueRows.map(Row)}
          </>
        )}

        {speciesRows.length === 0 &&
          knotRows.length === 0 &&
          gearRows.length === 0 &&
          crayfishRows.length === 0 &&
          recipeRows.length === 0 &&
          techniqueRows.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            Les images seront créditées ici une fois embarquées.
          </div>
        )}
      </div>
    </main>
  );
}
