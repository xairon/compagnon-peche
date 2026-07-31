import { describe, it, expect } from "vitest";
import { confusionMediaId, NAME_TO_ID } from "./media-helpers";
import { SPECIES } from "../data/species";
import { SPECIES_MEDIA } from "../data/media";
import { FICHES } from "../data/fiches";

// Confusion blocks are the point of the identification screens: "this is the
// one you mistake it for, here is how to tell them apart". A hand-written
// name→id table of 30 entries covered a third of the ~60 names the fiches
// actually cite, so most comparisons showed an empty frame next to the text —
// while the photo sat embedded and precached.

/** Every confusion name cited by a displayed fiche (Fiche.tsx reads ident.conf). */
function confusionNames(): string[] {
  const out = new Set<string>();
  for (const f of Object.values(FICHES)) {
    for (const c of f.ident?.conf ?? []) out.add(c.n);
  }
  return [...out];
}

describe("confusionMediaId", () => {
  it("résout les noms qui correspondent à une espèce du catalogue", () => {
    expect(confusionMediaId("Brème bordelière")).toBe("breme-bordeliere");
    expect(confusionMediaId("Omble chevalier")).toBe("omble-chevalier");
  });

  it("ignore la casse et les accents", () => {
    expect(confusionMediaId("breme bordeliere")).toBe("breme-bordeliere");
  });

  it("garde les alias manuels hors catalogue", () => {
    // Grémille and carassin have photos but no Species entry.
    expect(confusionMediaId("Grémille")).toBe("gremille");
    expect(confusionMediaId("Carassin")).toBe("carassin");
  });

  it("ne rend rien pour un nom inconnu", () => {
    expect(confusionMediaId("Poisson imaginaire")).toBeNull();
  });

  it("trouve une photo pour la grande majorité des confusions citées", () => {
    const noms = confusionNames();
    expect(noms.length).toBeGreaterThan(30);

    const sansPhoto = noms.filter((n) => {
      const id = confusionMediaId(n);
      return !id || !SPECIES_MEDIA[id]?.length;
    });
    // Some cited species genuinely have no embedded photo; what must not
    // happen is a photo existing and the name failing to reach it.
    const resolvablesNonResolus = sansPhoto.filter((n) => {
      const sp = SPECIES.find((s) => s.name.toLowerCase() === n.toLowerCase());
      return sp && SPECIES_MEDIA[sp.id]?.length;
    });
    expect(resolvablesNonResolus, "photo embarquée mais nom non résolu").toEqual([]);
  });
});

describe("NAME_TO_ID", () => {
  it("ne garde en manuel que ce que le catalogue ne donne pas", () => {
    const parNom = new Map(SPECIES.map((s) => [s.name.toLowerCase(), s.id]));
    const redondants = Object.entries(NAME_TO_ID).filter(
      ([nom, id]) => parNom.get(nom.toLowerCase()) === id,
    );
    expect(redondants.map(([n]) => n), "doublons du catalogue à retirer").toEqual([]);
  });
});
