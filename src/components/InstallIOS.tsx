import { doitAiderInstallIOS, lireEnvInstall, type EnvInstall } from "../lib/install-ios";

/**
 * Aide à l'installation sur iOS.
 *
 * Affichée exactement là où le prompt natif manque — voir lib/install-ios.ts
 * pour le pourquoi. Elle nomme le chemin RÉEL, « Partager » puis « Sur l'écran
 * d'accueil », parce qu'« installez l'app » n'aide personne quand le bouton est
 * caché derrière une icône de partage.
 *
 * Rien n'est importé de lib/pwa.ts : ce module appartient au lot réseau, et
 * l'état dont on a besoin ici (quel OS, déjà installé ou non) n'y vit pas.
 */
export function AideInstallIOS({ env }: { env?: EnvInstall } = {}) {
  const e = env ?? lireEnvInstall();
  if (!doitAiderInstallIOS(e)) return null;

  return (
    <div className="install-ios">
      <div className="install-ios-titre">Installer l'app sur votre iPhone</div>
      <div className="install-ios-corps">
        Dans Safari, touchez <b>Partager</b> (le carré avec une flèche, en bas de l'écran), puis{" "}
        <b>Sur l'écran d'accueil</b>.
      </div>
      <div className="install-ios-corps">
        Une fois installée, l'app s'ouvre en plein écran et fonctionne <b>hors-ligne</b> : fiches,
        réglementation et gestes restent disponibles sans réseau, ce qui n'est pas garanti depuis un
        simple onglet.
      </div>
    </div>
  );
}
