import type { ReactNode } from "react";

/**
 * Une section qu'on replie, avec ce qu'il faut pour que le repli ne se lise pas
 * comme une panne.
 *
 * DEUX RÈGLES, qui priment sur l'apparence :
 *
 *  1. CE QUI DISPARAÎT RESTE LISIBLE. Replié, l'en-tête porte un `resume` — la
 *     valeur qu'on venait chercher. Une section repliée qui n'affiche que son
 *     titre est indiscernable d'une section vide, et sur un tableau de bord de
 *     conditions de pêche « vide » veut dire « la donnée manque ».
 *
 *  2. LES ACTIONS NE SE REPLIENT PAS. `actions` est un frère de la bascule, pas
 *     un enfant : d'abord parce qu'un bouton dans un bouton n'est pas du HTML
 *     valide, ensuite parce que « me localiser » doit rester à un appui même
 *     carte repliée.
 *
 * L'état est ANNONCÉ (`aria-expanded`) et pas seulement peint : c'est la règle
 * que a11y-bascules.test.tsx tient pour le reste de l'app.
 *
 * Le corps est démonté quand il est replié, et non caché en CSS : la mini-carte
 * charge neuf tuiles IGN, la courbe de température dessine un SVG. Les garder
 * montés ferait payer le repli sans rien rendre.
 */
export function Repli({
  titre,
  resume,
  replie,
  onBascule,
  actions,
  className,
  children,
}: {
  /** Ce que la section contient. Sert de nom accessible à la bascule. */
  titre: string;
  /** La valeur à garder sous les yeux quand c'est replié. */
  resume?: ReactNode;
  replie: boolean;
  onBascule: () => void;
  /** Commandes qui restent utilisables repliées (elles ne sont pas dans la bascule). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`repli${replie ? " repli--ferme" : ""}${className ? ` ${className}` : ""}`}>
      <div className="repli-tete">
        <button
          type="button"
          className="repli-bascule"
          aria-expanded={!replie}
          onClick={onBascule}
        >
          <span className="repli-titre">{titre}</span>
          {resume != null && resume !== "" && <span className="repli-resume">{resume}</span>}
          <span className="repli-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
        {actions}
      </div>
      {!replie && <div className="repli-corps">{children}</div>}
    </section>
  );
}
