import { useStore } from "../store-hooks";

/**
 * L'écran de détail dont l'identifiant ne résout rien.
 *
 * Depuis les liens profonds (lot E), ce n'est plus un cas théorique : un lien
 * collé, tronqué par une messagerie, ou écrit pour une autre version de l'app
 * ouvre l'écran avec un identifiant que ce téléphone ne connaît pas. Plusieurs
 * écrans répondaient à ça par `return null`, c'est-à-dire un écran BLANC : pas
 * de titre, pas de flèche « ‹ », pas un mot d'explication. La barre du bas était
 * bien là (App.tsx ne la masque que sur `cuisine` et `fiche`), donc l'app
 * n'était pas verrouillée — mais rien ne disait ce qui venait de se passer, et
 * la flèche de retour, elle, manquait vraiment.
 *
 * Le patron vient de PriseDetail, qui traitait déjà le cas correctement — d'où
 * le `<main>` et le titre de barre, que la passe accessibilité a depuis rendus
 * la norme de tous les écrans : un écran qui n'annonce pas son sujet ne
 * s'annonce pas non plus au lecteur d'écran. Il vit ici pour que les écrans
 * disent la même chose de la même façon.
 */
export function DetailIntrouvable({
  titre,
  message,
  onBack,
}: {
  /** Ce que la barre annonce — « Nœud introuvable », « Recette introuvable ». */
  titre: string;
  message: string;
  /** Pour les écrans qui ont quelque chose à relâcher en partant — le mode
   *  cuisine tient le verrou d'écran allumé. Par défaut : le retour ordinaire. */
  onBack?: () => void;
}) {
  const { back } = useStore();
  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={onBack ?? back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">{titre}</h1>
      </div>
      <div className="pad">
        <div className="empty-note">{message}</div>
      </div>
    </main>
  );
}

/** La seconde phrase, commune aux catalogues embarqués (recettes du guide,
 *  techniques, nœuds) : leur contenu est livré AVEC l'app, donc un identifiant
 *  inconnu ne peut venir que d'un lien qui ne correspond pas à cette version. */
export const LIEN_AUTRE_VERSION =
  " Le lien vient peut-être d'une autre version de l'application.";
