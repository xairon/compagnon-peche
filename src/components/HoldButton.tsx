import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

/**
 * Hold-to-confirm button. A deliberate long press (default ~0.9 s) fires onConfirm,
 * so a destructive action ("garder / mise à mort") can't trigger from an accidental
 * tap with wet gloves. Releasing early cancels.
 */
export function HoldButton({
  onConfirm,
  children,
  className,
  style,
  duration = 900,
}: {
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  duration?: number;
}) {
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const holding = useRef(false);
  const startT = useRef(0);

  const stop = () => {
    holding.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    setProgress(0);
  };

  const begin = () => {
    holding.current = true;
    startT.current = 0;
    const tick = (t: number) => {
      if (!holding.current) return;
      if (!startT.current) startT.current = t;
      const p = Math.min(1, (t - startT.current) / duration);
      setProgress(p);
      if (p >= 1) {
        holding.current = false;
        setProgress(0);
        onConfirm();
      } else {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Keyboard equivalent: hold Space/Enter to arm (repeat events keep it held),
  // release to cancel. Without this the destructive step is unreachable by
  // keyboard/switch users — a hard block when "kill" is the only path (invasives).
  const onKeyDown = (ev: ReactKeyboardEvent) => {
    if ((ev.key === " " || ev.key === "Enter") && !holding.current) {
      ev.preventDefault();
      begin();
    }
  };
  const onKeyUp = (ev: ReactKeyboardEvent) => {
    if (ev.key === " " || ev.key === "Enter") stop();
  };

  return (
    <button
      type="button"
      className={"hold-btn " + (className || "")}
      style={style}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={stop}
    >
      <span className="hold-fill" style={{ width: `${progress * 100}%` }} />
      <span className="hold-label">{progress > 0 ? "Maintenez pour confirmer…" : children}</span>
    </button>
  );
}
