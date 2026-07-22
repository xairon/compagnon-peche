interface IconProps {
  d: string;
  size?: number;
  stroke?: string;
  width?: number;
  viewBox?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** Thin line icon. All app icons are drawn — no emoji in the UI. */
export function Icon({
  d,
  size = 20,
  stroke = "currentColor",
  width = 1.5,
  viewBox = "0 0 24 24",
  style,
  className,
}: IconProps) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  search: "M15.5 15.5 21 21M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  ident: "M15.5 15.5 21 21M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  fish: "M4 12c2.5-3.5 6-5.5 9-5.5 3 0 5.5 2.5 7 5.5-1.5 3-4 5.5-7 5.5-3 0-6.5-2-9-5.5zM4 12 1.5 9v6zM16 11h.01",
  identifyEye:
    "M4 12c2.5-3.5 6-5.5 9-5.5 3 0 5.5 2.5 7 5.5-1.5 3-4 5.5-7 5.5-3 0-6.5-2-9-5.5zM4 12 1.5 9v6zM16 11h.01",
  arrowUp: "M12 3v18M5 10l7-7 7 7",
  mic: "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4",
  regle: "M12 4v17M5 6h14M7 6l-3 7a3.5 3.5 0 0 0 6 0zM17 6l-3 7a3.5 3.5 0 0 0 6 0z",
  peche: "M16 3a2 2 0 1 1 0 4v6a5 5 0 0 1-10 0v-2m0 0-2.2 2.2M6 11l2.2 2.2",
  cuisine: "M6 3v7a4 4 0 0 0 8 0V3M10 14v7M18 3c-1.5 2-1.5 5 0 7v11",
  sante: "M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z",
  bio: "M12 21C7 17 4 13 4 9a8 8 0 0 1 16 0c0 4-3 8-8 12zM12 21V9",
  alert: "M12 9v5M12 17.5h.01M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z",
  ruler: "M3 9h18v6H3zM7 9v3M11 9v4M15 9v3M19 9v4",
  knot: "M4 12c3-5 6-5 8 0s5 5 8 0M7 9l3 6M14 9l3 6",
  book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17V5M9 8h5M9 12h5",
  pin: "M12 21c-4-4-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  gloves:
    "M8 11V5.5a1.5 1.5 0 0 1 3 0V10m0-5v-1a1.5 1.5 0 0 1 3 0V10m0-4.5a1.5 1.5 0 0 1 3 0V11m0-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.8-3.1L4.5 14a1.7 1.7 0 0 1 2.9-1.8l.6.9",
  pot: "M8 3v2M12 3v2M16 3v2M5 9h14a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-1a2 2 0 0 1 2-2zM7 16v5h10v-5",
};

// Bottom-nav icons.
export const NAV_ICONS: Record<string, string> = {
  accueil: "M3 11 12 4l9 7M6 10v9h12v-9",
  especes: ICONS.fish,
  carte: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  prise: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  carnet: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17V5M9 8h5M9 12h5",
  outils: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6",
};

// Section icons on the fiche.
export const SEC_ICONS: Record<string, string> = {
  ident: ICONS.search,
  regle: ICONS.regle,
  peche: ICONS.peche,
  cuisine: ICONS.cuisine,
  sante: ICONS.sante,
  bio: ICONS.bio,
};
