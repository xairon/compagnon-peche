/**
 * Mise en forme d'une mesure d'eau : où elle a été prise, sur quel cours d'eau,
 * à quelle distance.
 *
 * Le cours d'eau manquait. C'est pourtant lui qui fait voir d'un coup d'œil
 * qu'une température vient du Cher alors qu'on pêche la Loire — le cas mesuré
 * depuis Blois qui a lancé tout ce chantier.
 *
 * Un cours d'eau vide veut dire « la source ne le publie pas » (c'est le cas de
 * `analyse_pc`, dont aucun des 67 champs ne porte de rattachement) et se traduit
 * par un silence, jamais par « cours d'eau inconnu » — qui se lirait comme une
 * anomalie de la station alors que c'est une limite de l'API.
 */
export function descriptionMesure({
  station,
  cours,
  dist,
}: {
  station: string;
  cours?: string;
  dist: number;
}): string {
  const bouts: string[] = [];
  if (station) bouts.push(station);
  // Rapprochement de surface, assumé : « LA CISSE A AVERDON · la Cisse »
  // n'apprend rien. Il ne décide de rien — la sélection de station, elle, se
  // fait sur code (voir station.cleCours), jamais sur libellé.
  if (cours && !contient(station, cours)) bouts.push(cours);
  if (Number.isFinite(dist)) bouts.push(`${dist.toFixed(1).replace(".", ",")} km`);
  return bouts.join(" · ");
}

function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function contient(station: string, cours: string): boolean {
  // Le nom du cours d'eau est comparé sans son article : « la Cisse » se
  // retrouve dans « LA CISSE A AVERDON » par « cisse ».
  const noyau = normaliser(cours).replace(/^(le|la|les|l')\s*/, "").trim();
  return noyau.length > 2 && normaliser(station).includes(noyau);
}
