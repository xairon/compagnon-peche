import { useState } from "react";
import { useStore } from "../store-hooks";
import { Media } from "../components/Media";
import { IngredientList, StepList } from "../components/RecipeBody";
import { spNames } from "../lib/recipes";
import { usePhotoUrl } from "../lib/photos";
import type { PersonalRecipe } from "../types";

export function RecipeView({
  recipe,
  onBack,
  onEdit,
}: {
  recipe: PersonalRecipe;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { removeRecipe } = useStore();
  const url = usePhotoUrl(recipe.photo);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="screen" style={{ display: "block" }}>
      <div className="recipe-hero">
        {url ? (
          <img src={url} alt={recipe.title} className="mr-hero-img" />
        ) : recipe.species[0] ? (
          <Media kind="species" id={recipe.species[0]} placeholder={recipe.title} />
        ) : (
          <div className="mr-hero-ph mr-hero-noimg">🍽️</div>
        )}
        <button className="back" onClick={onBack} aria-label="Retour">
          ‹
        </button>
      </div>
      <div className="pad" style={{ paddingTop: 18 }}>
        <div className="mr-kicker">Ma recette</div>
        <div className="serif" style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {recipe.title}
        </div>
        {recipe.species.length > 0 && (
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
            {spNames(recipe.species)}
          </div>
        )}

        {recipe.note && <div className="recipe-intro">{recipe.note}</div>}

        <IngredientList items={recipe.ing} />
        <StepList items={recipe.steps} />

        <div className="mr-view-actions">
          <button className="btn-light" onClick={onEdit}>
            Modifier
          </button>
          {confirmDel ? (
            <button className="mr-del-confirm" onClick={() => removeRecipe(recipe.id)}>
              Confirmer la suppression
            </button>
          ) : (
            <button className="mr-del" onClick={() => setConfirmDel(true)}>
              Supprimer
            </button>
          )}
        </div>

        <div style={{ fontSize: 11.5, color: "#A8A495", marginTop: 16, lineHeight: 1.5 }}>
          Créée le {recipe.created} · stockée sur votre appareil.
        </div>
      </div>
    </div>
  );
}
