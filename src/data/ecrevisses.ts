// The five crayfish an angler meets in Centre-Val de Loire. Regulatory wording
// follows the house rule: the national figure first, the préfectoral arrêté
// always as the last word — never a bare green light.

export interface Crayfish {
  id: string;
  name: string;
  latin: string;
  /** true = fishable (invasive); false = nationally protected. */
  pechable: boolean;
  /** The one sentence that matters when the balance comes out of the water. */
  note: string;
}

export const ECREVISSES: Crayfish[] = [
  {
    id: "louisiane",
    name: "Écrevisse de Louisiane",
    latin: "Procambarus clarkii",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
  },
  {
    id: "americaine",
    name: "Écrevisse américaine",
    latin: "Faxonius limosus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
  },
  {
    id: "signal",
    name: "Écrevisse signal",
    latin: "Pacifastacus leniusculus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
  },
  {
    id: "pattes-blanches",
    name: "Écrevisse à pattes blanches",
    latin: "Austropotamobius pallipes",
    pechable: false,
    note: "Espèce protégée — remise à l'eau immédiate, sans la sortir de l'eau si possible.",
  },
  {
    id: "pattes-rouges",
    name: "Écrevisse à pattes rouges",
    latin: "Astacus astacus",
    pechable: false,
    note: "Espèce protégée dans les départements couverts — remise à l'eau immédiate.",
  },
];

export const PECHABLES = ECREVISSES.filter((e) => e.pechable);

export function crayfishById(id: string): Crayfish | undefined {
  return ECREVISSES.find((e) => e.id === id);
}

/** Shown on the session setup screen. */
export const REG_BALANCES = [
  "6 balances au maximum par pêcheur (repère national) — jusqu'à 10 dans certains départements.",
  "Diamètre maximal d'une balance : 30 cm.",
  "Périodes et cours d'eau autorisés : vérifiez l'arrêté préfectoral en vigueur.",
];

export const REG_SOURCE = "Code de l'environnement, art. R436-23 à R436-29 · R432-5";

/** The 9 cm figure exists (R436-18) but the species it targets is protected here:
 *  it is displayed WITH that caveat, never as a permission. */
export const MAILLE_NOTE =
  "Une maille de 9 cm figure au R436-18 pour l'écrevisse à pattes rouges, mais cette espèce est protégée dans les départements couverts (23 · 36 · 41) : elle ne se pêche pas. Les trois espèces pêchables n'ont pas de taille minimale.";
