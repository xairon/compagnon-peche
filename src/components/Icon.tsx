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
