import { useRef, useState } from "react";
import { useStore } from "../store";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";

export function ProfileHeader() {
  const { state, setProfile } = useStore();
  const p = state.profile;
  const avatar = usePhotoUrl(p.avatar);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p);

  const openEdit = () => {
    setDraft(state.profile);
    setEditing(true);
  };
  const save = () => {
    setProfile({ name: draft.name.trim(), bio: draft.bio.trim(), region: draft.region.trim() });
    setEditing(false);
  };
  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await downscaleImage(file, 512);
    // Versioned key so the new avatar shows immediately (usePhotoUrl re-fetches)
    // and the old blob is removed.
    const key = `profile-avatar:${Date.now()}`;
    await savePhoto(key, blob);
    if (p.avatar && p.avatar !== key) await deletePhoto(p.avatar);
    setProfile({ avatar: key });
  };

  if (editing) {
    return (
      <div className="ph-edit">
        <div className="field">
          <label>Nom / pseudo</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Votre nom" />
        </div>
        <div className="field">
          <label>Bio</label>
          <input value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Une phrase sur vous" />
        </div>
        <div className="field">
          <label>Région</label>
          <input value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} placeholder="Loir-et-Cher" />
        </div>
        <div className="ce-actions">
          <button className="btn-light" onClick={() => setEditing(false)}>
            Annuler
          </button>
          <button className="save-btn" style={{ marginTop: 0, flex: 1.2 }} onClick={save}>
            Enregistrer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ph">
      <button className="ph-avatar" onClick={() => fileRef.current?.click()} aria-label="Changer l'avatar">
        {avatar ? <img src={avatar} alt="" /> : <span>🎣</span>}
        <span className="ph-avatar-edit">📷</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
      <div className="ph-info">
        <div className="ph-name">{p.name || "Mon carnet"}</div>
        {p.bio && <div className="ph-bio">{p.bio}</div>}
        {p.region && <div className="ph-region">📍 {p.region}</div>}
      </div>
      <button className="ph-edit-btn" onClick={openEdit} aria-label="Modifier le profil">
        ✎
      </button>
    </div>
  );
}
