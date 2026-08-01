// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
