import { describe, it, expect } from "vitest";
import { lateBody } from "./notify";

describe("lateBody", () => {
  it("à l'heure (0 s) → invite à relever maintenant", () => {
    expect(lateBody(0)).toBe("À relever maintenant");
  });

  it("valeur négative (avance) → invite à relever maintenant", () => {
    expect(lateBody(-30)).toBe("À relever maintenant");
  });

  it("retard sous la minute → arrondi à 0 → relever maintenant", () => {
    expect(lateBody(29)).toBe("À relever maintenant");
  });

  it("retard d'exactement une minute → affiche 1 min", () => {
    expect(lateBody(60)).toBe("À relever depuis 1 min");
  });

  it("retard de plusieurs minutes → affiche le nombre arrondi", () => {
    expect(lateBody(7 * 60 + 20)).toBe("À relever depuis 7 min");
  });
});
