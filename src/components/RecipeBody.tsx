import { Glossed } from "./Glossed";

// Shared ingredient/step rendering for both guide recipes (Recette.tsx) and
// personal recipes (RecipeView.tsx) — they display the same shape of data
// (string[]) and had drifted into two hand-maintained copies.

/** Ingredient list with its "Ingrédients" label. Renders nothing when empty. */
export function IngredientList({
  items,
  card,
  margin = "20px 0 8px",
}: {
  items: string[];
  /** Wrap the rows in the bordered `.recipe-ing-card`, used for a guide
   *  recipe's main ingredients but not its sub-component ones or personal recipes. */
  card?: boolean;
  margin?: string;
}) {
  if (items.length === 0) return null;
  const rows = items.map((t, i) => (
    <div key={i} className="ing">
      <span style={{ color: "var(--green)" }}>—</span>
      <span>{t}</span>
    </div>
  ));
  return (
    <>
      <div className="label" style={{ margin }}>
        Ingrédients
      </div>
      {card ? <div className="recipe-ing-card">{rows}</div> : rows}
    </>
  );
}

/** Numbered step list with its "Préparation" label. Renders nothing when empty. */
export function StepList({
  items,
  glossed,
  margin = "20px 0 10px",
}: {
  items: string[];
  /** Run each line through Glossed() for tappable term definitions — used by
   *  the guide's editorial recipes, not personal free-text recipes. */
  glossed?: boolean;
  margin?: string;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="label" style={{ margin }}>
        Préparation
      </div>
      {items.map((t, i) => (
        <div key={i} className="step">
          <div className="step-num">{i + 1}</div>
          <div className="t">{glossed ? <Glossed>{t}</Glossed> : t}</div>
        </div>
      ))}
    </>
  );
}
