import { useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { CAT_LABEL } from "../data/gear";
import { usePhotoUrl } from "../lib/photos";
import { dayPart } from "../lib/helpers";
import { CatchEditor } from "../components/CatchEditor";

export function PriseDetail() {
  const { state, back, openSp, updateCatch, removeCatch, set } = useStore();
  const c = state.catches.find((x) => x.slot === state.catchSlot) || null;
  const [editing, setEditing] = useState(false);
  const [arm, setArm] = useState(false);
  const photo = usePhotoUrl(c?.photo);

  if (!c) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={back} aria-label="Retour">
            ‹
          </button>
        </div>
        <div className="pad">
          <div className="empty-note">Cette prise n'existe plus.</div>
        </div>
      </div>
    );
  }

  const spExists = SPECIES.some((s) => s.id === c.spid);
  const gearItems = (c.gearIds || []).map((id) => state.gear.find((g) => g.id === id)).filter(Boolean);
  const dp = dayPart(c.time);

  if (editing) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={() => setEditing(false)} aria-label="Retour">
            ‹
          </button>
          <div className="topbar-title">Modifier la prise</div>
        </div>
        <div className="pad">
          <CatchEditor
            initial={c}
            onSave={(entry) => {
              updateCatch(c.slot, entry);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  const rows: [string, string][] = [];
  if (c.weight) rows.push(["Poids", `${c.weight} kg`]);
  rows.push(["Date", c.date + (c.time ? ` · ${c.time}` : "") + (dp ? ` · ${dp}` : "")]);
  rows.push(["Lieu", c.place]);
  if (c.bait) rows.push(["Appât / leurre", c.bait]);
  if (c.technique) rows.push(["Technique", c.technique]);

  return (
    <div className="screen" style={{ display: "block" }}>
      <div className="pd-photo">
        {photo ? <img src={photo} alt={c.sp} /> : <div className="pd-noimg">Pas de photo</div>}
        <button className="pd-back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <span className={"pd-tag " + (c.kept ? "kept" : "rel")}>{c.kept ? "Gardé" : "Relâché"}</span>
      </div>

      <div className="pad">
        <div className="pd-title">
          {c.sp} · <b>{c.size}</b>
        </div>
        {spExists && (
          <button className="pd-fiche" onClick={() => openSp(c.spid)}>
            Voir la fiche de l'espèce ›
          </button>
        )}

        <div className="pd-rows">
          {rows.map(([k, v]) => (
            <div className="pd-r" key={k}>
              <span className="k">{k}</span>
              <span className="v">{v}</span>
            </div>
          ))}
        </div>

        {gearItems.length > 0 && (
          <div className="pd-block">
            <div className="pd-lbl">Matériel utilisé</div>
            <div className="chips">
              {gearItems.map((g) => (
                <span key={g!.id} className="chip">
                  {g!.name} · {CAT_LABEL[g!.cat]}
                </span>
              ))}
            </div>
          </div>
        )}

        {(c.lat != null || c.spotId) && (
          <button
            className="pd-map"
            onClick={() => {
              if (c.spotId) set({ focusSpot: c.spotId, screen: "carte", tab: "carte", stack: [] });
              else set({ screen: "carte", tab: "carte", stack: [] });
            }}
          >
            📍 Voir sur la carte
          </button>
        )}

        {c.note && (
          <div className="pd-block">
            <div className="pd-lbl">Note</div>
            <div className="pd-note">{c.note}</div>
          </div>
        )}

        <div className="pd-actions">
          <button className="btn-light" onClick={() => setEditing(true)}>
            Modifier
          </button>
          {arm ? (
            <button
              className="btn-danger"
              onClick={() => {
                removeCatch(c.slot);
                back();
              }}
            >
              Confirmer la suppression
            </button>
          ) : (
            <button className="btn-danger-ghost" onClick={() => setArm(true)}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
