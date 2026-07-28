import { useStore } from "../store-hooks";
import { TECHNIQUES, SAFETY } from "../data/techniques";
import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { hasMedia } from "../components/media-helpers";

const CAT: { id: string; label: string }[] = [
  { id: "abattage", label: "Abattage" },
  { id: "preparation", label: "Préparation" },
  { id: "conservation", label: "Conservation" },
  { id: "cuisson", label: "Cuisson" },
];

export function Techniques() {
  const { nav, back } = useStore();
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <div className="topbar-title">Techniques & gestes</div>
          <div className="h-sub">Abattage, préparation, conservation — sourcés</div>
        </div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        {CAT.map((c) => {
          const items = TECHNIQUES.filter((t) => t.category === c.id);
          if (!items.length) return null;
          return (
            <div key={c.id}>
              <div className="label" style={{ margin: "14px 0 8px" }}>
                {c.label}
              </div>
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tile"
                  onClick={() => nav("technique", { techId: t.id })}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                      {t.steps.length} étape(s)
                    </div>
                  </div>
                  <span style={{ color: "#C9C3B4" }}>›</span>
                </button>
              ))}
            </div>
          );
        })}

        <div className="label" style={{ margin: "20px 0 8px" }}>
          Sécurité sanitaire
        </div>
        <div className="safety-card">
          <p>
            <b>Parasites.</b> {SAFETY.parasites}
          </p>
          <p>
            <b>Congélation assainissante.</b> {SAFETY.congelation}
          </p>
          <p>
            <b>Mucus.</b> {SAFETY.mucus}
          </p>
          <div className="source">Source : {SAFETY.source}</div>
        </div>
      </div>
    </div>
  );
}

export function TechniqueDetail() {
  const { state, nav, back } = useStore();
  const t = TECHNIQUES.find((x) => x.id === state.techId);
  if (!t) return null;

  // Dérivé au rendu, jamais stocké en double (même règle que « Utilisé avec »
  // côté fils dans GuideMateriel) : les recettes qui citent cette technique.
  const usedByRecipes = RECIPES.filter((r) => r.techniques?.includes(t.id));

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">{t.name}</div>
      </div>
      {hasMedia("technique", t.id) && (
        <div className="tech-photo">
          <Media kind="technique" id={t.id} placeholder={t.name} />
        </div>
      )}
      <div style={{ padding: "8px 18px 26px" }}>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--body)" }}>{t.summary}</p>

        {t.tools && t.tools.length > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
            <b>Matériel :</b> {t.tools.join(" · ")}
          </div>
        )}

        <div className="label" style={{ margin: "18px 0 4px" }}>
          Protocole
        </div>
        {t.steps.map((s, i) => (
          <div key={i} className="tech-step">
            <div className="num">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div className="th">{s.title}</div>
              <div className="td">{s.detail}</div>
              <div className="tmeta">
                {s.tool && <span>🛠 {s.tool}</span>}
                {s.goal && <span className="goal">→ {s.goal}</span>}
              </div>
            </div>
          </div>
        ))}

        {t.speciesNote && t.speciesNote.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 6px" }}>
              Selon l'espèce
            </div>
            {t.speciesNote.map(([id, note]) => {
              const sp = SPECIES.find((s) => s.id === id);
              return (
                <div key={id} className="kv">
                  <span className="k">
                    {sp ? (
                      <button className="link-inline" onClick={() => nav("fiche", { spId: id })}>
                        {sp.name}
                      </button>
                    ) : (
                      id
                    )}
                  </span>
                  <span className="v">{note}</span>
                </div>
              );
            })}
          </>
        )}

        {usedByRecipes.length > 0 && (
          <>
            <div className="label" style={{ margin: "18px 0 8px" }}>
              Recettes qui l'emploient
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {usedByRecipes.map((r) => (
                <span
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="chip chip-sm"
                  onClick={() => nav("recette", { recipeId: r.id })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    e.stopPropagation();
                    nav("recette", { recipeId: r.id });
                  }}
                >
                  {r.title}
                </span>
              ))}
            </div>
          </>
        )}

        {t.safety && (
          <div className="alert" style={{ marginTop: 16 }}>
            <Icon d={ICONS.alert} size={18} stroke="#B33A2E" width={1.7} style={{ marginTop: 1 }} />
            <div className="txt">
              <b>Sécurité</b> — {t.safety}
            </div>
          </div>
        )}

        {t.source && <div className="source" style={{ marginTop: 14 }}>Source : {t.source}</div>}
      </div>
    </div>
  );
}
