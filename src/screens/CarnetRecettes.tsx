import { useMemo, useState } from "react";
import { useStore } from "../store-hooks";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { TECHNIQUES, SAFETY } from "../data/techniques";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { hasMedia } from "../components/media-helpers";
import { usePhotoUrl } from "../lib/photos";
import {
  searchRecipes,
  searchTechniques,
  searchableSpecies,
  recentCatchRecipes,
  resolveSpeciesRef,
  spNames,
  type RecipeFilters,
} from "../lib/recipes";
import { RecipeView } from "./RecipeView";
import { RecipeEditor } from "./RecipeEditor";
import type { PersonalRecipe, Recipe } from "../types";

const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"];
const GUIDE = [...RECIPES, ...CRAYFISH_RECIPES];

export function CarnetRecettes() {
  const { state, nav } = useStore();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<RecipeFilters>({});
  const [editing, setEditing] = useState<PersonalRecipe | "new" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const especeIds = useMemo(() => searchableSpecies(GUIDE), []);
  const suggestions = useMemo(
    () => recentCatchRecipes(state.catches, state.crayfish, GUIDE),
    [state.catches, state.crayfish],
  );

  const recipeHits = searchRecipes(q, filters, GUIDE, state.recipes);
  const techHits = searchTechniques(q, TECHNIQUES);

  const mine = state.recipes;
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
    <div style={{ marginTop: 14 }}>
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 7 }}>
            D'après vos prises
          </div>
          <div className="chips">
            {suggestions.map((s) => (
              <button
                key={s.speciesId}
                className="chip"
                onClick={() =>
                  s.recipes.length === 1
                    ? nav("recette", { recipeId: s.recipes[0].id })
                    : setQ(s.speciesName)
                }
              >
                {s.speciesName} · {s.recipes.length} recette{s.recipes.length > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="search">
        <Icon d={ICONS.search} size={19} stroke="var(--muted)" width={1.6} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (titre, ingrédient, technique…)"
          aria-label="Rechercher une recette ou une technique"
        />
        {q.length > 0 && (
          <button className="clear" onClick={() => setQ("")} aria-label="Effacer la recherche">
            ✕
          </button>
        )}
      </div>

      <div className="chips" style={{ marginTop: 10 }}>
        <button
          className="chip"
          style={chipStyle(!filters.especeId)}
          aria-pressed={!filters.especeId}
          onClick={() => setFilters((f) => ({ ...f, especeId: undefined }))}
        >
          Toutes espèces
        </button>
        {especeIds.map((id) => (
          <button
            key={id}
            className="chip"
            style={chipStyle(filters.especeId === id)}
            aria-pressed={filters.especeId === id}
            onClick={() => setFilters((f) => ({ ...f, especeId: id }))}
          >
            {resolveSpeciesRef(id).name}
          </button>
        ))}
      </div>

      <div className="chips" style={{ marginTop: 8 }}>
        <button
          className="chip"
          style={chipStyle(!filters.maxMinutes)}
          aria-pressed={!filters.maxMinutes}
          onClick={() => setFilters((f) => ({ ...f, maxMinutes: undefined }))}
        >
          Toutes durées
        </button>
        <button
          className="chip"
          style={chipStyle(filters.maxMinutes === 20)}
          aria-pressed={filters.maxMinutes === 20}
          onClick={() => setFilters((f) => ({ ...f, maxMinutes: 20 }))}
        >
          ≤ 20 min
        </button>
        <button
          className="chip"
          style={chipStyle(filters.maxMinutes === 45)}
          aria-pressed={filters.maxMinutes === 45}
          onClick={() => setFilters((f) => ({ ...f, maxMinutes: 45 }))}
        >
          ≤ 45 min
        </button>
        <button
          className="chip"
          style={chipStyle(filters.bivouacOnly === true)}
          aria-pressed={filters.bivouacOnly === true}
          onClick={() => setFilters((f) => ({ ...f, bivouacOnly: !f.bivouacOnly }))}
        >
          🏕️ Bivouac
        </button>
      </div>

      <button className="mr-create" style={{ marginTop: 14 }} onClick={() => setEditing("new")}>
        <Icon d="M12 5v14M5 12h14" size={20} stroke="var(--on-accent-warm)" width={1.8} />
        Créer une recette
      </button>
      <div className="mr-note">100 % local — liez-la à une espèce, avec photo, ingrédients, étapes et note.</div>

      <div className="label" style={{ margin: "18px 0 8px" }}>
        Recettes · {recipeHits.length}
      </div>
      {recipeHits.length === 0 && (
        <div className="empty-note">Aucune recette ne correspond à cette recherche.</div>
      )}
      <div className="mr-guide">
        {recipeHits.map((hit) =>
          hit.kind === "guide" ? (
            <GuideRow
              key={hit.recipe.id}
              r={hit.recipe}
              onOpen={() => nav("recette", { recipeId: hit.recipe.id })}
            />
          ) : (
            <PersoRow key={hit.recipe.id} r={hit.recipe} onOpen={() => setViewId(hit.recipe.id)} />
          ),
        )}
      </div>

      <div className="label" style={{ margin: "20px 0 8px" }}>
        Techniques · {techHits.length}
      </div>
      {techHits.length === 0 && (
        <div className="empty-note">Aucune technique ne correspond à cette recherche.</div>
      )}
      <div>
        {techHits.map((t) => (
          <button key={t.id} type="button" className="tile" onClick={() => nav("technique", { techId: t.id })}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{t.steps.length} étape(s)</div>
            </div>
            <span style={{ color: "var(--chev-ink)" }}>›</span>
          </button>
        ))}
      </div>

      <div className="label" style={{ margin: "20px 0 8px" }}>
        Sécurité sanitaire
      </div>
      <div className="safety-card">
        <p>
          <b>Parasites.</b> {SAFETY.parasites}
        </p>
        <p>
          <b>Congélation assainissante.</b> {SAFETY.congelation}
        </p>
        <p>
          <b>Mucus.</b> {SAFETY.mucus}
        </p>
        <div className="source">Source : {SAFETY.source}</div>
      </div>
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? "var(--green-dark)" : "var(--line-strong)"}`,
    background: active ? "var(--green-dark)" : "var(--card)",
    color: active ? "var(--on-accent-warm)" : "var(--body)",
  };
}

function GuideRow({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const ref0 = resolveSpeciesRef(r.species[0]);
  return (
    <button className="card-row" onClick={onOpen}>
      <div className="mr-guide-thumb">
        {hasMedia("recipe", r.id) ? (
          <Media kind="recipe" id={r.id} placeholder={r.title} />
        ) : (
          <Media kind={ref0.kind === "crayfish" ? "crayfish" : "species"} id={r.species[0]} placeholder={r.title} />
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
  );
}

function PersoRow({ r, onOpen }: { r: PersonalRecipe; onOpen: () => void }) {
  const url = usePhotoUrl(r.photo);
  return (
    <button className="card-row" onClick={onOpen}>
      <div className="mr-guide-thumb">
        {url ? (
          <img src={url} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : r.species[0] ? (
          <Media kind="species" id={r.species[0]} placeholder={r.title} />
        ) : (
          <div className="mr-noimg">🍽️</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">{r.title}</div>
        <div className="s">
          Ma recette{r.species.length > 0 ? ` · ${spNames(r.species.slice(0, 1))}` : ""}
        </div>
      </div>
      <span className="chev">›</span>
    </button>
  );
}
