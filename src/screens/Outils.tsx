import { REG_YEAR } from "../data/version";
import type { Screen } from "../store";
import { useStore } from "../store-hooks";
import { DEPARTEMENTS } from "../data/regulation";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { lienSignalement } from "../lib/diagnostic";
import { AideInstallIOS } from "../components/InstallIOS";
import { usePwa } from "../lib/pwa";
import { promesseHorsLigne } from "../lib/promesse-hors-ligne";

export function Outils() {
  const { state, nav } = useStore();
  const { reserve } = usePwa();
  const deptName = DEPARTEMENTS[state.dept].name;

  const rows: { title: string; sub: string; icon: string; to: Screen }[] = [
    { title: "Mon matériel", sub: "Équipement, ensembles, guide appâts/hameçons", icon: ICONS.peche, to: "materiel" },
    { title: "Outils de terrain", sub: "Horaires légaux du jour + chronos (balances, saignée…)", icon: ICONS.regle, to: "outils-terrain" },
    { title: "Écrevisses", sub: "Séance de balances : chronos individuels, alertes, bilan", icon: ICONS.regle, to: "ecrevisses" },
    { title: "Nœuds & montages", sub: "Guides pas-à-pas, hors-ligne", icon: ICONS.knot, to: "noeuds" },
    { title: "Réglementation générale", sub: "Socle national + " + deptName, icon: ICONS.regle, to: "reglement" },
    { title: "Département actif", sub: deptName + " — modifiable dans Réglementation", icon: ICONS.pin, to: "reglement" },
    // Pas de compte dans le libellé : il vivrait ici et divergerait du fichier
    // généré à la première collecte. L'écran Guides, lui, sait ce qu'il a.
    { title: "Guides", sub: "Coin de Pêche — techniques, espèces, départements (en ligne)", icon: ICONS.book, to: "guides" },
    { title: "Sources & mentions", sub: "Legifrance, ANSES, fédérations…", icon: ICONS.book, to: "sources" },
    { title: "Crédits photos", sub: "Auteurs & licences des images", icon: ICONS.book, to: "credits" },
    { title: "Mentions légales", sub: "Éditeur, hébergeur, vos données, portée des conseils", icon: ICONS.book, to: "mentions-legales" },
    { title: "Stockage & données", sub: "Espace, sauvegarde, tout effacer", icon: ICONS.pin, to: "stockage" },
  ];

  // External links — no public API for licenses/federation maps, so we link out.
  const links: { title: string; sub: string; href: string }[] = [
    {
      title: "Acheter ma carte de pêche",
      sub: "cartedepeche.fr (officiel FNPF) — annuelle, journalière, découverte, réciprocité",
      href: "https://www.cartedepeche.fr/",
    },
    {
      title: "Parcours & réglementation locale",
      sub: "GEOPECHE — carte des fédérations (dont Centre-Val de Loire) : lots, réserves, no-kill",
      href: "https://www.geopeche.com/",
    },
    // The correction channel. The app's argument is that nothing in it is
    // invented; without a way to be told otherwise, that argument has no
    // mechanism behind it — regulation.ts:127 already records a doubt only an
    // angler standing in front of the arrêté can settle.
    {
      title: "Signaler une erreur ou un manque",
      sub: "Une maille fausse, une date qui ne colle pas, un écran qui plante — dites-le",
      href: lienSignalement({ ecran: "outils", dept: state.dept }),
    },
  ];

  return (
    <div className="screen">
      <div className="pad">
        <div className="h1">Outils</div>
        {/* Ne s'affiche que sur iOS hors mode installé : Safari n'émet pas
            `beforeinstallprompt`, donc le bouton d'installation que lib/pwa.ts
            propose sur Android n'y apparaît jamais. */}
        <AideInstallIOS />
        <div className="section-list" style={{ marginTop: 16 }}>
          {rows.map((r) => (
            <button key={r.title} type="button" className="card-row" onClick={() => nav(r.to)}>
              <Icon d={r.icon} size={21} stroke="#4A5D52" />
              <div style={{ flex: 1 }}>
                <div className="t">{r.title}</div>
                <div className="s">{r.sub}</div>
              </div>
              <span className="chev">›</span>
            </button>
          ))}
        </div>

        <div className="label" style={{ margin: "22px 0 8px" }}>
          Carte de pêche & fédération
        </div>
        <div className="section-list">
          {links.map((l) => (
            <a
              key={l.href}
              className="card-row"
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon d={ICONS.pin} size={21} stroke="#4A5D52" />
              <div style={{ flex: 1 }}>
                <div className="t">{l.title}</div>
                <div className="s">{l.sub}</div>
              </div>
              <span className="chev">↗</span>
            </a>
          ))}
        </div>

        <div className="info" style={{ marginTop: 20 }}>
          {/* Même nuance qu'au bandeau hors-ligne d'App.tsx : depuis le
              découpage du précache, les photos arrivent après le noyau. Le
              texte et la réglementation, eux, sont là dès l'installation. */}
          {promesseHorsLigne(reserve).texte}. Les données réglementaires embarquées
          datent des arrêtés {REG_YEAR} ; revérifiez chaque année.
        </div>
      </div>
    </div>
  );
}
