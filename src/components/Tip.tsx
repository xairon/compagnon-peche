import { useState, useEffect, useRef, useId, type ReactNode } from "react";

/**
 * Tap-to-reveal explanation bubble. Works on touch (no hover needed): tap the
 * trigger to toggle, tap anywhere else — or press Escape — to dismiss. The bubble
 * is linked to the trigger (aria-describedby) and flips to the right edge when the
 * trigger sits in the right half, so it never gets clipped.
 */
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
  const [right, setRight] = useState(false);
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
    if (r) setRight(r.left + r.width / 2 > window.innerWidth / 2);
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
        <span id={id} className={"tip-bubble" + (right ? " right" : "")} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
