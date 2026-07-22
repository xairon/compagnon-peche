import { useStore } from "../store";
import { Icon, ICONS } from "../components/Icon";
import { Media, hasMedia } from "../components/Media";
import { findRecipe } from "../lib/recipes";
import { TECHNIQUES } from "../data/techniques";
import { enterCuisine } from "../lib/wakelock";
import { Glossed } from "../components/Glossed";

const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"];

export function Recette() {
  const { state, nav, back } = useStore();
  const found = findRecipe(state.recipeId);
  if (!found) return null;
  const { recipe: rec, speciesName } = found;

  const techs = (rec.techniques || [])
    .map((id) => TECHNIQUES.find((t) => t.id === id))
    .filter(Boolean);

  return (
    <div className="screen" style={{ display: "block" }}>
      <div className="recipe-hero recipe-hero-v2">
        {hasMedia("recipe", rec.id) ? (
          <Media kind="recipe" id={rec.id} placeholder={rec.title} />
        ) : (
          <Media kind="species" id={rec.species[0]} placeholder={rec.title} />
        )}
        <div className="recipe-hero-grad" />
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="recipe-hero-cap">
          <div className="recipe-hero-kicker">{rec.origin}</div>
          <div className="recipe-hero-title">{rec.title}</div>
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{speciesName}</div>

        {/* v2 stat cards — real values only (difficulté / prépa / cuisson) */}
        <div className="recipe-stats">
          <div className="recipe-stat">
            <div className="k">Difficulté</div>
            <div className="v">{DIFF_LABEL[rec.difficulty]}</div>
          </div>
          <div className="recipe-stat">
            <div className="k">Préparation</div>
            <div className="v">{rec.prep} min</div>
          </div>
          <div className="recipe-stat">
            <div className="k">{rec.rest ? "Repos" : "Cuisson"}</div>
            <div className="v">
              {rec.rest
                ? rec.rest >= 60
                  ? Math.round(rec.rest / 60) + " h"
                  : rec.rest + " min"
                : rec.cook
                  ? rec.cook + " min"
                  : "—"}
            </div>
          </div>
        </div>

        {(rec.author || rec.source) && (
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4, lineHeight: 1.5 }}>
            {rec.author ? <b style={{ color: "var(--muted)" }}>{rec.author}</b> : null}
            {rec.author && rec.source ? " · " : ""}
            {rec.source}
          </div>
        )}

        {rec.intro && (
          <div className="recipe-intro">
            <Glossed>{rec.intro}</Glossed>
          </div>
        )}

        {rec.safety && (
          <div className="alert" style={{ marginTop: 12 }}>
            <Icon d={ICONS.alert} size={18} stroke="#B33A2E" width={1.7} style={{ marginTop: 1 }} />
            <div className="txt">
              <b>Sécurité</b> — {rec.safety}
            </div>
          </div>
        )}

        {techs.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 7 }}>
              Techniques
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {techs.map((t) => (
                <button
                  key={t!.id}
                  type="button"
                  className="tech-chip"
                  onClick={() => nav("technique", { techId: t!.id })}
                >
                  {t!.name.split(" — ")[0].split(" (")[0]} ›
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="cta-center"
          style={{ marginTop: 16, background: "#1D6E42", padding: 15, fontSize: 15 }}
          onClick={() => enterCuisine(() => nav("cuisine", { cookStep: 0 }))}
        >
          <Icon d={ICONS.pot} size={18} stroke="currentColor" width={1.6} />
          Mode cuisine — pas à pas, en grand
        </button>

        {rec.tools && rec.tools.length > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>
            <b>Matériel :</b> {rec.tools.join(" · ")}
          </div>
        )}

        <div className="label" style={{ margin: "20px 0 8px" }}>
          Ingrédients
        </div>
        <div className="recipe-ing-card">
          {rec.ing.map((t, i) => (
            <div key={i} className="ing">
              <span style={{ color: "#1D6E42" }}>—</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        <div className="label" style={{ margin: "20px 0 10px" }}>
          Préparation
        </div>
        {rec.steps.map((t, i) => (
          <div key={i} className="step">
            <div className="step-num">{i + 1}</div>
            <div className="t">
              <Glossed>{t}</Glossed>
            </div>
          </div>
        ))}

        {rec.components?.map((c) => (
          <div key={c.title} style={{ marginTop: 20 }}>
            <div className="serif" style={{ fontSize: 16, fontWeight: 650 }}>
              {c.title}
            </div>
            <div className="label" style={{ margin: "10px 0 6px" }}>
              Ingrédients
            </div>
            {c.ing.map((t, i) => (
              <div key={i} className="ing">
                <span style={{ color: "#1D6E42" }}>—</span>
                <span>{t}</span>
              </div>
            ))}
            <div className="label" style={{ margin: "10px 0 6px" }}>
              Préparation
            </div>
            {c.steps.map((t, i) => (
              <div key={i} className="step">
                <div className="step-num">{i + 1}</div>
                <div className="t">
                  <Glossed>{t}</Glossed>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
