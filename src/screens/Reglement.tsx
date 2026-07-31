import { useEffect, useState } from "react";
import { REG_YEAR } from "../data/version";
import { useStore } from "../store-hooks";
import { chargerRegTiers, type RegTiers as RegTiersData } from "../lib/reg-tiers";
import { RegTiers } from "../components/RegTiers";
import { NATIONAL_SIZES, DEPARTEMENTS, type DeptId } from "../data/regulation";
import { MAILLE_NOTE } from "../data/ecrevisses";
import { OutOfZoneWarning } from "../components/OutOfZoneWarning";
import { DeptDefautWarning } from "../components/DeptDefautWarning";
import { RegPerimeeWarning } from "../components/RegPerimeeWarning";

export function Reglement() {
  const { state, set, back } = useStore();
  const dept = DEPARTEMENTS[state.dept];
  // 80 ko de fiches tierces que la plupart des sessions n'ouvriront jamais :
  // chargées à la demande, pas dans le premier rendu de tout le monde.
  const [tiersOuvert, setTiersOuvert] = useState(false);
  const [tiers, setTiers] = useState<RegTiersData | null>(null);
  const [tiersErr, setTiersErr] = useState(false);

  useEffect(() => {
    if (!tiersOuvert || tiers) return;
    let vivant = true;
    chargerRegTiers().then(
      (d) => vivant && setTiers(d),
      // Un échec de chargement de module n'est pas « pas de données » : le
      // dire, plutôt que d'afficher une liste vide.
      () => vivant && setTiersErr(true),
    );
    return () => {
      vivant = false;
    };
  }, [tiersOuvert, tiers]);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Réglementation</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        {/* Stale data outranks the department question: applying the right
            département's figures from the wrong season is still wrong. */}
        <RegPerimeeWarning dept={state.dept} style={{ marginTop: 0, marginBottom: 12 }} />
        {state.outOfZoneDept ? (
          <OutOfZoneWarning
            outOfZoneDept={state.outOfZoneDept}
            activeDept={state.dept}
            style={{ marginTop: 0, marginBottom: 12 }}
          />
        ) : (
          <DeptDefautWarning
            deptChosen={state.deptChosen}
            activeDept={state.dept}
            style={{ marginTop: 0, marginBottom: 12 }}
          />
        )}
        <div className="label" style={{ margin: "8px 0 8px" }}>
          Socle national — tailles minimales
        </div>
        <div className="reg-table">
          {NATIONAL_SIZES.map(([k, v]) => (
            <div key={k} className="reg-row">
              <span style={{ color: "#3A3E36" }}>{k}</span>
              <span style={{ fontWeight: 650 }}>{v}</span>
            </div>
          ))}
          {/* La ligne « 9 cm » ne doit jamais se lire comme une autorisation :
              même mise en garde que sur l'écran Écrevisses, même source. */}
          <div className="reg-note">{MAILLE_NOTE}</div>
          <div className="reg-note">
            Art. R436-18 du Code de l'environnement. Le préfet peut modifier ces tailles localement
            (R436-19/20) — le national est un socle, pas une constante.
          </div>
        </div>

        <div className="label" style={{ margin: "18px 0 8px" }}>
          Quota carnassiers (2ᵉ catégorie)
        </div>
        <div className="reg-block">
          <b>3 carnassiers / jour</b> (sandre + brochet + black-bass), <b>dont 2 brochets maximum</b>.
          Le préfet peut durcir, jamais assouplir.
          <div style={{ fontSize: 11.5, color: "#A8A495", marginTop: 8 }}>Art. R436-21.</div>
        </div>

        <div className="label" style={{ margin: "18px 0 8px" }}>
          Périodes &amp; horaires
        </div>
        <div className="reg-block">
          <b>1ʳᵉ catégorie</b> : du 2ᵉ samedi de mars au 3ᵉ dimanche de septembre.
          <br />
          <b>2ᵉ catégorie</b> : ouverte à l'année. Brochet : fermé sauf du 1ᵉʳ janvier au dernier
          dimanche de janvier, puis du dernier samedi d'avril au 31 décembre.
          <br />
          <b>Horaires</b> : de ½ h avant le lever à ½ h après le coucher du soleil.
          <div style={{ fontSize: 11.5, color: "#A8A495", marginTop: 8 }}>
            Fiche F2117, service-public.gouv.fr.
          </div>
        </div>

        {/* The picker sits BEFORE the block it governs: it used to be an
            unlabelled row of buttons below everything, which read as decoration
            rather than as the control deciding which arrêté is quoted. */}
        <div className="label" style={{ margin: "18px 0 8px" }}>
          Mon département {state.deptChosen ? `— ${dept.name}` : "— non confirmé"}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(Object.keys(DEPARTEMENTS) as DeptId[]).map((id) => {
            const active = state.deptChosen && state.dept === id;
            return (
              <button
                key={id}
                aria-pressed={active}
                onClick={() => set({ dept: id, deptChosen: true })}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "4px 6px",
                  borderRadius: 12,
                  fontSize: 12.5,
                  lineHeight: 1.15,
                  fontWeight: 600,
                  border: `1.5px solid ${active ? "#16281E" : "#E6E2D8"}`,
                  background: active ? "#16281E" : "#FFFFFF",
                  color: active ? "#FBFAF7" : "#3A3E36",
                }}
              >
                {DEPARTEMENTS[id].name}
              </button>
            );
          })}
        </div>
        <div className="reg-block">
          {dept.regText}
          <div className="note" style={{ marginTop: 10 }}>
            Arrêté préfectoral annuel — valable pour {REG_YEAR}. À revérifier chaque début d'année.
          </div>
          <div style={{ marginTop: 10, fontSize: 13.5 }}>
            <a href={dept.url} target="_blank" rel="noreferrer">
              Réglementation complète — {dept.fede} ↗
            </a>
          </div>
        </div>


        {/* L'app connaît l'arrêté de trois départements. Pour les autres elle
            ne disait rien du tout ; elle peut désormais montrer une fiche de
            seconde main, à condition de le dire dans ces mots. */}
        <div className="label" style={{ margin: "18px 0 8px" }}>
          Je pêche dans un autre département
        </div>
        {!tiersOuvert ? (
          <button
            className="rgt-ouvrir"
            style={{ minHeight: 44 }}
            onClick={() => setTiersOuvert(true)}
          >
            Voir la réglementation d'un autre département ›
          </button>
        ) : tiersErr ? (
          <div className="ecr-warn">
            Les fiches des autres départements n'ont pas pu être chargées. Ce n'est pas « aucune
            donnée » : réessayez une fois en ligne.
          </div>
        ) : !tiers ? (
          <div className="reg-note">Chargement des fiches…</div>
        ) : (
          <RegTiers
            fiches={tiers.fiches}
            consulteLe={tiers.consulteLe}
            codeInitial={state.outOfZoneDept ?? tiers.fiches[0]?.code ?? ""}
          />
        )}

        <div className="disclaimer">
          Cette app est un outil d'aide. La réglementation applicable est celle de l'arrêté
          préfectoral en vigueur ; vérifiez-la. Ailleurs en France : consultez la fédération de votre
          département.
        </div>
      </div>
    </div>
  );
}
