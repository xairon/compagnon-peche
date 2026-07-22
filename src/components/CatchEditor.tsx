import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { CAT_LABEL } from "../data/gear";
import { norm, uid, isoDay } from "../lib/helpers";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";
import { locate, locateMessage } from "../lib/locate";
import type { Catch } from "../types";

const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function frLongDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface FormState {
  spid: string;
  taille: string;
  poids: string;
  date: string;
  heure: string;
  place: string;
  spotId: string;
  lat?: number;
  lon?: number;
  gearIds: string[];
  bait: string;
  technique: string;
  kept: boolean;
  note: string;
  photoKey?: string;
  photoFile: File | null;
  photoPreview: string | null;
  removePhoto: boolean;
}

export function CatchEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Catch;
  onSave: (entry: Catch) => void;
  onCancel: () => void;
}) {
  const { state } = useStore();
  const gear = state.gear;
  const spots = state.spots;
  const fileRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState<FormState>(() => ({
    spid: initial?.spid ?? "sandre",
    taille: initial ? String(initial.n || "") : "",
    poids: initial?.weight != null ? String(initial.weight) : "",
    date: initial?.iso ?? isoDay(),
    heure: initial?.time ?? nowHM(),
    place: initial?.place && initial.place !== "—" ? initial.place : "",
    spotId: initial?.spotId ?? "",
    lat: initial?.lat,
    lon: initial?.lon,
    gearIds: initial?.gearIds ?? [],
    bait: initial?.bait ?? "",
    technique: initial?.technique ?? "",
    kept: initial?.kept ?? false,
    note: initial?.note ?? "",
    photoKey: initial?.photo,
    photoFile: null,
    photoPreview: null,
    removePhoto: false,
  }));

  const [spq, setSpq] = useState("");
  const [saving, setSaving] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  // Revoke the preview object URL on change/unmount (avoid leaking blobs).
  useEffect(() => {
    const url = f.photoPreview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [f.photoPreview]);
  const existingPhoto = usePhotoUrl(f.removePhoto || f.photoFile ? undefined : f.photoKey);
  const shownPhoto = f.photoPreview || existingPhoto;

  const up = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }));

  const nq = norm(spq);
  const spMatches = nq
    ? SPECIES.filter((s) => norm(s.name).includes(nq) || norm(s.latin).includes(nq)).slice(0, 14)
    : SPECIES.slice(0, 10);

  const toggleGear = (id: string) =>
    up({ gearIds: f.gearIds.includes(id) ? f.gearIds.filter((x) => x !== id) : [...f.gearIds, id] });

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (f.photoPreview) URL.revokeObjectURL(f.photoPreview);
    up({ photoFile: file, photoPreview: URL.createObjectURL(file), removePhoto: false });
  };
  const clearPhoto = () => {
    if (f.photoPreview) URL.revokeObjectURL(f.photoPreview);
    up({ photoFile: null, photoPreview: null, removePhoto: true });
  };

  const useGps = () => {
    setGpsMsg("Localisation…");
    locate()
      .then(({ lat, lon }) => {
        up({ lat, lon });
        setGpsMsg(null);
      })
      .catch((err) => setGpsMsg(locateMessage(err)));
  };

  const submit = async () => {
    const sp = SPECIES.find((s) => s.id === f.spid);
    if (!sp) return;
    setSaving(true);
    const slot = initial?.slot ?? uid("u");

    let photoKey = f.photoKey;
    if (f.photoFile) {
      const blob = await downscaleImage(f.photoFile);
      // Versioned key so usePhotoUrl (keyed on the string) re-fetches after a
      // replacement, and the previous blob is removed (no orphan / stale image).
      const newKey = `photo:${slot}:${Date.now()}`;
      await savePhoto(newKey, blob);
      if (f.photoKey && f.photoKey !== newKey) await deletePhoto(f.photoKey);
      photoKey = newKey;
    } else if (f.removePhoto && f.photoKey) {
      await deletePhoto(f.photoKey);
      photoKey = undefined;
    }

    const cm = parseInt(f.taille) || 0;
    const kg = parseFloat(f.poids.replace(",", "."));
    const validSpot = f.spotId && spots.some((s) => s.id === f.spotId) ? f.spotId : undefined;
    const spotName = validSpot ? spots.find((s) => s.id === validSpot)?.name : undefined;

    const entry: Catch = {
      slot,
      sp: sp.name,
      spid: sp.id,
      iso: f.date || isoDay(), // empty date → today, so it still counts in quota/stats
      time: f.heure || undefined,
      size: cm ? cm + " cm" : "— cm",
      n: cm,
      weight: !isNaN(kg) && kg > 0 ? kg : undefined,
      date: frLongDate(f.date || isoDay()),
      place: f.place.trim() || spotName || "—",
      spotId: validSpot,
      lat: f.lat,
      lon: f.lon,
      gearIds: f.gearIds.length ? f.gearIds : undefined,
      bait: f.bait.trim() || undefined,
      technique: f.technique.trim() || undefined,
      photo: photoKey,
      note: f.note.trim() || undefined,
      kept: f.kept,
    };
    onSave(entry);
  };

  return (
    <div className="catch-editor">
      {/* Photo */}
      <div className="ce-photo">
        {shownPhoto ? (
          <div className="ce-photo-has">
            <img src={shownPhoto} alt="Photo de la prise" />
            <button className="ce-photo-x" onClick={clearPhoto} aria-label="Retirer la photo">
              ✕
            </button>
          </div>
        ) : (
          <button className="ce-photo-add" onClick={() => fileRef.current?.click()}>
            📷 Ajouter une photo
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={pickPhoto}
          style={{ display: "none" }}
        />
      </div>

      {/* Species */}
      <div className="label" style={{ marginBottom: 6 }}>
        Espèce — <b style={{ color: "#1D6E42" }}>{SP_NAME.get(f.spid) || f.spid}</b>
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
            className={"chip chip-sm" + (f.spid === s.id ? " chip-on" : "")}
            onClick={() => up({ spid: s.id })}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Size + weight */}
      <div className="ce-row">
        <div className="field">
          <label>Taille (cm)</label>
          <input value={f.taille} onChange={(e) => up({ taille: e.target.value })} inputMode="numeric" placeholder="52" />
        </div>
        <div className="field">
          <label>Poids (kg)</label>
          <input value={f.poids} onChange={(e) => up({ poids: e.target.value })} inputMode="decimal" placeholder="1,8" />
        </div>
      </div>

      {/* Date + time */}
      <div className="ce-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={f.date} onChange={(e) => up({ date: e.target.value })} />
        </div>
        <div className="field">
          <label>Heure</label>
          <input type="time" value={f.heure} onChange={(e) => up({ heure: e.target.value })} />
        </div>
      </div>

      {/* Place + spot + GPS */}
      <div className="field">
        <label>Lieu</label>
        <input value={f.place} onChange={(e) => up({ place: e.target.value })} placeholder="Loire, Blois" />
      </div>
      <div className="ce-row">
        {spots.length > 0 && (
          <div className="field">
            <label>Spot lié</label>
            <select value={f.spotId} onChange={(e) => up({ spotId: e.target.value })}>
              <option value="">— aucun —</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Position GPS</label>
          <button className="ce-gps" onClick={useGps}>
            {f.lat != null ? `📍 ${f.lat.toFixed(4)}, ${f.lon?.toFixed(4)}` : "📍 Utiliser ma position"}
          </button>
        </div>
      </div>
      {gpsMsg && <div className="ce-gps-msg">{gpsMsg}</div>}

      {/* Gear */}
      {gear.length > 0 && (
        <>
          <div className="label" style={{ margin: "6px 0" }}>
            Matériel utilisé
          </div>
          <div className="ce-chips">
            {gear.map((g) => (
              <button
                key={g.id}
                className={"chip chip-sm" + (f.gearIds.includes(g.id) ? " chip-on" : "")}
                onClick={() => toggleGear(g.id)}
              >
                {g.name} <span style={{ opacity: 0.6 }}>· {CAT_LABEL[g.cat]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bait + technique */}
      <div className="ce-row">
        <div className="field">
          <label>Appât / leurre</label>
          <input value={f.bait} onChange={(e) => up({ bait: e.target.value })} placeholder="Leurre souple 10 cm" />
        </div>
        <div className="field">
          <label>Technique</label>
          <input value={f.technique} onChange={(e) => up({ technique: e.target.value })} placeholder="Linéaire au fond" />
        </div>
      </div>

      {/* Kept / released */}
      <div className="ce-kept">
        <button className={f.kept ? "on-kept" : ""} onClick={() => up({ kept: true })}>
          Gardé
        </button>
        <button className={!f.kept ? "on-rel" : ""} onClick={() => up({ kept: false })}>
          Relâché
        </button>
      </div>

      {/* Note */}
      <div className="field" style={{ marginTop: 12 }}>
        <label>Note</label>
        <textarea value={f.note} onChange={(e) => up({ note: e.target.value })} rows={2} placeholder="Conditions, souvenir, détail…" />
      </div>

      <div className="ce-actions">
        <button className="btn-light" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
        <button className="save-btn" style={{ marginTop: 0, flex: 1.4 }} onClick={submit} disabled={saving}>
          {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter la prise"}
        </button>
      </div>
    </div>
  );
}
