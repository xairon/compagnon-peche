import type { Species } from "../types";

export interface SeasonState {
  open: boolean;
  label: string;
}

// nth weekday of a month, e.g. 2nd Saturday of March.
function nth(year: number, month: number, dow: number, n: number): Date {
  const x = new Date(year, month, 1);
  let c = 0;
  for (;;) {
    if (x.getDay() === dow) {
      c++;
      if (c === n) return new Date(x);
    }
    x.setDate(x.getDate() + 1);
  }
}

// last given weekday of a month.
function last(year: number, month: number, dow: number): Date {
  const x = new Date(year, month + 1, 0);
  while (x.getDay() !== dow) x.setDate(x.getDate() - 1);
  return x;
}

/**
 * Whether a species is in open season at `now`, computed from the national
 * category rules (F2117). Departmental arrêtés can differ — the UI says so.
 */
export function season(sp: Species, now: Date = new Date()): SeasonState {
  const y = now.getFullYear();

  if (sp.invasive) return { open: true, label: "Capture toute l'année" };

  if (sp.season === "cat1") {
    const o = nth(y, 2, 6, 2); // 2nd Saturday of March
    const c = nth(y, 8, 0, 3); // 3rd Sunday of September
    c.setHours(23, 59, 59, 999); // the closing day itself is still open
    return now >= o && now <= c
      ? { open: true, label: "Pêche ouverte (1ʳᵉ cat.)" }
      : { open: false, label: "Fermée (1ʳᵉ cat.)" };
  }

  if (sp.season === "brochet") {
    const c1 = last(y, 0, 0); // last Sunday of January
    c1.setHours(23, 59, 59, 999); // open through the whole closing day
    const o2 = last(y, 3, 6); // last Saturday of April
    return now <= c1 || now >= o2
      ? { open: true, label: "Pêche ouverte" }
      : { open: false, label: "Brochet fermé" };
  }

  return { open: true, label: "Ouverte toute l'année" };
}
