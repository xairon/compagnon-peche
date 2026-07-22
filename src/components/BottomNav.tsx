import { useStore, type Tab } from "../store";
import { Icon, NAV_ICONS, ICONS } from "./Icon";

const LEFT: [Tab, string][] = [
  ["accueil", "Accueil"],
  ["especes", "Espèces"],
];
const RIGHT: [Tab, string][] = [
  ["carte", "Carte"],
  ["carnet", "Carnet"],
];

function NavBtn({ id, label }: { id: Tab; label: string }) {
  const { state, goTab } = useStore();
  const active = state.tab === id && state.screen !== "prise";
  const fg = active ? "#1D6E42" : "#6b675c";
  return (
    <button className="nav-btn" onClick={() => goTab(id)} aria-current={active ? "page" : undefined} aria-label={label}>
      <Icon d={NAV_ICONS[id]} size={23} stroke={fg} width={active ? 1.9 : 1.5} />
      <span className="lbl" style={{ color: fg, fontWeight: active ? 650 : 500 }}>
        {label}
      </span>
    </button>
  );
}

export function BottomNav() {
  const { state, startPrise } = useStore();
  const priseActive = state.screen === "prise";
  return (
    <div className="bottom-nav">
      {LEFT.map(([id, label]) => (
        <NavBtn key={id} id={id} label={label} />
      ))}

      <button
        className={"nav-prise" + (priseActive ? " on" : "")}
        onClick={() => startPrise()}
        aria-label="Ma prise — que faire de ce poisson ?"
        aria-current={priseActive ? "page" : undefined}
      >
        <span className="disc">
          <Icon d={ICONS.fish} size={26} stroke="#FBFAF7" width={1.7} />
        </span>
        <span className="lbl">Prise</span>
      </button>

      {RIGHT.map(([id, label]) => (
        <NavBtn key={id} id={id} label={label} />
      ))}
    </div>
  );
}
