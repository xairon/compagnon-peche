import { useEffect, useState } from "react";
import { REG_YEAR } from "../data/version";
import { useStore } from "../store-hooks";
import { chargerRegTiers, type RegTiers as RegTiersData } from "../lib/reg-tiers";
import { RegTiers } from "../components/RegTiers";
import { NATIONAL_SIZES, DEPARTEMENTS } from "../data/regulation";
import { MAILLE_NOTE } from "../data/ecrevisses";
import { OutOfZoneWarning } from "../components/OutOfZoneWarning";
import { DeptDefautWarning } from "../components/DeptDefautWarning";
import { DeptBouton } from "../components/DeptBouton";
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
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">Réglementation</h1>
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
              <span style={{ color: "var(--body)" }}>{k}</span>
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
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>Art. R436-21.</div>
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
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
            Fiche F2117, service-public.gouv.fr.
          </div>
        </div>

        {/* Le MÊME contrôle que l'Accueil, pas un second de son cru. Cet écran
            avait sa propre rangée de boutons : deux commandes d'apparence
            différente pour un seul réglage, et l'utilisateur ne savait plus
            laquelle faisait foi. Le contrôle reste ici — on veut pouvoir
            changer de département en lisant les règles — mais il se présente
            et se comporte exactement comme là-bas.

            Il reste AVANT le bloc qu'il gouverne : placé après, il se lisait
            comme une décoration plutôt que comme la commande qui décide de
            l'arrêté cité. */}
        <div className="label" style={{ margin: "18px 0 8px" }}>
          Mon département
        </div>
        <DeptBouton
          dept={state.dept}
          deptChosen={state.deptChosen}
          outOfZoneDept={state.outOfZoneDept}
          onChoose={(id) => set({ dept: id, deptChosen: true })}
          onVoirTout={() => {}}
        />

        <div className="reg-block">
          {dept.regText}
          <div className="note" style={{ marginTop: 10 }}>
            Arrêté préfectoral annuel — valable pour {REG_YEAR}. À revérifier chaque début d'année.
          </div>
          <div style={{ marginTop: 10, fontSize: 13.5 }}>
            <a className="rgl-lien-fede" href={dept.url} target="_blank" rel="noreferrer">
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
    </main>
  );
}
