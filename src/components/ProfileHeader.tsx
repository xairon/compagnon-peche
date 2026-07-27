import { useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";
import { isQuotaError } from "../lib/storage";
import { fishingCardStatus, daysUntilCardExpiry } from "../lib/carte-peche";

const CARTE_PECHE_URL = "https://www.cartedepeche.fr/";

export function ProfileHeader() {
  const { state, setProfile } = useStore();
  const p = state.profile;
  const avatar = usePhotoUrl(p.avatar);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const cardYears = [currentYear - 1, currentYear, currentYear + 1];
  const cardStatus = fishingCardStatus(p.carteAnnee, now);
  const cardDaysLeft = p.carteAnnee ? daysUntilCardExpiry(p.carteAnnee, now) : null;

  const openEdit = () => {
    setDraft(state.profile);
    setEditing(true);
  };
  const save = () => {
    setProfile({
      name: draft.name.trim(),
      bio: draft.bio.trim(),
      region: draft.region.trim(),
      aappma: draft.aappma?.trim() || undefined,
      carteAnnee: draft.carteAnnee,
    });
    setEditing(false);
  };
  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    const blob = await downscaleImage(file, 512);
    // Versioned key so the new avatar shows immediately (usePhotoUrl re-fetches)
    // and the old blob is removed.
    const key = `profile-avatar:${Date.now()}`;
    try {
      await savePhoto(key, blob);
    } catch (err) {
      // Keep the previous avatar — never point the profile at a blob that
      // was never actually written.
      setAvatarError(
        isQuotaError(err)
          ? "Espace de stockage saturé : l'avatar n'a pas pu être enregistré. Libérez de la place ou exportez une sauvegarde."
          : "L'avatar n'a pas pu être enregistré sur cet appareil.",
      );
      return;
    }
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
        <div className="field">
          <label>AAPPMA (association de pêche)</label>
          <input
            value={draft.aappma ?? ""}
            onChange={(e) => setDraft({ ...draft, aappma: e.target.value })}
            placeholder="AAPPMA de…"
          />
        </div>
        <div className="field">
          <label>Carte de pêche — année de validité</label>
          <select
            value={draft.carteAnnee ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, carteAnnee: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">Non renseignée</option>
            {cardYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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
    <div>
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
          {(p.aappma || p.carteAnnee) && (
            <div className="ph-card">
              🎣 {[p.aappma, p.carteAnnee ? `Carte ${p.carteAnnee}` : null].filter(Boolean).join(" · ")}
            </div>
          )}
          {avatarError && (
            <div className="stg-note" style={{ color: "var(--red)" }} role="alert">
              {avatarError}
            </div>
          )}
        </div>
        <button className="ph-edit-btn" onClick={openEdit} aria-label="Modifier le profil">
          ✎
        </button>
      </div>

      {/* Carte de pêche : discret quand tout va bien, net quand elle expire ou est périmée. */}
      {cardStatus === "perimee" && (
        <div className="ph-card-alert ph-card-danger" role="alert">
          <b>Carte de pêche {p.carteAnnee} périmée</b> depuis le 1ᵉʳ janvier — pêcher sans carte valide
          expose à une amende pouvant aller jusqu'à 450 € (contravention de 4ᵉ classe, art. L436-16 du code de
          l'environnement).{" "}
          <a href={CARTE_PECHE_URL} target="_blank" rel="noopener noreferrer">
            Renouveler sur cartedepeche.fr ↗
          </a>
        </div>
      )}
      {cardStatus === "expire-bientot" && (
        <div className="ph-card-alert ph-card-warn">
          Carte de pêche {p.carteAnnee} : expire {cardDaysLeft === 0 ? "aujourd'hui" : `dans ${cardDaysLeft} j`}{" "}
          (31 décembre) —{" "}
          <a href={CARTE_PECHE_URL} target="_blank" rel="noopener noreferrer">
            la renouveler sur cartedepeche.fr ↗
          </a>
        </div>
      )}
      {cardStatus === "absente" && (
        <div className="ph-card-nudge">
          Carte de pêche obligatoire dès 12 ans.{" "}
          <a href={CARTE_PECHE_URL} target="_blank" rel="noopener noreferrer">
            L'acheter ou la renouveler sur cartedepeche.fr ↗
          </a>
        </div>
      )}
    </div>
  );
}
