import { useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { savePhoto, deletePhoto, downscaleImage, usePhotoUrl } from "../lib/photos";
import { isQuotaError } from "../lib/storage";
import {
  TYPES_ANNUELS,
  RECIPROCITES,
  type CarteDePeche,
  type TypeCarte,
  type Reciprocite,
} from "../lib/carte-peche";
import { carteDuProfil } from "../lib/carte-profil";
import { CartePeche } from "./CartePeche";

const TYPES: { v: TypeCarte; l: string }[] = [
  { v: "annuelle", l: "Annuelle (personne majeure)" },
  { v: "interfederale", l: "Interfédérale (EHGO + CHI + URNE)" },
  { v: "mineure", l: "Mineure (12-18 ans)" },
  { v: "decouverte", l: "Découverte" },
  { v: "hebdomadaire", l: "Hebdomadaire (7 jours)" },
  { v: "journaliere", l: "Journalière (1 jour)" },
];

const RECIP_LABEL: Record<Reciprocite, string> = {
  EHGO: "EHGO",
  CHI: "CHI",
  URNE: "URNE",
  interfederale: "Les trois (interfédérale)",
  aucune: "Aucune",
  inconnue: "Je ne sais pas",
};

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
  // Lit aussi les anciens profils, qui ne portent qu'une année nue.
  const carte = carteDuProfil(p);
  const carteDraft = carteDuProfil(draft);
  const majCarte = (patch: Partial<CarteDePeche>) =>
    setDraft({
      ...draft,
      carte: { type: "annuelle", ...carteDraft, ...patch },
      // L'ancien champ cesse d'être la vérité dès qu'une carte détaillée
      // existe ; le laisser derrière ferait diverger deux sources.
      carteAnnee: undefined,
    });
  const typeDraft = carteDraft?.type ?? "annuelle";

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
      carte: draft.carte,
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

  // Les deux branches occupent la même place dans l'arbre : sans clés distinctes,
  // React apparie leurs nœuds par position et recycle l'<input type="file"> de
  // l'avatar en champ « Nom / pseudo ». Un input fichier n'a pas de `value`, donc
  // ce champ naissait non contrôlé et le devenait dans la foulée — l'avertissement
  // « changing an uncontrolled input to be controlled ». Les clés forcent un
  // démontage franc : chaque champ du formulaire naît contrôlé.
  if (editing) {
    return (
      <div key="edit" className="ph-edit">
        <div className="field">
          <label htmlFor="ph-name">Nom / pseudo</label>
          <input id="ph-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Votre nom" />
        </div>
        <div className="field">
          <label htmlFor="ph-bio">Bio</label>
          <input id="ph-bio" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Une phrase sur vous" />
        </div>
        <div className="field">
          <label htmlFor="ph-region">Région</label>
          <input id="ph-region" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} placeholder="Loir-et-Cher" />
        </div>
        <div className="field">
          <label htmlFor="ph-aappma">AAPPMA (association de pêche)</label>
          <input
            id="ph-aappma"
            value={draft.aappma ?? ""}
            onChange={(e) => setDraft({ ...draft, aappma: e.target.value })}
            placeholder="AAPPMA de…"
          />
        </div>
        {/* Le type décide de la durée réelle : une journalière ne vaut pas
            jusqu'au 31 décembre. C'est la première question, pas la dernière. */}
        <div className="field">
          <label htmlFor="ph-carte-type">Carte de pêche — type</label>
          <select
            id="ph-carte-type"
            value={draft.carte || draft.carteAnnee ? typeDraft : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setDraft({ ...draft, carte: undefined, carteAnnee: undefined });
                return;
              }
              majCarte({ type: v as TypeCarte });
            }}
          >
            <option value="">Non renseignée</option>
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </select>
        </div>

        {(draft.carte || draft.carteAnnee) &&
          (TYPES_ANNUELS.includes(typeDraft) ? (
            <div className="field">
              <label htmlFor="ph-carte-annee">Année de validité</label>
              <select
                id="ph-carte-annee"
                value={carteDraft?.annee ?? ""}
                onChange={(e) =>
                  majCarte({ annee: e.target.value ? Number(e.target.value) : undefined })
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
          ) : (
            <div className="field">
              <label htmlFor="ph-carte-debut">Premier jour de validité</label>
              <input
                id="ph-carte-debut"
                type="date"
                value={carteDraft?.debut ?? ""}
                onChange={(e) => majCarte({ debut: e.target.value || undefined })}
              />
            </div>
          ))}

        {(draft.carte || draft.carteAnnee) && (
          <div className="field">
            <label htmlFor="ph-carte-recip">Réciprocité (sur votre carte)</label>
            <select
              id="ph-carte-recip"
              value={carteDraft?.reciprocite ?? ""}
              onChange={(e) =>
                majCarte({ reciprocite: (e.target.value || undefined) as Reciprocite | undefined })
              }
            >
              <option value="">Non renseignée</option>
              {RECIPROCITES.map((r) => (
                <option key={r} value={r}>
                  {RECIP_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        )}
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
    <div key="view">
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

      {/* Carte de pêche : discret quand tout va bien, net quand elle expire ou
          est périmée. La durée dépend du type — c'est CartePeche qui la calcule,
          et qui sait qu'une journalière ne court pas jusqu'au 31 décembre. */}
      <CartePeche carte={carte} now={now} />
    </div>
  );
}
