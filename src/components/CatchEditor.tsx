import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { CAT_LABEL } from "../data/gear";
import { norm, uid, isoDay } from "../lib/helpers";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";
import { locate, locateMessage } from "../lib/locate";
import { isQuotaError, getLastExportAt, storageInfo } from "../lib/storage";
import { shouldSuggestBackup } from "../lib/backup-reminder";
import { getFreshConditions } from "../lib/conditionsCache";
import { Icon } from "./Icon";
import { ICONS } from "./icons-data";
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
  // Préfixe d'identifiants pour lier chaque <label> à son champ. useId, et non
  // un compteur : cet éditeur est monté deux fois dans l'app (ajout depuis le
  // carnet, correction depuis le détail d'une prise), et deux `id` identiques
  // renverraient les deux libellés vers le même champ.
  const fid = useId();

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
  // Set when the photo write fails but the catch itself is still savable: we
  // hold the entry here and wait for the user to acknowledge before calling
  // onSave, so the parent doesn't unmount this screen (and the message with
  // it) before they've had a chance to read why the photo is missing.
  const [photoError, setPhotoError] = useState<string | null>(null);
  const pendingEntryRef = useRef<Catch | null>(null);

  // Revoke the preview object URL on change/unmount (avoid leaking blobs).
  useEffect(() => {
    const url = f.photoPreview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [f.photoPreview]);
  const existingPhoto = usePhotoUrl(f.removePhoto || f.photoFile ? undefined : f.photoKey);
  const shownPhoto = f.photoPreview || existingPhoto;

  // Discreet backup nudge: this screen (adding/editing a catch) is the one
  // place in the app every angler visits regularly, which makes it a better
  // spot for a reminder than the Stockage screen alone (nobody goes there on
  // their own). Anchored on the oldest catch/spot date so it still fires for
  // someone who has never exported, not just after a first backup.
  // `now`/`lastExportAtMs` are read once per mount (lazy initializer, not a
  // direct call during render) — a form filled out over several days is not
  // something this app needs to react to mid-render.
  const [nowMs] = useState(() => Date.now());
  const [lastExportAtMs] = useState(() => getLastExportAt());
  const oldestDataAtMs = (() => {
    const stamps = [...state.catches.map((c) => c.iso), ...state.spots.map((sp) => sp.created)]
      .map((d) => new Date(d + "T00:00:00").getTime())
      .filter((t) => Number.isFinite(t));
    return stamps.length ? Math.min(...stamps) : null;
  })();
  const showBackupReminder = shouldSuggestBackup({ lastExportAtMs, oldestDataAtMs, now: nowMs });

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
    setPhotoError(null);
    const slot = initial?.slot ?? uid("u");

    let photoKey = f.photoKey;
    let photoFailure: string | null = null;
    if (f.photoFile) {
      const blob = await downscaleImage(f.photoFile);
      // Versioned key so usePhotoUrl (keyed on the string) re-fetches after a
      // replacement, and the previous blob is removed (no orphan / stale image).
      const newKey = `photo:${slot}:${Date.now()}`;
      try {
        await savePhoto(newKey, blob);
        if (f.photoKey && f.photoKey !== newKey) await deletePhoto(f.photoKey);
        photoKey = newKey;
        // The photo is the biggest single write this app makes — check right
        // after it whether we're now close to the quota, so the user finds
        // out before the NEXT photo write is the one that fails.
        storageInfo().catch(() => {});
      } catch (e) {
        // Write failed (quota, private mode, …): keep whatever photo was
        // already attached rather than pointing the catch at a blob that was
        // never written. The catch itself must still be savable.
        photoKey = f.photoKey;
        photoFailure = isQuotaError(e)
          ? "Espace de stockage saturé : la prise sera enregistrée, mais pas la nouvelle photo. Libérez de la place ou exportez une sauvegarde (« Stockage & données »), puis réessayez d'ajouter la photo."
          : "La prise sera enregistrée, mais la nouvelle photo n'a pas pu être sauvegardée sur cet appareil.";
      }
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
      // Conditions snapshot: only attached to a brand-new catch, from whatever
      // Accueil/Briefing last cached (see lib/conditionsCache) — never fresher
      // than ~3h, and never added retroactively when editing an older entry.
      conditions: initial ? initial.conditions : getFreshConditions() ?? undefined,
    };

    if (photoFailure) {
      pendingEntryRef.current = entry;
      setPhotoError(photoFailure);
      setSaving(false);
      return;
    }
    onSave(entry);
  };

  // The user has read why the photo is missing — now actually save the catch.
  const confirmSaveWithoutPhoto = () => {
    if (pendingEntryRef.current) onSave(pendingEntryRef.current);
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
            aria-pressed={f.spid === s.id}
            onClick={() => up({ spid: s.id })}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Size + weight */}
      <div className="ce-row">
        <div className="field">
          <label htmlFor={`${fid}-taille`}>Taille (cm)</label>
          <input id={`${fid}-taille`} value={f.taille} onChange={(e) => up({ taille: e.target.value })} inputMode="numeric" placeholder="52" />
        </div>
        <div className="field">
          <label htmlFor={`${fid}-poids`}>Poids (kg)</label>
          <input id={`${fid}-poids`} value={f.poids} onChange={(e) => up({ poids: e.target.value })} inputMode="decimal" placeholder="1,8" />
        </div>
      </div>

      {/* Date + time */}
      <div className="ce-row">
        <div className="field">
          <label htmlFor={`${fid}-date`}>Date</label>
          <input id={`${fid}-date`} type="date" value={f.date} onChange={(e) => up({ date: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${fid}-heure`}>Heure</label>
          <input id={`${fid}-heure`} type="time" value={f.heure} onChange={(e) => up({ heure: e.target.value })} />
        </div>
      </div>

      {/* Place + spot + GPS */}
      <div className="field">
        <label htmlFor={`${fid}-lieu`}>Lieu</label>
        <input id={`${fid}-lieu`} value={f.place} onChange={(e) => up({ place: e.target.value })} placeholder="Loire, Blois" />
      </div>
      <div className="ce-row">
        {spots.length > 0 && (
          <div className="field">
            <label htmlFor={`${fid}-spot`}>Spot lié</label>
            <select id={`${fid}-spot`} value={f.spotId} onChange={(e) => up({ spotId: e.target.value })}>
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
          {/* Pas un <label> : la commande en dessous est un bouton, et un
              <label> ne s'associe qu'à un champ de saisie. Le texte reste
              affiché à l'identique et le bouton le cite par aria-labelledby,
              donc l'intitulé est bien annoncé — mais rien ne fait croire à
              une association qui n'existerait pas. */}
          <span className="field-lbl" id={`${fid}-gps-lbl`}>
            Position GPS
          </span>
          <button className="ce-gps" onClick={useGps} aria-labelledby={`${fid}-gps-lbl ${fid}-gps-btn`} id={`${fid}-gps-btn`}>
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
                aria-pressed={f.gearIds.includes(g.id)}
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
          <label htmlFor={`${fid}-appat`}>Appât / leurre</label>
          <input id={`${fid}-appat`} value={f.bait} onChange={(e) => up({ bait: e.target.value })} placeholder="Leurre souple 10 cm" />
        </div>
        <div className="field">
          <label htmlFor={`${fid}-technique`}>Technique</label>
          <input id={`${fid}-technique`} value={f.technique} onChange={(e) => up({ technique: e.target.value })} placeholder="Linéaire au fond" />
        </div>
      </div>

      {/* Kept / released */}
      <div className="ce-kept">
        <button
          className={f.kept ? "on-kept" : ""}
          aria-pressed={f.kept}
          onClick={() => up({ kept: true })}
        >
          Gardé
        </button>
        <button
          className={!f.kept ? "on-rel" : ""}
          aria-pressed={!f.kept}
          onClick={() => up({ kept: false })}
        >
          Relâché
        </button>
      </div>

      {/* Note */}
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor={`${fid}-note`}>Note</label>
        <textarea id={`${fid}-note`} value={f.note} onChange={(e) => up({ note: e.target.value })} rows={2} placeholder="Conditions, souvenir, détail…" />
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

      {!photoError && showBackupReminder && (
        <div className="stg-note" style={{ marginTop: 12 }}>
          💾 Cela fait un moment que le carnet n'a pas été sauvegardé — pensez à exporter une copie
          depuis « Stockage & données ».
        </div>
      )}

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
