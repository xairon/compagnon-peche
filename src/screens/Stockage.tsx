import { useEffect, useState } from "react";
import { useStore } from "../store";
import {
  storageInfo,
  requestPersist,
  exportData,
  wipeAll,
  fmtBytes,
  type StorageInfo,
} from "../lib/storage";

export function Stockage() {
  const { state, back } = useStore();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [arm, setArm] = useState(false);
  const [exported, setExported] = useState(false);

  const refresh = () => storageInfo().then(setInfo);
  useEffect(() => {
    refresh();
  }, []);

  const askPersist = async () => {
    setBusy(true);
    await requestPersist();
    await refresh();
    setBusy(false);
  };

  const doExport = async () => {
    await exportData();
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const doWipe = async () => {
    await wipeAll();
    window.location.reload();
  };

  const pct = info && info.quota ? Math.min(100, (info.usage / info.quota) * 100) : 0;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Stockage & données</div>
      </div>

      <div className="pad">
        {/* Persistence */}
        <div className={"stg-card " + (info?.persisted ? "ok" : "warn")}>
          <div className="stg-h">
            {info?.persisted ? "✅ Stockage persistant" : "⚠️ Stockage non persistant"}
          </div>
          <div className="stg-p">
            {info?.persisted
              ? "Vos données (carnet, spots, photos) sont protégées : le navigateur ne les effacera pas automatiquement."
              : "Le navigateur pourrait effacer vos données sous pression mémoire. Activez le stockage persistant."}
          </div>
          {!info?.persisted && (
            <button className="stg-btn dark" onClick={askPersist} disabled={busy}>
              {busy ? "…" : "Protéger mes données"}
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="stg-block">
          <div className="stg-lbl">Espace utilisé</div>
          {info ? (
            <>
              <div className="stg-bar">
                <div className="stg-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="stg-sub">
                {fmtBytes(info.usage)}
                {info.quota ? ` / ${fmtBytes(info.quota)} disponibles` : ""}
              </div>
            </>
          ) : (
            <div className="stg-sub">Calcul…</div>
          )}
        </div>

        {/* Counts */}
        <div className="stg-counts">
          <div className="stg-count">
            <div className="n">{state.catches.length}</div>
            <div className="l">Prises</div>
          </div>
          <div className="stg-count">
            <div className="n">{state.spots.length}</div>
            <div className="l">Spots</div>
          </div>
          <div className="stg-count">
            <div className="n">{info?.photos ?? "…"}</div>
            <div className="l">Photos</div>
          </div>
        </div>

        {/* Export */}
        <button className="stg-btn" onClick={doExport}>
          {exported ? "✓ Sauvegarde téléchargée" : "⤓ Exporter mes données (JSON)"}
        </button>
        <div className="stg-note">
          Sauvegarde locale du carnet, des spots, du matériel et du profil. Les photos ne sont pas
          incluses (elles restent sur l'appareil).
        </div>

        {/* Wipe */}
        <div className="stg-danger">
          <div className="stg-lbl">Zone sensible</div>
          {arm ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="stg-btn" onClick={() => setArm(false)} style={{ flex: 1 }}>
                Annuler
              </button>
              <button className="stg-btn danger" onClick={doWipe} style={{ flex: 1.4 }}>
                Oui, tout effacer
              </button>
            </div>
          ) : (
            <button className="stg-btn danger-ghost" onClick={() => setArm(true)}>
              Effacer toutes mes données
            </button>
          )}
        </div>

        <div className="stg-note" style={{ marginTop: 16 }}>
          100 % local sur votre appareil. Aucune donnée n'est transmise. Pensez à exporter une
          sauvegarde de temps en temps.
        </div>
      </div>
    </div>
  );
}
