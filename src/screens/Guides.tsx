import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store-hooks";
import type { GuideCdp } from "../lib/coindepeche-guides";

/**
 * Index des guides de coindepeche.fr.
 *
 * Publié avec l'accord de l'administrateur du site. Cet accord porte sur la
 * publication, pas sur une dispense d'attribution : chaque entrée dit d'où elle
 * vient, qui la signe et de quand elle date. L'auteur affiché est celui que le
 * site déclare — une organisation sur les 41 guides relevés, jamais une
 * personne. En faire une signature humaine serait inventer un auteur.
 *
 * Le corps des articles n'est pas embarqué : l'app renvoie vers la page. Un
 * guide n'est donc PAS consultable hors ligne, et l'écran le dit — une app qui
 * promet le hors-ligne ne doit pas laisser croire que tout l'est.
 */

const TOUTES = "Toutes";

function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

export function ListeGuides({
  guides,
  consulteLe,
  annonces,
}: {
  guides: GuideCdp[];
  consulteLe: string;
  annonces: number;
}) {
  const [cat, setCat] = useState(TOUTES);
  const cats = useMemo(() => {
    const vues: string[] = [];
    for (const g of guides) if (g.categorie && !vues.includes(g.categorie)) vues.push(g.categorie);
    return [TOUTES, ...vues];
  }, [guides]);
  const visibles = cat === TOUTES ? guides : guides.filter((g) => g.categorie === cat);

  return (
    <div className="gds">
      <p className="gds-intro">
        Guides publiés par <b>Coin de Pêche</b>, repris ici avec l'accord de l'administrateur du
        site. L'app n'embarque pas leur texte : chaque guide s'ouvre sur coindepeche.fr et demande
        une connexion — il n'est pas consultable hors ligne.
      </p>

      <div className="gds-cats">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            className="gds-cat"
            style={{ minHeight: 44 }}
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="gds-list">
        {visibles.map((g) => {
          // La date de modification quand elle existe, sinon celle de
          // publication. Jamais la date de collecte : elle ferait passer un
          // article de janvier pour récent.
          const d = g.modifieLe ?? g.publieLe;
          return (
            <a
              key={g.slug}
              className="gds-item"
              href={g.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="gds-tete">
                {g.categorie && <span className="gds-badge">{g.categorie}</span>}
                {d && <span className="gds-date">{dateFr(d)}</span>}
              </div>
              <div className="gds-titre">{g.titre}</div>
              {g.description && <div className="gds-desc">{g.description}</div>}
              <div className="gds-src">
                {g.auteur ?? "auteur non déclaré"} · coindepeche.fr ↗
              </div>
            </a>
          );
        })}
      </div>

      <div className="gds-pied">
        Index collecté le {consulteLe}.
        {guides.length < annonces && (
          <>
            {" "}
            {guides.length} guides lus sur {annonces} annoncés par le site : la liste est
            incomplète.
          </>
        )}
      </div>
    </div>
  );
}

export function Guides() {
  const { back } = useStore();
  const [data, setData] = useState<{
    guides: GuideCdp[];
    consulteLe: string;
    annonces: number;
  } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let vivant = true;
    import("../data/guides-coindepeche.gen").then(
      (m) =>
        vivant &&
        setData({
          guides: m.GUIDES_COINDEPECHE,
          consulteLe: m.GUIDES_CONSULTE_LE,
          annonces: m.GUIDES_ANNONCES,
        }),
      // Un module qui ne se charge pas n'est pas « aucun guide ».
      () => vivant && setErr(true),
    );
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Guides</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        {err ? (
          <div className="ecr-warn">
            L'index des guides n'a pas pu être chargé. Ce n'est pas « aucun guide » : réessayez une
            fois en ligne.
          </div>
        ) : !data ? (
          <div className="reg-note">Chargement…</div>
        ) : (
          <ListeGuides {...data} />
        )}
      </div>
    </div>
  );
}
