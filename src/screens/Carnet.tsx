import { useEffect, useState } from "react";
import type { CarnetSeg } from "../store";
import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { Media } from "../components/Media";
import { ProfileHeader } from "../components/ProfileHeader";
import { CatchEditor } from "../components/CatchEditor";
import { usePhotoUrl } from "../lib/photos";
import { uid, frDate } from "../lib/helpers";
import { tallyTotal, fmtElapsed } from "../lib/ecrevisses";
import { crayfishById } from "../data/ecrevisses";
import { upcomingSeasonReminders, type SeasonReminder } from "../lib/season-reminders";
import type { Catch, CrayfishSession } from "../types";
import { CarnetRecettes } from "../components/CarnetRecettes";

const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));
type Sort = "recent" | "size" | "species";

export function Carnet() {
  const { state, set, nav, goTab, addCatchFull, removeCrayfishSession } = useStore();
  const catches = state.catches;
  const spots = state.spots;
  const sessions = [...state.crayfish].sort((a, b) => b.debut - a.debut);

  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  // The segment lives in the store: closing a bilan lands here on « Écrevisses ».
  const seg = state.carnetSeg;
  const setSeg = (v: CarnetSeg) => set({ carnetSeg: v });

  const added = catches.find((c) => c.slot === state.justAdded);
  // No scheduled notifications (unreliable in a PWA, see lib/notify.ts) — the
  // reminder simply shows up whenever the carnet is opened.
  const seasonReminders = upcomingSeasonReminders(new Date());
  const total = catches.length;
  const speciesCount = new Set(catches.map((c) => c.spid)).size;
  const record = catches.reduce((m, c) => (c.n > m ? c.n : m), 0);

  useEffect(() => {
    if (!state.justAdded) return;
    const t = setTimeout(() => set({ justAdded: null }), 4000);
    return () => clearTimeout(t);
  }, [state.justAdded, set]);

  // Par `goTab` et non par un `set({ screen, tab, … })` en direct : c'est ce qui
  // met l'entrée dans l'historique du navigateur, sans quoi le geste retour
  // depuis la carte fermerait l'app au lieu de revenir au carnet.
  const openSpotOnMap = (id: string) => goTab("carte", { focusSpot: id });

  const sorted = [...catches].sort((a, b) => {
    if (sort === "size") return b.n - a.n;
    if (sort === "species") return a.sp.localeCompare(b.sp);
    // recent: by day, then by capture time so same-day catches keep real order
    return b.iso.localeCompare(a.iso) || (b.time || "").localeCompare(a.time || "");
  });

  if (adding) {
    return (
      <main className="screen">
        <div className="topbar">
          <button className="back" onClick={() => setAdding(false)} aria-label="Retour">
            ‹
          </button>
          <h1 className="topbar-title">Nouvelle prise</h1>
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
      </main>
    );
  }

  return (
    <main className="screen">
      <div className="pad">
        {/* Le carnet n'a pas de barre de titre : son en-tête est le profil, qui
            appartient à un autre lot. Le titre de l'écran existe donc pour la
            navigation par titres sans rien changer à la mise en page. */}
        <h1 className="sr-only">Mon carnet</h1>
        <ProfileHeader />

        {seasonReminders.length > 0 && (
          <div className="season-reminders">
            {seasonReminders.map((r) => (
              <SeasonReminderRow key={r.rule} r={r} />
            ))}
          </div>
        )}

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

        {/* v2 segmented control : 4 vues mutuellement exclusives. Statistiques navigue
            ailleurs (ce n'est pas une vue de ce carnet) — elle vit donc à côté, pas dedans,
            depuis que ce carnet est passé à 4 segments réels. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 16px" }}>
          <div className="pf-seg" style={{ margin: 0, flex: 1 }}>
            <button
              className={seg === "prises" ? "on" : ""}
              aria-pressed={seg === "prises"}
              onClick={() => setSeg("prises")}
            >
              Prises
            </button>
            <button
              className={seg === "spots" ? "on" : ""}
              aria-pressed={seg === "spots"}
              onClick={() => setSeg("spots")}
            >
              Spots · {spots.length}
            </button>
            <button
              className={seg === "ecrevisses" ? "on" : ""}
              aria-pressed={seg === "ecrevisses"}
              onClick={() => setSeg("ecrevisses")}
            >
              Écrevisses · {sessions.length}
            </button>
            <button
              className={seg === "recettes" ? "on" : ""}
              aria-pressed={seg === "recettes"}
              onClick={() => setSeg("recettes")}
            >
              Recettes
            </button>
          </div>
          <button
            className="link-inline lien-commande"
            style={{ flexShrink: 0 }}
            onClick={() => nav("statistiques")}
          >
            Stats ›
          </button>
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
              <SessionRow
                key={s.id}
                s={s}
                onDelete={() => removeCrayfishSession(s.id)}
                onCorriger={() => nav("ecrevisses", { bilanSession: s.id })}
              />
            ))}
          </div>
        )}

        {seg === "recettes" && <CarnetRecettes />}

        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 16, lineHeight: 1.5 }}>
          100 % local sur votre appareil. Aucune donnée n'est transmise.
        </div>
      </div>
    </main>
  );
}

function SeasonReminderRow({ r }: { r: SeasonReminder }) {
  const verbe = r.kind === "ouverture" ? "Ouverture" : "Fermeture";
  const delai = r.inDays === 0 ? "aujourd'hui" : `dans ${r.inDays} j`;
  return (
    <div className={`season-reminder-row ${r.kind === "fermeture" ? "closing" : "opening"}`}>
      🗓️ {verbe} {r.label} — {delai} ({frDate(r.date)})
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

function SessionRow({
  s,
  onDelete,
  onCorriger,
}: {
  s: CrayfishSession;
  onDelete: () => void;
  onCorriger: () => void;
}) {
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
          {/* Une séance terminée reste modifiable : un total oublié se rattrape. */}
          {s.fin !== null && (
            <button className="btn-light" onClick={onCorriger}>
              Corriger le bilan
            </button>
          )}
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
