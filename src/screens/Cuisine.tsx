import { useStore } from "../store-hooks";
import { findRecipe } from "../lib/recipes";
import { exitCuisine } from "../lib/wakelock";

export function Cuisine() {
  const { state, replace, back } = useStore();
  const found = findRecipe(state.recipeId);
  const rec = found?.recipe;

  // Flatten main steps + each component's steps into one guided sequence,
  // keeping a section label so complex dishes (quenelles, sauces) read clearly.
  const flat: { section: string; text: string }[] = rec
    ? [
        ...rec.steps.map((t) => ({ section: "Préparation", text: t })),
        ...(rec.components || []).flatMap((c) =>
          c.steps.map((t) => ({ section: c.title, text: t })),
        ),
      ]
    : [];
  const n = flat.length;
  const step = Math.min(Math.max(state.cookStep, 0), n);

  const exit = () => exitCuisine(back);
  // `replace` : l'étape est dans l'URL (donc un rechargement, les mains sales et
  // l'écran qui s'est éteint, reprend au bon endroit), mais elle ne fabrique pas
  // une entrée d'historique par étape — sortir d'une recette de vingt étapes ne
  // doit pas demander vingt gestes retour. La sortie, c'est « ‹ Quitter ».
  const goto = (v: number) => replace({ cookStep: Math.min(Math.max(v, 0), n) });
  const next = () => (step >= n ? exit() : goto(step + 1));
  const prev = () => (step === 0 ? exit() : goto(step - 1));
  const cur = step > 0 ? flat[step - 1] : null;

  return (
    <div className="cook">
      <div className="cook-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="prog">
            {step === 0 ? "Ingrédients" : `${cur?.section} · étape ${step} sur ${n}`}
          </div>
          <div className="title">{rec?.title}</div>
        </div>
        <button className="cook-x" onClick={exit} aria-label="Quitter le mode cuisine">
          ✕
        </button>
      </div>

      {n > 0 && (
        <div className="cook-progress">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={i < step ? "on" : ""} />
          ))}
        </div>
      )}

      <div className="cook-body">
        {step === 0 ? (
          <>
            <div
              style={{
                fontSize: 13,
                color: "#9DB4A6",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Ingrédients
            </div>
            {rec?.ing.map((t, i) => (
              <div key={i} className="cook-ing">
                {t}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="cook-step-n">{step}</div>
            <div className="cook-text">{cur?.text}</div>
          </>
        )}
      </div>

      <div className="cook-nav">
        <button className="cook-prev" onClick={prev}>
          {step === 0 ? "‹ Quitter" : "‹ Préc."}
        </button>
        <button className="cook-next" onClick={next}>
          {step === 0 ? "Commencer ›" : step >= n ? "Terminé ✓" : "Suivant ›"}
        </button>
      </div>
    </div>
  );
}
