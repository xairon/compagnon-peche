import { useStore } from "../store-hooks";
import { IDENTITE, champsACompleter, type Identite } from "../data/mentions-legales";

/**
 * Mentions légales — volet identité et volet sanitaire.
 *
 * Les clauses RÉGLEMENTAIRES existent déjà et ne sont pas répétées ici :
 * `Reglement.tsx` et `Fiche.tsx` portent chacun « la réglementation applicable
 * est celle de l'arrêté préfectoral en vigueur ». Ce qui manquait, c'est de dire
 * qui publie l'app, qui l'héberge, ce qu'elle fait des données — et que ni ses
 * verdicts ni ses avertissements sanitaires ne sont un conseil professionnel.
 *
 * L'identité vit dans `src/data/mentions-legales.ts`, avec l'explication des
 * marqueurs « à compléter » et de la barrière qui les garde.
 */

export function MentionsLegales({ identite }: { identite: Identite }) {
  const manque = champsACompleter(identite);

  return (
    <div className="mentions">
      {manque.length > 0 && (
        <div className="ecr-warn" role="alert">
          <b>Mentions légales incomplètes.</b> Il manque {manque.join(", ")}. Ces informations sont
          obligatoires pour un service en ligne ; elles n'ont volontairement pas été inventées.
        </div>
      )}

      <div className="label" style={{ margin: "18px 0 6px" }}>
        Éditeur
      </div>
      <div className="mentions-bloc">
        <div>{identite.editeur}</div>
        <div className="mentions-sec">Statut : {identite.statut}</div>
        <div className="mentions-sec">
          Contact :{" "}
          <a href={identite.contact} target="_blank" rel="noopener noreferrer">
            nous contacter / signaler une erreur ↗
          </a>
        </div>
        <div className="mentions-sec">
          Service publié à l'adresse{" "}
          <a href={identite.siteUrl} target="_blank" rel="noopener noreferrer">
            {identite.siteUrl}
          </a>
        </div>
      </div>

      <div className="label" style={{ margin: "18px 0 6px" }}>
        Hébergeur
      </div>
      <div className="mentions-bloc">
        <div>{identite.hebergeur}</div>
        <div className="mentions-sec">{identite.hebergeurAdresse}</div>
      </div>

      <div className="label" style={{ margin: "18px 0 6px" }}>
        Vos données
      </div>
      {/* Même promesse que l'écran Sources, dans les mêmes termes. Deux
          formulations différentes, ce sont deux promesses : l'utilisateur ne
          saurait plus laquelle fait foi. Et la seconde phrase dit ce qui SORT
          bel et bien de l'appareil — promettre moins que vrai est une faute
          symétrique de promettre plus. */}
      <div className="mentions-bloc">
        <div>
          Votre carnet, vos photos et votre profil restent 100 % sur votre appareil — jamais
          transmis, pas de tracking. Aucun compte, aucune inscription, aucune analyse d'audience.
        </div>
        <div className="mentions-sec">
          En revanche, la carte et la météo envoient votre position (ou la zone affichée) aux API
          publiques pour charger les données du lieu : IGN, Hub'Eau, Open-Meteo,
          OpenStreetMap/Overpass, GBIF et Sandre (Eaufrance). Si vous ouvrez la carte
          « Officielle », celle-ci est fournie par Géopêche (FNPF) et reçoit alors votre adresse IP
          et la zone consultée. Le détail des sources et de leurs licences est sur l'écran
          « Sources &amp; mentions ».
        </div>
        <div className="mentions-sec">
          Tout est effaçable depuis « Stockage &amp; données » : la suppression est immédiate et
          définitive, puisqu'il n'existe aucune copie ailleurs.
        </div>
      </div>

      <div className="label" style={{ margin: "18px 0 6px" }}>
        Portée de ce que l'app dit
      </div>
      {/* Le volet sanitaire n'existait nulle part. L'app affiche des repères de
          consommation issus des avis de l'ANSES et des verdicts « garder /
          relâcher » : les deux se lisent facilement comme une autorisation. */}
      <div className="mentions-bloc">
        <div>
          Cette app est un outil d'aide. Elle ne constitue <b>ni un conseil juridique</b>,{" "}
          <b>ni un avis médical</b>.
        </div>
        <div className="mentions-sec">
          Les tailles, quotas, périodes et verdicts « je garde / je relâche » sont transcrits des
          textes en vigueur, mais seul l'arrêté préfectoral de votre département fait foi : c'est
          lui qu'un garde-pêche opposera, pas cet écran. Vérifiez-le.
        </div>
        <div className="mentions-sec">
          Les repères de consommation et les avertissements sur les polluants reprennent des avis
          publics (ANSES, arrêtés de restriction). Ils ne remplacent pas l'avis d'un médecin, en
          particulier pour les femmes enceintes ou allaitantes, les jeunes enfants et les
          consommateurs réguliers de poisson de rivière.
        </div>
        <div className="mentions-sec">
          Les identifications d'espèces proposées par l'app sont des <i>hypothèses</i> à confirmer :
          plusieurs espèces protégées se confondent avec des espèces pêchables.
        </div>
      </div>

      <div className="disclaimer">
        Une erreur, un manque, une mention à corriger&nbsp;:{" "}
        <a href={identite.contact} target="_blank" rel="noopener noreferrer">
          dites-le ↗
        </a>
      </div>
    </div>
  );
}

export function Mentions() {
  const { back } = useStore();
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Mentions légales</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        <MentionsLegales identite={IDENTITE} />
      </div>
    </div>
  );
}
