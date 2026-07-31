import { useStore } from "../store-hooks";
import { SOURCES } from "../data/regulation";
import { LICENCES_DONNEES } from "../data/licences-donnees";
import { buildLabel } from "../lib/build";
import { lienSignalement } from "../lib/diagnostic";
import { REG_YEAR, VERIFIE_LE } from "../data/version";

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
        {/* Attribution des données. Ce n'est pas une politesse : ODbL et CC BY
            font de l'attribution une CONDITION de la redistribution. L'app
            affichait des données OpenStreetMap, Open-Meteo et Eaufrance sans
            créditer personne. Les licences non établies sont dites comme
            telles plutôt que devinées. */}
        <div className="label" style={{ margin: "22px 0 8px" }}>
          Licences des données
        </div>
        <div className="lic-list">
          {LICENCES_DONNEES.map((l) => (
            <div key={l.source} className="lic">
              <div className="lic-tete">
                <span className="lic-src">{l.source}</span>
                {l.etat === "non-verifiee" ? (
                  <span className="lic-nv">licence non établie</span>
                ) : (
                  <a href={l.url} target="_blank" rel="noreferrer">
                    {l.licence} ↗
                  </a>
                )}
              </div>
              <div className="lic-mention">{l.mention}</div>
              {l.reserve && <div className="lic-reserve">{l.reserve}</div>}
              {l.verifieLe && <div className="lic-date">Vérifié le {l.verifieLe}.</div>}
            </div>
          ))}
        </div>

        <div className="info" style={{ marginTop: 18 }}>
          Aucune donnée réglementaire ou sanitaire n'est inventée : tout est sourcé ou marqué « à
          vérifier ». Votre carnet, vos photos et votre profil restent 100 % sur votre appareil —
          jamais transmis, pas de tracking. En revanche, la carte et la météo envoient votre position
          (ou la zone affichée) aux API publiques pour charger les données du lieu : IGN, Hub'Eau,
          Open-Meteo, OpenStreetMap/Overpass, GBIF et Sandre (Eaufrance). Si vous ouvrez la carte
          « Officielle », celle-ci est fournie par Géopêche (FNPF) et reçoit alors votre adresse IP et
          la zone consultée.
        </div>

        {/* The build identity, so a report can be attached to a version. An
            install that keeps dismissing the update prompt can sit on an old
            build for weeks, and nothing else on screen says which. */}
        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          Application {buildLabel()} · réglementation saison {REG_YEAR}, vérifiée le {VERIFIE_LE}.
          <br />
          <a href={lienSignalement({ ecran: "sources" })} target="_blank" rel="noreferrer">
            Signaler une erreur ou un manque ↗
          </a>
        </div>
      </div>
    </div>
  );
}
