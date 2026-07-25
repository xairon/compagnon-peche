import type { Species } from "../../types";
import { CYPRINIDES } from "./cyprinides";
import { MIGRATEURS } from "./migrateurs";
import { AUTRES } from "./autres";
import { CARNASSIERS_SALMONIDES } from "./carnassiers-salmonides";

/**
 * Enrichment overlays for the auto-generated "base" species.
 *
 * `species-base.ts` is machine-generated (taxonomy + national regulation) and
 * carries the header "do not edit by hand". Yet most species live only there,
 * with no identification, fishing, cooking or biology section — an angler
 * opening one of those fiches reads the law and nothing else.
 *
 * Rather than hand-patch a generated file (a regeneration would silently revert
 * it, as already happened with the moratorium fix), each batch of fiches lives
 * in its own module here and is merged over the generated data. Splitting by
 * group also lets batches be written independently without touching one file.
 *
 * A fiche only ever ADDS descriptive sections. It must never carry `maille`,
 * `quota`, `season`, `protected` or `invasive`: those come from the generator
 * and the regulation modules, and having two sources for a legal value is
 * exactly the split this app has spent so long removing. A test enforces it.
 */
export interface Fiche {
  ident?: Species["ident"];
  fish?: Species["fish"];
  cook?: Species["cook"];
  bio?: Species["bio"];
  /** Where the descriptive content comes from. Shown on the fiche: this app
   *  sources what it asserts, and a hand-written fiche is no exception. */
  ficheSrc?: string;
}

/** Every overlay, keyed by species id. */
export const FICHES: Record<string, Fiche> = {
  ...CYPRINIDES,
  ...MIGRATEURS,
  ...AUTRES,
  ...CARNASSIERS_SALMONIDES,
};

/** Apply the overlay for a species, if any — descriptive sections only. */
export function withFiche(sp: Species): Species {
  const f = FICHES[sp.id];
  if (!f) return sp;
  const enriched = !!(f.ident || f.fish || f.cook || f.bio);
  return {
    ...sp,
    ident: f.ident ?? sp.ident,
    fish: f.fish ?? sp.fish,
    cook: f.cook ?? sp.cook,
    bio: f.bio ?? sp.bio,
    ficheSrc: f.ficheSrc ?? sp.ficheSrc,
    // Once it carries real content it is no longer a bare "base" record, and the
    // UI should stop labelling it as one.
    depth: enriched ? undefined : sp.depth,
  };
}
