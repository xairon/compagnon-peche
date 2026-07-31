import { useStore } from "../store-hooks";
import { TECHNIQUES } from "../data/techniques";
import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { hasMedia } from "../components/media-helpers";

export function TechniqueDetail() {
  const { state, nav, back } = useStore();
  const t = TECHNIQUES.find((x) => x.id === state.techId);
  if (!t) return null;

  // Dérivé au rendu, jamais stocké en double (même règle que « Utilisé avec »
  // côté fils dans GuideMateriel) : les recettes qui citent cette technique.
  const usedByRecipes = RECIPES.filter((r) => r.techniques?.includes(t.id));

  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">{t.name}</h1>
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
    </main>
  );
}
