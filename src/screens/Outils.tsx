import { useStore, type Screen } from "../store";
import { DEPARTEMENTS } from "../data/regulation";
import { Icon, ICONS } from "../components/Icon";

export function Outils() {
  const { state, nav } = useStore();
  const deptName = DEPARTEMENTS[state.dept].name;

  const rows: { title: string; sub: string; icon: string; to: Screen }[] = [
    { title: "Mon matériel", sub: "Équipement, ensembles, guide appâts/hameçons", icon: ICONS.peche, to: "materiel" },
    { title: "Techniques & gestes", sub: "Ikejime, désarêtage, garum… + sécurité sanitaire", icon: ICONS.cuisine, to: "techniques" },
    { title: "Outils de terrain", sub: "Horaires légaux du jour + chronos (balances, saignée…)", icon: ICONS.regle, to: "outils-terrain" },
    { title: "Mes recettes", sub: "Vos recettes perso, liées à une espèce — 100 % local", icon: ICONS.cuisine, to: "mes-recettes" },
    { title: "Nœuds & montages", sub: "Guides pas-à-pas, hors-ligne", icon: ICONS.knot, to: "noeuds" },
    { title: "Réglementation générale", sub: "Socle national + " + deptName, icon: ICONS.regle, to: "reglement" },
    { title: "Département actif", sub: deptName + " — modifiable dans Réglementation", icon: ICONS.pin, to: "reglement" },
    { title: "Sources & mentions", sub: "Legifrance, ANSES, fédérations…", icon: ICONS.book, to: "sources" },
    { title: "Crédits photos", sub: "Auteurs & licences des images", icon: ICONS.book, to: "credits" },
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
  ];

  return (
    <div className="screen">
      <div className="pad">
        <div className="h1">Outils</div>
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
          Hors-ligne — toutes les fiches restent disponibles. Les données réglementaires embarquées
          datent des arrêtés 2026 ; revérifiez chaque année.
        </div>
      </div>
    </div>
  );
}
