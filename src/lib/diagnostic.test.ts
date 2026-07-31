import { describe, it, expect } from "vitest";
import { rapportDiagnostic, lienSignalement, CONTACT } from "./diagnostic";

// The app's whole claim is "rien n'est inventé" — every figure is sourced. That
// claim needs a correction mechanism, and there was none: no mailto, no issue
// link, no version number. A doubt already written into the code
// (regulation.ts:127, trout size 23 vs 25 cm in the Loir-et-Cher) could not be
// resolved by the one person able to check it — an angler standing there.

const CTX = {
  ecran: "fiche",
  dept: "36" as const,
  espece: "brochet",
  detail: "La maille indiquée ne correspond pas à l'arrêté.",
};

describe("rapportDiagnostic", () => {
  it("porte la version du build, sans quoi un signalement n'est pas rattachable", () => {
    const r = rapportDiagnostic(CTX);

    expect(r).toMatch(/version/i);
  });

  it("porte le contexte que l'utilisateur ne saura pas donner lui-même", () => {
    const r = rapportDiagnostic(CTX);

    expect(r).toContain("fiche");
    expect(r).toContain("36");
    expect(r).toContain("brochet");
  });

  it("reste lisible quand il n'y a aucun contexte", () => {
    const r = rapportDiagnostic({});

    expect(r.length).toBeGreaterThan(0);
    expect(r).not.toContain("undefined");
    expect(r).not.toContain("null");
  });

  it("n'emporte aucune donnée personnelle", () => {
    // The report is pasted into a public issue tracker. Position, catches and
    // profile must never ride along.
    const r = rapportDiagnostic({ ...CTX, detail: "texte libre" }).toLowerCase();

    for (const interdit of ["lat", "lon", "carnet:", "photo", "profil"]) {
      expect(r, `« ${interdit} » ne doit pas figurer dans le rapport`).not.toContain(interdit);
    }
  });
});

describe("lienSignalement", () => {
  it("vise le canal public du projet, pas une adresse personnelle", () => {
    expect(CONTACT).toContain("github.com/xairon/compagnon-peche");
  });

  it("pré-remplit le rapport pour que l'utilisateur n'ait qu'à décrire", () => {
    const url = lienSignalement(CTX);

    expect(new URL(url).searchParams.get("body")).toContain("brochet");
  });

  it("encode le corps, sinon un accent ou une esperluette tronque le lien", () => {
    const detail = "maille & taille — à vérifier ?";

    const url = lienSignalement({ detail });

    // Read it back the way the browser will: an unescaped "&" would silently
    // cut the report in half.
    expect(new URL(url).searchParams.get("body")).toContain(detail);
  });
});
