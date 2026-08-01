import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { SPECIES, CURATED_IDS } from "../data/species";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";
import { ondeEtat, ondeTropLoin } from "../lib/onde";
import { fraicheur } from "../lib/fraicheur";
import { Media } from "../components/Media";
import { Icon } from "../components/Icon";
import { Tip } from "../components/Tip";
import { MiniMap } from "../components/MiniMap";
import { Repli } from "../components/Repli";
import { ChoixRiviere } from "../components/ChoixRiviere";
import { OutOfZoneWarning } from "../components/OutOfZoneWarning";
import { DeptBouton } from "../components/DeptBouton";
import { RegPerimeeWarning } from "../components/RegPerimeeWarning";
import { usePhotoUrl } from "../lib/photos";
import { fetchMeteo, weatherLabel, type Meteo, type MeteoHour } from "../lib/meteo";
import {
  nearestOnde,
  nearestHydroStation,
  latestHydro,
  waterTemp,
  isStaleWaterTemp,
  type OndeReading,
  type HydroReading,
  type WaterTemp,
} from "../lib/hubeau";
import { stationsHydro } from "../lib/hydro-riviere";
import { surLaRiviere } from "../lib/rivieres";
import { choisirStation } from "../lib/station";
import { REFERENTIEL_SANDRE } from "../lib/cours-du-point";
import {
  readPrefsAccueil,
  writePrefsAccueil,
  estReplie,
  type RiviereChoisie,
} from "../lib/prefs-accueil";
import { horairesPeche, MARGE_LEGALE_MIN } from "../lib/horaires-peche";
import { sunTimes, moonIllumination, moonPhaseName, type SunTimes } from "../lib/astro";
import { quotaToday } from "../lib/helpers";
import { hhmm, ago } from "../lib/geo";
import { isPlainlyOpen } from "../lib/statut";
import { locate, locateMessage } from "../lib/locate";
import { deptFromCoords } from "../lib/sandre";
import { setConditions } from "../lib/conditionsCache";
import { useNow } from "../lib/now";
import { effectiveMaille } from "../lib/maille";
import type { Screen } from "../store";
import "./accueil.css";

// Default "home water" until GPS refines it (Blois / Loire).
const HOME = { lat: 47.586, lon: 1.336 };
const FISH_ICON = "M4 12c2.5-3.5 6-5.5 9-5.5 3 0 5.5 2.5 7 5.5-1.5 3-4 5.5-7 5.5-3 0-6.5-2-9-5.5zM4 12 1.5 9v6zM16 11h.01";
const MOON_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

const TOOLS: { icon: string; label: string; to: Screen }[] = [
  { icon: "M3 9h18v6H3zM7 9v3M11 9v4M15 9v3M19 9v4", label: "Règle", to: "regle" },
  { icon: "M4 12c3-5 6-5 8 0s5 5 8 0M7 9l3 6M14 9l3 6", label: "Nœuds", to: "noeuds" },
  { icon: "M16 3a2 2 0 1 1 0 4v6a5 5 0 0 1-10 0v-2m0 0-2.2 2.2M6 11l2.2 2.2", label: "Matériel", to: "materiel" },
  { icon: "M6 14a6 6 0 0 1 12 0v3H6zM8 14 4 9M16 14l4-5M9 20v-3M15 20v-3", label: "Écrevisses", to: "ecrevisses" },
  { icon: "M12 4v17M5 6h14M7 6l-3 7a3.5 3.5 0 0 0 6 0zM17 6l-3 7a3.5 3.5 0 0 0 6 0z", label: "Réglementation", to: "reglement" },
];

/** A model value that may be absent. Renders "—" instead of a rounded null:
 *  Math.round(null) is 0, and 0 °C or 0 hPa are readings a pêcheur would act on. */
function mesure(v: number | null | undefined): string {
  return v == null ? "—" : String(Math.round(v));
}

interface Water {
  station?: string;
  flow?: HydroReading | null;
  level?: HydroReading | null;
  temp?: WaterTemp | null;
  /** Vrai quand tout ce qui précède a été filtré sur la rivière choisie. Sans
   *  ce drapeau, « rien trouvé » et « rien sur VOTRE rivière » s'écriraient
   *  pareil, et c'est justement la distinction que le choix apporte. */
  filtree: boolean;
}

/**
 * Les conditions d'eau d'un point, éventuellement bornées à UNE rivière.
 *
 * Sans `riviere`, rien ne change : la station la plus proche répond, comme
 * avant. Avec, le filtre est STRICT et il s'applique AVANT le choix de station
 * — `choisirStation(…, coursRef)` retomberait sinon sur la plus proche toutes
 * rivières confondues quand la bonne n'a rien, ce qui est exactement l'erreur
 * que le pêcheur cherche à corriger en désignant sa rivière.
 */
async function loadWater(
  lat: number,
  lon: number,
  riviere: RiviereChoisie | null,
  signal?: AbortSignal,
): Promise<Water> {
  const cles = riviere?.cles ?? null;

  let st: { code: string; nom: string } | null = null;
  if (cles) {
    // Une liste complète, filtrée, puis la règle ordinaire sur ce qui reste.
    const cands = await stationsHydro(lat, lon, signal);
    st = choisirStation(surLaRiviere(cands, cles), "hydro");
  } else {
    st = await nearestHydroStation(lat, lon, signal).catch(() => null);
  }
  let flow: HydroReading | null = null;
  let level: HydroReading | null = null;
  if (st) {
    flow = await latestHydro(st.code, "Q", signal).catch(() => null);
    if (!flow) level = await latestHydro(st.code, "H", signal).catch(() => null);
  }

  // Freshest real reading across both Hub'Eau networks — always shown WITH its
  // date (no French river has continuous coverage), so it's never faked as "live".
  let temp: WaterTemp | null = null;
  if (!cles) {
    temp = await waterTemp(lat, lon, signal).catch(() => null);
  } else {
    // La thermie et la physico-chimie codent dans CoursEau_Carthage2017 ; leur
    // passer la clé CEA de l'hydrométrie ne rapprocherait rien. Sans clé
    // Carthage, la requête serait certaine d'être rejetée ensuite : on ne la
    // fait pas.
    const carthage = cles.find((c) => c.startsWith(`${REFERENTIEL_SANDRE}:`));
    if (carthage) {
      const t = await waterTemp(lat, lon, signal, carthage).catch(() => null);
      // Vérification APRÈS coup : waterTemp retombe elle aussi sur la plus
      // proche quand la bonne rivière n'a rien. Ce filtre est le garde-fou.
      temp = t && surLaRiviere([t], cles).length ? t : null;
    }
  }
  return { station: st?.nom, flow, level, temp, filtree: !!cles };
}

export function Accueil() {
  const { state, set, nav, goTab, openSp, startPrise } = useStore();
  const p = state.profile;
  const avatar = usePhotoUrl(p.avatar);
  const deptName = DEPARTEMENTS[state.dept].name;

  const [pt, setPt] = useState(HOME);
  const [located, setLocated] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [meteo, setMeteo] = useState<Meteo | null>(null);
  const [onde, setOnde] = useState<OndeReading | null>(null);
  const [water, setWater] = useState<Water | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  // Freshness is judged in days here, so a per-minute clock is ample.
  const now = useNow();

  // Préférences de l'écran : lues SYNCHRONEMENT au premier rendu (voir
  // lib/prefs-accueil.ts). Un `useEffect` déplierait tout le tableau de bord le
  // temps d'une frame avant de le replier, et lancerait les requêtes d'eau sans
  // la rivière choisie avant de les relancer avec.
  const [replis, setReplis] = useState(() => readPrefsAccueil().replis);
  const [riviere, setRiviere] = useState<RiviereChoisie | null>(() => readPrefsAccueil().riviere);
  const [choixOuvert, setChoixOuvert] = useState(false);

  const basculer = useCallback((id: string, defaut: boolean) => {
    setReplis((r) => ({ ...r, [id]: !estReplie(r, id, defaut) }));
  }, []);

  const choisirRiviere = useCallback((r: RiviereChoisie | null) => {
    setRiviere(r);
    setChoixOuvert(false);
  }, []);

  // Un seul point d'écriture, et pas un effet de bord dans un `setState` : en
  // mode strict React rejoue les mises à jour, et écrire depuis l'intérieur
  // rendrait le nombre d'écritures dépendant du mode de rendu.
  useEffect(() => {
    writePrefsAccueil({ replis, riviere });
  }, [replis, riviere]);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    // Resets loading/err/water immediately on a pt change so the home screen
    // doesn't show the previous location's weather/water while the new fetch
    // is in flight. Deriving this instead (tagging state with the pt it was
    // fetched for, like Briefing's useFetch) would mean threading that
    // comparison through every meteo/onde/water read below — for the home
    // screen's own data effect, the eslint-disable is the safer change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setErr(false);
    setWater(null);
    Promise.all([
      fetchMeteo(pt.lat, pt.lon, ac.signal).catch(() => null),
      nearestOnde(pt.lat, pt.lon, ac.signal).catch(() => null),
    ]).then(([m, o]) => {
      if (!alive) return;
      setMeteo(m);
      setOnde(o);
      setLoading(false);
      setErr(!m);
    });
    loadWater(pt.lat, pt.lon, riviere, ac.signal).then((w) => alive && setWater(w));
    return () => {
      alive = false;
      ac.abort(); // cancel in-flight weather/onde/water requests on unmount/dep change
    };
    // `riviere` en dépendance : changer de rivière doit relancer les mesures,
    // sinon l'écran garderait celles de l'ancienne sous le nouveau nom.
  }, [pt.lat, pt.lon, riviere]);

  const sun = useMemo(() => sunTimes(new Date(), pt.lat, pt.lon), [pt.lat, pt.lon]);
  const moon = useMemo(() => moonIllumination(new Date()), []);
  // Les horaires légaux (½ h avant le lever, ½ h après le coucher, R436-13).
  // `now` fait avancer « ouvert / fermé » sans recalculer l'éphéméride.
  const legal = useMemo(() => horairesPeche(sun, new Date(now)), [sun, now]);

  // Feed the conditions cache: a catch logged from anywhere in the app picks the
  // snapshot up from here. Only what is actually known goes in — the cache has
  // its own freshness guard, and a partial reading beats an invented one.
  useEffect(() => {
    if (!meteo && !water) return;
    setConditions({
      // `?? undefined` and not `?? 0`: the cache stamps a catch with the
      // conditions of the moment, and a missing pressure must stay missing
      // rather than be recorded as a reading of zero.
      pressure: meteo?.now.pressure ?? undefined,
      pressureTrend: meteo?.pressureTrend,
      moonPhase: moon.phase,
      waterTemp: water?.temp?.value,
      flow: water?.flow?.value ?? water?.level?.value,
      flowUnit: water?.flow ? "m³/s" : water?.level ? "m" : undefined,
      flowTrend: water?.flow?.trend ?? water?.level?.trend,
    });
  }, [meteo, water, moon.phase]);
  const qt = quotaToday(state.catches);

  const today = useMemo(() => {
    const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const openSpecies = useMemo(
    // Le carrousel montre le catalogue vedette, pas tout ce qui a une fiche : il
    // filtrait sur `depth !== "base"`, ce qui ne veut plus rien dire depuis que les
    // fiches « base » ont du contenu — un poisson rouge aurait fini par y remonter.
    () => SPECIES.filter((s) => CURATED_IDS.has(s.id) && isPlainlyOpen(s)).slice(0, 10),
    [],
  );

  // Guard the async GPS chain so its callbacks don't setState (or silently flip the
  // active department) after the user has left the dashboard.
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const useGps = () => {
    setGpsMsg("Localisation…");
    locate()
      .then(({ lat, lon }) => {
        if (!mounted.current) return;
        setPt({ lat, lon });
        setLocated(true);
        setGpsMsg(null);
        // Auto-set the active department from the GPS position (supported: 23/36/41).
        deptFromCoords(lat, lon).then((d) => {
          if (!mounted.current) return;
          if (d && d in DEPARTEMENTS) {
            // Back in (or already in) a covered department: clear any earlier
            // out-of-zone warning, it no longer applies.
            if (d !== state.dept) {
              set({ dept: d as DeptId, outOfZoneDept: null });
              setGpsMsg(`Département : ${DEPARTEMENTS[d as DeptId].name}`);
              setTimeout(() => {
                if (mounted.current) setGpsMsg((m) => (m?.startsWith("Département") ? null : m));
              }, 3500);
            } else {
              set({ outOfZoneDept: null });
            }
          } else if (d) {
            // Detected département isn't covered: keep the active department's
            // regulation displayed (never guess), but remember the mismatch so a
            // persistent banner (not a fleeting toast) can warn it doesn't apply.
            set({ outOfZoneDept: d });
            setGpsMsg(null);
          }
          // d === null: reverse-geocoding failed — leave state as is, no claim either way.
        });
      })
      .catch((e) => {
        if (mounted.current) setGpsMsg(locateMessage(e));
      });
  };

  const wl = meteo ? weatherLabel(meteo.now.code) : null;
  const n = meteo?.now;

  // Où l'on est, en une ligne — c'est ce qui reste sous les yeux carte repliée.
  const lieu = located
    ? "Ma position"
    : state.deptChosen
      ? `${deptName} · chef-lieu`
      : `${deptName} · défaut`;

  // Ce que le détail météo montrerait : le résumé doit porter une VALEUR, pas
  // un intitulé, sans quoi replier ressemble à une donnée manquante.
  const resumeMeteo = n
    ? `${mesure(n.wind)} km/h · ${mesure(n.pressure)} hPa · ${mesure(n.humidity)} %`
    : loading
      ? "Chargement…"
      : "";

  const REPLI_CARTE = "carte";
  const REPLI_METEO = "meteo";
  // Défauts : les deux blocs que l'utilisateur a nommés s'ouvrent repliés. Ils
  // ne sont pas écrits dans les préférences tant qu'on n'y a pas touché — sans
  // quoi changer d'avis ici ne changerait plus rien pour les installés.
  const carteReplie = estReplie(replis, REPLI_CARTE, true);
  const meteoReplie = estReplie(replis, REPLI_METEO, true);

  // Les trois états de la rivière. `aucuneMesure` n'est PAS « chargement » :
  // il ne vaut que lorsque la réponse est arrivée et qu'elle est vide.
  const aucuneMesure = !!water?.filtree && !water.flow && !water.level && !water.temp;

  return (
    <main className="screen dash">
      <div className="pad" style={{ paddingTop: 22 }}>
        {/* Header */}
        <div className="ac-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ac-kicker">{today}</div>
            <h1 className="ac-hello">Bonjour{p.name ? `, ${p.name}` : ""}</h1>
          </div>
          <button className="ac-avatar" onClick={() => goTab("carnet")} aria-label="Mon carnet">
            {avatar ? <img src={avatar} alt="" /> : <span>🎣</span>}
          </button>
        </div>

        <RegPerimeeWarning dept={state.dept} style={{ marginTop: 10 }} />
        {/* Le département n'est pas une préférence d'affichage : c'est l'arrêté
            préfectoral que tous les verdicts de l'app citent. Il a donc son
            propre contrôle sur l'Accueil, et non un renvoi vers un autre écran.
            Ce bouton remplace ici DeptDefautWarning — il porte le même
            avertissement, avec le geste qui le résout. */}
        <DeptBouton
          dept={state.dept}
          deptChosen={state.deptChosen}
          outOfZoneDept={state.outOfZoneDept}
          onChoose={(id) => set({ dept: id, deptChosen: true })}
          onVoirTout={() => nav("reglement")}
        />
        {/* Conservé en plus du bouton : c'est le seul endroit qui dise quoi
            faire quand on pêche hors des trois départements couverts — le
            sélecteur, lui, n'a rien à proposer à ce pêcheur. */}
        {state.outOfZoneDept && (
          <OutOfZoneWarning
            outOfZoneDept={state.outOfZoneDept}
            activeDept={state.dept}
            style={{ marginTop: 10 }}
          />
        )}

        {/* Position — la mini-carte se replie, le lieu et le GPS restent.
            « défaut » veut dire que l'app a choisi le département elle-même ;
            une fois qu'il a choisi, le dire contredirait le pêcheur — c'est le
            chef-lieu de SON département qui est montré. */}
        <Repli
          className="ac-repli-carte"
          titre="Position"
          resume={lieu}
          replie={carteReplie}
          onBascule={() => basculer(REPLI_CARTE, true)}
          actions={
            <button className="loc-gps" onClick={useGps}>
              {gpsMsg || (located ? "Recentrer" : "📍 Me localiser")}
            </button>
          }
        >
          <div className="dash-map">
            <MiniMap lat={pt.lat} lon={pt.lon} zoom={13} onClick={() => goTab("carte")} />
            <div className="dash-map-bar">
              <div className="loc">
                <span className="ping" />
                <div style={{ minWidth: 0 }}>
                  <div className="place">{lieu}</div>
                  <div className="coord">
                    {pt.lat.toFixed(3)}, {pt.lon.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Repli>

        {/* Weather hero + temperature curve */}
        <div className="dash-wx">
          {err && !meteo ? (
            <div className="dash-wx-off">Conditions météo indisponibles hors-ligne.</div>
          ) : (
            <>
              <div className="dash-wx-top">
                <div className="dash-wx-temp">
                  {/* `n` is an object and always truthy, so a null temperature
                      used to reach Math.round and render as a real "0 °C". */}
                  <span className="deg">
                    {n?.temp != null ? Math.round(n.temp) : loading ? "…" : "—"}
                  </span>
                  <span className="unit">°C</span>
                </div>
                <div className="dash-wx-cond">
                  <div className="emoji">{wl ? wl.icon : ""}</div>
                  <div className="lbl">{wl ? wl.label : loading ? "Chargement…" : "—"}</div>
                  {n?.feels != null && <div className="feels">Ressenti {Math.round(n.feels)}°</div>}
                </div>
              </div>

              {/* Le soleil et la lune, fondus dans la tuile qui portait déjà
                  l'heure et la température. Ils occupaient 422 px à part —
                  dont 199 px d'icône ⓘ étirée par `.dash-sun svg {width:100%}`,
                  qui l'emportait sur `.tip-i {width:12px}`.
                  Les horaires LÉGAUX passent devant le lever et le coucher :
                  ce sont eux qui disent si l'on est en règle. La demi-heure de
                  l'art. R436-13 n'existait jusqu'ici que dans le texte d'une
                  infobulle — les deux seules heures affichées étaient donc
                  celles auxquelles il n'est PAS interdit de pêcher. */}
              <div className="ac-ciel">
                {legal ? (
                  <div className={`ac-legal${legal.ouvert ? " ac-legal--ouvert" : ""}`}>
                    <span className="ac-legal-k">Pêche autorisée</span>
                    <b className="ac-legal-v">
                      {hhmm(legal.ouverture)} → {hhmm(legal.fermeture)}
                    </b>
                    <span className="ac-legal-s">
                      <Tip
                        text={`Horaires légaux : d'une demi-heure (${MARGE_LEGALE_MIN} min) avant le lever du soleil à une demi-heure après son coucher — art. R436-13. Éphéméride calculée localement pour ${pt.lat.toFixed(2)} / ${pt.lon.toFixed(2)}, elle fonctionne hors-ligne. Un arrêté préfectoral peut restreindre davantage.`}
                      >
                        ½ h avant/après le soleil
                      </Tip>
                    </span>
                  </div>
                ) : (
                  <div className="ac-legal">
                    <span className="ac-legal-k">Horaires légaux</span>
                    <b className="ac-legal-v">indisponibles ici</b>
                    <span className="ac-legal-s">le soleil ne se lève ou ne se couche pas</span>
                  </div>
                )}
                <div className="ac-astro">
                  <span className="ac-astro-i">
                    ☀︎ Lever <b>{hhmm(sun.sunrise)}</b>
                  </span>
                  <span className="ac-astro-i">
                    ☾ Coucher <b>{hhmm(sun.sunset)}</b>
                  </span>
                  <span className="ac-astro-i ac-astro-lune">
                    <Tip text="Phase de la lune et part du disque éclairé. Repère traditionnel des pêcheurs (indicatif, non prouvé scientifiquement). Calcul d'éphéméride local — fonctionne hors-ligne.">
                      <span className="ac-lune-disc" aria-hidden="true">
                        {MOON_EMOJI[Math.round(moon.phase * 8) % 8]}
                      </span>{" "}
                      {moonPhaseName(moon.phase)} <b>{Math.round(moon.fraction * 100)} %</b>
                    </Tip>
                  </span>
                </div>
              </div>

              <Repli
                className="ac-repli-meteo"
                titre="Détail météo"
                resume={resumeMeteo}
                replie={meteoReplie}
                onBascule={() => basculer(REPLI_METEO, true)}
              >
                {meteo && meteo.hours.length > 1 && <TempCurve hours={meteo.hours} sun={sun} />}

                {n && (
                  <div className="dash-metrics">
                    <Metric
                    k="Vent"
                    v={`${mesure(n.wind)}`}
                    s={`km/h ${n.windCompass}`}
                    tip="Vent moyen à 10 m du sol, avec sa direction. Source : Open-Meteo (modèle météo)."
                  />
                  <Metric
                    k="Rafales"
                    v={`${mesure(n.gust)}`}
                    s="km/h"
                    tip="Rafales de vent maximales. Source : Open-Meteo."
                  />
                  <Metric
                    k="Humidité"
                    v={`${mesure(n.humidity)}`}
                    s="%"
                    tip="Humidité relative de l'air. Source : Open-Meteo."
                  />
                  <Metric
                    k="Pression"
                    v={`${mesure(n.pressure)}`}
                    s={`hPa ${trendArrow(meteo!.pressureTrend)}`}
                    tip="Pression atmosphérique au niveau de la mer, avec la tendance sur 3 h (↑ hausse, ↓ baisse). Une pression qui chute annonce souvent une meilleure activité. Source : Open-Meteo."
                  />
                  <Metric
                    k="Couvert"
                    v={`${mesure(n.cloud)}`}
                    s="% ciel"
                    tip="Part du ciel couverte par les nuages. Source : Open-Meteo."
                  />
                  <Metric
                    k="Pluie"
                    v={`${n.precip.toFixed(1)}`}
                    s="mm/h"
                    tip="Précipitations sur l'heure en cours. Source : Open-Meteo."
                  />
                  </div>
                )}
              </Repli>
            </>
          )}
        </div>

        {/* Water card */}
        <div className="dash-water">
          <div className="dash-card-h">
            <Icon d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" size={15} stroke="var(--info)" width={1.6} />
            <span>Conditions de l'eau</span>
            {water?.station && !aucuneMesure && <span className="src">{water.station}</span>}
          </div>

          {/* Le choix de la rivière, et ses trois états. Il est ICI et pas dans
              un écran de réglages : c'est la carte dont il change le contenu. */}
          <button
            type="button"
            className={`ac-riv${riviere ? " ac-riv--choisie" : ""}`}
            onClick={() => setChoixOuvert(true)}
          >
            <span className="ac-riv-k">{riviere ? "Votre rivière" : "Rivière"}</span>
            <span className="ac-riv-v">{riviere ? riviere.nom : "Choisir ma rivière"}</span>
            <span className="ac-riv-chev" aria-hidden="true">
              ›
            </span>
          </button>
          {!riviere && (
            <p className="ac-riv-note">
              Sans rivière choisie, les mesures viennent de la station la plus proche, quelle que
              soit sa rivière.
            </p>
          )}
          {aucuneMesure && (
            // Le troisième état, et le plus important : dire qu'il n'y a rien
            // plutôt que montrer la mesure d'à côté. C'est le défaut fondateur
            // de l'audit — une mesure du Cher affichée comme celle de la Loire.
            <p className="ac-riv-note ac-riv-note--vide">
              Aucune station Hub&apos;Eau sur {riviere?.nom} à portée d&apos;ici. Rien n&apos;est
              affiché plutôt qu&apos;une mesure d&apos;une autre rivière.
            </p>
          )}

          <div className="dash-water-grid">
            {(() => {
              // Hydrometry is the ONE genuinely real-time source here, so the
              // tile reads as live — and it was showing a Loire discharge from
              // ten days earlier with no way to tell. Past AGE_MAX.hydro the
              // number goes and only its date remains.
              const hydro = water?.flow || water?.level;
              const f = fraicheur(hydro?.date, "hydro", now);
              const perime = !!hydro && f.perime;
              return (
                <WaterTile
                  k={water?.flow ? "Débit" : "Niveau"}
                  val={
                    perime || !hydro
                      ? "—"
                      : water?.flow
                        ? `${water.flow.value.toFixed(1)}`
                        : `${water!.level!.value.toFixed(2)}`
                  }
                  unit={perime || !hydro ? "" : water?.flow ? "m³/s" : "m"}
                  trend={perime ? undefined : water?.flow?.trend || water?.level?.trend}
                  when={perime ? undefined : hydro?.date}
                  sub={perime ? f.texte : undefined}
                  tip="Débit (m³/s) ou hauteur d'eau à l'échelle (m) du cours d'eau, avec la tendance. Une crue trouble l'eau et disperse le poisson ; un étiage le concentre. Au-delà de 6 h sans relevé, la valeur n'est plus présentée comme actuelle. Source : Hub'Eau / OFB (station hydrométrique la plus proche)."
                />
              );
            })()}
            {(() => {
              // French river thermometry is sparse/campaign-based: the freshest
              // real reading can be months old. Beyond ~30 days it is not a
              // "current condition" — show "pas de relevé récent" instead of a
              // stale number (the old value stays in the water briefing on tap).
              const t = water?.temp;
              const f = fraicheur(t?.date, "temperature", now);
              const tooOld = !!t && f.perime;
              return (
                <WaterTile
                  k="Temp. eau"
                  val={t && !tooOld ? `${t.value.toFixed(1)}` : "—"}
                  unit={t && !tooOld ? "°C" : ""}
                  tip="Température de l'eau. Elle règle l'activité des poissons. Source : Hub'Eau (réseau thermie + physico-chimie). La mesure est rare et par campagnes en France : souvent pas de relevé récent — on n'affiche jamais une valeur estimée."
                  when={t && !tooOld ? t.date : undefined}
                  stale={t && !tooOld ? isStaleWaterTemp(t.date) : false}
                  sub={
                    !water
                      ? undefined
                      : !t
                        ? // « pas de mesure » sans rivière choisie veut dire
                          // « nulle part autour » ; avec, « pas sur celle-ci ».
                          water.filtree
                          ? "pas sur cette rivière"
                          : "pas de mesure"
                        : tooOld
                          ? f.texte
                          : undefined
                  }
                />
              );
            })()}
            {/* NOT "Écoulement" — that read as the state of the water in front
                of the angler, and ONDE never says that. The network watches
                small watercourses prone to drying (the Loire has no station at
                all), so the tile names its subject. Sub carries the stream, the
                distance and the age: without the distance, a brook 13 km away
                reads as the river underfoot. Beyond ONDE_MAX_DIST_KM the app
                abstains, same rule as the physico-chemical stations. */}
            {onde && !ondeTropLoin(onde.dist) && !fraicheur(onde.date, "onde", now).perime && (
              <WaterTile
                k="Petits cours d'eau"
                val={ondeEtat(onde.code, onde.label).court}
                unit=""
                tip="État d'écoulement des PETITS cours d'eau du secteur — pas celui de la rivière où vous pêchez. Le réseau ONDE (OFB) suit volontairement les ruisseaux et têtes de bassin sujets à l'assèchement ; les grands cours d'eau n'y figurent pas. Relevés par campagnes (≈ mensuelles l'été, dormantes l'hiver) : ce n'est pas du temps réel. Source : Hub'Eau / ONDE."
                sub={`${onde.cours || onde.station} · ${onde.dist.toFixed(0)} km · ${ago(onde.date)}`}
              />
            )}
          </div>
          {!water && !onde && (
            <div className="dash-water-empty">Recherche des stations Hub'Eau proches…</div>
          )}
        </div>

        {/* Le bloc soleil/lune séparé a disparu : ses quatre chiffres sont
            désormais dans la tuile météo, qui portait déjà l'heure et la
            température. Il mesurait 422 px sur 375 × 812. */}

        {/* Quota + Prise CTA */}
        <div className="dash-quota">
          <Icon d="M4 6v12M8 6v12M12 6v12M16 6v12M3 16l16-9" size={15} stroke="var(--faint)" width={1.6} />
          <span className="q">
            <Tip text="Limite légale nationale : 3 carnassiers (sandre, brochet, black-bass) par jour et par pêcheur, dont 2 brochets maximum — art. R436-21. Décompté depuis votre carnet du jour. Un arrêté préfectoral peut être plus strict.">
              Quota du jour
            </Tip>{" "}
            : <b>{qt.c}/3 carnassiers · {qt.b}/2 brochets</b>
          </span>
          <button className="carnet-link" onClick={() => goTab("carnet")}>
            Carnet ›
          </button>
        </div>

        <button className="ac-prise" onClick={() => startPrise()}>
          <span className="disc">
            <Icon d={FISH_ICON} size={21} stroke="var(--paper)" width={1.7} />
          </span>
          <span className="txt">
            <span className="t">J'ai une prise</span>
            <span className="s">Garder ou relâcher — le bon geste en 3 étapes</span>
          </span>
          <span className="chev">›</span>
        </button>

        {/* Species open today */}
        <div className="ac-sec-h">
          <span>En ce moment dans vos eaux</span>
          <button onClick={() => goTab("especes")}>Espèces ›</button>
        </div>
        <div className="ac-carousel">
          {openSpecies.map((sp) => (
            <button key={sp.id} className="ac-spcard" onClick={() => openSp(sp.id)}>
              <div className="img">
                <Media kind="species" id={sp.id} placeholder={sp.name} />
                {effectiveMaille(sp, state.dept).label && (
                  <span className="maille">Maille {effectiveMaille(sp, state.dept).label}</span>
                )}
              </div>
              <div className="body">
                <div className="nm">{sp.name}</div>
                <div className="st">● Pêche ouverte</div>
              </div>
            </button>
          ))}
        </div>

        {/* Toolbox */}
        <div className="ac-sec-h">
          <span>Boîte à outils</span>
          <button onClick={() => nav("outils")}>Tout ›</button>
        </div>
        <div className="ac-tools">
          {TOOLS.map((t) => (
            <button key={t.label} className="ac-tool" onClick={() => nav(t.to)}>
              <Icon d={t.icon} size={20} stroke="var(--green)" width={1.6} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "16px 0 4px", lineHeight: 1.5 }}>
          Météo & conditions : requêtes aux API publiques Open-Meteo et Hub'Eau avec vos coordonnées
          (éphéméride calculée localement). Votre carnet, vos photos et votre profil, eux, restent
          100 % sur votre appareil — jamais transmis.
        </div>
      </div>

      {choixOuvert && (
        <ChoixRiviere
          lat={pt.lat}
          lon={pt.lon}
          choisie={riviere}
          onChoisir={choisirRiviere}
          onFermer={() => setChoixOuvert(false)}
        />
      )}
    </main>
  );
}

function Metric({ k, v, s, tip }: { k: string; v: string; s: string; tip?: string }) {
  return (
    <div className="dash-metric">
      <div className="k">{tip ? <Tip text={tip}>{k}</Tip> : k}</div>
      <div className="v">{v}</div>
      <div className="s">{s}</div>
    </div>
  );
}

function WaterTile({
  k,
  val,
  unit,
  trend,
  when,
  sub,
  stale,
  tip,
}: {
  k: string;
  val: string;
  unit: string;
  trend?: "rising" | "falling" | "stable";
  when?: string;
  sub?: string;
  stale?: boolean;
  tip?: string;
}) {
  return (
    <div className="dash-wtile">
      <div className="k">{tip ? <Tip text={tip}>{k}</Tip> : k}</div>
      <div className="v">
        {val}
        {unit && <span className="u"> {unit}</span>}
        {trend && <span className={"tr " + trend}>{trendArrow(trend)}</span>}
      </div>
      <div className={"s" + (stale ? " stale" : "")}>
        {sub || (when ? ago(when) + (stale ? " · ancienne" : "") : "—")}
      </div>
    </div>
  );
}

function trendArrow(t: "rising" | "falling" | "stable"): string {
  return t === "rising" ? "↑" : t === "falling" ? "↓" : "→";
}

// 24h temperature area chart with night shading, sun markers and a "now" cursor.
function TempCurve({ hours, sun }: { hours: MeteoHour[]; sun: SunTimes }) {
  const W = 320;
  const H = 118;
  const padX = 8;
  const padTop = 20;
  const padBot = 24;
  const temps = hours.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  const xOf = (hr: number) => padX + (hr / 23) * (W - 2 * padX);
  const yOf = (t: number) => padTop + (1 - (t - min) / span) * (H - padTop - padBot);
  const pts = hours.map((h) => [xOf(h.hour), yOf(h.temp)] as [number, number]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const base = H - padBot;
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${base} L ${pts[0][0].toFixed(1)} ${base} Z`;

  const iMax = temps.indexOf(max);
  const iMin = temps.indexOf(min);
  const nowIdx = hours.findIndex((h) => !h.past);
  const nowPt = nowIdx >= 0 ? pts[nowIdx] : null;

  const hrDec = (d: Date | null) => (d ? d.getHours() + d.getMinutes() / 60 : null);
  const sr = hrDec(sun.sunrise);
  const ss = hrDec(sun.sunset);

  return (
    <svg className="dash-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe de température du jour">
      <defs>
        <linearGradient id="tempg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c99a3e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#c99a3e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* night shading */}
      {sr != null && <rect x={padX} y={padTop} width={xOf(sr) - padX} height={base - padTop} fill="var(--fir)" opacity="0.06" />}
      {ss != null && <rect x={xOf(ss)} y={padTop} width={W - padX - xOf(ss)} height={base - padTop} fill="var(--fir)" opacity="0.06" />}
      {/* sun markers */}
      {sr != null && <line x1={xOf(sr)} y1={padTop} x2={xOf(sr)} y2={base} stroke="#c9a24a" strokeWidth="1" strokeDasharray="2 3" />}
      {ss != null && <line x1={xOf(ss)} y1={padTop} x2={xOf(ss)} y2={base} stroke="#8a6d2f" strokeWidth="1" strokeDasharray="2 3" />}
      <path d={area} fill="url(#tempg)" />
      <path d={line} fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* min / max labels */}
      <circle cx={pts[iMax][0]} cy={pts[iMax][1]} r="2.6" fill="var(--red)" />
      <text x={pts[iMax][0]} y={pts[iMax][1] - 6} className="dash-chart-t hi" textAnchor="middle">{Math.round(max)}°</text>
      <circle cx={pts[iMin][0]} cy={pts[iMin][1]} r="2.6" fill="var(--info)" />
      <text x={pts[iMin][0]} y={pts[iMin][1] + 12} className="dash-chart-t lo" textAnchor="middle">{Math.round(min)}°</text>
      {/* now cursor */}
      {nowPt && (
        <>
          <line x1={nowPt[0]} y1={padTop - 4} x2={nowPt[0]} y2={base} stroke="var(--green-dark)" strokeWidth="1.2" opacity="0.5" />
          <circle cx={nowPt[0]} cy={nowPt[1]} r="4" fill="var(--green-dark)" stroke="var(--card)" strokeWidth="1.5" />
        </>
      )}
      {/* x axis hours */}
      {[0, 6, 12, 18].map((h) => (
        <text key={h} x={xOf(h)} y={H - 8} className="dash-chart-x" textAnchor="middle">{h}h</text>
      ))}
    </svg>
  );
}


