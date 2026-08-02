// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { Accueil } from "./Accueil";
import { readPrefsAccueil, writePrefsAccueil } from "../lib/prefs-accueil";

/**
 * L'Accueil épuré, et la rivière que le pêcheur désigne lui-même.
 *
 * TROIS DEMANDES, verbatim :
 *   1. « faudrait peut être également que la map en haut, les valeurs de temps,
 *      temp etc, tout le truc climat soit collapsable ou quoi, faut épurer
 *      l'acceuil là c'est super chargé »
 *   2. « le module lever coucher du soleil est trop gros faudrait avoir juste
 *      les infos sur le module du dessus où y'a déjà les heures et la
 *      temperature »
 *   3. « pour les conditions de l'eau faudrait pouvoir selectionner une rivière
 *      ou quoi, pour avoir les infos, là c'est automatique c'est pas bien »
 *
 * MESURÉ AVANT, au navigateur, 375 × 812, département 41, position par défaut
 * (Blois), en ligne — fenêtre utile 735 px une fois la barre de navigation
 * (77 px) retirée :
 *   · 2 192 px de contenu, soit 2,98 écrans, en 13 blocs de premier niveau
 *   · au-dessus de la ligne de flottaison : 4 blocs (en-tête 57, bouton
 *     département 139, mini-carte 168, météo 398 — tronquée)
 *   · « Conditions de l'eau » commence à 834 px, donc hors vue
 *   · « J'ai une prise », l'action principale, à 1 506 px — deux écrans plus bas
 *   · le bloc soleil/lune fait 422 px à lui seul, dont 199 px d'icône ⓘ étirée
 *     (`.dash-sun svg { width: 100% }` l'emporte sur `.tip-i { width: 12px }`)
 *
 * CE QUE CE FICHIER NE VOIT PAS : jsdom ne calcule aucune géométrie. Aucune des
 * hauteurs ci-dessus n'est vérifiable ici — elles le sont au navigateur, et le
 * corps du commit les redonne après.
 */

vi.mock("../lib/db", () => ({
  runMigrations: vi.fn(async () => {}),
  loadCatches: vi.fn(async () => []),
  saveCatches: vi.fn(async () => {}),
  loadSpots: vi.fn(async () => []),
  saveSpots: vi.fn(async () => {}),
  loadGear: vi.fn(async () => []),
  saveGear: vi.fn(async () => {}),
  loadProfile: vi.fn(async () => ({ name: "", bio: "", region: "" })),
  saveProfile: vi.fn(async () => {}),
  loadRecipes: vi.fn(async () => []),
  saveRecipes: vi.fn(async () => {}),
  loadCrayfish: vi.fn(async () => []),
  saveCrayfish: vi.fn(async () => {}),
}));

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

const CARTHAGE = "CoursEau_Carthage2017";
const LOIRE = { nom: "la Loire", cles: [`${CARTHAGE}:----0000`, "CEA:----0000"] };

/** Toutes les stations de Blois, pour que le sélecteur ait de quoi proposer. */
function reseauNormal() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      const j = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });
      if (u.includes("api.open-meteo.com"))
        return j({
          current: {
            time: "2026-08-01T12:00",
            temperature_2m: 24.3,
            apparent_temperature: 25.1,
            relative_humidity_2m: 52,
            precipitation: 0,
            cloud_cover: 30,
            wind_speed_10m: 12,
            wind_direction_10m: 210,
            wind_gusts_10m: 28,
            pressure_msl: 1013,
            weather_code: 2,
          },
          hourly: { time: ["2026-08-01T12:00"], temperature_2m: [24.3], precipitation_probability: [5], pressure_msl: [1013] },
          daily: { time: ["2026-08-01"], weather_code: [2], temperature_2m_max: [27], temperature_2m_min: [15], precipitation_sum: [0], wind_speed_10m_max: [18] },
        });
      if (u.includes("/hydrometrie/referentiel/stations"))
        return j({
          data: [
            {
              code_station: "K447001001",
              libelle_station: "La Loire à Blois",
              latitude_station: 47.584957,
              longitude_station: 1.335148,
              code_cours_eau: "----0000",
              libelle_cours_eau: "la Loire",
              uri_cours_eau: "http://id.eaufrance.fr/CEA/----0000",
            },
            {
              code_station: "K479301001",
              libelle_station: "Le Cosson à Chailles",
              latitude_station: 47.5427,
              longitude_station: 1.3241,
              code_cours_eau: "K47-0300",
              libelle_cours_eau: "le Cosson",
              uri_cours_eau: "http://id.eaufrance.fr/CEA/K47-0300",
            },
          ],
        });
      if (u.includes("/station_pc"))
        return j({
          data: [
            {
              code_cours_eau: "----0000",
              nom_cours_eau: "la Loire",
              uri_cours_eau: `https://id.eaufrance.fr/${CARTHAGE}/----0000`,
              latitude: 47.5849,
              longitude: 1.3351,
            },
            {
              code_cours_eau: "K47-0300",
              nom_cours_eau: "le Cosson",
              uri_cours_eau: `https://id.eaufrance.fr/${CARTHAGE}/K47-0300`,
              latitude: 47.5427,
              longitude: 1.3241,
            },
          ],
        });
      return j({ data: [] });
    }),
  );
}

function monter() {
  return render(
    <StoreProvider>
      <Accueil />
    </StoreProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  reseauNormal();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Épurer : les blocs se replient, et le repli se retient", () => {
  it("la carte et le détail météo sont repliables, et disent leur état", async () => {
    monter();

    const carte = await screen.findByRole("button", { name: /position/i });
    const meteo = await screen.findByRole("button", { name: /détail.*météo|météo.*détail/i });
    expect(carte).toHaveAttribute("aria-expanded");
    expect(meteo).toHaveAttribute("aria-expanded");
  });

  it("ce qui est replié reste ATTEIGNABLE : un appui le redéploie", async () => {
    const user = userEvent.setup();
    monter();

    const bascule = await screen.findByRole("button", { name: /position/i });
    const avant = bascule.getAttribute("aria-expanded");

    await user.click(bascule);

    expect(bascule.getAttribute("aria-expanded")).not.toBe(avant);
  });

  it("un bloc replié montre un résumé, jamais un vide qui se lirait « pas de donnée »", async () => {
    const user = userEvent.setup();
    monter();

    const bascule = await screen.findByRole("button", { name: /position/i });
    if (bascule.getAttribute("aria-expanded") === "true") await user.click(bascule);

    // Le lieu reste lisible sans déplier, sinon le repli ressemble à une panne.
    expect(bascule.textContent).toMatch(/Loir-et-Cher|Ma position/);
  });

  it("le repli survit à un remontage — c'est-à-dire à un relancement", async () => {
    const user = userEvent.setup();
    const { unmount } = monter();

    const bascule = await screen.findByRole("button", { name: /position/i });
    const voulu = bascule.getAttribute("aria-expanded") === "true" ? "false" : "true";
    await user.click(bascule);
    await waitFor(() => expect(Object.keys(readPrefsAccueil().replis).length).toBeGreaterThan(0));
    unmount();

    monter();

    const relu = await screen.findByRole("button", { name: /position/i });
    expect(relu.getAttribute("aria-expanded")).toBe(voulu);
  });

  it("la localisation reste utilisable carte repliée", async () => {
    const user = userEvent.setup();
    monter();

    const bascule = await screen.findByRole("button", { name: /position/i });
    if (bascule.getAttribute("aria-expanded") === "true") await user.click(bascule);

    expect(screen.getByRole("button", { name: /me localiser|recentrer/i })).toBeInTheDocument();
  });
});

describe("Le soleil rejoint la tuile qui porte déjà les heures", () => {
  it("plus de module soleil séparé", async () => {
    monter();

    await screen.findByRole("main");
    expect(document.querySelector(".dash-astro")).toBeNull();
    expect(document.querySelector(".dash-sun")).toBeNull();
  });

  it("le lever et le coucher sont dans la tuile météo", async () => {
    monter();

    const wx = document.querySelector(".dash-wx")!;
    await waitFor(() => expect(wx.textContent).toMatch(/\d{1,2}:\d{2}/));
    expect(wx.textContent).toMatch(/[Ll]ever/);
    expect(wx.textContent).toMatch(/[Cc]oucher/);
  });

  it("les horaires LÉGAUX sont visibles sans déplier quoi que ce soit", async () => {
    monter();

    // La demi-heure est réglementaire (R436-13). Elle n'existait que dans le
    // texte d'une infobulle : les deux seules heures affichées étaient le lever
    // et le coucher nus.
    const main = await screen.findByRole("main");
    await waitFor(() => expect(main.textContent).toMatch(/[Pp]êche autorisée/));
    expect(main.textContent).toMatch(/demi-heure|½/);
  });
});

describe("Choisir sa rivière", () => {
  it("sans rivière choisie, l'écran le dit et propose d'en choisir une", async () => {
    monter();

    const bouton = await screen.findByRole("button", { name: /choisir.*rivière|rivière/i });
    expect(bouton).toBeInTheDocument();
  });

  it("une fois choisie, la rivière est nommée dans la carte des conditions d'eau", async () => {
    writePrefsAccueil({ replis: {}, riviere: LOIRE });
    monter();

    const eau = document.querySelector(".dash-water")!;
    await waitFor(() => expect(eau.textContent).toContain("la Loire"));
  });

  it("le sélecteur propose les rivières mesurées autour du point", async () => {
    const user = userEvent.setup();
    monter();

    await user.click(await screen.findByRole("button", { name: /choisir.*rivière|rivière/i }));

    const dialogue = await screen.findByRole("dialog");
    expect(await within(dialogue).findByRole("button", { name: /la Loire/ })).toBeInTheDocument();
    expect(within(dialogue).getByRole("button", { name: /le Cosson/ })).toBeInTheDocument();
  });

  it("choisir une rivière l'enregistre avec TOUTES ses clés de référentiel", async () => {
    const user = userEvent.setup();
    monter();

    await user.click(await screen.findByRole("button", { name: /choisir.*rivière|rivière/i }));
    const dialogue = await screen.findByRole("dialog");
    await user.click(await within(dialogue).findByRole("button", { name: /la Loire/ }));

    await waitFor(() => expect(readPrefsAccueil().riviere?.nom).toBe("la Loire"));
    // Une seule clé laisserait la moitié des réseaux sans rattachement.
    expect(readPrefsAccueil().riviere?.cles.sort()).toEqual(
      [`${CARTHAGE}:----0000`, "CEA:----0000"].sort(),
    );
  });

  it("rivière choisie mais aucune station à portée : l'écran le DIT", async () => {
    // Le troisième état. Ni un tiret muet, ni — surtout — la station d'à côté.
    writePrefsAccueil({
      replis: {},
      riviere: { nom: "le Cher", cles: [`${CARTHAGE}:AUCUNE`, "CEA:AUCUNE"] },
    });
    monter();

    const eau = document.querySelector(".dash-water")!;
    await waitFor(() => expect(eau.textContent).toMatch(/aucune station/i));
    expect(eau.textContent).toContain("le Cher");
  });

  it("JAMAIS la station d'une autre rivière sous le nom de celle qu'on a choisie", async () => {
    // Le défaut fondateur de tout l'audit : une mesure du Cher affichée comme
    // la température de la Loire. Ici, le pêcheur choisit une rivière sans
    // station alors que la Loire en a une à 0,1 km.
    writePrefsAccueil({
      replis: {},
      riviere: { nom: "le Cher", cles: [`${CARTHAGE}:AUCUNE`, "CEA:AUCUNE"] },
    });
    monter();

    const eau = document.querySelector(".dash-water")!;
    await waitFor(() => expect(eau.textContent).toMatch(/aucune station/i));
    expect(eau.textContent).not.toContain("La Loire à Blois");
    expect(eau.textContent).not.toContain("Le Cosson");
  });

  it("on peut revenir au choix automatique", async () => {
    const user = userEvent.setup();
    writePrefsAccueil({ replis: {}, riviere: LOIRE });
    monter();

    await user.click(await screen.findByRole("button", { name: /la Loire/ }));
    const dialogue = await screen.findByRole("dialog");
    await user.click(within(dialogue).getByRole("button", { name: /automatique|plus proche/i }));

    await waitFor(() => expect(readPrefsAccueil().riviere).toBeNull());
  });
});

describe("Ce que l'épuration ne doit pas casser", () => {
  it("toujours un seul <main> et un seul <h1>", async () => {
    monter();

    await screen.findByRole("main");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
  });

  it("l'action principale reste là", async () => {
    monter();

    expect(await screen.findByRole("button", { name: /J'ai une prise/i })).toBeInTheDocument();
  });
});

/**
 * La bascule de thème dans l'en-tête.
 *
 * DEMANDE, verbatim : « pourquoi il est en darkmode par défaut ? devrait y
 * avoir un bouton pour switch automatiquement entre les deux, c'est standard »
 *
 * Le défaut n'était pas le problème : `theme: "auto"` suit `prefers-color-
 * scheme`, donc l'app était sombre parce que le téléphone l'était — c'est déjà
 * le standard demandé. Le problème était le BOUTON. Il existait, en tête
 * d'Outils, mais un seul chemin menait à Outils dans toute l'app : un lien
 * « Tout › » dans un en-tête de section, en bas d'un écran de trois hauteurs
 * d'écran. Introuvable revient au même qu'absent.
 *
 * Sous jsdom, `matchMedia` n'existe pas : `systemeSombre()` retombe sur `false`
 * et « auto » résout donc en CLAIR. C'est ce qui rend ces cas déterministes.
 */
describe("Apparence : la bascule quitte le fond d'Outils pour l'en-tête", () => {
  it("l'en-tête porte la bascule, et son libellé annonce où elle mène", async () => {
    monter();

    // Le libellé nomme la DESTINATION, pas l'état courant : « Passer en thème
    // sombre » se comprend sans voir l'écran, là où « Thème clair » laisse le
    // lecteur d'écran deviner si c'est un constat ou une action.
    expect(await screen.findByRole("button", { name: /passer en thème sombre/i })).toBeInTheDocument();
  });

  it("un appui bascule en sombre, et la feuille de style suit", async () => {
    const user = userEvent.setup();
    monter();

    await user.click(await screen.findByRole("button", { name: /passer en thème sombre/i }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("le libellé se retourne : depuis le sombre, elle ramène au clair", async () => {
    const user = userEvent.setup();
    monter();

    await user.click(await screen.findByRole("button", { name: /passer en thème sombre/i }));

    const retour = await screen.findByRole("button", { name: /passer en thème clair/i });
    await user.click(retour);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("choisir explicitement fait sortir d'« auto » — le réglage cesse de suivre le téléphone", async () => {
    const user = userEvent.setup();
    monter();

    await user.click(await screen.findByRole("button", { name: /passer en thème sombre/i }));

    // Conséquence assumée, et réversible : « Auto » reste offert en tête
    // d'Outils, qui garde le contrôle à trois états.
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("carnet:prefs") || "{}").theme).toBe("dark"),
    );
  });
});

describe("Apparence : « auto » quand le téléphone, lui, est en sombre", () => {
  /** jsdom n'implémente pas matchMedia ; on le pose pour ce cas précis. */
  function telephoneSombre() {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("dark"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }

  it("le libellé suit le thème EFFECTIF, pas la préférence", async () => {
    // Le piège que ce cas verrouille : lire `state.theme` donnerait « auto »,
    // dont on ne peut déduire aucune destination. Un utilisateur en auto sur un
    // téléphone sombre verrait « Passer en thème sombre » — proposé alors qu'il
    // y est déjà, et menant en réalité au clair.
    telephoneSombre();
    monter();

    expect(await screen.findByRole("button", { name: /passer en thème clair/i })).toBeInTheDocument();
  });
});

describe("Apparence : le téléphone qui change d'avis, app ouverte", () => {
  /**
   * Ce cas ne se vérifie PAS au navigateur : l'émulation de
   * `prefers-color-scheme` du pilote change `matchMedia().matches` sans
   * dispatcher l'événement `change` — un écouteur témoin posé à la main n'en
   * reçoit aucun. C'est donc ici que la promesse se tient, avec un matchMedia
   * dont on garde la poignée pour déclencher le changement soi-même.
   *
   * Ce qu'on protège : `themeEffectif` vit dans l'état, et pas recalculé au
   * rendu, précisément pour que ce changement-là repeigne l'en-tête.
   */
  it("en « auto », le libellé de la bascule se retourne sans rechargement", async () => {
    const ecouteurs: Array<(e: { matches: boolean }) => void> = [];
    let sombre = true;
    vi.stubGlobal("matchMedia", (q: string) => ({
      get matches() {
        return q.includes("dark") && sombre;
      },
      media: q,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        ecouteurs.push(fn);
      },
      removeEventListener: () => {},
    }));

    monter();
    expect(await screen.findByRole("button", { name: /passer en thème clair/i })).toBeInTheDocument();

    // Le pêcheur bascule son téléphone en clair, l'app ouverte.
    sombre = false;
    ecouteurs.forEach((fn) => fn({ matches: false }));

    expect(await screen.findByRole("button", { name: /passer en thème sombre/i })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

/**
 * Le double montage de <StrictMode> ne doit pas condamner la chaîne GPS.
 *
 * `src/main.tsx` enveloppe l'app dans <StrictMode>. En développement, React
 * monte, exécute le nettoyage, puis REMONTE — sur la même instance, et les refs
 * ne sont pas recréées entre les deux passes. Un effet réduit à son seul
 * nettoyage, `useEffect(() => () => { garde.current = false }, [])`, laisse donc
 * la garde à `false` dès le premier affichage, et pour toujours.
 *
 * Ce que ça donnait à l'écran : « 📍 Me localiser » posait « Localisation… »,
 * puis restait dessus, sans retour possible — la chaîne GPS était coupée par sa
 * propre garde, à la première ligne de son propre succès. Une modification de
 * code relançait l'effet via Fast Refresh et reproduisait le blocage.
 *
 * La production n'était pas touchée (le double montage est propre au
 * développement), et c'est précisément pourquoi toute cette suite restait verte :
 * elle monte l'écran nu, jamais sous <StrictMode>. D'où ces cas-ci, qui sont les
 * seuls du fichier à monter comme l'application monte réellement.
 */
describe("StrictMode : le double montage ne condamne pas la chaîne GPS", () => {
  /** Un GPS qui répond tout de suite : ce qu'on mesure est la garde, pas l'attente. */
  function gpsQuiRepond(lat: number, lon: number) {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: lat, longitude: lon }, timestamp: 0 } as unknown as GeolocationPosition),
      },
    });
  }

  /**
   * Le géocodeur inverse de l'IGN, seul appel qui décide du département. Le
   * reste du réseau reste celui de `reseauNormal()`, posé par le `beforeEach`.
   */
  function geocodageInverse(citycode: string) {
    const reseau = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("/geocodage/reverse"))
          return new Response(JSON.stringify({ features: [{ properties: { citycode } }] }), {
            status: 200,
          });
        return reseau(input, init);
      }),
    );
  }

  /** Comme `monter()`, mais sous <StrictMode> — donc monté deux fois, comme en vrai. */
  function monterStrict() {
    return render(
      <StrictMode>
        <StoreProvider>
          <Accueil />
        </StoreProvider>
      </StrictMode>,
    );
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("« Me localiser » aboutit : le bouton quitte « Localisation… »", async () => {
    const user = userEvent.setup();
    gpsQuiRepond(47.586, 1.336); // Blois — le département par défaut, rien ne doit bouger d'autre.
    monterStrict();

    await user.click(await screen.findByRole("button", { name: /me localiser/i }));

    // Le symptôme exact : le libellé restait figé sur l'attente. « Recentrer »
    // ne s'affiche que si `setLocated(true)` a eu lieu, donc si la garde a laissé
    // passer le premier maillon de la chaîne.
    expect(await screen.findByRole("button", { name: /recentrer/i })).toBeInTheDocument();
  });

  it("le département détecté est appliqué — la garde imbriquée passe aussi", async () => {
    const user = userEvent.setup();
    gpsQuiRepond(46.811, 1.691); // Châteauroux : couvert, et différent du 41 par défaut.
    geocodageInverse("36044");
    monterStrict();

    await user.click(await screen.findByRole("button", { name: /me localiser/i }));

    // La seconde garde, celle qui suit `deptFromCoords`, était condamnée par le
    // même ref : le changement de département partait silencieusement à la
    // trappe, sans même le message qui l'annonce.
    expect(await screen.findByRole("button", { name: /Département\s*:\s*Indre/i })).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem("carnet:prefs") || "{}").dept).toBe("36"));
  });

  it("hors StrictMode aussi, évidemment — la garde n'est pas devenue décorative", async () => {
    const user = userEvent.setup();
    gpsQuiRepond(47.586, 1.336);
    monter();

    await user.click(await screen.findByRole("button", { name: /me localiser/i }));

    expect(await screen.findByRole("button", { name: /recentrer/i })).toBeInTheDocument();
  });
});
