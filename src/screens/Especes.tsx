import { useEffect, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { DEPARTEMENTS } from "../data/regulation";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { ratingFg } from "../lib/helpers";
import { speciesStatus } from "../lib/statut";
import { matchSpecies } from "../lib/recherche";
import { effectiveMaille } from "../lib/maille";
import {
  chargerEspecesDuCoin,
  coinEstLoin,
  PORTEE_COIN_KM,
  type CoinEspeces,
} from "../lib/especes-du-coin";
import { readCoin, writeCoin } from "../lib/prefs-coin";
import { locate, locateMessage } from "../lib/locate";
import type { Species } from "../types";
import "./especes.css";

// Web Speech API: still absent from TypeScript's DOM lib, and prefixed on WebKit.
// Only the members the voice search actually touches are declared.
interface SpeechRecognitionLike {
  lang: string;
  start: () => void;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

// Le statut vient de lib/statut, partagé avec l'accueil et la fiche : la
// pastille ne peut plus dire « ouverte » là où le parcours dit « vérifiez
// l'arrêté ».
const statusPill = (sp: Species) => speciesStatus(sp);

const GROUPS: [string, string][] = [
  ["tous", "Toutes"],
  ["carnassiers", "Carnassiers"],
  ["cyprinides", "Cyprinidés"],
  ["salmonides", "Salmonidés"],
  ["migrateurs", "Migrateurs"],
  ["autres", "Autres"],
];

// Deux badges au plus : le statut légal ET l'alerte sanitaire, qui ne se
// remplacent pas. Le silure, le plus bioaccumulateur du catalogue, n'affichait
// jamais « ANSES » parce que son badge « Invasive » sortait en premier.
function flags(sp: Species): { label: string; amber: boolean }[] {
  const out: { label: string; amber: boolean }[] = [];
  if (sp.protected) out.push({ label: "Protégée", amber: false });
  else if (sp.invasive) out.push({ label: "Invasive", amber: false });
  if (sp.sante?.alert) out.push({ label: "ANSES", amber: true });
  return out;
}

export function Especes() {
  const { state, set, nav, openSp } = useStore();
  const deptName = DEPARTEMENTS[state.dept].name;

  // Relu en synchrone au montage : ce relevé décide du premier rendu, et une
  // lecture asynchrone afficherait les 129 fiches le temps d'une frame avant
  // d'en masquer 95.
  const [coin, setCoin] = useState<CoinEspeces | null>(() => readCoin());
  // Trois états nommés plutôt qu'une chaîne libre : `"repos" | "charge" | string`
  // s'effondre en `string` pour TypeScript, et le test `typeof x === "string"`
  // serait toujours vrai. L'échec porte son message, il ne l'EST pas.
  const [coinEtat, setCoinEtat] = useState<
    { k: "repos" } | { k: "charge" } | { k: "err"; msg: string }
  >({ k: "repos" });
  // Le relevé ne meurt jamais tout seul (voir chargerEspecesDuCoin), et la
  // bascule est un appui : sans ce drapeau, un relevé fait à Blois continuerait
  // de s'afficher « dans mon coin » à un pêcheur maintenant à 200 km. Purement
  // consultatif : il ne désactive rien, il ne vide rien, il avertit.
  const [coinLoin, setCoinLoin] = useState(false);

  // Même garde que le GPS de l'Accueil (voir Accueil.tsx) : un relevé résolu
  // après que le pêcheur a quitté l'écran ne doit toucher ni un état local, ni
  // le store — celui-ci, lui, survit à l'écran. `enVol` porte en plus le
  // contrôleur de la requête en cours : il l'abandonne au démontage, et il
  // interdit d'en démarrer une seconde tant que la première tourne, parce que
  // Hub'Eau lit ses stations EN SÉRIE (voir lib/especes-du-coin.ts) — un
  // second relevé concurrent romprait cette règle.
  const mounted = useRef(true);
  const enVol = useRef<AbortController | null>(null);
  useEffect(() => {
    // Réarmé au (re)montage : sous StrictMode (voir main.tsx), React monte,
    // démonte puis remonte le MÊME composant sans recréer ses refs — sans ce
    // réarmement, `mounted.current` reste bloqué à `false` depuis le premier
    // démontage, et un relevé lancé après ne clôt jamais son `{k:"charge"}`.
    mounted.current = true;
    return () => {
      mounted.current = false;
      enVol.current?.abort();
    };
  }, []);

  // Sans le coin : sert à distinguer, quand la grille est vide, une recherche
  // sans résultat (déjà vide ici) d'un relevé qui ne contient rien du groupe
  // demandé (vide seulement après le filtre coin — voir plus bas).
  const sansCoin = SPECIES.filter(
    (sp) => (state.filter === "tous" || sp.group === state.filter) && matchSpecies(sp, state.q),
  );
  const list = sansCoin.filter((sp) => !state.coin || !coin || coin.ids.includes(sp.id));
  // Ce que le filtre cache, compté sur le catalogue entier et non sur la vue
  // courante : c'est le nombre que le pêcheur doit pouvoir contredire. Un
  // `.filter` et non `SPECIES.length - coin.ids.length` : un id du relevé qui
  // n'existe plus dans SPECIES (fiche retirée depuis) fausserait la
  // soustraction sans qu'aucun test ne le voie.
  const masquees =
    state.coin && coin ? SPECIES.filter((sp) => !coin.ids.includes(sp.id)).length : 0;

  const micAvail = !!speechCtor();

  function startVoice() {
    try {
      const SR = speechCtor();
      if (!SR) return;
      const r = new SR();
      r.lang = "fr-FR";
      set({ listening: true });
      r.onresult = (e) => set({ q: e.results[0][0].transcript, listening: false });
      r.onend = () => set({ listening: false });
      r.onerror = () => set({ listening: false });
      r.start();
    } catch {
      set({ listening: false });
    }
  }

  const recentSp = state.recent
    .map((id) => SPECIES.find((s) => s.id === id))
    .filter(Boolean) as Species[];

  async function releverLeCoin() {
    // Un relevé est déjà en vol : voir le commentaire sur `enVol` plus haut.
    if (enVol.current) return;
    const controleur = new AbortController();
    enVol.current = controleur;
    setCoinEtat({ k: "charge" });
    try {
      const { lat, lon } = await locate();
      if (!mounted.current) return;
      const c = await chargerEspecesDuCoin(lat, lon, controleur.signal);
      if (!mounted.current) return;
      if (!c) {
        // `chargerEspecesDuCoin` rend `null` pour toute lecture à laquelle on
        // n'a pas pu répondre — pas seulement hors-ligne : un 5xx Hub'Eau, la
        // réponse de rate-limit mesurée (299 o de HTML au lieu du JSON), ou
        // `CorpsTropGrand` (qui dit lui-même « la source a répondu »). Le
        // message ne peut donc pas diagnostiquer une cause qu'on n'a pas
        // constatée — seulement l'incapacité. Distinct de « il n'y a rien
        // ici » : on ne sait pas, et l'écran n'a pas le droit de confondre
        // les deux.
        setCoinEtat({
          k: "err",
          msg: "La liste des relevés n'a pas pu être établie — réseau indisponible ou source muette.",
        });
        return;
      }
      if (!c.stations.length) {
        // On a demandé, et la réponse est « rien ici ». Pas de repli sur le
        // département : aucune donnée de répartition départementale n'existe
        // dans le dépôt, et en inventer une pour boucher ce trou irait contre
        // la règle qui tient tout le reste.
        setCoinEtat({
          k: "err",
          msg: `Aucune station de pêche scientifique à moins de ${PORTEE_COIN_KM} km d'ici.`,
        });
        return;
      }
      writeCoin(c);
      setCoin(c);
      setCoinEtat({ k: "repos" });
      // Le relevé vient d'être fait exactement ici : rien à avertir.
      setCoinLoin(false);
      set({ coin: true });
    } catch (e) {
      if (!mounted.current) return;
      // `locate()` rejette avec un code (`"denied"`…), pas une Error :
      // locateMessage en fait la phrase, et elle est déjà juste.
      setCoinEtat({ k: "err", msg: locateMessage(e) });
    } finally {
      enVol.current = null;
    }
  }

  /**
   * Compare la position actuelle au point du relevé enregistré, pour avertir
   * (jamais bloquer) quand il ne décrit plus le coin où l'on se trouve.
   *
   * GÉOLOCALISATION SEULE, JAMAIS UNE REQUÊTE HUB'EAU : vérifier la distance ne
   * doit pas devenir un coût, sous peine de transformer une bascule qui marche
   * hors-ligne en dépense réseau à chaque appui. Si la position est refusée ou
   * indisponible, on ne dit RIEN : le silence est correct quand on ne sait pas
   * — deviner serait pire, et ça casserait une bascule qui, sinon, marche.
   */
  async function verifierDistanceCoin(c: CoinEspeces) {
    try {
      const { lat, lon } = await locate();
      if (!mounted.current) return;
      setCoinLoin(coinEstLoin(c, lat, lon));
    } catch {
      /* position refusée ou indisponible : silence, voir le commentaire ci-dessus */
    }
  }

  function basculerCoin() {
    if (coin) {
      const activation = !state.coin;
      set({ coin: activation });
      // Une « actualiser » ratée ne doit pas laisser son erreur affichée alors
      // que le filtre s'est remis à marcher depuis le relevé déjà enregistré.
      if (coinEtat.k === "err") setCoinEtat({ k: "repos" });
      if (activation) void verifierDistanceCoin(coin);
      else setCoinLoin(false);
    } else {
      void releverLeCoin();
    }
  }

  return (
    <main className="screen">
      <div style={{ padding: "22px 18px 0" }}>
        <h1 className="h1">Espèces</h1>
        <div className="h-sub">Eau douce · France — dépt. actif : {deptName}</div>

        <div className="search">
          <Icon d={ICONS.search} size={19} stroke="var(--muted)" width={1.6} />
          <input
            value={state.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Rechercher (sandre, brochet…)"
            aria-label="Rechercher une espèce"
          />
          {state.q.length > 0 && (
            <button className="clear" onClick={() => set({ q: "" })} aria-label="Effacer la recherche">
              ✕
            </button>
          )}
          {micAvail && (
            <button className="icon-btn" onClick={startVoice} aria-label="Recherche vocale">
              <Icon d={ICONS.mic} size={20} stroke={state.listening ? "var(--red)" : "var(--muted)"} width={1.6} />
            </button>
          )}
        </div>

        <button className="cta-dark" style={{ marginTop: 12 }} onClick={() => nav("identify")}>
          <Icon d={ICONS.identifyEye} size={22} stroke="#8FBFA4" width={1.5} />
          <span className="grow">
            <span className="t">Identifier ma prise</span>
            <span className="s">Je ne connais pas l'espèce — assistant par critères</span>
          </span>
          <span style={{ color: "var(--chev-on-dark)", fontSize: 18 }}>›</span>
        </button>

        {recentSp.length > 0 && (
          <div style={{ marginTop: 15 }}>
            <div className="label" style={{ marginBottom: 7 }}>
              Vu récemment
            </div>
            <div className="chips">
              {recentSp.map((sp) => (
                <button
                  key={sp.id}
                  className="chip"
                  style={{ fontWeight: 550 }}
                  onClick={() => openSp(sp.id)}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="coin-rang">
          <button
            type="button"
            // Allumé seulement quand le filtre agit vraiment : `state.coin` à
            // `true` avec `coin` à `null` (écriture refusée en navigation
            // privée, stockage vidé depuis un autre onglet) ne masque rien —
            // une puce allumée le dirait à tort, et l'échec doit rester
            // ouvert (rien de caché) sans se prétendre actif pour autant.
            className={"chip" + (state.coin && coin ? " chip-on" : "")}
            aria-pressed={state.coin && !!coin}
            disabled={coinEtat.k === "charge"}
            onClick={basculerCoin}
          >
            {coinEtat.k === "charge" ? "Relevé en cours…" : "Dans mon coin"}
          </button>
        </div>

        {coinEtat.k === "err" && (
          <div className="coin-src" aria-live="polite">
            {coinEtat.msg}
          </div>
        )}

        {state.coin && coin && (
          <div className="coin-src" aria-live="polite">
            D'après {coin.stations.length}{" "}
            {coin.stations.length > 1 ? "stations Hub'Eau" : "station Hub'Eau"} —{" "}
            {coin.stations
              .map((s) => `${s.nom} (${s.dist.toFixed(1).replace(".", ",")} km)`)
              .join(", ")}{" "}
            · relevé le {coin.releveIso.split("-").reverse().join("/")}{" "}
            <button
              type="button"
              className="coin-maj link-inline"
              disabled={coinEtat.k === "charge"}
              onClick={releverLeCoin}
            >
              actualiser
            </button>
            {coinLoin && (
              <>
                <br />
                <span className="coin-loin">
                  Ce relevé a été fait à plus de {PORTEE_COIN_KM} km d'ici.
                </span>
              </>
            )}
            {coin.inconnus.length > 0 && (
              <>
                <br />
                {coin.inconnus.length} taxon{coin.inconnus.length > 1 ? "s" : ""} relevé
                {coin.inconnus.length > 1 ? "s" : ""} n'
                {coin.inconnus.length > 1 ? "ont" : "a"} pas de fiche : lots identifiés au genre
                ou à la famille, hybrides.
              </>
            )}
            {coin.ecrevisses.length > 0 && (
              <>
                <br />
                {coin.ecrevisses.length} écrevisse{coin.ecrevisses.length > 1 ? "s" : ""} relevée
                {coin.ecrevisses.length > 1 ? "s" : ""} ici — voir l'écran Écrevisses.
              </>
            )}
          </div>
        )}

        <div className="chips" style={{ margin: "16px -18px 0", padding: "0 18px 4px" }}>
          {GROUPS.map(([id, label]) => {
            const active = state.filter === id;
            return (
              <button
                key={id}
                className="chip"
                aria-pressed={active}
                style={{
                  border: `1px solid ${active ? "var(--green-dark)" : "var(--line-strong)"}`,
                  background: active ? "var(--green-dark)" : "var(--card)",
                  color: active ? "var(--on-accent-warm)" : "var(--body)",
                }}
                onClick={() => set({ filter: id })}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid2" style={{ padding: "16px 18px 24px" }}>
        {list.map((sp) => {
          const fl = flags(sp);
          return (
            <button
              key={sp.id}
              type="button"
              className="sp-card"
              onClick={() => openSp(sp.id)}
              aria-label={`Fiche ${sp.name}`}
            >
              <div className="thumb">
                <Media kind="species" id={sp.id} placeholder={sp.name} />
                {fl.length > 0 && (
                  <div className="flags">
                    {fl.map((f) => (
                      <span key={f.label} className={"flag" + (f.amber ? " amber" : "")}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="sp-name">
                <span
                  className="dot"
                  style={{
                    background: sp.invasive
                      ? "var(--red)"
                      : sp.ratingCls
                        ? ratingFg(sp.ratingCls)
                        : "#C2BEB2",
                  }}
                />
                <span className="n">{sp.name}</span>
              </div>
              <div className="sp-latin">{sp.latin}</div>
              <div className="sp-status">
                {(() => {
                  const st = statusPill(sp);
                  return <span className={"sp-pill " + st.cls}>{st.label}</span>;
                })()}
                <span className="sp-pill neutral">
                  {effectiveMaille(sp, state.dept).label ?? "Pas de maille"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {masquees > 0 && (
        <div className="coin-reste">
          {/* Les relevés ne sont pas exhaustifs : l'électro-pêche capture mal
              les gros silures et les carpes de fond, et une station ne couvre
              qu'un point du cours d'eau. Le filtre masque, mais il dit combien,
              et il se défait en un appui. */}
          <button type="button" className="link-inline" onClick={() => set({ coin: false })}>
            {masquees} autres espèces ne sont pas dans les relevés d'ici — les voir
          </button>
        </div>
      )}

      {list.length === 0 && sansCoin.length > 0 ? (
        // La grille n'est vide qu'à cause du filtre coin (il y a des espèces
        // pour la recherche/le groupe en cours, mais aucune dans le relevé) :
        // blâmer « {state.q} » ici affirmerait une cause qui n'est pas la
        // bonne — le relevé n'affirme que ce qu'il a constaté.
        <div style={{ padding: "10px 18px 30px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Le relevé de ce coin ne contient aucune de ces espèces.
          <br />
          <button type="button" className="link-inline" onClick={() => set({ coin: false })}>
            Les voir quand même
          </button>
        </div>
      ) : (
        list.length === 0 && (
          <div style={{ padding: "10px 18px 30px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Aucune espèce ne correspond à « {state.q} ».
            <br />
            Essayez l'
            <button className="link-inline" onClick={() => nav("identify")}>
              identification guidée
            </button>
            .
          </div>
        )
      )}
    </main>
  );
}
