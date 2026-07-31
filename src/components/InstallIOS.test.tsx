// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AideInstallIOS } from "./InstallIOS";
import { doitAiderInstallIOS, type EnvInstall } from "../lib/install-ios";

// iOS ne déclenche jamais `beforeinstallprompt` : le bouton « Installer » que
// lib/pwa.ts sait afficher sur Android n'apparaît donc JAMAIS sur iPhone. Un
// pêcheur sous Safari n'a aucun moyen, depuis l'app, de savoir qu'elle
// s'installe — et sans installation, pas de hors-ligne fiable au bord de l'eau,
// qui est toute la promesse de l'app.
//
// L'aide doit donc s'afficher exactement là où le prompt natif manque : sur
// iOS, et seulement tant que l'app tourne dans le navigateur.

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
// iPadOS 13+ ment sur son UA : il se déclare « Macintosh ». Le seul indice
// restant est le tactile.
const IPAD_DEGUISE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

const env = (p: Partial<EnvInstall>): EnvInstall => ({
  ua: IPHONE,
  maxTouchPoints: 5,
  displayModeStandalone: false,
  ...p,
});

describe("doitAiderInstallIOS", () => {
  it("aide sur un iPhone dans Safari", () => {
    expect(doitAiderInstallIOS(env({}))).toBe(true);
  });

  it("se tait une fois l'app installée (navigator.standalone de Safari)", () => {
    expect(doitAiderInstallIOS(env({ standaloneSafari: true }))).toBe(false);
  });

  it("se tait aussi quand l'affichage est déjà en standalone", () => {
    // navigator.standalone n'existe pas partout ; display-mode, si.
    expect(doitAiderInstallIOS(env({ displayModeStandalone: true }))).toBe(false);
  });

  it("reconnaît un iPad qui se fait passer pour un Mac", () => {
    expect(doitAiderInstallIOS(env({ ua: IPAD_DEGUISE, maxTouchPoints: 5 }))).toBe(true);
  });

  it("ne prend pas un vrai Mac pour un iPad", () => {
    // Le déguisement de l'iPad est indiscernable de macOS SAUF par le tactile.
    expect(doitAiderInstallIOS(env({ ua: MAC, maxTouchPoints: 0 }))).toBe(false);
  });

  it("se tait sur Android, où le prompt natif fait le travail", () => {
    // lib/pwa.ts capte `beforeinstallprompt` : deux invitations concurrentes
    // valent moins qu'une.
    expect(doitAiderInstallIOS(env({ ua: ANDROID, maxTouchPoints: 5 }))).toBe(false);
  });
});

describe("AideInstallIOS", () => {
  it("donne le chemin exact, pas une invitation vague", () => {
    // « Installez l'app » n'aide personne : sur iOS le chemin est caché
    // derrière le bouton Partager, et c'est ça qu'il faut nommer.
    render(<AideInstallIOS env={env({})} />);

    expect(screen.getByText(/Partager/)).toBeInTheDocument();
    expect(screen.getByText(/écran d'accueil/i)).toBeInTheDocument();
  });

  it("dit pourquoi ça vaut le détour", () => {
    render(<AideInstallIOS env={env({})} />);

    expect(document.body.textContent ?? "").toMatch(/hors[- ]ligne/i);
  });

  it("ne rend rien du tout hors iOS", () => {
    const { container } = render(<AideInstallIOS env={env({ ua: ANDROID })} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien du tout une fois l'app installée", () => {
    const { container } = render(<AideInstallIOS env={env({ standaloneSafari: true })} />);

    expect(container).toBeEmptyDOMElement();
  });
});
