import { useStore } from "../store-hooks";
import { ECREVISSES, TRI_CARPOPODITE, IDENT_CAVEAT } from "../data/ecrevisses";
import { Media } from "../components/Media";

export function EcrevissesIdent() {
  const { back } = useStore();

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Reconnaître les écrevisses</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        <div className="ecr-tri">
          <div className="ecr-tri-t">Le premier tri</div>
          <div className="ecr-tri-x">{TRI_CARPOPODITE}</div>
        </div>

        {ECREVISSES.map((e) => (
          <div key={e.id} className={"ecr-id" + (e.pechable ? "" : " protegee")}>
            <div className="ecr-id-ph">
              {/* Six local images on this screen, no network cost — eager avoids
                  the below-the-fold ones sitting unloaded behind the placeholder
                  background, which reads as "no photo" (see Media's `eager` doc). */}
              <Media kind="crayfish" id={e.id} placeholder={e.name} eager />
            </div>
            <div className="ecr-id-n">{e.name}</div>
            <div className="ecr-id-l">{e.latin}</div>
            <div className={"ecr-id-st" + (e.pechable ? "" : " ferme")}>{e.statut}</div>
            {e.presence && <div className="ecr-id-pr">{e.presence}</div>}
            {e.ident && (
              <>
                <div className="ecr-id-sum">{e.ident.summary}</div>
                <ul className="ecr-id-tr">
                  {e.ident.traits.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {e.ident.conf.map((c) => (
                  <div key={c.n} className="ecr-id-cf">
                    <b>Ne pas confondre avec {c.n}</b>
                    <div>{c.how}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}

        <div className="info" style={{ marginTop: 18 }}>
          {IDENT_CAVEAT}
        </div>
        <div className="ecr-reg-note" style={{ marginTop: 12 }}>
          L'écrevisse des torrents (<i>Austropotamobius torrentium</i>) est citée par les arrêtés
          préfectoraux, qui reprennent la liste nationale de R436-10 : elle vit en Alsace, en Moselle
          et en Haute-Savoie, pas ici. Elle n'a donc pas de fiche d'identification dans cette app.
        </div>
      </div>
    </div>
  );
}
