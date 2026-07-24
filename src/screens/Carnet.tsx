import { useEffect, useState } from "react";
import { useStore, type CarnetSeg } from "../store";
import { SPECIES } from "../data/species";
import { Media } from "../components/Media";
import { ProfileHeader } from "../components/ProfileHeader";
import { CatchEditor } from "../components/CatchEditor";
import { usePhotoUrl } from "../lib/photos";
import { uid } from "../lib/helpers";
import { tallyTotal, fmtElapsed } from "../lib/ecrevisses";
import { crayfishById } from "../data/ecrevisses";
import type { Catch, CrayfishSession } from "../types";

const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));
type Sort = "recent" | "size" | "species";

export function Carnet() {
  const { state, set, nav, addCatchFull, removeCrayfishSession } = useStore();
  const catches = state.catches;
  const spots = state.spots;
  const sessions = [...state.crayfish].sort((a, b) => b.debut - a.debut);

  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  // The segment lives in the store: closing a bilan lands here on « Écrevisses ».
  const seg = state.carnetSeg;
  const setSeg = (v: CarnetSeg) => set({ carnetSeg: v });

  const added = catches.find((c) => c.slot === state.justAdded);
  const total = catches.length;
  const speciesCount = new Set(catches.map((c) => c.spid)).size;
  const record = catches.reduce((m, c) => (c.n > m ? c.n : m), 0);

  useEffect(() => {
    if (!state.justAdded) return;
    const t = setTimeout(() => set({ justAdded: null }), 4000);
    return () => clearTimeout(t);
  }, [state.justAdded, set]);

  const openSpotOnMap = (id: string) =>
    set({ focusSpot: id, screen: "carte", tab: "carte", stack: [] });

  const sorted = [...catches].sort((a, b) => {
    if (sort === "size") return b.n - a.n;
    if (sort === "species") return a.sp.localeCompare(b.sp);
    // recent: by day, then by capture time so same-day catches keep real order
    return b.iso.localeCompare(a.iso) || (b.time || "").localeCompare(a.time || "");
  });

  if (adding) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={() => setAdding(false)} aria-label="Retour">
            ‹
          </button>
          <div className="topbar-title">Nouvelle prise</div>
        </div>
        <div className="pad">
          <CatchEditor
            onSave={(entry) => {
              addCatchFull({ ...entry, slot: entry.slot || uid("u") });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="pad">
        <ProfileHeader />

        {added && (
          <div className="added-banner">
            ✓ {added.kept ? "Prise gardée" : "Prise relâchée"} ajoutée : {added.sp}
            {added.n ? ` · ${added.size}` : ""}
          </div>
        )}

        {/* Stat row */}
        <div className="pf-stats">
          <div className="pf-stat">
            <div className="n">{total}</div>
            <div className="l">Prises</div>
          </div>
          <div className="pf-stat">
            <div className="n">{speciesCount}</div>
            <div className="l">Espèces</div>
          </div>
          <div className="pf-stat">
            <div className="n">{record ? record : "—"}</div>
            <div className="l">Record (cm)</div>
          </div>
        </div>

        {/* v2 segmented control: Prises · Spots · Statistiques */}
        <div className="pf-seg">
          <button className={seg === "prises" ? "on" : ""} onClick={() => setSeg("prises")}>
            Prises
          </button>
          <button className={seg === "spots" ? "on" : ""} onClick={() => setSeg("spots")}>
            Spots · {spots.length}
          </button>
          <button className={seg === "ecrevisses" ? "on" : ""} onClick={() => setSeg("ecrevisses")}>
            Écrevisses · {sessions.length}
          </button>
          <button onClick={() => nav("statistiques")}>Statistiques ›</button>
        </div>

        {seg === "prises" && (
          <>
            <div className="pf-catches-head">
              <div className="h2">Mes prises</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {total > 0 && (
                  <select className="pf-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier">
                    <option value="recent">Récent</option>
                    <option value="size">Taille</option>
                    <option value="species">Espèce</option>
                  </select>
                )}
                <button className="pill-btn" onClick={() => setAdding(true)}>
                  + Capture
                </button>
              </div>
            </div>

            {state.hydrated && total === 0 && (
              <div className="empty-note">
                Aucune prise enregistrée. Ajoutez-en une avec « + Capture » ou à la fin du parcours « Ma prise ».
              </div>
            )}

            {total > 0 && (
              <div className="pf-grid">
                {sorted.map((c) => (
                  <CatchTile key={c.slot} c={c} onOpen={() => nav("prise-detail", { catchSlot: c.slot })} />
                ))}
              </div>
            )}
          </>
        )}

        {seg === "spots" && (
          <div className="spots-section" style={{ marginTop: 14, borderTop: "none", paddingTop: 0 }}>
            {spots.length === 0 && (
              <div className="empty-note">
                Aucun spot. Ajoutez-en un depuis la carte (bouton « Ajouter un spot »).
              </div>
            )}
            {spots.map((sp) => {
              const names = sp.species.map((id) => SP_NAME.get(id)).filter(Boolean).join(", ");
              const sub = [names, sp.technique].filter(Boolean).join(" · ");
              return (
                <button key={sp.id} className="spot-row" onClick={() => openSpotOnMap(sp.id)}>
                  <span className="pin">📍</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">{sp.name}</div>
                    <div className="sub">{sub || "Aucune info — touchez pour voir sur la carte"}</div>
                  </div>
                  <span className="go">›</span>
                </button>
              );
            })}
          </div>
        )}

        {seg === "ecrevisses" && (
          <div style={{ marginTop: 14 }}>
            <button className="pill-btn" onClick={() => nav("ecrevisses")}>
              + Séance
            </button>
            {state.hydrated && sessions.length === 0 && (
              <div className="empty-note">
                Aucune séance. Démarrez-en une avec « + Séance » : balances chronométrées, alertes,
                bilan par espèce.
              </div>
            )}
            {sessions.map((s) => (
              <SessionRow key={s.id} s={s} onDelete={() => removeCrayfishSession(s.id)} />
            ))}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: "#A8A495", marginTop: 16, lineHeight: 1.5 }}>
          100 % local sur votre appareil. Aucune donnée n'est transmise.
        </div>
      </div>
    </div>
  );
}

function CatchTile({ c, onOpen }: { c: Catch; onOpen: () => void }) {
  const url = usePhotoUrl(c.photo);
  return (
    <button className="ct" onClick={onOpen}>
      <div className="ct-img">
        {url ? <img src={url} alt={c.sp} /> : <Media kind="species" id={c.spid} placeholder={c.sp} />}
        {!c.kept && <span className="ct-rel">Relâché</span>}
      </div>
      <div className="ct-cap">
        <b>{c.sp}</b> · {c.size}
      </div>
    </button>
  );
}

function SessionRow({ s, onDelete }: { s: CrayfishSession; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [arm, setArm] = useState(false);
  const total = tallyTotal(s.tally);
  // Durée écoulée, pas un compte à rebours : « 3 h 24 », jamais « 3:24:07 ».
  const duree = s.fin ? fmtElapsed((s.fin - s.debut) / 1000) : null;

  return (
    <div className="ecr-row">
      <button
        className="ecr-row-head"
        onClick={() => {
          setOpen((o) => !o);
          setArm(false);
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">
            {s.lieu} · {s.date}
          </div>
          <div className="sub">
            {s.balances.length} balance{s.balances.length > 1 ? "s" : ""}
            {duree ? ` · ${duree}` : " · en cours"}
            {total > 0 ? ` · ${total} écrevisse${total > 1 ? "s" : ""}` : ""}
          </div>
        </div>
        <span className="go">{open ? "⌄" : "›"}</span>
      </button>

      {open && (
        <div className="ecr-row-body">
          {s.tally.length === 0 && <div className="sub">Aucune capture enregistrée.</div>}
          {s.tally.map((t) => (
            <div key={t.spId} className="sub">
              {crayfishById(t.spId)?.name ?? t.spId} — <b>{t.count}</b>
            </div>
          ))}
          {s.note && <div className="ecr-row-note">{s.note}</div>}
          {arm ? (
            <button className="btn-danger" onClick={onDelete}>
              Confirmer la suppression
            </button>
          ) : (
            <button className="btn-danger-ghost" onClick={() => setArm(true)}>
              Supprimer cette séance
            </button>
          )}
        </div>
      )}
    </div>
  );
}
