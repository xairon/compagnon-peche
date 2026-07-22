import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";

// 1 cm ≈ 37.795 px at 96 dpi. Real-world accuracy depends on the device DPI —
// the on-screen note tells the user to sanity-check with a bank card (8.6 cm).
const PX_PER_CM = 37.795;

export function Regle() {
  const { state, back } = useStore();
  const cur = SPECIES.find((s) => s.id === state.spId) || SPECIES[0];
  const sp = SPECIES.find((s) => s.id === state.prise.sp) || cur;
  const cm = parseInt(sp.maille) || 0;

  // The ruler MUST keep the true 1:1 cm scale (it measures a fish laid on the
  // glass), so it can't shrink to fit. Instead we measure how many centimetres
  // actually fit on this device and warn when the maille exceeds that — never
  // render a maille line off-screen with no notice.
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaH, setAreaH] = useState(0);
  useEffect(() => {
    const measure = () => setAreaH(areaRef.current?.clientHeight ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Leave ~30px so the last label / maille caption isn't flush against the edge.
  const maxCm = areaH ? Math.max(1, Math.min(20, Math.floor((areaH - 30) / PX_PER_CM))) : 20;
  const over = cm > maxCm;
  const ticks = Array.from({ length: maxCm + 1 }, (_, i) => i);

  return (
    <div className="regle-wrap">
      <div className="topbar" style={{ position: "relative", zIndex: 2, paddingBottom: 2 }}>
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <div className="topbar-title">Règle à l'écran</div>
          <div className="h-sub">Posez le poisson contre l'écran, museau au 0</div>
        </div>
      </div>

      <div className="regle-area" ref={areaRef}>
        <div style={{ position: "absolute", top: 6, left: 56, right: 16, fontSize: 11, color: "#A8A495", lineHeight: 1.4 }}>
          Vérifiez l'échelle : une carte bancaire doit mesurer 8,6 cm sur cette règle.
        </div>

        {ticks.map((i) => (
          <div key={i}>
            <div className="tick-major" style={{ top: i * PX_PER_CM }} />
            <div className="tick-minor" style={{ top: i * PX_PER_CM + 18.9 }} />
            <div className="tick-label" style={{ top: i * PX_PER_CM }}>
              {i}
            </div>
          </div>
        ))}

        {cm > 0 && cm <= maxCm && (
          <>
            <div
              style={{
                position: "absolute",
                top: cm * PX_PER_CM,
                left: 0,
                right: 14,
                borderTop: "2px dashed #B33A2E",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: cm * PX_PER_CM,
                right: 14,
                transform: "translateY(6px)",
                fontSize: 12,
                fontWeight: 650,
                color: "#B33A2E",
                textAlign: "right",
              }}
            >
              Maille {sp.name} — {cm} cm
            </div>
          </>
        )}

        {over && (
          <div
            className="note"
            style={{ position: "absolute", bottom: 8, left: 16, right: 16, marginTop: 0 }}
          >
            Maille {sp.name} ({cm} cm) dépasse l'écran : mesurez en deux fois (repère au pouce), ou
            utilisez le repère physique de la fiche.
          </div>
        )}
      </div>
    </div>
  );
}
