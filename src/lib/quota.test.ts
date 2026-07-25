import { describe, it, expect } from "vitest";
import { effectiveQuota } from "./quota";
import { SPECIES } from "../data/species";
import { DEPT_REG } from "../data/regulation";
import type { Species } from "../types";

const sp = (id: string) => SPECIES.find((s) => s.id === id)!;

describe("effectiveQuota", () => {
  // The bug this module fixes: a national "—" must not shadow a departmental quota.
  it("rend le quota départemental quand l'espèce n'a pas de quota national (truite fario, 41)", () => {
    const truite = sp("truite-fario");
    expect(truite.quota).toBe("—"); // sanity: confirms the bug scenario
    const q = effectiveQuota(truite, "41");
    expect(q.text).toBe(DEPT_REG["41"].salmonideQuota);
    expect(q.local).toBe(true);
  });

  it("s'applique aussi à l'ombre et au huchon (groupe salmonidés 1ʳᵉ cat.)", () => {
    expect(effectiveQuota(sp("ombre"), "23").text).toBe(DEPT_REG["23"].salmonideQuota);
    expect(effectiveQuota(sp("ombre"), "23").local).toBe(true);
    expect(effectiveQuota(sp("huchon"), "23").text).toBe(DEPT_REG["23"].salmonideQuota);
  });

  it("le quota départemental l'emporte même quand l'espèce a un quota national (brochet)", () => {
    const q = effectiveQuota(sp("brochet"), "23");
    expect(q.text).toBe(DEPT_REG["23"].carnassierQuota);
    expect(q.local).toBe(true);
  });

  it("sans département, s'en tient au quota national", () => {
    const q = effectiveQuota(sp("brochet"), undefined);
    expect(q.text).toBe("2 / jour");
    expect(q.local).toBe(false);
  });

  it("sans spécificité départementale, rend le quota national de l'espèce", () => {
    const carp = { id: "carpe-imaginaire", quota: "5 / jour" } as Species;
    const q = effectiveQuota(carp, "41");
    expect(q.text).toBe("5 / jour");
    expect(q.local).toBe(false);
  });

  it("rend null quand ni le national ni le local ne fixent de quota", () => {
    const q = effectiveQuota(sp("gardon"), "41");
    expect(q.text).toBeNull();
    expect(q.local).toBe(false);
  });

  it("rend null sans département quand l'espèce n'a pas de quota national", () => {
    const q = effectiveQuota(sp("gardon"), undefined);
    expect(q.text).toBeNull();
  });
});
