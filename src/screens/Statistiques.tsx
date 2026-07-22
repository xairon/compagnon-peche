import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { DAY_PARTS, dayPart, type DayPart } from "../lib/helpers";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const HAS_FICHE = new Set(SPECIES.map((s) => s.id));

export function Statistiques() {
  const { state, back, openSp } = useStore();
  const catches = state.catches;

  const total = catches.length;
  const speciesCount = new Set(catches.map((c) => c.spid)).size;
  const record = catches.reduce((m, c) => (c.n > m ? c.n : m), 0);
  const kept = catches.filter((c) => c.kept).length;

  // By species: count + record, most caught first.
  const bySpecies = Object.values(
    catches.reduce<Record<string, { spid: string; sp: string; count: number; record: number }>>((acc, c) => {
      const e = acc[c.spid] || { spid: c.spid, sp: c.sp, count: 0, record: 0 };
      e.count++;
      if (c.n > e.record) e.record = c.n;
      acc[c.spid] = e;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const byMonth = Array(12).fill(0) as number[];
  for (const c of catches) {
    const m = parseInt(c.iso.split("-")[1]) - 1;
    if (m >= 0 && m < 12) byMonth[m]++;
  }
  const monthMax = Math.max(1, ...byMonth);

  const byPart = Object.fromEntries(DAY_PARTS.map((p) => [p, 0])) as Record<DayPart, number>;
  let withTime = 0;
  for (const c of catches) {
    const p = dayPart(c.time);
    if (p) {
      byPart[p]++;
      withTime++;
    }
  }
  const partMax = Math.max(1, ...Object.values(byPart));

  const relPct = total ? Math.round(((total - kept) / total) * 100) : 0;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back back-round" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title serif" style={{ fontSize: 20 }}>
            Statistiques
          </div>
          {total > 0 && (
            <div style={{ fontSize: 12, color: "#948f81", marginTop: 1 }}>
              Depuis vos {total} prise{total > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <div className="pad">
        {total === 0 ? (
          <div className="empty-note">
            Aucune prise pour l'instant. Vos statistiques apparaîtront ici dès votre première capture.
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="st-summary">
              <div className="st-card fir">
                <div className="st-n">{total}</div>
                <div className="st-l">Prises</div>
              </div>
              <div className="st-card">
                <div className="st-n">{speciesCount}</div>
                <div className="st-l">Espèces</div>
              </div>
              <div className="st-card">
                <div className="st-n">
                  {record ? record : "—"}
                  {record ? <span className="st-sub"> cm</span> : null}
                </div>
                <div className="st-l">Record</div>
              </div>
              <div className="st-card">
                <div className="st-n green">
                  {relPct}
                  <span className="st-sub"> %</span>
                </div>
                <div className="st-l">Relâchées</div>
              </div>
            </div>

            {/* By species */}
            <div className="st-h">Par espèce</div>
            <div className="st-species">
              {bySpecies.map((s) => {
                const clickable = HAS_FICHE.has(s.spid);
                return (
                  <button
                    key={s.spid}
                    className="st-sp"
                    disabled={!clickable}
                    onClick={() => clickable && openSp(s.spid)}
                  >
                    <div className="st-sp-bar">
                      <div className="st-sp-fill" style={{ width: `${(s.count / bySpecies[0].count) * 100}%` }} />
                      <span className="st-sp-name">{s.sp}</span>
                    </div>
                    <div className="st-sp-meta">
                      {s.count} · rec. {s.record || "—"} cm
                    </div>
                  </button>
                );
              })}
            </div>

            {/* By month */}
            <div className="st-h">Par mois</div>
            <div className="st-bars">
              {byMonth.map((v, i) => (
                <div className="st-bar-col" key={i}>
                  <div className="st-bar-track">
                    <div className="st-bar-fill" style={{ height: `${(v / monthMax) * 100}%` }} />
                  </div>
                  <div className="st-bar-x">{MONTHS[i]}</div>
                </div>
              ))}
            </div>

            {/* By time of day */}
            <div className="st-h">Par moment de la journée</div>
            {withTime === 0 ? (
              <div className="st-note">Ajoutez l'heure à vos prises pour voir ce classement.</div>
            ) : (
              <div className="st-parts">
                {DAY_PARTS.map((p) => (
                  <div className="st-part" key={p}>
                    <span className="st-part-l">{p}</span>
                    <div className="st-part-track">
                      <div className="st-part-fill" style={{ width: `${(byPart[p] / partMax) * 100}%` }} />
                    </div>
                    <span className="st-part-n">{byPart[p]}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11.5, color: "#A8A495", marginTop: 18, lineHeight: 1.5 }}>
              Calculé depuis vos {total} prise(s), 100 % sur votre appareil.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
