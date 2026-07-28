import { useEffect, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { norm, uid, isoDay } from "../lib/helpers";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";
import { isQuotaError } from "../lib/storage";
import { spNames } from "../lib/recipes";
import type { PersonalRecipe } from "../types";

export function RecipeEditor({
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
  // Set when the photo write fails but the recipe itself is still savable:
  // held here until the user acknowledges, so onDone() doesn't unmount this
  // screen (and the message with it) before they've read why.
  const [photoError, setPhotoError] = useState<string | null>(null);
  const pendingRef = useRef<{ id: string; recipe: PersonalRecipe } | null>(null);

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
    setPhotoError(null);
    const id = initial?.id ?? uid("r");

    let key = photoKey;
    let failure: string | null = null;
    if (photoFile) {
      const blob = await downscaleImage(photoFile);
      const newKey = `photo:${id}:${Date.now()}`;
      try {
        await savePhoto(newKey, blob);
        if (photoKey && photoKey !== newKey) await deletePhoto(photoKey);
        key = newKey;
      } catch (e) {
        // Write failed: keep whatever photo was already attached rather than
        // pointing the recipe at a blob that was never written.
        key = photoKey;
        failure = isQuotaError(e)
          ? "Espace de stockage saturé : la recette sera enregistrée, mais pas la nouvelle photo. Libérez de la place ou exportez une sauvegarde, puis réessayez d'ajouter la photo."
          : "La recette sera enregistrée, mais la nouvelle photo n'a pas pu être sauvegardée sur cet appareil.";
      }
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

    if (failure) {
      pendingRef.current = { id, recipe };
      setPhotoError(failure);
      setSaving(false);
      return;
    }
    if (initial) updateRecipe(id, recipe);
    else addRecipe(recipe);
    onDone(id);
  };

  // The user has read why the photo is missing — now actually save the recipe.
  const confirmSaveWithoutPhoto = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (initial) updateRecipe(pending.id, pending.recipe);
    else addRecipe(pending.recipe);
    onDone(pending.id);
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

        {photoError && (
          <div className="alert" style={{ marginTop: 12 }} role="alert">
            <Icon d={ICONS.alert} size={18} stroke="#B33A2E" width={1.7} style={{ marginTop: 1 }} />
            <div className="txt">
              {photoError}
              <div style={{ marginTop: 8 }}>
                <button className="save-btn" style={{ marginTop: 0 }} onClick={confirmSaveWithoutPhoto}>
                  J'ai compris, continuer
                </button>
              </div>
            </div>
          </div>
        )}

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
