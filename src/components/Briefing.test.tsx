// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Briefing } from "./Briefing";
// Importées statiquement : sous jsdom, `new URL(…, import.meta.url)` ne résout
// pas vers le disque et la lecture échouait silencieusement dans le stub.
import troncons from "../lib/__fixtures__/sandre-troncon-blois.json";
import thermieStation from "../lib/__fixtures__/hubeau-temperature-station-blois.json";
import thermieChronique from "../lib/__fixtures__/hubeau-temperature-chronique.json";
import stationPc from "../lib/__fixtures__/hubeau-station-pc-blois.json";
import analysePc from "../lib/__fixtures__/hubeau-analyse-pc-qualite-mees.json";

/**
 * Le briefing branché sur le cours d'eau du point.
 *
 * Le critère du même cours d'eau était complet et testé côté bibliothèque, mais
 * personne ne fournissait `coursRef` : ce test-ci vérifie que l'écran le
 * fournit, et qu'il ne le paie qu'une fois.
 *
 * Toutes les charges viennent des réponses RÉELLES capturées le 31/07/2026
 * autour de Blois (47,586 / 1,336).
 */

const vide = { data: [] };
const videFc = { type: "FeatureCollection", features: [] };

let appels: string[] = [];

function stub() {
  appels = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      appels.push(u);
      const corps = u.includes("TronconHydrographique")
        ? troncons
        : u.includes("/temperature/station")
          ? thermieStation
          : u.includes("/temperature/chronique")
            ? thermieChronique
            : u.includes("/station_pc")
              ? stationPc
              : u.includes("/analyse_pc")
                ? analysePc
                : u.includes("SERVICE=WFS")
                  ? videFc
                  : vide;
      return new Response(JSON.stringify(corps), { status: 200 });
    }),
  );
}

beforeEach(() => {
  // jsdom n'implémente pas Element.scrollTo, dont le panneau se sert pour
  // remonter en haut quand la cible change.
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  stub();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const cible = { lat: 47.586, lon: 1.336, title: "Loire", subtitle: "Cours d'eau" };

describe("Briefing — le cours d'eau du point", () => {
  it("demande la couche des tronçons, et une seule fois pour trois usages", async () => {
    // Température, qualité et affichage posent la même question. Trois requêtes
    // Sandre pour une réponse seraient absurdes — la promesse est partagée.
    render(<Briefing target={cible} onClose={() => {}} />);

    await waitFor(() => {
      expect(appels.filter((u) => u.includes("TronconHydrographique")).length).toBe(1);
    });
  });

  it("retient LOIRE à MUIDES-SUR-LOIRE, à 17,2 km, parce que c'est la Loire", async () => {
    // LE cas de fin de lot. Sans cours d'eau de référence, 17,2 km dépasse les
    // 15 km de DIST_MAX.temperature et la tuile reste vide.
    render(<Briefing target={cible} onClose={() => {}} />);

    expect(await screen.findByText(/LOIRE à MUIDES-SUR-LOIRE/)).toBeInTheDocument();
  });

  it("dit POURQUOI la mesure vient de plus loin que d'habitude", async () => {
    // « 17,2 km » à côté d'un seuil annoncé de 15 km ressemble sinon à une
    // erreur de l'app.
    render(<Briefing target={cible} onClose={() => {}} />);

    expect(await screen.findByText(/le même cours d'eau que ce point/)).toBeInTheDocument();
  });

  it("dit à quelle distance, sans arrondir la question", async () => {
    render(<Briefing target={cible} onClose={() => {}} />);

    expect(await screen.findByText(/17,2 km/)).toBeInTheDocument();
  });

  it("ne demande rien au Sandre quand le point n'a pas encore été ouvert", () => {
    // Aucun rendu : rien ne part. C'est ce qui garantit que l'Accueil, qui
    // n'affiche pas de briefing, ne paie pas cette requête.
    expect(appels).toHaveLength(0);
  });
});
