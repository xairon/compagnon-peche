import { describe, it, expect } from "vitest";
import { thumbOf } from "./thumbs";

describe("thumbOf", () => {
  it("redirige une photo d'espèce vers sa vignette", () => {
    expect(thumbOf("assets/species/sandre.webp")).toBe("assets/species-sm/sandre.webp");
  });

  it("laisse intact ce qui n'est pas une photo d'espèce", () => {
    expect(thumbOf("assets/knots/palomar.webp")).toBe("assets/knots/palomar.webp");
    expect(thumbOf("assets/recipes/matelote.webp")).toBe("assets/recipes/matelote.webp");
  });

  it("ne transforme pas deux fois une vignette déjà résolue", () => {
    expect(thumbOf("assets/species-sm/sandre.webp")).toBe("assets/species-sm/sandre.webp");
  });
});
