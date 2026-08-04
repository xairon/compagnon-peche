import { useEffect, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { HoldButton } from "../components/HoldButton";
import { quotaToday, norm } from "../lib/helpers";
import { season } from "../lib/season";
import { priseView, parseTaille, type ActKind } from "../lib/prise";
import { etapesPour } from "../lib/prise-etapes";
import { effectiveMaille } from "../lib/maille";
import { useNow } from "../lib/now";
import { OutOfZoneWarning } from "../components/OutOfZoneWarning";
import { DeptDefautWarning } from "../components/DeptDefautWarning";
import { RegPerimeeWarning } from "../components/RegPerimeeWarning";
import { savePhoto, downscaleImage } from "../lib/photos";
import { locate } from "../lib/locate";
import { isoDay, frDate, uid } from "../lib/helpers";
import type { Catch } from "../types";

function actStyle(kind: ActKind) {
  if (kind === "primary") return { bd: "var(--green-dark)", bg: "var(--green-dark)", fg: "var(--on-accent-warm)" };
  if (kind === "danger") return { bd: "var(--red)", bg: "var(--red)", fg: "var(--on-accent-warm)" };
  return { bd: "var(--line-strong)", bg: "var(--card)", fg: "var(--ink-2)" };
}

export function Prise() {
  const { state, set, nav, back, goTab, addCatchFull } = useStore();
  const [pq, setPq] = useState("");
  const [size, setSize] = useState("");
  // L'étape de saisie. `photo` est le fichier choisi, pas encore écrit : il ne
  // part en IndexedDB qu'à l'enregistrement, pour qu'un abandon ne laisse pas un
  // blob orphelin derrière lui.
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  // `null` = le pêcheur n'y a pas touché, on suit le défaut ; un booléen = son
  // choix, qui l'emporte. Figer le défaut à l'initialisation d'un `useState` le
  // calculait AU MONTAGE de l'écran, avant que le spot ne soit connu — l'écran
  // vit tout le parcours, le spot peut arriver après lui.
  //
  // Le défaut lui-même : coché si le lieu est DÉJÀ connu (le parcours vient d'un
  // spot, affiché depuis le début — le noter ne révèle rien de neuf), éteint
  // sinon, car le lieu voudrait alors dire relever la position. Un coin de pêche
  // se garde, et ne se capture pas faute d'opposition.
  const [noterLieu, setNoterLieu] = useState<boolean | null>(null);
  const lieuActif = noterLieu ?? !!state.prisePlace;
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [msgLieu, setMsgLieu] = useState<string | null>(null);
  const [ecrit, setEcrit] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  // L'aperçu courant, tenu dans une ref pour être révocable au démontage.
  //
  // L'écran ne part pas que par le bouton « Retirer » : il part par
  // l'enregistrement, par « Terminer sans enregistrer » et par « Annuler », et
  // il partait alors en laissant l'URL du blob vivante jusqu'au rechargement.
  // La ref plutôt que la valeur d'état : un effet qui dépendrait de `apercu` se
  // rejouerait sous StrictMode et révoquerait une URL encore affichée.
  const apercuRef = useRef<string | null>(null);
  useEffect(() => {
    apercuRef.current = apercu;
  }, [apercu]);
  useEffect(
    () => () => {
      if (apercuRef.current) URL.revokeObjectURL(apercuRef.current);
    },
    [],
  );
  const qt = quotaToday(state.catches);
  const sp = SPECIES.find((s) => s.id === state.priseSp);
  // The screen owns the clock; the engine never reads it (see lib/prise.ts).
  // useNow re-renders on its own cadence, so a phone left open on the card
  // crosses an opening or closing date instead of freezing on the verdict it
  // computed when the screen was first mounted.
  const now = new Date(useNow());
  // The size field fed the carnet and nothing else: the card could announce a
  // 60 cm maille while the angler had just typed 45 into the input right below
  // it. The engine now receives the measurement and answers with it.
  const pv = priseView(sp, state.priseStep, qt, state.dept, now, parseTaille(size));
  // Une étape sans poisson connu n'affiche RIEN : `priseView` rend `null`, et
  // l'écran n'aurait ni carte ni liste. Ça n'arrive que par un lien qui nomme
  // une espèce disparue du jeu de données — on retombe sur le choix d'espèce
  // plutôt que sur un cul-de-sac.
  const choosing = !state.priseStep || !sp;

  const nq = norm(pq);
  const found = SPECIES.filter(
    (s) => !nq || norm(s.name).includes(nq) || norm(s.latin).includes(nq),
  );
  const recentSp = state.recent.map((id) => SPECIES.find((s) => s.id === id)).filter(Boolean);
  const pick = (id: string) => set({ priseSp: id, priseStep: "statut" });
  const ui = state.bigUI ? { fs: "17.5px", h: 66 } : { fs: "15px", h: 54 };

  // Protected/invasive/out-of-season/special-regime jump straight from "statut"
  // to kill/release, skipping choix — so those two steps aren't "step 5 of 5",
  // they're the end of a two-step path and the counter would lie.
  const shortcut =
    !!sp && (!!sp.protected || !!sp.invasive || sp.season === "special" || !season(sp, now).open);
  const step = state.priseStep;
  // La saisie ferme le parcours : elle appartient au chemin court autant que
  // les deux étapes qui la précèdent. Restée hors de cette garde, elle
  // rallumait le compteur sur le DERNIER écran pour annoncer un total que le
  // pêcheur n'a pas traversé — sur un apron du Rhône, « étape 4 / 4 » et
  // quatre pastilles pour trois écrans, `choix` n'étant jamais montré.
  const isShortcutStep =
    shortcut &&
    (step === "kill" || step === "release" || step === "consigner" || step === "consigner-rel");

  // Le parcours RÉEL de cette espèce, dont le compteur découle. Il annonçait
  // « / 5 » depuis une table figée, alors qu'une perche ne traverse que quatre
  // écrans — et le code masquait déjà le compteur sur les chemins courts plutôt
  // que de le corriger.
  // L'issue se lit sur DEUX étapes : « relâcher » et sa saisie. Ne regarder que
  // la première faisait sortir « consigner-rel » du parcours calculé, donc
  // disparaître le compteur sur le dernier écran d'une prise relâchée.
  const issue = step === "release" || step === "consigner-rel" ? "release" : "kill";
  const etapes = sp ? etapesPour(sp, state.dept, issue) : [];
  const rang = step ? etapes.indexOf(step) + 1 : 0;

  const setPrise = (s: typeof state.priseStep) => set({ priseStep: s });

  // Garde « monté » : une géolocalisation qui se résout après la sortie de
  // l'écran ne doit pas écrire sur un composant démonté (standard du dépôt,
  // cf. Accueil.tsx et Especes.tsx qui documentent la règle).
  const mountedRef = useRef(true);
  useEffect(() => () => void (mountedRef.current = false), []);

  const choisirPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (apercu) URL.revokeObjectURL(apercu);
    setPhoto(f);
    setApercu(URL.createObjectURL(f));
  };

  const retirerPhoto = () => {
    if (apercu) URL.revokeObjectURL(apercu);
    setPhoto(null);
    setApercu(null);
  };

  /** L'interrupteur du lieu. Sans spot, l'allumer DEMANDE la position — c'est le
   *  geste qui vaut consentement, pas une case cochée d'avance. */
  const basculerLieu = () => {
    const vers = !lieuActif;
    setNoterLieu(vers);
    setMsgLieu(null);
    if (!vers || state.prisePlace || gps) return;
    setMsgLieu("Localisation…");
    locate()
      .then(({ lat, lon }) => {
        if (!mountedRef.current) return;
        setGps({ lat, lon });
        setMsgLieu(null);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setGps(null);
        setNoterLieu(false);
        setMsgLieu("Position indisponible — la prise sera notée sans lieu.");
      });
  };

  /**
   * Écrit la prise, avec ce que le pêcheur a bien voulu en donner.
   *
   * `addCatchFull` et non `addCatch` : celui-ci ne sait poser que l'espèce, la
   * taille et le lieu du spot. Photo et position n'existaient nulle part dans le
   * parcours — il fallait rouvrir la fiche après coup pour les ajouter.
   */
  const enregistrer = async (gardee: boolean) => {
    if (!sp || ecrit) return;
    setEcrit(true);
    const slot = uid("p");
    const cm = parseTaille(size);

    let photoKey: string | undefined;
    let photoRatee = false;
    if (photo) {
      try {
        // Pas de clé versionnée ici, contrairement à la fiche de prise : ce
        // `slot` vient d'être forgé, aucune photo ne peut déjà y pendre, donc
        // rien à invalider pour `usePhotoUrl`.
        const cle = `photo:${slot}`;
        await savePhoto(cle, await downscaleImage(photo));
        photoKey = cle;
      } catch {
        // Quota plein, navigation privée : la PRISE doit rester enregistrable.
        // Mieux vaut une prise sans photo qu'une prise pointant vers un blob
        // qui n'a jamais été écrit.
        //
        // L'échec part avec la navigation, il ne se dit PAS ici : cet écran est
        // démonté avant le paint par le `goTab` qui suit, et le message n'y
        // vivait que le temps d'un rendu que personne ne voyait. Le carnet, lui,
        // est là où le pêcheur atterrit — voir `photoRatee` dans le store.
        photoKey = undefined;
        photoRatee = true;
      }
    }

    const lieu = lieuActif ? (state.prisePlace ?? (gps ? "Position relevée" : "—")) : "—";
    const entree: Catch = {
      slot,
      sp: sp.name,
      spid: sp.id,
      iso: isoDay(),
      size: cm ? cm + " cm" : "— cm",
      n: cm ?? 0,
      date: frDate(),
      place: lieu,
      kept: gardee,
      ...(photoKey ? { photo: photoKey } : {}),
      ...(lieuActif && !state.prisePlace && gps ? { lat: gps.lat, lon: gps.lon } : {}),
    };
    addCatchFull(entree);
    goTab("carnet", { prisePlace: null, photoRatee });
  };

  const handleAct = (act: string) => {
    if (act === "cancel" || act === "done") {
      goTab("especes", { prisePlace: null });
    } else if (act === "ruler") {
      nav("regle");
    } else if (act === "tocarnet" && sp) {
      void enregistrer(true);
    } else if (act === "tocarnet-rel" && sp) {
      void enregistrer(false);
    } else {
      setPrise(act as typeof state.priseStep);
    }
  };

  return (
    <main className="screen">
      <div style={{ padding: "22px 18px 8px" }}>
        <h1 className="h1">Ma prise</h1>
        <div className="h-sub">Garder ou relâcher — le bon geste, tout de suite</div>
      </div>

      <RegPerimeeWarning dept={state.dept} style={{ margin: "0 18px 10px" }} />

      {(state.outOfZoneDept || !state.deptChosen) && (
        <div style={{ margin: "0 18px 10px" }}>
          {state.outOfZoneDept ? (
            <OutOfZoneWarning outOfZoneDept={state.outOfZoneDept} activeDept={state.dept} />
          ) : (
            <DeptDefautWarning deptChosen={state.deptChosen} activeDept={state.dept} />
          )}
        </div>
      )}

      <div className="quota-bar">
        <Icon d="M4 6v12M8 6v12M12 6v12M16 6v12M3 16l16-9" size={18} stroke="var(--icon-muted)" />
        <div className="txt">
          <b>Quota du jour</b> (carnet) : {qt.c} / 3 carnassiers · {qt.b} / 2 brochets
        </div>
      </div>

      {state.prisePlace && (
        <div className="prise-place">
          📍 Enregistrée à&nbsp;: <b>{state.prisePlace}</b>
        </div>
      )}

      {choosing && (
        <div style={{ padding: "4px 18px 24px" }}>
          <div className="search" style={{ marginTop: 6 }}>
            <Icon d={ICONS.search} size={18} stroke="var(--muted)" />
            <input
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              placeholder="Quelle est ta prise ? (nom du poisson)"
              aria-label="Rechercher l'espèce"
            />
            {pq && (
              <button className="clear" onClick={() => setPq("")} aria-label="Effacer">
                ✕
              </button>
            )}
          </div>

          <button className="cta-dark" style={{ marginTop: 12 }} onClick={() => nav("identify")}>
            <Icon d={ICONS.identifyEye} size={22} stroke="#8FBFA4" width={1.5} />
            <span className="grow">
              <span className="t">Je ne connais pas l'espèce</span>
              <span className="s">Identification guidée par critères</span>
            </span>
            <span style={{ color: "var(--chev-on-dark)", fontSize: 18 }}>›</span>
          </button>

          {!pq && recentSp.length > 0 && (
            <>
              <div className="label" style={{ margin: "18px 0 8px" }}>
                Vu récemment
              </div>
              <div className="chips">
                {recentSp.map((s) => (
                  <button key={s!.id} className="chip" onClick={() => pick(s!.id)}>
                    {s!.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="label" style={{ margin: "18px 0 10px" }}>
            {pq ? `${found.length} résultat(s)` : "Toutes les espèces"}
          </div>
          <div className="grid2">
            {found.map((s) => (
              <button key={s.id} type="button" className="sp-card" onClick={() => pick(s.id)}>
                <div className="thumb">
                  <Media kind="species" id={s.id} placeholder={s.name} />
                </div>
                <div className="sp-name">
                  <span className="n">{s.name}</span>
                </div>
                <div className="sp-latin">{s.latin}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!choosing && pv && (
        <div style={{ padding: "4px 18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            {/* Le retour est délégué à l'historique, comme partout ailleurs :
                chaque étape y a son entrée, donc cette flèche et le geste
                d'Android dépilent la MÊME chose. Le chemin n'est plus déduit —
                ce qui règle d'un coup les raccourcis (protégée, invasive, hors
                saison, régime spécial), dont la liste avait déjà été oubliée
                une fois : le « ‹ » d'un saumon relâché proposait « Je garde ». */}
            <button className="round-btn" onClick={back} aria-label="Étape précédente">
              ‹
            </button>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {sp?.name}
              {!isShortcutStep && rang > 0 && ` · étape ${rang} / ${etapes.length}`}
            </div>
            <button
              onClick={() => set({ priseSp: null, priseStep: null })}
              style={{
                marginLeft: "auto",
                border: "none",
                background: "transparent",
                fontSize: 12.5,
                color: "var(--muted)",
                textDecoration: "underline",
              }}
            >
              Annuler
            </button>
          </div>

          {!isShortcutStep && rang > 0 && (
            <div className="prise-steps" aria-hidden="true">
              {etapes.map((e, i) => (
                <span key={e} className={"pstep" + (i < rang ? " on" : "")} />
              ))}
            </div>
          )}

          {pv.banner && (
            <div role="status" className={"verdict-banner " + (pv.tone || "")}>
              {pv.tone === "bad" && (
                <Icon d={ICONS.alert} size={22} stroke="currentColor" width={1.8} />
              )}
              <span className="vb-word">{pv.banner}</span>
            </div>
          )}

          <div className="prise-card" style={{ border: `1px solid ${pv.bd}` }}>
            <div className="prise-kicker" style={{ color: pv.kickFg }}>
              {pv.kicker}
            </div>
            <div className="prise-title" style={{ color: pv.titleFg }}>
              {pv.title}
            </div>
            {pv.paras.map((t, i) => (
              <p key={i} style={{ fontSize: 14, lineHeight: 1.55, color: "var(--body)", margin: "10px 0 0" }}>
                {t}
              </p>
            ))}
            {pv.list.map((li) => (
              <div
                key={li.n}
                style={{ display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.5, color: "var(--body)", marginTop: 9 }}
              >
                <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>{li.n}</span>
                <span>{li.t}</span>
              </div>
            ))}
            {pv.note && <div className="note" style={{ marginTop: 14 }}>{pv.note}</div>}
          </div>

          {state.priseStep === "maille" && sp && effectiveMaille(sp, state.dept).cm > 0 && (
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="prise-taille-maille">Taille mesurée (cm) — facultatif, pré-remplira le carnet</label>
              <input
                id="prise-taille-maille"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                inputMode="numeric"
                placeholder={`≥ ${effectiveMaille(sp, state.dept).cm} cm`}
              />
            </div>
          )}

          {(step === "consigner" || step === "consigner-rel") && sp && (
            <div className="prise-consigner">
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="prise-taille">Taille (cm) — facultatif</label>
                <input
                  id="prise-taille"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  inputMode="numeric"
                  placeholder="ex. 32"
                />
              </div>

              <div style={{ marginTop: 14 }}>
                {apercu ? (
                  <div className="prise-photo">
                    <img src={apercu} alt="Photo de la prise" />
                    <button onClick={retirerPhoto} aria-label="Retirer la photo">
                      ✕
                    </button>
                  </div>
                ) : (
                  <button className="prise-photo-add" onClick={() => photoRef.current?.click()}>
                    📷 Ajouter une photo
                  </button>
                )}
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={choisirPhoto}
                  style={{ display: "none" }}
                />
              </div>

              <button
                className="prise-lieu"
                onClick={basculerLieu}
                role="switch"
                aria-checked={lieuActif}
                style={{ marginTop: 14 }}
              >
                <span className={"prise-lieu-box" + (lieuActif ? " on" : "")} aria-hidden="true">
                  {lieuActif ? "✓" : ""}
                </span>
                <span>
                  {state.prisePlace
                    ? `Noter le lieu : ${state.prisePlace}`
                    : "Noter ma position GPS"}
                </span>
              </button>
              {msgLieu && (
                <div className="note" style={{ marginTop: 8 }} role="status">
                  {msgLieu}
                </div>
              )}
              {lieuActif && !state.prisePlace && gps && (
                <div className="note" style={{ marginTop: 8 }}>
                  Position relevée : {gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}.
                </div>
              )}
            </div>
          )}

          <div className="prise-actions">
            {pv.actions.map((a, i) => {
              const st = actStyle(a.kind);
              const style = {
                width: "100%",
                minHeight: ui.h,
                borderRadius: 14,
                fontSize: ui.fs,
                fontWeight: 600 as const,
                border: `1.5px solid ${st.bd}`,
                background: st.bg,
                color: st.fg,
                padding: 12,
              };
              // "Garder / mise à mort" requires a deliberate hold — no accidental gloved tap.
              if (a.act === "kill") {
                return (
                  <HoldButton key={i} style={style} onConfirm={() => handleAct(a.act)}>
                    {a.label} · maintenez
                  </HoldButton>
                );
              }
              return (
                <button key={i} onClick={() => handleAct(a.act)} style={style}>
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
