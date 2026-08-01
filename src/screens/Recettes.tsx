import { useMemo, useState } from "react";
import { useStore } from "../store-hooks";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { SAFETY } from "../data/techniques";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { hasMedia } from "../components/media-helpers";
import { usePhotoUrl } from "../lib/photos";
import {
  searchRecipes,
  searchableSpecies,
  searchableTechniques,
  especesANePasRelacher,
  especesSousRegime,
  recentCatchRecipes,
  resolveSpeciesRef,
  spNames,
  type RecipeFilters,
} from "../lib/recipes";
import { RecipeView } from "./RecipeView";
import { RecipeEditor } from "./RecipeEditor";
import type { PersonalRecipe, Recipe } from "../types";
import "./recettes.css";

/**
 * Cuisine & recettes — le module, pas la section.
 *
 * Ce qui existait avant : le moteur (`lib/recipes.ts`) et une interface de
 * recherche complète… au quatrième onglet de « Mon carnet », entre les spots et
 * les séances d'écrevisses. Rien n'y menait depuis l'Accueil ni depuis Outils,
 * et le seul chemin visible vers une recette passait par la fiche d'une espèce
 * précise. Le corpus était là, l'accès n'y était pas.
 *
 * Trois choses ne se négocient pas dans cet écran :
 *
 *  1. **Le sanitaire ne disparaît d'aucune vue.** Une consigne `safety` porte
 *     des instructions réelles (congélation avant cru, anisakis, boyau des
 *     écrevisses). Elle est affichée EN ENTIER dans la ligne de résultat, pas
 *     réservée au détail : une recherche qui fait remonter une recette sans sa
 *     consigne est pire que pas de recherche du tout.
 *  2. **Le régime spécial se dit là où la recette se montre.** La fiche espèce
 *     avertit déjà pour l'anguille et les aloses ; ce nouveau chemin d'accès
 *     reprend le même avertissement, sinon il le contourne.
 *  3. **Les recettes personnelles ne sont pas dans un silo.** Elles sont dans la
 *     même liste que le guide, trouvées par la même recherche.
 *
 * Rien n'est chargé à la demande : le corpus est déjà dans le noyau précaché
 * (`lib/precache-decoupe.ts`), seules les photos de plats vivent dans la réserve
 * — leur absence dégrade la vignette, jamais le texte.
 */

const GUIDE = [...RECIPES, ...CRAYFISH_RECIPES];
const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"] as const;
const NIVEAUX: (1 | 2 | 3)[] = [1, 2, 3];

/** Durée affichable. `cook: 0` est délibéré sur les conserves d'alose (la
 *  stérilisation n'a pas de barème sûr à afficher) : on ne l'additionne pas. */
function duree(r: Recipe): string {
  return r.cook ? `${r.prep + r.cook} min` : `${r.prep} min de prépa`;
}

export function Recettes() {
  const { state, nav, back } = useStore();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<RecipeFilters>({});
  const [editing, setEditing] = useState<PersonalRecipe | "new" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const especeIds = useMemo(() => searchableSpecies(GUIDE), []);
  const techniques = useMemo(() => searchableTechniques(GUIDE), []);
  const invasives = useMemo(() => especesANePasRelacher(GUIDE), []);
  const suggestions = useMemo(
    () => recentCatchRecipes(state.catches, state.crayfish, GUIDE),
    [state.catches, state.crayfish],
  );

  const hits = searchRecipes(q, filters, GUIDE, state.recipes);
  const actif = (k: keyof RecipeFilters) => filters[k] !== undefined && filters[k] !== false;
  const aucunFiltre = !Object.values(filters).some((v) => v !== undefined && v !== false);
  const bascule = <K extends keyof RecipeFilters>(k: K, v: RecipeFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: f[k] === v ? undefined : v }));

  // RecipeEditor et RecipeView sont écrits pour s'ouvrir DANS un écran qui porte
  // déjà le repère principal et le titre — c'était le carnet. Ouverts d'ici sans
  // enveloppe, ils faisaient disparaître les deux : plus de `<main>`, plus de
  // `<h1>`, donc plus rien qui dise à un lecteur d'écran où l'on est. L'enveloppe
  // les rétablit sans toucher à ces deux composants (l'un ne m'appartient pas).
  if (editing) {
    return (
      <main className="rcz-sous-ecran">
        <h1 className="sr-only">Cuisine &amp; recettes</h1>
        <RecipeEditor
          initial={editing === "new" ? undefined : editing}
          onDone={(id) => {
            setEditing(null);
            if (id) setViewId(id);
          }}
          onCancel={() => setEditing(null)}
        />
      </main>
    );
  }
  const viewed = viewId ? state.recipes.find((r) => r.id === viewId) : null;
  if (viewed) {
    return (
      <main className="rcz-sous-ecran">
        <h1 className="sr-only">Cuisine &amp; recettes</h1>
        <RecipeView
          recipe={viewed}
          onBack={() => setViewId(null)}
          onEdit={() => {
            setEditing(viewed);
            setViewId(null);
          }}
        />
      </main>
    );
  }

  return (
    <main className="screen rcz">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">Cuisine &amp; recettes</h1>
      </div>

      <div className="pad rcz-pad">
        <div className="search rcz-search">
          <Icon d={ICONS.search} size={19} stroke="var(--muted)" width={1.6} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Espèce, plat, ingrédient, technique…"
            aria-label="Rechercher une recette"
          />
          {q.length > 0 && (
            <button className="clear" onClick={() => setQ("")} aria-label="Effacer la recherche">
              ✕
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <>
            <h2 className="label rcz-label">D'après vos prises</h2>
            <div className="rcz-chips">
              {suggestions.map((s) => (
                <button
                  key={s.speciesId}
                  type="button"
                  className="rcz-chip"
                  onClick={() => {
                    setFilters({ especeId: s.speciesId });
                    setQ("");
                  }}
                >
                  {s.speciesName} · {s.recipes.length} recette{s.recipes.length > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </>
        )}

        <h2 className="label rcz-label">Au bord de l'eau</h2>
        <div className="rcz-chips">
          <button
            type="button"
            className="rcz-chip"
            aria-pressed={filters.bivouacOnly === true}
            onClick={() => bascule("bivouacOnly", true)}
          >
            🏕️ Au bivouac
          </button>
          <button
            type="button"
            className="rcz-chip rcz-chip-alerte"
            aria-pressed={filters.nePasRelacherOnly === true}
            onClick={() => bascule("nePasRelacherOnly", true)}
          >
            À ne pas relâcher · {invasives.length} espèces
          </button>
          <button
            type="button"
            className="rcz-chip"
            aria-pressed={filters.maxMinutes === 20}
            onClick={() => bascule("maxMinutes", 20)}
          >
            ≤ 20 min
          </button>
          <button
            type="button"
            className="rcz-chip"
            aria-pressed={filters.maxMinutes === 45}
            onClick={() => bascule("maxMinutes", 45)}
          >
            ≤ 45 min
          </button>
        </div>

        {filters.nePasRelacherOnly && (
          <p className="rcz-note-invasive">
            La remise à l'eau vivante de ces espèces est interdite (art. R432-5) : toute capture
            doit être mise à mort. Ces recettes sont là pour que cette obligation ne finisse pas à
            la poubelle.
          </p>
        )}

        <h2 className="label rcz-label">Difficulté</h2>
        <div className="rcz-chips">
          {NIVEAUX.map((n) => (
            <button
              key={n}
              type="button"
              className="rcz-chip"
              aria-pressed={filters.difficulty === n}
              onClick={() => bascule("difficulty", n)}
            >
              {DIFF_LABEL[n]}
            </button>
          ))}
        </div>

        <h2 className="label rcz-label">Espèce</h2>
        <div className="rcz-chips">
          {especeIds.map((id) => (
            <button
              key={id}
              type="button"
              className="rcz-chip"
              aria-pressed={filters.especeId === id}
              onClick={() => bascule("especeId", id)}
            >
              {resolveSpeciesRef(id).name}
            </button>
          ))}
        </div>

        <h2 className="label rcz-label">Technique</h2>
        <div className="rcz-chips">
          {techniques.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rcz-chip"
              aria-pressed={filters.techniqueId === t.id}
              onClick={() => bascule("techniqueId", t.id)}
            >
              {t.name.split(" — ")[0].split(" (")[0]}
            </button>
          ))}
        </div>

        {!aucunFiltre && (
          <button type="button" className="rcz-reset" onClick={() => setFilters({})}>
            Tout afficher
          </button>
        )}

        <button type="button" className="rcz-create" onClick={() => setEditing("new")}>
          <Icon d="M12 5v14M5 12h14" size={20} stroke="var(--paper)" width={1.8} />
          Créer ma recette
        </button>
        <p className="rcz-create-note">
          100 % locale, sur votre appareil : liez-la à une espèce, avec photo, ingrédients, étapes
          et note. Elle apparaît ensuite dans cette liste, avec les autres.
        </p>

        <div className="rcz-count">
          {hits.length} recette{hits.length > 1 ? "s" : ""}
          {actif("especeId") ? ` · ${resolveSpeciesRef(filters.especeId!).name}` : ""}
        </div>

        {hits.length === 0 && (
          <p className="empty-note">
            Aucune recette ne correspond. Le corpus embarqué compte {GUIDE.length} recettes
            sourcées : élargissez la recherche ou retirez un filtre.
          </p>
        )}

        <ul className="rcz-list" aria-label="Recettes">
          {hits.map((hit) =>
            hit.kind === "guide" ? (
              <LigneGuide
                key={hit.recipe.id}
                r={hit.recipe}
                onOpen={() => nav("recette", { recipeId: hit.recipe.id })}
              />
            ) : (
              <LignePerso
                key={hit.recipe.id}
                r={hit.recipe}
                onOpen={() => setViewId(hit.recipe.id)}
              />
            ),
          )}
        </ul>

        <h2 className="label rcz-label">Sécurité sanitaire</h2>
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
    </main>
  );
}

function LigneGuide({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const ref0 = resolveSpeciesRef(r.species[0]);
  const regime = especesSousRegime(r);
  // `placeholder` vide et non le titre : le titre est juste à côté, le répéter
  // dans la vignette de repli en ferait un doublon pour un lecteur d'écran.
  return (
    <li className="rcz-item">
      <button type="button" className="rcz-row" onClick={onOpen}>
        <span className="rcz-thumb">
          {hasMedia("recipe", r.id) ? (
            <Media kind="recipe" id={r.id} placeholder="" />
          ) : (
            <Media
              kind={ref0.kind === "crayfish" ? "crayfish" : "species"}
              id={r.species[0]}
              placeholder=""
            />
          )}
        </span>
        <span className="rcz-txt">
          <span className="rcz-title">{r.title}</span>
          <span className="rcz-meta">
            {spNames(r.species.slice(0, 2))} · {DIFF_LABEL[r.difficulty]} · {duree(r)}
          </span>
          {/* L'attribution voyage avec la recette : origine, auteur, source.
              Rien n'est inventé ici — seuls les champs réellement remplis
              s'affichent. */}
          <span className="rcz-src">
            {[r.origin, r.author, r.year ? String(r.year) : null].filter(Boolean).join(" · ")}
          </span>
          {r.bivouac && <span className="rcz-badge">🏕️ Réalisable au bord de l'eau</span>}
        </span>
        <span className="rcz-chev" aria-hidden="true">
          ›
        </span>
      </button>

      {regime.length > 0 && (
        <p className="rcz-regime">
          <b>{regime.join(", ")}</b> — régime spécial : à relâcher, ne pas conserver là où le
          moratoire s'applique. Ces préparations ont un intérêt patrimonial et ne valent que là où
          l'espèce est légalement pêchable (moratoires variables par bassin — vérifiez l'arrêté).
        </p>
      )}

      {r.safety && (
        <p className="rcz-safety">
          <b>Sécurité</b> — {r.safety}
        </p>
      )}
    </li>
  );
}

function LignePerso({ r, onOpen }: { r: PersonalRecipe; onOpen: () => void }) {
  const url = usePhotoUrl(r.photo);
  return (
    <li className="rcz-item">
      <button type="button" className="rcz-row" onClick={onOpen}>
        <span className="rcz-thumb">
          {url ? (
            <img src={url} alt="" className="media-img" />
          ) : r.species[0] ? (
            <Media kind="species" id={r.species[0]} placeholder="" />
          ) : (
            <span className="rcz-noimg" aria-hidden="true">
              🍽️
            </span>
          )}
        </span>
        <span className="rcz-txt">
          <span className="rcz-title">{r.title}</span>
          <span className="rcz-meta">
            Ma recette{r.species.length > 0 ? ` · ${spNames(r.species.slice(0, 2))}` : ""}
          </span>
          <span className="rcz-src">Créée le {r.created} · sur votre appareil</span>
        </span>
        <span className="rcz-chev" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
}
