// Fishing-vocabulary glossary. Definitions are factual technique descriptions
// (not regulatory claims). Terms are matched in body text and made tappable so a
// beginner can decode the jargon — and so remaining anglicisms are always explained.

export interface GlossaryTerm {
  term: string; // canonical term shown/matched
  alt?: string[]; // extra spellings/synonyms to match
  def: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "leurre souple",
    alt: ["leurres souples", "shad", "shads"],
    def: "Leurre en plastique mou imitant un poisson ou une proie, monté sur une tête plombée. Le « shad » est un leurre souple à caudale battante.",
  },
  {
    term: "drop shot",
    def: "Montage où le plomb est en bout de ligne et l'hameçon (avec un leurre souple) est fixé au-dessus : la proie reste présentée entre deux eaux, presque immobile. Idéal pour les poissons méfiants.",
  },
  {
    term: "montage texan",
    alt: ["texan"],
    def: "Montage anti-accroche : la pointe de l'hameçon est masquée dans le corps d'un leurre souple, ce qui permet de pêcher dans les herbiers et le bois sans s'accrocher.",
  },
  {
    term: "pater-noster",
    alt: ["paternoster"],
    def: "Montage pour la pêche au vif ou au posé : une potence tient l'appât à distance du fond, au-dessus d'un plomb.",
  },
  {
    term: "vif",
    alt: ["au vif"],
    def: "Petit poisson vivant utilisé comme appât pour les carnassiers (dans le respect de la réglementation locale sur les espèces autorisées).",
  },
  {
    term: "finesse",
    def: "Approche discrète avec des leurres fins et légers, sur ligne fine, pour déclencher des poissons peu actifs.",
  },
  {
    term: "verticale",
    alt: ["pêche verticale", "en verticale"],
    def: "Technique où l'on anime le leurre à l'aplomb du bateau, juste au-dessus du fond.",
  },
  {
    term: "cassure",
    alt: ["cassures"],
    def: "Rupture de pente sur le fond (le tombant d'une fosse, d'un plateau) : un poste de choix où les carnassiers chassent.",
  },
  {
    term: "poste",
    alt: ["postes"],
    def: "Endroit précis où le poisson se tient (obstacle, cassure, veine de courant, herbier).",
  },
  {
    term: "amorçage",
    alt: ["amorce", "amorcer"],
    def: "Attirer et fixer le poisson sur un coup en dispersant une amorce (mélange de farines, graines, esches).",
  },
  {
    term: "friture",
    def: "Petits poissons (ablettes, goujons…) frits entiers ; par extension, une pêche de nombreux petits poissons.",
  },
  {
    term: "no-kill",
    alt: ["no kill"],
    def: "Pratique consistant à relâcher systématiquement ses prises, vivantes et en bon état.",
  },
  {
    term: "tresse",
    def: "Fil de pêche multifibre, très fin et quasi sans élasticité : grande sensibilité et résistance, mais visible — souvent relié à un bas de ligne en fluorocarbone.",
  },
  {
    term: "fluorocarbone",
    alt: ["fluoro"],
    def: "Fil quasi invisible dans l'eau et résistant à l'abrasion, utilisé en bas de ligne au bout de la tresse.",
  },
  {
    term: "bas de ligne",
    def: "Section de fil discret (fluorocarbone ou acier) reliant le corps de ligne au leurre ou à l'hameçon.",
  },
  {
    term: "cuiller",
    alt: ["cuillère", "cuiller tournante", "cuiller ondulante"],
    def: "Leurre métallique qui tourne (tournante) ou ondule (ondulante) en réfléchissant la lumière pour provoquer l'attaque.",
  },
  {
    term: "poisson-nageur",
    alt: ["poissons-nageurs", "jerkbait", "crankbait"],
    def: "Leurre dur imitant un poisson, avec une bavette qui le fait plonger et nager à la récupération.",
  },
  {
    term: "ikejime",
    def: "Mise à mort japonaise : une pointe détruit le cerveau puis la moelle, ce qui tue le poisson instantanément et préserve la qualité de la chair.",
  },
  {
    term: "nageoire adipeuse",
    alt: ["adipeuse"],
    def: "Petite nageoire charnue sans rayons, entre la dorsale et la caudale : caractéristique des salmonidés (truites, ombre, ombles).",
  },
  {
    term: "streamer",
    def: "Leurre souple en plumes/fibres monté à la mouche, imitant un alevin ; utilisé notamment pour la truite et la perche.",
  },
];
