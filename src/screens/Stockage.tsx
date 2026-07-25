import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import {
  storageInfo,
  requestPersist,
  exportData,
  importData,
  wipeAll,
  fmtBytes,
  getLastExportAt,
  type StorageInfo,
} from "../lib/storage";
import { isQuotaNearlyFull, shouldSuggestBackup } from "../lib/backup-reminder";

export function Stockage() {
  const { state, back } = useStore();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [arm, setArm] = useState(false);
  const [exported, setExported] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setImportMsg(null);
    setImportErr(false);
    try {
      const r = await importData(file);
      const total = r.catches + r.spots + r.gear + r.recipes + r.photos;
      if (total === 0) {
        setImportMsg("Sauvegarde lue : tout y était déjà présent (rien à ajouter).");
      } else {
        const parts = [
          r.catches && `${r.catches} prise${r.catches > 1 ? "s" : ""}`,
          r.spots && `${r.spots} spot${r.spots > 1 ? "s" : ""}`,
          r.gear && `${r.gear} matériel`,
          r.recipes && `${r.recipes} recette${r.recipes > 1 ? "s" : ""}`,
          r.photos && `${r.photos} photo${r.photos > 1 ? "s" : ""}`,
        ].filter(Boolean);
        setImportMsg(`Restauré : ${parts.join(", ")}. Rechargement…`);
        setTimeout(() => window.location.reload(), 1400);
      }
    } catch (err) {
      setImportErr(true);
      setImportMsg(err instanceof Error ? err.message : "Import impossible.");
    }
  };

  const doWipe = async () => {
    await wipeAll();
    window.location.reload();
  };

  const pct = info && info.quota ? Math.min(100, (info.usage / info.quota) * 100) : 0;
  const quotaWarn = info ? isQuotaNearlyFull(info.usage, info.quota) : false;

  // "now" is a snapshot taken once (not on every render — Date.now() isn't
  // called directly in the render body): the reminder threshold is measured
  // in days, a session-long drift of a few minutes changes nothing. The last
  // export time IS read fresh each render, so the reminder clears itself
  // right after a successful export (doExport → setExported → re-render).
  const [nowMs] = useState(() => Date.now());
  const oldestDataAtMs = (() => {
    const stamps = [...state.catches.map((c) => c.iso), ...state.spots.map((sp) => sp.created)]
      .map((d) => new Date(d + "T00:00:00").getTime())
      .filter((t) => Number.isFinite(t));
    return stamps.length ? Math.min(...stamps) : null;
  })();
  const backupOverdue = shouldSuggestBackup({
    lastExportAtMs: getLastExportAt(),
    oldestDataAtMs,
    now: nowMs,
  });

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

        {/* Proactive quota warning — before a write ever fails */}
        {quotaWarn && (
          <div className="stg-card warn">
            <div className="stg-h">⚠️ Stockage presque saturé</div>
            <div className="stg-p">
              Vous approchez de la limite d'espace de ce navigateur ({Math.round(pct)} %). Au-delà,
              les nouvelles photos (les plus grosses données stockées) risquent de ne plus
              s'enregistrer. Exportez une sauvegarde maintenant, puis libérez de la place si besoin.
            </div>
            <button className="stg-btn dark" onClick={doExport}>
              {exported ? "✓ Sauvegarde téléchargée" : "⤓ Exporter maintenant"}
            </button>
          </div>
        )}

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

        {/* Backup reminder — this card only appears once the delay AND real
            data have both been met (see shouldSuggestBackup); otherwise the
            plain note at the bottom of the screen is enough. */}
        {backupOverdue && (
          <div className="stg-card warn">
            <div className="stg-h">💾 Pensez à sauvegarder</div>
            <div className="stg-p">
              Votre carnet contient des données non sauvegardées depuis un moment. Tout est stocké
              uniquement sur cet appareil — un téléphone perdu ou un cache vidé les efface
              définitivement. Une minute suffit pour exporter une copie.
            </div>
          </div>
        )}

        {/* Export */}
        <button className="stg-btn" onClick={doExport}>
          {exported ? "✓ Sauvegarde téléchargée" : "⤓ Exporter mes données (JSON)"}
        </button>
        <div className="stg-note">
          Sauvegarde locale complète : carnet, spots, matériel, profil, recettes <b>et photos</b>.
          Conservez ce fichier ailleurs (cloud, ordinateur) — c'est votre seul filet en cas de perte
          d'appareil.
        </div>

        {/* Import / restore */}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onPickFile}
          style={{ display: "none" }}
        />
        <button className="stg-btn" onClick={() => fileRef.current?.click()} style={{ marginTop: 10 }}>
          ⤒ Importer une sauvegarde
        </button>
        {importMsg && (
          <div className="stg-note" style={{ color: importErr ? "var(--red)" : "var(--green)" }}>
            {importMsg}
          </div>
        )}
        <div className="stg-note">
          La restauration <b>complète</b> vos données sans écraser ce qui existe déjà (aucun doublon).
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
