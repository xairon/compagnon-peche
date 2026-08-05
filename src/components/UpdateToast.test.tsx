// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateToast } from "./UpdateToast";
import { valeurDeclaree } from "../lib/contraste-palette";
import { JOUR_MS, type DossierMaj } from "../lib/maj-sw";

/**
 * Le bandeau de mise à jour, côté écran.
 *
 * La décision est déjà posée et testée dans lib/maj-sw.ts : trois reports de
 * vingt-quatre heures, puis plus rien. Ce qui manquait, c'est le seul endroit
 * où un utilisateur peut l'exercer — le bandeau n'offrait que « Mettre à jour »,
 * donc « plus tard » se disait en ignorant l'écran, indéfiniment.
 *
 * Deux exigences se tiennent par le col ici. Le report doit exister, sinon le
 * bandeau harcèle. Et sa fin doit se DIRE, avec le vrai nombre de jours : une
 * app qui affiche des tailles légales et des espèces qu'on n'a pas le droit de
 * remettre à l'eau ne peut pas laisser un correctif dormir sans expliquer
 * pourquoi elle insiste.
 *
 * `depuis` est calculé à partir de l'heure réelle plutôt que d'une horloge
 * gelée : `useNow()` lit `Date.now()` au montage, et `joursDAttente` tronque à
 * la journée, donc les quelques millisecondes d'écart ne changent aucun
 * chiffre.
 */

function dossier({ jours = 0, reports = 0 }: { jours?: number; reports?: number }): DossierMaj {
  return { depuis: Date.now() - jours * JOUR_MS, reports, jusqua: 0, build: "abc1234" };
}

describe("UpdateToast", () => {
  it("offre « Plus tard » tant qu'il reste un report à accorder", async () => {
    const reporter = vi.fn();
    render(
      <UpdateToast maj={dossier({})} reportable onApply={() => {}} onReport={reporter} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /plus tard/i }));

    expect(reporter).toHaveBeenCalledTimes(1);
  });

  it("dit depuis combien de jours elle attend, une fois les reports épuisés", () => {
    render(
      <UpdateToast
        maj={dossier({ jours: 8, reports: 3 })}
        reportable={false}
        onApply={() => {}}
        onReport={() => {}}
      />,
    );

    // Le chiffre vient de `joursDAttente`, jamais d'une formule d'ambiance :
    // « depuis un moment » ne se vérifie pas, « depuis 8 jours » si.
    expect(screen.getByText(/8 jours/)).toBeInTheDocument();
  });

  it("accorde le singulier au premier jour", () => {
    render(
      <UpdateToast
        maj={dossier({ jours: 1, reports: 3 })}
        reportable={false}
        onApply={() => {}}
        onReport={() => {}}
      />,
    );

    expect(screen.getByText(/depuis 1 jour\b/)).toBeInTheDocument();
    expect(screen.queryByText(/1 jours/)).not.toBeInTheDocument();
  });

  it("compte les reports plutôt que d'annoncer une attente de zéro jour", () => {
    // Trois reports tiennent trois jours : y arriver le jour même suppose une
    // horloge revenue en arrière ou un dossier trafiqué. La durée n'est alors
    // plus digne de foi — le nombre de reports, lui, l'est encore.
    render(
      <UpdateToast
        maj={dossier({ jours: 0, reports: 3 })}
        reportable={false}
        onApply={() => {}}
        onReport={() => {}}
      />,
    );

    expect(screen.queryByText(/0 jour/)).not.toBeInTheDocument();
    expect(screen.getByText(/reportée 3 fois/i)).toBeInTheDocument();
  });

  // Les trois qui suivent étaient vertes dès leur écriture : elles ne pilotent
  // rien, elles verrouillent. Notées comme telles pour ne pas laisser croire
  // qu'un cycle rouge les a produites.

  it("retire « Plus tard » quand il n'y a plus de report à accorder", () => {
    render(
      <UpdateToast
        maj={dossier({ jours: 8, reports: 3 })}
        reportable={false}
        onApply={() => {}}
        onReport={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: /plus tard/i })).not.toBeInTheDocument();
  });

  it("n'applique jamais la mise à jour de sa propre initiative", () => {
    // Le garde-fou du lot. Le brouillon de prise n'est pas persisté : un
    // rechargement décidé par l'app effacerait une saisie en cours. La borne
    // pousse, elle ne décide pas à la place — même reports épuisés, même après
    // que l'horloge de `useNow()` a tourné.
    const appliquer = vi.fn();
    vi.useFakeTimers();
    try {
      render(
        <UpdateToast
          maj={dossier({ jours: 30, reports: 3 })}
          reportable={false}
          onApply={appliquer}
          onReport={() => {}}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(10 * JOUR_MS);
      });

      expect(appliquer).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("applique la mise à jour au clic, et seulement là", async () => {
    const appliquer = vi.fn();
    render(
      <UpdateToast maj={dossier({})} reportable onApply={appliquer} onReport={() => {}} />,
    );
    expect(appliquer).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /mettre à jour/i }));

    expect(appliquer).toHaveBeenCalledTimes(1);
  });
});

/**
 * Garde-fou de non-régression sur le layout du bandeau.
 *
 * Le 01/08/2026, le bandeau dimensionné par son contenu (~400 px) débordait
 * d'un téléphone de 375 px : « Plus tard » et « Mettre à jour » se repliaient
 * sur 62 px. Le passage à la ligne (flex-wrap) a réglé le contenu, mais le
 * centrage par `left: 50% + translateX + width: 100vw` dépendait de `100vw` —
 * fragile dès qu'un moteur rend un viewport plus étroit que 100vw (barres
 * système, zoom, WebView). Le pattern borné (left/right) du bandeau d'échec
 * d'écriture (.persist-warn) ne dépend, lui, d'aucune unité de viewport : le
 * bouton ne peut pas sortir de la fenêtre, il n'y a tout simplement plus de
 * place pour lui en dehors.
 *
 * La feuille est relue à chaque exécution, comme les autres garde-fous CSS du
 * dépôt (contraste-palette.test.ts) : si quelqu'un re-étire le bandeau ou
 * re-introduit une largeur en 100vw, le test le dit.
 */
describe("UpdateToast — le bandeau ne sort pas de la fenêtre", () => {
  const CSS = readFileSync(join(__dirname, "..", "styles.css"), "utf8");

  it("le bandeau est borné par les bords de l'écran (left/right), pas par 100vw", () => {
    expect(valeurDeclaree(CSS, ".update-toast", "left")).toBe("12px");
    expect(valeurDeclaree(CSS, ".update-toast", "right")).toBe("12px");
  });

  it("le contenu passe à la ligne plutôt que de déborder (flex-wrap)", () => {
    // Verte dès son écriture : elle ne pilote rien, elle verrouille — le
    // passage à la ligne est déjà en place, il ne doit pas s'en aller.
    expect(valeurDeclaree(CSS, ".update-toast", "flex-wrap")).toBe("wrap");
  });

  it("le message occupe sa rangée, les boutons gardent leur libellé", () => {
    expect(valeurDeclaree(CSS, ".update-toast > span", "flex")).toBe("1 1 100%");
    expect(valeurDeclaree(CSS, ".update-toast button", "flex")).toBe("0 0 auto");
    expect(valeurDeclaree(CSS, ".update-toast button", "white-space")).toBe("nowrap");
  });
});
