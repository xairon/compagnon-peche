import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { Icon } from "../components/Icon";
import { Media, hasMedia } from "../components/Media";
import { norm, uid, isoDay } from "../lib/helpers";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";
import type { PersonalRecipe } from "../types";

const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));
const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"];

function spNames(ids: string[]): string {
  return ids.map((id) => SP_NAME.get(id) || id).filter(Boolean).join(", ");
}

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

// ————————————————————————————————————————————————————————————————
// Viewer
// ————————————————————————————————————————————————————————————————
function RecipeView({
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
        {url ? <img src={url} alt={recipe.title} className="mr-hero-img" /> : <div className="mr-hero-ph" />}
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

        {recipe.ing.length > 0 && (
          <>
            <div className="label" style={{ margin: "20px 0 8px" }}>
              Ingrédients
            </div>
            {recipe.ing.map((t, i) => (
              <div key={i} className="ing">
                <span style={{ color: "#1D6E42" }}>—</span>
                <span>{t}</span>
              </div>
            ))}
          </>
        )}

        {recipe.steps.length > 0 && (
          <>
            <div className="label" style={{ margin: "20px 0 10px" }}>
              Préparation
            </div>
            {recipe.steps.map((t, i) => (
              <div key={i} className="step">
                <div className="step-num">{i + 1}</div>
                <div className="t">{t}</div>
              </div>
            ))}
          </>
        )}

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

// ————————————————————————————————————————————————————————————————
// Editor
// ————————————————————————————————————————————————————————————————
function RecipeEditor({
  initial,
  onDone,
  onCancel,
}: {
  initial?: PersonalRecipe;
  onDone: (id: string | null) => void;
  onCancel: () => void;
}) {
  const { addRecipe, updateRecipe } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [species, setSpecies] = useState<string[]>(initial?.species ?? []);
  const [ing, setIng] = useState((initial?.ing ?? []).join("\n"));
  const [steps, setSteps] = useState((initial?.steps ?? []).join("\n"));
  const [note, setNote] = useState(initial?.note ?? "");
  const [spq, setSpq] = useState("");
  const [saving, setSaving] = useState(false);

  const [photoKey] = useState(initial?.photo);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);
  const existingPhoto = usePhotoUrl(removePhoto || photoFile ? undefined : photoKey);
  const shownPhoto = photoPreview || existingPhoto;

  const nq = norm(spq);
  const spMatches = nq
    ? SPECIES.filter((s) => norm(s.name).includes(nq) || norm(s.latin).includes(nq)).slice(0, 14)
    : SPECIES.slice(0, 10);
  const toggleSp = (id: string) =>
    setSpecies((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };
  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
  };

  const canSave = title.trim().length > 0;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    const id = initial?.id ?? uid("r");

    let key = photoKey;
    if (photoFile) {
      const blob = await downscaleImage(photoFile);
      const newKey = `photo:${id}:${Date.now()}`;
      await savePhoto(newKey, blob);
      if (photoKey && photoKey !== newKey) await deletePhoto(photoKey);
      key = newKey;
    } else if (removePhoto && photoKey) {
      await deletePhoto(photoKey);
      key = undefined;
    }

    const recipe: PersonalRecipe = {
      id,
      title: title.trim(),
      species,
      photo: key,
      ing: ing.split("\n").map((l) => l.trim()).filter(Boolean),
      steps: steps.split("\n").map((l) => l.trim()).filter(Boolean),
      note: note.trim() || undefined,
      created: initial?.created ?? isoDay(),
    };
    if (initial) updateRecipe(id, recipe);
    else addRecipe(recipe);
    onDone(id);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onCancel} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">{initial ? "Modifier la recette" : "Nouvelle recette"}</div>
      </div>

      <div className="pad">
        {/* Photo */}
        <div className="ce-photo">
          {shownPhoto ? (
            <div className="ce-photo-has">
              <img src={shownPhoto} alt="Photo du plat" />
              <button className="ce-photo-x" onClick={clearPhoto} aria-label="Retirer la photo">
                ✕
              </button>
            </div>
          ) : (
            <button className="ce-photo-add" onClick={() => fileRef.current?.click()}>
              📷 Photo du plat (facultatif)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={pickPhoto}
            style={{ display: "none" }}
          />
        </div>

        <div className="field">
          <label>Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sandre au beurre blanc"
          />
        </div>

        {/* Species link */}
        <div className="label" style={{ margin: "14px 0 6px" }}>
          Espèce(s) liée(s){species.length > 0 ? ` — ${spNames(species)}` : ""}
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <input
            value={spq}
            onChange={(e) => setSpq(e.target.value)}
            placeholder="Rechercher une espèce…"
            aria-label="Rechercher l'espèce"
          />
        </div>
        <div className="ce-chips">
          {spMatches.map((s) => (
            <button
              key={s.id}
              className={"chip chip-sm" + (species.includes(s.id) ? " chip-on" : "")}
              onClick={() => toggleSp(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Ingrédients — un par ligne</label>
          <textarea
            value={ing}
            onChange={(e) => setIng(e.target.value)}
            rows={5}
            placeholder={"2 filets de sandre\n50 g de beurre\n1 échalote\n10 cl de vin blanc"}
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Préparation — une étape par ligne</label>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={6}
            placeholder={"Ciseler l'échalote et la faire suer.\nDéglacer au vin blanc, réduire.\nMonter au beurre froid…"}
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Note (facultatif)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Origine, adaptation, souvenir…"
          />
        </div>

        <div className="ce-actions">
          <button className="btn-light" onClick={onCancel} disabled={saving}>
            Annuler
          </button>
          <button
            className="save-btn"
            style={{ marginTop: 0, flex: 1.4 }}
            onClick={submit}
            disabled={saving || !canSave}
          >
            {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Créer la recette"}
          </button>
        </div>
      </div>
    </div>
  );
}
