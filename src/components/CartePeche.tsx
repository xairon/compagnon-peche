import {
  statutCarte,
  finValidite,
  debutValidite,
  joursRestants,
  phraseReciprocite,
  type CarteDePeche,
  type TypeCarte,
} from "../lib/carte-peche";

/**
 * État de la carte de pêche du pêcheur, et où la prendre.
 *
 * L'app ne traite aucun paiement : cartedepeche.fr est le canal officiel FNPF,
 * l'app y renvoie. Aucun tarif n'est affiché non plus — les deux pages de
 * coindepeche.fr consultées le 31/07/2026 se contredisent sur tous les prix
 * (interfédérale 100 € contre ~110 €, journalière 17 € contre ~15 €), et le
 * site lui-même écrit que « la source officielle reste cartedepeche.fr ».
 *
 * Ce que l'app apporte, elle : la durée réelle selon le type. Une journalière
 * ne vaut pas jusqu'au 31 décembre, et le dire était une fausse assurance sur
 * exactement le document qu'un garde demande.
 */

const URL_FNPF = "https://www.cartedepeche.fr/";

const NOM_TYPE: Record<TypeCarte, string> = {
  annuelle: "Carte annuelle",
  interfederale: "Carte interfédérale",
  mineure: "Carte mineure (12-18 ans)",
  decouverte: "Carte découverte",
  hebdomadaire: "Carte hebdomadaire",
  journaliere: "Carte journalière",
};

function dateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function LienFnpf({ children }: { children: string }) {
  return (
    <a className="cp-lien-fnpf" href={URL_FNPF} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function CartePeche({ carte, now }: { carte: CarteDePeche | undefined; now: Date }) {
  const statut = statutCarte(carte, now);

  if (!carte || statut === "absente") {
    return (
      <div className="cp cp-nudge">
        Carte de pêche obligatoire dès 12 ans.{" "}
        <LienFnpf>L'acheter sur cartedepeche.fr (site officiel FNPF) ↗</LienFnpf>
      </div>
    );
  }

  const fin = finValidite(carte)!;
  const debut = debutValidite(carte)!;
  const restants = joursRestants(carte, now)!;

  return (
    <div className="cp">
      <div className="cp-tete">
        <span className="cp-type">{NOM_TYPE[carte.type]}</span>
        {statut === "valide" && <span className="cp-etat cp-ok">valable</span>}
      </div>

      {statut === "pas-encore-valide" && (
        <div className="cp-alerte cp-warn">
          Cette carte ne vaut <b>pas encore</b> : elle prend effet le {dateFr(debut)}. D'ici là,
          pêcher demande une carte en cours de validité.
        </div>
      )}

      {statut === "perimee" && (
        <div className="cp-alerte cp-danger" role="alert">
          <b>Carte périmée</b> depuis le {dateFr(new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() + 1))} —
          pêcher sans carte valide expose à une amende pouvant aller jusqu'à 450 €
          (contravention de 4ᵉ classe, art. L436-16 du code de l'environnement).{" "}
          <LienFnpf>La renouveler sur cartedepeche.fr ↗</LienFnpf>
        </div>
      )}

      {statut === "expire-bientot" && (
        <div className="cp-alerte cp-warn">
          {restants === 0 ? (
            <>
              Valable <b>aujourd'hui</b> seulement — dernier jour le {dateFr(fin)}.
            </>
          ) : (
            <>
              Expire dans <b>{restants} j</b>, le {dateFr(fin)}.
            </>
          )}{" "}
          <LienFnpf>Renouveler sur cartedepeche.fr ↗</LienFnpf>
        </div>
      )}

      {statut === "valide" && <div className="cp-fin">Valable jusqu'au {dateFr(fin)}.</div>}

      {/* Rien quand elle n'est pas renseignée : une réciprocité qu'on ne
          connaît pas ne se déduit pas du département. */}
      {carte.reciprocite && <div className="cp-recip">{phraseReciprocite(carte.reciprocite)}</div>}
    </div>
  );
}
