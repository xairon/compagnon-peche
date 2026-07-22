import { useStore } from "../store";
import { SOURCES } from "../data/regulation";

export function Sources() {
  const { back } = useStore();
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Sources &amp; mentions</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        {SOURCES.map((s) => (
          <div key={s.t} style={{ padding: "13px 2px", borderBottom: "1px solid #ECE8DD" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.t}</div>
            <div style={{ fontSize: 12.5, color: "#6b675c", marginTop: 2, lineHeight: 1.5 }}>
              {s.d}
            </div>
          </div>
        ))}
        <div className="info" style={{ marginTop: 18 }}>
          Aucune donnée réglementaire ou sanitaire n'est inventée : tout est sourcé ou marqué « à
          vérifier ». Votre carnet, vos photos et votre profil restent 100 % sur votre appareil —
          jamais transmis, pas de tracking. En revanche, la carte et la météo envoient votre position
          aux API publiques ci-dessus (IGN, Hub'Eau, Open-Meteo, OSM, GBIF) pour charger les données
          du lieu.
        </div>
      </div>
    </div>
  );
}
