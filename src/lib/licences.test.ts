import { describe, it, expect } from "vitest";
import { licenceUrl } from "./licences";
import { MEDIA_BY_KIND } from "../components/media-helpers";

// CC licences require the redistributor to link to the licence text, not just
// name it: "CC BY-SA 4.0" as bare characters tells a reader nothing about what
// they may do. Derived from the licence string rather than stored per entry —
// 189 media entries, one rule.

describe("licenceUrl", () => {
  it("pointe la bonne version et la bonne variante", () => {
    expect(licenceUrl("CC BY 4.0")).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(licenceUrl("CC BY-SA 3.0")).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
    expect(licenceUrl("CC BY-SA 2.5")).toBe("https://creativecommons.org/licenses/by-sa/2.5/");
    expect(licenceUrl("CC0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
  });

  it("garde le suffixe de juridiction, qui désigne un texte différent", () => {
    // The German port is its own legal text; dropping "de" would link to the
    // wrong one.
    expect(licenceUrl("CC BY-SA 3.0 de")).toBe("https://creativecommons.org/licenses/by-sa/3.0/de/");
    expect(licenceUrl("CC BY-SA 2.0 DE")).toBe("https://creativecommons.org/licenses/by-sa/2.0/de/");
  });

  it("ne rend pas de lien quand aucun texte de licence ne s'applique", () => {
    expect(licenceUrl("Domaine public")).toBeNull();
  });

  it("renvoie le modèle Commons pour une licence d'attribution simple", () => {
    // Not a CC licence — inventing a CC URL for it would misstate the terms.
    expect(licenceUrl("Attribution (libre)")).toContain("commons.wikimedia.org");
  });

  it("ne devine jamais : une licence inconnue ne produit pas de lien", () => {
    expect(licenceUrl("Licence maison v2")).toBeNull();
  });

  it("ne rend pas de lien pour les schémas dessinés par l'app", () => {
    // Own work: there is no third-party licence text to point at.
    expect(licenceUrl("Schéma original")).toBeNull();
  });

  it("couvre chaque licence réellement présente dans le corpus", () => {
    // The guard: a new licence string this function does not know would
    // silently ship an unlinked credit. Only two cases legitimately have no
    // licence text — everything else is a third party's terms.
    const SANS_TEXTE = new Set(["Domaine public", "Schéma original"]);

    const inconnues = new Set<string>();
    for (const table of Object.values(MEDIA_BY_KIND)) {
      for (const v of Object.values(table)) {
        for (const m of Array.isArray(v) ? v : [v]) {
          if (!SANS_TEXTE.has(m.license) && licenceUrl(m.license) === null) {
            inconnues.add(m.license);
          }
        }
      }
    }
    expect([...inconnues]).toEqual([]);
  });
});
