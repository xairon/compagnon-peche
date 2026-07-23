import { useState, useEffect, useRef, useId, type ReactNode } from "react";

/**
 * Tap-to-reveal explanation bubble. Works on touch (no hover needed): tap the
 * trigger to toggle, tap anywhere else — or press Escape — to dismiss. The bubble
 * is linked to the trigger (aria-describedby) and shifted horizontally so it
 * always stays fully within the viewport (clamped on both edges), never clipped —
 * including for grid tiles whose trigger sits near the centre.
 */
const BUBBLE_MAX = 250; // keep in sync with .tip-bubble width in styles.css
const EDGE_MARGIN = 8;
export function Tip({
  children,
  text,
  icon = true,
}: {
  children: ReactNode;
  text: string;
  icon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0); // px offset of the bubble from the trigger
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openNow = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      // Clamp the bubble fully inside the viewport (both edges), then express the
      // result as an offset from the trigger — robust for any trigger position,
      // unlike a binary left/right flip which overflows for near-centre triggers.
      const margin = EDGE_MARGIN;
      const bw = Math.min(BUBBLE_MAX, window.innerWidth * 0.74);
      const vpLeft = Math.max(margin, Math.min(r.left, window.innerWidth - bw - margin));
      setLeft(vpLeft - r.left);
    }
    setOpen((o) => !o);
  };

  return (
    <span className="tip-wrap" ref={ref}>
      <button
        type="button"
        className="tip-trigger"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          openNow();
        }}
      >
        {children}
        {icon && (
          <svg viewBox="0 0 24 24" className="tip-i" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="11" x2="12" y2="16" />
            <circle cx="12" cy="7.7" r="0.6" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      {open && (
        <span id={id} className="tip-bubble" style={{ left }} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
