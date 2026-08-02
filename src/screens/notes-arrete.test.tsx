// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { StoreProvider } from "../store";
import type { AppState } from "../store";
import { useStore } from "../store-hooks";
import { Fiche } from "./Fiche";
import { Ecrevisses } from "./Ecrevisses";

/**
 * Ce que la fiche déversait : sous « Autres points de l'arrêté », toutes les
 * notes du département que le rattachement n'avait pas reliées à l'espèce. Sur
 * une fiche gardon dans l'Indre, six notes — brochet, sandre, black-bass,
 * truite arc-en-ciel, anguille, saumon — dont aucune ne parle d'un gardon.
 *
 * La règle qui remplace : seules restent les notes qui nomment l'espèce, et
 * celles qui ne nomment AUCUNE créature. Ce fichier vérifie les deux faces à
 * l'écran — ce qui doit partir, et ce qui doit rester.
 */

function Monte({ patch, ecran }: { patch: Partial<AppState>; ecran: React.ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set(patch);
  }, [set, patch]);
  return ecran;
}

const montrer = (patch: Partial<AppState>) =>
  render(
    <StoreProvider>
      <Monte patch={patch} ecran={<Fiche />} />
    </StoreProvider>,
  );

const page = () => document.body.textContent ?? "";

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

describe("Fiche — l'arrêté d'un autre poisson ne s'invite plus", () => {
  it("l'Indre, fiche gardon : aucune des six notes du département", () => {
    montrer({ dept: "36", deptChosen: true, screen: "fiche", spId: "gardon" });

    const t = page();
    expect(t).not.toMatch(/Sandre fermé/);
    expect(t).not.toMatch(/Black-bass/);
    expect(t).not.toMatch(/Anguille jaune/);
    expect(t).not.toMatch(/Brochet no-kill/);
    expect(t).not.toMatch(/Truite arc-en-ciel/);
    expect(t).not.toMatch(/Saumon, truite de mer/);
  });

  it("l'Indre, fiche gardon : le bloc « Autres points de l'arrêté » a disparu", () => {
    montrer({ dept: "36", deptChosen: true, screen: "fiche", spId: "gardon" });

    expect(page()).not.toMatch(/Autres points de l'arrêté/);
  });

  it("l'Indre n'ayant aucune règle générale, aucun bloc ne s'y substitue", () => {
    montrer({ dept: "36", deptChosen: true, screen: "fiche", spId: "gardon" });

    expect(page()).not.toMatch(/Règles générales/);
  });

  it("le poisson nommé garde sa note — c'est là qu'elle vit désormais", () => {
    // La contrepartie du masquage : rien n'est perdu, tout est déplacé. La note
    // « dans le doute, relâchez » se lit sur la fiche black-bass.
    montrer({ dept: "36", deptChosen: true, screen: "fiche", spId: "black-bass" });

    expect(page()).toMatch(/Black-bass/);
    expect(page()).toMatch(/relâchez/i);
  });
});

describe("Fiche — la règle qui ne nomme personne reste affichée", () => {
  it("la Creuse, fiche gardon : « bassin du Cher » est là", () => {
    // Elle ne nomme aucune créature : elle vaut pour le pêcheur de gardon
    // autant que pour les autres, et rien d'autre dans l'app ne la porte.
    montrer({ dept: "23", deptChosen: true, screen: "fiche", spId: "gardon" });

    expect(page()).toMatch(/Règles générales/);
    expect(page()).toMatch(/bassin du Cher/);
  });

  it("la Creuse, fiche gardon : la note brochet et la note écrevisses, elles, partent", () => {
    montrer({ dept: "23", deptChosen: true, screen: "fiche", spId: "gardon" });

    const t = page();
    expect(t).not.toMatch(/Fenêtre brochet/);
    // Le faux positif du classement : sans le vocabulaire écrevisses, cette
    // note passait pour générale et se serait affichée sur les 129 fiches.
    expect(t).not.toMatch(/Écrevisses à pattes/);
  });

  it("le repli annonce les règles générales quand il y en a", () => {
    // La phrase disait « le socle national ci-dessous s'applique » alors qu'une
    // règle départementale s'affichait juste en dessous.
    montrer({ dept: "23", deptChosen: true, screen: "fiche", spId: "gardon" });

    expect(page()).toMatch(/les règles générales ci-dessous et le socle national/);
  });

  it("et ne les annonce pas quand il n'y en a aucune", () => {
    montrer({ dept: "36", deptChosen: true, screen: "fiche", spId: "gardon" });

    expect(page()).toMatch(/le socle national ci-dessous s'applique/);
  });

  it("le repli ne répète plus le département, qui prenait le mauvais article", () => {
    // « dans le Indre », « dans le Creuse » : deux départements sur trois. Le
    // nom figure déjà dans le sous-titre de la section, juste au-dessus.
    montrer({ dept: "36", deptChosen: true, screen: "fiche", spId: "gardon" });

    expect(page()).not.toMatch(/dans le Indre/);
    expect(page()).toMatch(/Pas de spécificité départementale connue pour cette espèce —/);
  });
});

/**
 * Le point de sortie. La note écrevisses quitte les 129 fiches poisson ; si
 * l'écran Écrevisses ne la reprend pas, une interdiction de pêche toute l'année
 * n'existe plus nulle part dans l'application.
 */
describe("Écrevisses — l'arrêté du département rejoint le bloc réglementation", () => {
  const montrerEcrevisses = (patch: Partial<AppState>) =>
    render(
      <StoreProvider>
        <Monte patch={patch} ecran={<Ecrevisses />} />
      </StoreProvider>,
    );

  /** L'écran monte sur « Chargement… » : sans cette attente, une assertion
   *  négative passerait sur un écran vide, donc pour la mauvaise raison. */
  const chargé = () => waitFor(() => expect(page()).not.toMatch(/Chargement/));

  /** « Écrevisse à pattes blanches » est aussi un nom du catalogue, affiché par
   *  cet écran : chercher ce nom prouverait la présence d'une fiche, pas celle
   *  de la note. Ce fragment-ci n'appartient qu'au texte de l'arrêté. */
  const NOTE = /rouges et grêles/;

  it("la Creuse : la note écrevisses est là, et le département est nommé", async () => {
    montrerEcrevisses({ dept: "23", deptChosen: true, screen: "ecrevisses" });
    await chargé();

    expect(page()).toMatch(NOTE);
    expect(page()).toMatch(/Arrêté Creuse/);
  });

  it("l'Indre : aucune note écrevisses, donc aucun bloc d'arrêté", async () => {
    montrerEcrevisses({ dept: "36", deptChosen: true, screen: "ecrevisses" });
    await chargé();

    // L'écran est bien rendu — c'est la note qui manque, pas la page.
    expect(page()).toMatch(/balance/i);
    expect(page()).not.toMatch(NOTE);
    expect(page()).not.toMatch(/Arrêté Indre/);
  });
});
