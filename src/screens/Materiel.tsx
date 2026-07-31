import { useEffect, useState } from "react";
import { get, set as idbSet } from "idb-keyval";
import { useStore } from "../store-hooks";
import { uid } from "../lib/helpers";
import { STORES } from "../lib/stores";
import { GEAR_CATEGORIES, CAT_LABEL, GEAR_GUIDE, type GearCategory } from "../data/gear";
import { GEAR_CARDS } from "../data/gear-cards";
import { Media } from "../components/Media";
import { SPECIES } from "../data/species";
import type { GearItem } from "../types";

interface Bundle {
  id: string;
  name: string;
  target: string;
  itemIds: string[];
  note: string;
}

export function Materiel() {
  // Gear is the single source of truth in the store (shared with the catch form).
  const { nav, back, state, setGear } = useStore();
  const gear = state.gear;
  const [tab, setTab] = useState<"gear" | "bundles">("gear");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [ready, setReady] = useState(false);

  const [gForm, setGForm] = useState<{ cat: GearCategory; name: string; detail: string } | null>(
    null,
  );
  const [bForm, setBForm] = useState<{ name: string; target: string; itemIds: string[] } | null>(
    null,
  );

  useEffect(() => {
    get(STORES.bundles)
      .then((b) => setBundles((b as Bundle[]) || []))
      .catch(() => {
        /* IndexedDB unavailable (private mode, quota) — start empty */
      })
      .finally(() => setReady(true));
  }, []);

  const saveGear = (next: GearItem[]) => setGear(next); // store action persists
  const saveBundles = (next: Bundle[]) => {
    setBundles(next);
    idbSet(STORES.bundles, next);
  };

  const addGear = () => {
    if (!gForm || !gForm.name.trim()) return;
    saveGear([{ id: uid("g"), ...gForm, name: gForm.name.trim() }, ...gear]);
    setGForm(null);
  };
  const addBundle = () => {
    if (!bForm || !bForm.name.trim()) return;
    saveBundles([
      { id: uid("b"), name: bForm.name.trim(), target: bForm.target, itemIds: bForm.itemIds, note: "" },
      ...bundles,
    ]);
    setBForm(null);
  };

  return (
    <div className="screen">
      <div className="pad" style={{ paddingBottom: 10 }}>
        <button
          className="back"
          onClick={back}
          aria-label="Retour"
          style={{ marginBottom: 8 }}
        >
          ‹
        </button>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div className="h1">Matériel</div>
            <div className="h-sub">Votre équipement et vos ensembles montés</div>
          </div>
          <button className="pill-btn" onClick={() => nav("guide-materiel")}>
            Guide
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {(["gear", "bundles"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 600,
                border: `1.5px solid ${tab === t ? "#16281E" : "#E6E2D8"}`,
                background: tab === t ? "#16281E" : "#fff",
                color: tab === t ? "#FBFAF7" : "#3A3E36",
              }}
            >
              {t === "gear" ? `Mon matériel (${gear.length})` : `Mes ensembles (${bundles.length})`}
            </button>
          ))}
        </div>
      </div>

      {!ready ? null : tab === "gear" ? (
        <div style={{ padding: "0 18px 24px" }}>
          {!gForm ? (
            <button className="add-row" onClick={() => setGForm({ cat: "leurre", name: "", detail: "" })}>
              + Ajouter du matériel
            </button>
          ) : (
            <div className="form-card">
              <div className="label" style={{ marginBottom: 7 }}>
                Catégorie
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {GEAR_CATEGORIES.map((c) => {
                  const on = gForm.cat === c.id;
                  return (
                    <button
                      key={c.id}
                      className="chip chip-sm"
                      style={{
                        border: `1px solid ${on ? "#1D6E42" : "#E6E2D8"}`,
                        background: on ? "#E9F2EC" : "#fff",
                        color: on ? "#1D6E42" : "#3A3E36",
                      }}
                      onClick={() => setGForm({ ...gForm, cat: c.id })}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Nom</label>
                <input
                  autoFocus
                  value={gForm.name}
                  onChange={(e) => setGForm({ ...gForm, name: e.target.value })}
                  placeholder="Ex : Canne spinning 2-10 g"
                />
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <label>Détail (optionnel)</label>
                <input
                  value={gForm.detail}
                  onChange={(e) => setGForm({ ...gForm, detail: e.target.value })}
                  placeholder="Longueur, marque, taille…"
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn-ghost" onClick={() => setGForm(null)}>
                  Annuler
                </button>
                <button className="btn-primary" onClick={addGear}>
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {GEAR_CATEGORIES.filter((c) => gear.some((g) => g.cat === c.id)).map((c) => (
            <div key={c.id} style={{ marginTop: 16 }}>
              <div className="label" style={{ marginBottom: 6 }}>
                {c.label}
              </div>
              {gear
                .filter((g) => g.cat === c.id)
                .map((g) => (
                  <div key={g.id} className="gear-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="gr-name">{g.name}</div>
                      {g.detail && <div className="gr-detail">{g.detail}</div>}
                    </div>
                    <button
                      className="gr-del"
                      onClick={() => saveGear(gear.filter((x) => x.id !== g.id))}
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          ))}

          {gear.length === 0 && !gForm && (
            <div className="empty-note">
              Répertoriez vos cannes, moulinets, leurres, appâts… pour tout retrouver au bord de
              l'eau. 100 % local sur votre appareil.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "0 18px 24px" }}>
          {!bForm ? (
            <button
              className="add-row"
              onClick={() => setBForm({ name: "", target: "", itemIds: [] })}
              disabled={gear.length === 0}
              style={{ opacity: gear.length === 0 ? 0.5 : 1 }}
            >
              + Créer un ensemble
            </button>
          ) : (
            <div className="form-card">
              <div className="field">
                <label>Nom de l'ensemble</label>
                <input
                  autoFocus
                  value={bForm.name}
                  onChange={(e) => setBForm({ ...bForm, name: e.target.value })}
                  placeholder="Ex : Ensemble sandre drop shot"
                />
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <label>Pour quelle pêche (optionnel)</label>
                <input
                  value={bForm.target}
                  onChange={(e) => setBForm({ ...bForm, target: e.target.value })}
                  placeholder="Espèce, technique, spot…"
                />
              </div>
              <div className="label" style={{ margin: "14px 0 7px" }}>
                Matériel de l'ensemble
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {gear.map((g) => {
                  const on = bForm.itemIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      className="pick-row"
                      onClick={() =>
                        setBForm({
                          ...bForm,
                          itemIds: on
                            ? bForm.itemIds.filter((i) => i !== g.id)
                            : [...bForm.itemIds, g.id],
                        })
                      }
                    >
                      <span className={"pick-box" + (on ? " on" : "")}>{on ? "✓" : ""}</span>
                      <span style={{ flex: 1 }}>{g.name}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{CAT_LABEL[g.cat]}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn-ghost" onClick={() => setBForm(null)}>
                  Annuler
                </button>
                <button className="btn-primary" onClick={addBundle}>
                  Créer
                </button>
              </div>
            </div>
          )}

          {bundles.map((b) => (
            <div key={b.id} className="bundle-card">
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="bundle-name">{b.name}</div>
                  {b.target && <div className="bundle-target">{b.target}</div>}
                </div>
                <button
                  className="gr-del"
                  onClick={() => saveBundles(bundles.filter((x) => x.id !== b.id))}
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                {b.itemIds
                  .map((id) => gear.find((g) => g.id === id))
                  .filter(Boolean)
                  .map((g) => (
                    <div key={g!.id} className="bundle-item">
                      <span style={{ color: "#1D6E42" }}>—</span> {g!.name}
                      <span style={{ color: "var(--muted)", fontSize: 12 }}> · {CAT_LABEL[g!.cat]}</span>
                    </div>
                  ))}
                {b.itemIds.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>Aucun matériel associé.</div>
                )}
              </div>
            </div>
          ))}

          {bundles.length === 0 && !bForm && (
            <div className="empty-note">
              Créez des « ensembles » : regroupez canne + moulinet + ligne + leurres pour une pêche
              donnée (ex. « sandre aux leurres souples »), et retrouvez-les d'un coup d'œil.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GuideMateriel() {
  const { back, state, set, nav } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const sections: { key: "leurre" | "appat" | "fil"; title: string }[] = [
    { key: "leurre", title: "Leurres" },
    { key: "appat", title: "Appâts naturels" },
    { key: "fil", title: "Fils & lignes" },
  ];

  const speciesName = (id: string) => SPECIES.find((s) => s.id === id)?.name ?? id;

  const focusCard = (id: string) => {
    setOpen(id);
    document.getElementById(`gear-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Deep-link depuis une fiche espèce (ou une autre carte gear) : consomme
  // gearFocusId une seule fois au montage. Le setState synchrone dans
  // focusCard() est volontaire ici (pas le cas à éviter que la règle
  // set-state-in-effect cible d'habitude) : GuideMateriel démonte/remonte à
  // chaque navigation (contrairement à la Carte, montée en continu, dont le
  // focusSpot se déclenche via un tableau de dépendances sur mapReady) —
  // un effet à dépendances vides qui ne s'exécute qu'au montage est donc le
  // bon outil, pas un contournement.
  useEffect(() => {
    if (state.gearFocusId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      focusCard(state.gearFocusId);
      set({ gearFocusId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Guide — appâts, hameçons & leurres</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        {sections.map(({ key, title }) => (
          <div key={key} style={{ marginTop: 14 }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>
              {title}
            </div>
            <div className="gear-card-grid">
              {GEAR_CARDS[key].map((c) => {
                const expanded = open === c.id;
                // "Utilisé avec" n'existe que pour les fils : les leurres dont
                // filIds cite cet id, calculé ici plutôt que stocké (jamais de
                // duplication à l'envers — voir Global Constraints du plan).
                const usedBy = key === "fil" ? GEAR_CARDS.leurre.filter((l) => l.filIds?.includes(c.id)) : [];
                return (
                  <button
                    key={c.id}
                    id={`gear-${c.id}`}
                    type="button"
                    className={"gear-card" + (expanded ? " expanded" : "")}
                    onClick={() => setOpen(expanded ? null : c.id)}
                  >
                    <div className="gear-card-img">
                      <Media kind="gear" id={c.id} placeholder={c.name} />
                    </div>
                    <div className="gc-name">{c.name}</div>
                    <div className="gc-summary">{c.summary}</div>
                    {expanded && (
                      <div className="gc-usage">
                        <div>
                          <b>Usage :</b> {c.usage}
                        </div>
                        {c.hamecon && (
                          <div style={{ marginTop: 4 }}>
                            <b>Hameçon :</b> {c.hamecon}
                          </div>
                        )}
                        {c.species && c.species.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <b>Espèces :</b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                              {c.species.map((spId) => (
                                <span
                                  key={spId}
                                  role="button"
                                  tabIndex={0}
                                  className="chip chip-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nav("fiche", { spId });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key !== "Enter" && e.key !== " ") return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    nav("fiche", { spId });
                                  }}
                                >
                                  {speciesName(spId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {c.filIds && c.filIds.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <b>Fil recommandé :</b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                              {c.filIds.map((fId) => {
                                const f = GEAR_CARDS.fil.find((x) => x.id === fId);
                                return (
                                  <span
                                    key={fId}
                                    role="button"
                                    tabIndex={0}
                                    className="chip chip-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      focusCard(fId);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key !== "Enter" && e.key !== " ") return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      focusCard(fId);
                                    }}
                                  >
                                    {f?.name ?? fId}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {usedBy.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <b>Utilisé avec :</b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                              {usedBy.map((l) => (
                                <span
                                  key={l.id}
                                  role="button"
                                  tabIndex={0}
                                  className="chip chip-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    focusCard(l.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key !== "Enter" && e.key !== " ") return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    focusCard(l.id);
                                  }}
                                >
                                  {l.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 14 }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>
            Hameçons — tailles
          </div>
          {GEAR_GUIDE[0].intro && (
            <div style={{ fontSize: 13, color: "#5a5e52", margin: "4px 0 8px", lineHeight: 1.5 }}>
              {GEAR_GUIDE[0].intro}
            </div>
          )}
          {GEAR_GUIDE[0].entries.map((e) => (
            <div key={e.name} className="guide-row">
              <div className="g-name">{e.name}</div>
              <div className="g-detail">{e.detail}</div>
            </div>
          ))}
        </div>

        <div className="info" style={{ marginTop: 18 }}>
          Repères généraux pour débuter. Adaptez au poisson visé, à la saison et à la réglementation
          locale (certains appâts ou le vif peuvent être restreints).
        </div>
      </div>
    </div>
  );
}
