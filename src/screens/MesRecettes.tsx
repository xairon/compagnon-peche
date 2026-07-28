import { useState } from "react";
import { useStore } from "../store-hooks";
import { RECIPES } from "../data/recipes";
import { Icon } from "../components/Icon";
import { Media } from "../components/Media";
import { hasMedia } from "../components/media-helpers";
import { usePhotoUrl } from "../lib/photos";
import { spNames } from "../lib/recipes";
import { RecipeView } from "./RecipeView";
import { RecipeEditor } from "./RecipeEditor";
import type { PersonalRecipe } from "../types";

const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"];

export function MesRecettes() {
  const { state, nav, back } = useStore();
  const mine = state.recipes;
  // The mockup opens on "Mes recettes".
  const [seg, setSeg] = useState<"mine" | "guide">("mine");
  const [editing, setEditing] = useState<PersonalRecipe | "new" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  if (editing) {
    return (
      <RecipeEditor
        initial={editing === "new" ? undefined : editing}
        onDone={(id) => {
          setEditing(null);
          if (id) setViewId(id);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const viewed = viewId ? mine.find((r) => r.id === viewId) : null;
  if (viewId && viewed) {
    return (
      <RecipeView
        recipe={viewed}
        onBack={() => setViewId(null)}
        onEdit={() => {
          setEditing(viewed);
          setViewId(null);
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Recettes</div>
      </div>

      <div className="pad">
        <div className="pf-seg">
          <button className={seg === "guide" ? "on" : ""} onClick={() => setSeg("guide")}>
            Le guide · {RECIPES.length}
          </button>
          <button className={seg === "mine" ? "on" : ""} onClick={() => setSeg("mine")}>
            Mes recettes · {mine.length}
          </button>
        </div>

        {seg === "mine" && (
          <>
            <button className="mr-create" onClick={() => setEditing("new")}>
              <Icon d="M12 5v14M5 12h14" size={20} stroke="#FBFAF7" width={1.8} />
              Créer une recette
            </button>
            <div className="mr-note">
              100 % local — liez-la à une espèce, avec photo, ingrédients, étapes et note.
            </div>

            {mine.length === 0 && (
              <div className="empty-note" style={{ marginTop: 4 }}>
                Aucune recette perso pour l'instant. Touchez « Créer une recette » pour ajouter la
                vôtre — elle reste sur votre appareil.
              </div>
            )}

            <div className="mr-grid">
              {mine.map((r) => (
                <MineCard key={r.id} r={r} onOpen={() => setViewId(r.id)} />
              ))}
            </div>
          </>
        )}

        {seg === "guide" && (
          <div className="mr-guide">
            {RECIPES.map((r) => (
              <button
                key={r.id}
                className="card-row"
                onClick={() => nav("recette", { recipeId: r.id })}
              >
                <div className="mr-guide-thumb">
                  {hasMedia("recipe", r.id) ? (
                    <Media kind="recipe" id={r.id} placeholder={r.title} />
                  ) : (
                    <Media kind="species" id={r.species[0]} placeholder={r.title} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t">{r.title}</div>
                  <div className="s">
                    {spNames(r.species.slice(0, 2))} · {r.origin} · {DIFF_LABEL[r.difficulty]}
                  </div>
                </div>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: "#A8A495", marginTop: 16, lineHeight: 1.5 }}>
          Vos recettes sont stockées sur votre appareil. Aucune donnée n'est transmise.
        </div>
      </div>
    </div>
  );
}

function MineCard({ r, onOpen }: { r: PersonalRecipe; onOpen: () => void }) {
  const url = usePhotoUrl(r.photo);
  return (
    <button className="ct" onClick={onOpen}>
      <div className="ct-img">
        {url ? (
          <img src={url} alt={r.title} />
        ) : r.species[0] ? (
          <Media kind="species" id={r.species[0]} placeholder={r.title} />
        ) : (
          <div className="mr-noimg">🍽️</div>
        )}
        <span className="mr-badge">Ma recette</span>
      </div>
      <div className="ct-cap">
        <b>{r.title}</b>
        {r.species.length > 0 && <span> · {spNames(r.species.slice(0, 1))}</span>}
      </div>
    </button>
  );
}
