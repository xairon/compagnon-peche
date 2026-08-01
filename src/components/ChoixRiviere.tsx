import { useEffect, useRef, useState } from "react";
import { chargerRivieres, type Riviere } from "../lib/rivieres";
import type { RiviereChoisie } from "../lib/prefs-accueil";

/**
 * « Pour les conditions de l'eau faudrait pouvoir sélectionner une rivière ou
 * quoi, pour avoir les infos, là c'est automatique c'est pas bien. »
 *
 * L'app choisissait seule la station qui répond, et le pêcheur n'avait aucun
 * moyen de la contredire — alors que lui SAIT sur quelle rivière il est.
 *
 * CE QUE ÇA COÛTE : deux requêtes, ~22,5 ko, mesurés autour de Blois (voir
 * lib/rivieres.ts). Elles ne partent qu'à l'OUVERTURE de cette feuille. Le
 * tableau de bord s'ouvre à chaque session ; ce sélecteur, une fois.
 */
export function ChoixRiviere({
  lat,
  lon,
  choisie,
  onChoisir,
  onFermer,
}: {
  lat: number;
  lon: number;
  choisie: RiviereChoisie | null;
  /** `null` = revenir au choix automatique. */
  onChoisir: (r: RiviereChoisie | null) => void;
  onFermer: () => void;
}) {
  const [rivieres, setRivieres] = useState<Riviere[] | null>(null);
  const feuille = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    let vivant = true;
    chargerRivieres(lat, lon, ac.signal).then((r) => vivant && setRivieres(r));
    return () => {
      vivant = false;
      ac.abort();
    };
  }, [lat, lon]);

  // Échap ferme : la feuille couvre l'écran, et sans ça un clavier y reste
  // enfermé. Même règle que les autres feuilles de l'app (echap.test.ts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFermer]);

  useEffect(() => {
    feuille.current?.focus();
  }, []);

  return (
    <div className="riv-voile" onClick={onFermer}>
      <div
        className="riv-feuille"
        role="dialog"
        aria-modal="true"
        aria-label="Choisir la rivière des conditions d'eau"
        ref={feuille}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="riv-tete">
          <h2 className="riv-titre">Votre rivière</h2>
          <button type="button" className="riv-fermer" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="riv-note">
          Les conditions d'eau ne viendront alors que de stations situées sur cette rivière —
          jamais d'une voisine.
        </p>

        <button
          type="button"
          className={`riv-item riv-item--auto${choisie ? "" : " riv-item--actif"}`}
          onClick={() => onChoisir(null)}
        >
          <span className="riv-nom">Automatique — la station la plus proche</span>
          <span className="riv-dist">quelle que soit sa rivière</span>
        </button>

        {rivieres === null && <div className="riv-etat">Recherche des cours d'eau mesurés…</div>}

        {rivieres !== null && rivieres.length === 0 && (
          // Ni « aucune rivière ici » ni une liste vide muette : hors-ligne, les
          // deux réseaux se taisent, et c'est la seule explication honnête.
          <div className="riv-etat">
            Aucun cours d'eau mesuré trouvé autour d'ici. Sans réseau, la liste ne peut pas être
            établie — le choix déjà enregistré, lui, reste actif.
          </div>
        )}

        {rivieres !== null && rivieres.length > 0 && (
          <ul className="riv-liste">
            {rivieres.map((r) => {
              const actif = !!choisie && r.cles.some((c) => choisie.cles.includes(c));
              return (
                <li key={r.cles.join("|")}>
                  <button
                    type="button"
                    className={`riv-item${actif ? " riv-item--actif" : ""}`}
                    onClick={() => onChoisir({ nom: r.nom, cles: r.cles })}
                  >
                    <span className="riv-nom">{r.nom}</span>
                    {/* La distance de la station la plus proche, pas celle de la
                        rivière : c'est ce qui décide si une mesure existera. */}
                    {/* Virgule décimale : `toFixed` rend « 0.1 », et le reste
                        de l'app écrit « 17,2 km ». */}
                    <span className="riv-dist">
                      station à {r.dist.toFixed(1).replace(".", ",")} km
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
