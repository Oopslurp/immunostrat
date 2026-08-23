import bacteriaIcon from "../assets/campaign/unit-bacteria.png";
import biofilmIcon from "../assets/campaign/unit-biofilm.png";
import dendriticIcon from "../assets/campaign/unit-dendritic.png";
import macrophageIcon from "../assets/campaign/unit-macrophage.png";
import neutrophilIcon from "../assets/campaign/unit-neutrophil.png";
import nkIcon from "../assets/campaign/unit-nk.png";
import plasmocyteIcon from "../assets/campaign/unit-plasmocyte.png";
import tissueIcon from "../assets/campaign/unit-tissue.png";
import virusIcon from "../assets/campaign/unit-virus.png";
import antigenIcon from "../assets/bodymap-control/icon-ag.png";
import cytokineIcon from "../assets/bodymap-control/icon-cyt.png";
import inflammationIcon from "../assets/bodymap-control/icon-global-inflammation.png";
import lymphNodeIcon from "../assets/bodymap-control/icon-ganglion.png";
import pathogenIcon from "../assets/bodymap-control/icon-pathogen.png";
import vaccineIcon from "../assets/campaign/icon-vaccine.png";
import { pathogenDefinitions, type PathogenClass } from "../game/data/pathogens";

export type EncyclopediaCategory =
  | "immuneCells"
  | "signals"
  | "structures"
  | "infectiousAgents"
  | "threatContexts";

export type SpriteSpecimenVisual = {
  kind: "sprite";
  src: string;
  alt: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  row: number;
  frames: number;
  frameRate: number;
};

export type ImageSpecimenVisual = {
  kind: "image";
  src: string;
  alt: string;
};

export type ProceduralSpecimenVisual = {
  kind: "procedural";
  alt: string;
  shape: "coccus" | "virus" | "colony" | "spore" | "parasite" | "abnormal" | "mixed";
  symbol: string;
  color: string;
};

export type SpecimenVisual =
  | SpriteSpecimenVisual
  | ImageSpecimenVisual
  | ProceduralSpecimenVisual;

export type RealLifeVisual = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  license: string;
  sourceUrl: string;
};

export type EncyclopediaEntry = {
  id: string;
  title: string;
  shortTitle: string;
  category: EncyclopediaCategory;
  categoryLabel: string;
  accent: string;
  tagline: string;
  shortDescription: string;
  gameVisual: SpecimenVisual;
  realVisual?: RealLifeVisual;
  biologyRole: string[];
  modelChoice: string[];
  gameRole: string;
  playerDecision: string;
  faithfulAspects: string[];
  gameplaySimplifications: string[];
  fieldNotes: string[];
  relatedIds: string[];
  pathogenClass?: PathogenClass;
  profileIds?: string[];
};

export const encyclopediaCategories: Array<{
  id: EncyclopediaCategory;
  label: string;
  description: string;
}> = [
  {
    id: "immuneCells",
    label: "Cellules immunitaires",
    description: "Les unités que vous déployez, avec leurs limites et leurs états réels dans la simulation.",
  },
  {
    id: "signals",
    label: "Signaux et mécanismes",
    description: "Ce que le jeu transforme en jauges, ressources, analyses et capacités lisibles.",
  },
  {
    id: "structures",
    label: "Structures et trajets",
    description: "Les lieux et relais qui organisent une réponse au-delà du foyer local.",
  },
  {
    id: "infectiousAgents",
    label: "Familles d’agents infectieux",
    description: "Bactéries, virus, champignons et parasites : quatre familles distinctes, quatre problèmes tactiques.",
  },
  {
    id: "threatContexts",
    label: "Menaces et contextes",
    description: "Cellules infectées, cellules anormales et infections opportunistes, séparées des familles taxonomiques.",
  },
];

const publicAsset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const sprite = (
  path: string,
  alt: string,
  frameWidth: number,
  frameHeight: number,
  rows: number,
  row = 0,
  frameRate = 7,
): SpriteSpecimenVisual => ({
  kind: "sprite",
  src: publicAsset(path),
  alt,
  frameWidth,
  frameHeight,
  columns: 8,
  rows,
  row,
  frames: 8,
  frameRate,
});

const realImage = (
  filename: string,
  alt: string,
  caption: string,
  credit: string,
  license: string,
  sourceUrl: string,
): RealLifeVisual => ({
  src: publicAsset(`assets/encyclopedia/real/${filename}`),
  alt,
  caption,
  credit,
  license,
  sourceUrl,
});

const entries: EncyclopediaEntry[] = [
  {
    id: "macrophage",
    title: "Macrophage",
    shortTitle: "Macrophage",
    category: "immuneCells",
    categoryLabel: "Immunité innée",
    accent: "#62d3c8",
    tagline: "Le nettoyeur de proximité qui transforme une élimination en fenêtre tactique.",
    shortDescription: "Phagocyte robuste, lent et local : il absorbe les bactéries admissibles et tient le front.",
    gameVisual: sprite(
      "assets/sprites/units/macrophage/unit_macrophage.png",
      "Animation idle du macrophage dans Immunostrat",
      64,
      64,
      6,
    ),
    realVisual: realImage(
      "macrophage-niams.jpg",
      "Macrophages observés par microscopie confocale, membranes rouges et noyaux bleus",
      "Trois macrophages en microscopie confocale 3D ; les couleurs sont des marquages, pas leurs couleurs naturelles.",
      "Robert Kwiat, NIAMS Functional Immunogenomics Section",
      "NIAMS Multimedia Library — réutilisation avec crédit",
      "https://www.niams.nih.gov/niams-multimedia-library/search/macrophages-micro-world",
    ),
    biologyRole: [
      "Les macrophages sont des cellules de l’immunité innée capables de détecter des signaux microbiens ou de dommage et d’engloutir certaines cibles.",
      "Ils peuvent produire des médiateurs inflammatoires, éliminer des débris et, selon le contexte, participer à la présentation antigénique.",
    ],
    modelChoice: [
      "Le modèle retient sa robustesse, son action locale et la phagocytose terminale de certaines bactéries.",
      "La collecte de débris antigéniques est confiée à la cellule dendritique afin de séparer deux rôles jouables.",
    ],
    gameRole: "Unité lente et résistante qui attaque en priorité bactéries et spores. Lorsqu’un coup admissible serait terminal, une phagocytose lisible remplace la disparition immédiate de la cible.",
    playerDecision: "Le placer assez près du foyer pour verrouiller l’espace, sans attendre de lui qu’il résolve seul une infection virale ou une crise dispersée.",
    faithfulAspects: [
      "Lien entre immunité innée, phagocytose et contrôle local des microbes.",
      "Rôle d’entretien du tissu et de coordination d’une réponse inflammatoire.",
    ],
    gameplaySimplifications: [
      "La phagocytose devient une animation courte avec seuil de dégâts déterministe.",
      "Déplacements, portée, points de vie et cadence sont des conventions tactiques.",
    ],
    fieldNotes: ["Fort contre les bactéries", "Lent", "Phagocytose terminale"],
    relatedIds: ["bacteria", "dendritic-cell", "inflammation"],
  },
  {
    id: "neutrophil",
    title: "Neutrophile",
    shortTitle: "Neutrophile",
    category: "immuneCells",
    categoryLabel: "Immunité innée",
    accent: "#ffc76b",
    tagline: "Une réponse fulgurante dont la puissance a un coût pour le tissu.",
    shortDescription: "Renfort rapide, agressif et de courte durée, capable de laisser un piège NET à sa mort.",
    gameVisual: sprite(
      "assets/sprites/units/neutrophil/unit_neutrophil.png",
      "Animation idle du neutrophile dans Immunostrat",
      64,
      64,
      7,
    ),
    realVisual: realImage(
      "neutrophil-niams.jpg",
      "Neutrophiles humains observés au microscope confocal",
      "Neutrophiles humains ; membrane en rouge et noyaux multilobés en bleu par marquage fluorescent.",
      "Thai Tran, NIAMS Functional Immunogenomics Section",
      "NIAMS Multimedia Library — réutilisation avec crédit",
      "https://www.niams.nih.gov/niams-multimedia-library/search/human-neutrophil-image-1",
    ),
    biologyRole: [
      "Les neutrophiles sont recrutés rapidement vers certains tissus infectés et utilisent phagocytose, molécules antimicrobiennes et parfois des NETs.",
      "Leur action peut être efficace mais aussi contribuer aux dommages si elle devient excessive ou mal régulée.",
    ],
    modelChoice: [
      "Le modèle condense rapidité, durée de vie courte et potentiel de dégâts collatéraux dans une unité à auto-usure.",
      "La NET devient une zone brève qui attire, ralentit, immobilise et endommage les menaces proches.",
    ],
    gameRole: "Renfort mobile qui frappe vite. Sa mort près d’un pathogène peut déclencher une NET, mais la zone peut aussi blesser les cellules du tissu.",
    playerDecision: "Décider si la vitesse d’intervention justifie l’inflammation et le risque collatéral, puis choisir où laisser se former la NET.",
    faithfulAspects: [
      "Réponse innée rapide, recrutement local et forte activité antimicrobienne.",
      "NETs utiles mais potentiellement dommageables pour l’environnement tissulaire.",
    ],
    gameplaySimplifications: [
      "Une durée fixe et une zone circulaire remplacent des mécanismes cellulaires distribués.",
      "La NET affecte toutes les catégories pour rester lisible, sans simuler sa sélectivité réelle.",
    ],
    fieldNotes: ["Très rapide", "Durée limitée", "NET à double tranchant"],
    relatedIds: ["inflammation", "bacteria", "fungus"],
  },
  {
    id: "dendritic-cell",
    title: "Cellule dendritique",
    shortTitle: "Dendritique",
    category: "immuneCells",
    categoryLabel: "Relais inné → adaptatif",
    accent: "#8ae2d9",
    tagline: "Elle ne gagne pas le combat local : elle transporte l’information qui change la suite.",
    shortDescription: "Collecte les débris, rejoint la lymphe, livre l’antigène puis revient sur le terrain.",
    gameVisual: sprite(
      "assets/sprites/units/dendritic/unit_dendritic.png",
      "Animation idle de la cellule dendritique dans Immunostrat",
      64,
      64,
      10,
    ),
    biologyRole: [
      "Les cellules dendritiques peuvent capter des antigènes dans les tissus, migrer et contribuer à activer des lymphocytes dans des organes lymphoïdes.",
      "Elles font partie des ponts majeurs entre détection locale et organisation d’une réponse adaptative.",
    ],
    modelChoice: [
      "Le modèle transforme le prélèvement et la migration en une cargaison visible de zéro à trois débris.",
      "Le trajet lymphatique et le temps passé hors carte matérialisent un processus normalement plus long et plus distribué.",
    ],
    gameRole: "Unité non combattante : elle collecte automatiquement des débris, suit la route lymphatique, quitte temporairement le terrain et convertit sa charge en ressource antigénique.",
    playerDecision: "Sécuriser son trajet et arbitrer entre tenir le front maintenant ou investir dans la réponse adaptative à venir.",
    faithfulAspects: [
      "Capture d’information antigénique et migration vers un relais lymphatique.",
      "Lien fonctionnel entre immunité innée et réponse spécifique.",
    ],
    gameplaySimplifications: [
      "Trois icônes de débris résument une diversité d’antigènes et de signaux.",
      "Le ganglion, les rencontres cellulaires et les délais sont fortement condensés.",
    ],
    fieldNotes: ["Ne combat pas", "Porte 3 débris", "Génère des antigènes"],
    relatedIds: ["antigen", "lymph-node", "cytotoxic-t"],
  },
  {
    id: "plasmocyte",
    title: "Plasmocyte",
    shortTitle: "Plasmocyte",
    category: "immuneCells",
    categoryLabel: "Immunité adaptative",
    accent: "#b69cff",
    tagline: "La réponse spécifique devient une salve à longue portée, volontairement spectaculaire.",
    shortDescription: "Unité adaptative débloquée par l’analyse, produisant des projectiles anticorps guidés.",
    gameVisual: sprite(
      "assets/sprites/units/plasmocyte/unit_plasmocyte.png",
      "Animation idle du plasmocyte dans Immunostrat",
      80,
      64,
      6,
    ),
    biologyRole: [
      "Les plasmocytes dérivent de lymphocytes B activés et sécrètent de grandes quantités d’anticorps.",
      "Les anticorps peuvent notamment neutraliser des cibles ou faciliter leur élimination par d’autres mécanismes.",
    ],
    modelChoice: [
      "Le modèle matérialise une production diffuse par des projectiles guidés, visibles et attribuables à une unité.",
      "L’analyse bactérienne et la ressource antigénique servent de prérequis lisibles à cette montée en puissance.",
    ],
    gameRole: "Tire des salves de trois anticorps à longue portée. Le système peut retargeter différentes menaces hostiles, au-delà des seules bactéries.",
    playerDecision: "Investir tôt dans l’analyse et protéger une unité fragile pour obtenir une pression soutenue à distance.",
    faithfulAspects: [
      "Production d’anticorps après activation d’une réponse adaptative.",
      "Efficacité fondée sur l’information antigénique plutôt que sur une réponse immédiate universelle.",
    ],
    gameplaySimplifications: [
      "Les anticorps ne sont pas des missiles ni des explosifs ; le projectile rend leur action lisible.",
      "Le ciblage élargi est une convention d’équilibrage, pas une affirmation de spécificité biologique.",
    ],
    fieldNotes: ["Longue portée", "Salves de 3", "Analyse requise"],
    relatedIds: ["antigen", "bacteria", "immune-memory"],
  },
  {
    id: "nk-cell",
    title: "Cellule NK",
    shortTitle: "Cellule NK",
    category: "immuneCells",
    categoryLabel: "Surveillance innée",
    accent: "#ff9f43",
    tagline: "Reconnaître l’anormal avant de frapper : une boucle de surveillance rendue visible.",
    shortDescription: "Scanne les cellules du tissu et élimine rapidement une cellule infectée ou anormale détectée.",
    gameVisual: sprite(
      "assets/sprites/units/nk-cell/unit_nk.png",
      "Animation idle de la cellule NK dans Immunostrat",
      72,
      64,
      8,
    ),
    biologyRole: [
      "Les cellules NK participent à l’immunité innée et peuvent éliminer certaines cellules infectées ou transformées.",
      "Leur décision dépend d’un équilibre de signaux activateurs et inhibiteurs, pas d’un simple test binaire.",
    ],
    modelChoice: [
      "Le modèle conserve une phase de surveillance, puis transforme la décision moléculaire en état normal/anormal lisible.",
      "Le délai de détection donne au joueur le temps de comprendre pourquoi une cible devient prioritaire.",
    ],
    gameRole: "Scanne cellules saines, infectées et anormales. Après détection, elle peut éliminer la cible ; elle n’attaque pas directement les virus libres.",
    playerDecision: "La placer au contact du tissu à surveiller et distinguer la source infectée de la particule virale libre.",
    faithfulAspects: [
      "Surveillance de l’intégrité cellulaire et action sur des cellules infectées ou transformées.",
      "Différence entre contrôler un pathogène libre et supprimer une cellule devenue source.",
    ],
    gameplaySimplifications: [
      "La multiplicité des récepteurs devient une jauge de détection courte.",
      "L’élimination terminale est déterministe afin de rendre le rôle immédiatement identifiable.",
    ],
    fieldNotes: ["Surveillance", "Cible le tissu anormal", "N’attaque pas le virus libre"],
    relatedIds: ["infected-cell", "abnormal-cells", "virus"],
  },
  {
    id: "cytotoxic-t",
    title: "Lymphocyte T cytotoxique",
    shortTitle: "T cytotoxique",
    category: "immuneCells",
    categoryLabel: "Immunité adaptative",
    accent: "#a98cff",
    tagline: "Une réponse cellulaire puissante, payée par du temps et de l’information.",
    shortDescription: "Unité adaptative contre les cellules infectées, également utile pour dévoiler les cellules anormales.",
    gameVisual: sprite(
      "assets/sprites/units/cytotoxic-t/unit_cytotoxic_t.png",
      "Animation idle du lymphocyte T cytotoxique dans Immunostrat",
      72,
      64,
      7,
    ),
    biologyRole: [
      "Les lymphocytes T cytotoxiques reconnaissent des peptides présentés par le CMH I et peuvent tuer certaines cellules infectées ou anormales.",
      "Leur activation et expansion relèvent d’une réponse adaptative spécifique qui demande du temps.",
    ],
    modelChoice: [
      "Le CMH, la co-stimulation et l’expansion clonale sont regroupés en analyse virale et ressource antigénique.",
      "Sa présence proche peut faire passer une cellule anormale de cachée à détectée.",
    ],
    gameRole: "Après analyse virale, cible surtout les cellules infectées et contribue à révéler les cellules anormales ; il peut aussi combattre des menaces hostiles générales.",
    playerDecision: "Préparer l’adaptatif avant que les cellules infectées ne deviennent des usines à virus, puis concentrer les frappes sur les sources.",
    faithfulAspects: [
      "Ciblage de cellules infectées plutôt que de seules particules libres.",
      "Besoin d’une information spécifique avant une réponse efficace.",
    ],
    gameplaySimplifications: [
      "La présentation par le CMH et les sous-populations T ne sont pas simulées.",
      "L’analyse est commune à toute la partie et non propre à chaque clone lymphocytaire.",
    ],
    fieldNotes: ["Adaptatif", "Cible les sources virales", "Détecte l’anormal"],
    relatedIds: ["antigen", "infected-cell", "abnormal-cells"],
  },
  {
    id: "cytokines",
    title: "Cytokines",
    shortTitle: "Cytokines",
    category: "signals",
    categoryLabel: "Signalisation",
    accent: "#62d3c8",
    tagline: "Une diversité de messages moléculaires condensée en ressource de commandement.",
    shortDescription: "Ressource agrégée qui matérialise l’intensité de la communication immunitaire.",
    gameVisual: { kind: "image", src: cytokineIcon, alt: "Icône CYT du HUD Immunostrat" },
    biologyRole: [
      "Les cytokines sont de nombreuses molécules de signalisation produites par différents types cellulaires.",
      "Leurs effets varient : recrutement, activation, freinage, coordination ou modification de l’état d’un tissu.",
    ],
    modelChoice: [
      "Le modèle agrège des signaux distincts en une seule quantité nommée CYT.",
      "Cette quantité rend visible une communication qui serait autrement microscopique, locale et multivariable.",
    ],
    gameRole: "Ressource utilisée pour recruter des unités et activer plusieurs commandes. Elle augmente notamment avec certaines pressions bactériennes, virales et cellulaires infectées.",
    playerDecision: "Dépenser les signaux pour répondre maintenant ou les conserver pour une capacité plus décisive.",
    faithfulAspects: ["La communication coordonne le recrutement et l’intensité de la réponse."],
    gameplaySimplifications: [
      "CYT n’est ni une substance unique, ni une énergie, ni un carburant réel.",
      "Concentrations, gradients, récepteurs et effets parfois opposés ne sont pas simulés.",
    ],
    fieldNotes: ["Ressource agrégée", "Recrutement", "Capacités"],
    relatedIds: ["inflammation", "interferons", "antigen"],
  },
  {
    id: "inflammation",
    title: "Inflammation",
    shortTitle: "Inflammation",
    category: "signals",
    categoryLabel: "Risque systémique",
    accent: "#ff9f43",
    tagline: "Combattre assez fort pour contenir l’infection, sans sacrifier le tissu.",
    shortDescription: "Jauge centrale : utile pour mobiliser la défense, dangereuse quand elle s’emballe.",
    gameVisual: { kind: "image", src: inflammationIcon, alt: "Icône d’inflammation globale dans Immunostrat" },
    biologyRole: [
      "L’inflammation est une réponse coordonnée qui peut favoriser le recrutement et l’activation de mécanismes de défense.",
      "Elle n’est pas intrinsèquement mauvaise, mais son intensité, sa durée ou sa mauvaise régulation peuvent endommager les tissus.",
    ],
    modelChoice: [
      "Le modèle résume un phénomène collectif et distribué par des jauges locale et globale.",
      "Les effets deviennent un compromis mesurable entre puissance de réponse et intégrité du tissu.",
    ],
    gameRole: "Certains combats, unités et menaces augmentent l’inflammation. À haut niveau, le tissu subit une pression qui peut transformer une victoire militaire en défaite biologique.",
    playerDecision: "Choisir quand accélérer l’offensive, quand employer un traitement anti-inflammatoire et quand accepter un front plus lent.",
    faithfulAspects: [
      "Une réponse utile peut devenir dommageable si elle est excessive.",
      "Le contexte tissulaire compte autant que la destruction de la menace.",
    ],
    gameplaySimplifications: [
      "Une valeur numérique unique remplace de nombreuses voies, cellules, médiateurs et échelles spatiales.",
      "Les seuils et dégâts sont calibrés pour une partie de quelques minutes.",
    ],
    fieldNotes: ["Nécessaire", "Mesurable", "Dommages au tissu"],
    relatedIds: ["cytokines", "neutrophil", "opportunistic-infections"],
  },
  {
    id: "interferons",
    title: "Interférons",
    shortTitle: "Interférons",
    category: "signals",
    categoryLabel: "Signal antiviral",
    accent: "#8ae2d9",
    tagline: "Gagner du temps contre la propagation n’est pas guérir une cellule déjà infectée.",
    shortDescription: "Protection temporaire qui réduit l’efficacité virale sans supprimer la source.",
    gameVisual: { kind: "image", src: virusIcon, alt: "Icône de virus utilisée pour l’état antiviral dans Immunostrat" },
    biologyRole: [
      "Les interférons regroupent des cytokines importantes dans les réponses antivirales et la mise en place d’états cellulaires moins permissifs.",
      "Leurs effets dépendent du type d’interféron, du tissu, du moment et de nombreux autres signaux.",
    ],
    modelChoice: [
      "Le modèle retient l’idée d’un voisinage temporairement moins facile à infecter.",
      "Une animation protégée distingue visuellement prévention partielle et infection déjà installée.",
    ],
    gameRole: "La commande protège temporairement des cellules du tissu et réduit vitesse, portée d’infection ou production virale selon l’état actif.",
    playerDecision: "Activer la protection avant que la vague atteigne un groupe de cellules, puis envoyer NK/T sur les sources déjà infectées.",
    faithfulAspects: ["Signal antiviral et protection temporaire de cellules voisines."],
    gameplaySimplifications: [
      "Une capacité unique fusionne plusieurs interférons et effets.",
      "La protection est représentée par un multiplicateur et une durée lisible.",
    ],
    fieldNotes: ["Préventif", "Temporaire", "Ne guérit pas"],
    relatedIds: ["virus", "infected-cell", "cytokines"],
  },
  {
    id: "antigen",
    title: "Antigène",
    shortTitle: "Antigène",
    category: "signals",
    categoryLabel: "Information adaptative",
    accent: "#b69cff",
    tagline: "Une structure reconnue devient, dans le modèle, une information à transporter et dépenser.",
    shortDescription: "Ressource issue des débris livrés, nécessaire à plusieurs réponses adaptatives.",
    gameVisual: { kind: "image", src: antigenIcon, alt: "Icône AG de la ressource antigénique" },
    biologyRole: [
      "Un antigène est une structure moléculaire pouvant être reconnue par des mécanismes de l’immunité adaptative.",
      "Un micro-organisme peut porter de nombreux antigènes : antigène et microbe ne sont pas synonymes.",
    ],
    modelChoice: [
      "Le modèle représente l’information par des débris transportables puis une réserve AG.",
      "Il ne simule ni épitopes, ni récepteurs clonaux, ni affinité ; il conserve la dépendance à une reconnaissance préalable.",
    ],
    gameRole: "Produit lorsque la dendritique livre sa charge. Sert de coût ou de prérequis aux analyses et unités adaptatives.",
    playerDecision: "Investir dans la collecte alors que le front est encore contrôlable, afin de ne pas découvrir trop tard que la bonne réponse est verrouillée.",
    faithfulAspects: ["Une réponse spécifique dépend d’information issue de la cible."],
    gameplaySimplifications: ["Tous les antigènes pertinents deviennent une ressource commune et fongible."],
    fieldNotes: ["Information", "Transport", "Adaptatif"],
    relatedIds: ["dendritic-cell", "lymph-node", "plasmocyte"],
  },
  {
    id: "vaccination",
    title: "Vaccination",
    shortTitle: "Vaccination",
    category: "signals",
    categoryLabel: "Préparation",
    accent: "#7ee28a",
    tagline: "Préparer une reconnaissance avant l’exposition devient un choix d’avant-mission.",
    shortDescription: "Bonus de préparation donnant un avantage spécifique avant le premier contact.",
    gameVisual: { kind: "image", src: vaccineIcon, alt: "Icône de vaccination de la campagne" },
    biologyRole: [
      "La vaccination peut préparer des composantes de l’immunité adaptative à reconnaître un antigène avant une exposition ultérieure.",
      "Les réponses, durées et niveaux de protection varient selon le vaccin, l’agent et la personne.",
    ],
    modelChoice: [
      "Le modèle retient l’anticipation et la spécificité, puis les condense en bonus initial de campagne.",
      "Il ne représente ni protocole, ni dose, ni efficacité clinique.",
    ],
    gameRole: "Préparation optionnelle qui fournit des antigènes ou un avantage de départ lié au profil déjà étudié.",
    playerDecision: "Choisir la préparation qui réduit le temps nécessaire pour atteindre la réponse adaptée à la mission.",
    faithfulAspects: ["Préparation spécifique avant exposition."],
    gameplaySimplifications: ["Bonus instantané et déterministe, sans simulation vaccinale."],
    fieldNotes: ["Avant mission", "Spécifique", "Bonus initial"],
    relatedIds: ["antigen", "immune-memory", "virus"],
  },
  {
    id: "immune-memory",
    title: "Mémoire immunitaire",
    shortTitle: "Mémoire",
    category: "signals",
    categoryLabel: "Progression",
    accent: "#7ee28a",
    tagline: "Une rencontre passée raccourcit la préparation de la réponse future.",
    shortDescription: "Progression persistante locale qui reconnaît des profils antigéniques déjà rencontrés.",
    gameVisual: { kind: "image", src: antigenIcon, alt: "Icône d’antigène associée à la mémoire dans Immunostrat" },
    biologyRole: [
      "Certaines réponses adaptatives laissent des populations capables de réagir plus vite ou plus efficacement lors d’une nouvelle exposition.",
      "La mémoire dépend du type de réponse, du temps et du contexte ; elle n’est pas une immunité absolue.",
    ],
    modelChoice: [
      "Le modèle stocke des identifiants de profils connus dans la progression locale du navigateur.",
      "Cette connaissance devient un léger bonus plutôt qu’un arbre immunologique complet.",
    ],
    gameRole: "Les profils déjà analysés accélèrent ou facilitent certaines préparations lors de missions ultérieures.",
    playerDecision: "Construire un avantage de campagne en apprenant tôt les profils qui reviendront sous d’autres formes.",
    faithfulAspects: ["Une exposition passée modifie la vitesse de réponse future."],
    gameplaySimplifications: ["Un profil connu résume clones, anticorps, durées et qualité de mémoire."],
    fieldNotes: ["Persistante", "Locale au navigateur", "Bonus léger"],
    relatedIds: ["vaccination", "antigen", "plasmocyte"],
  },
  {
    id: "lymph-node",
    title: "Ganglion lymphatique",
    shortTitle: "Ganglion",
    category: "structures",
    categoryLabel: "Relais lymphatique",
    accent: "#62d3c8",
    tagline: "Le combat local envoie de l’information vers un lieu d’organisation de la réponse.",
    shortDescription: "Relais condensé où la cargaison dendritique devient ressource adaptative.",
    gameVisual: { kind: "image", src: lymphNodeIcon, alt: "Icône de ganglion lymphatique de la carte du corps" },
    biologyRole: [
      "Les ganglions reçoivent de la lymphe, des antigènes et des cellules provenant des tissus drainés.",
      "Ils favorisent des rencontres entre cellules présentatrices et lymphocytes et organisent de nombreuses réponses adaptatives.",
    ],
    modelChoice: [
      "Le modèle matérialise la circulation par une route et un point de sortie visibles sur la carte tactique.",
      "La complexité du ganglion devient un temps hors carte suivi d’un dépôt de ressource antigénique.",
    ],
    gameRole: "Destination des cellules dendritiques chargées. Il sert de relais entre collecte locale et déblocage adaptatif.",
    playerDecision: "Garder le corridor lymphatique praticable et escorter l’unité d’information plutôt que de concentrer toutes les forces sur le foyer.",
    faithfulAspects: ["Drainage tissulaire et organisation de la réponse adaptative dans un relais."],
    gameplaySimplifications: ["Trajets, architecture interne, populations cellulaires et délais sont condensés en un portail."],
    fieldNotes: ["Relais", "Hors carte", "Conversion en AG"],
    relatedIds: ["dendritic-cell", "antigen", "cytotoxic-t"],
  },
  {
    id: "bacteria",
    title: "Bactéries",
    shortTitle: "Bactéries",
    category: "infectiousAgents",
    categoryLabel: "Agent infectieux",
    accent: "#ff7f8f",
    tagline: "Essaim, prolifération, résistance, biofilm : une famille, plusieurs problèmes de terrain.",
    shortDescription: "Menaces extracellulaires déclinées en archétypes tactiques, sans représenter des espèces exactes.",
    gameVisual: { kind: "image", src: bacteriaIcon, alt: "Illustration de bactérie utilisée dans la campagne" },
    realVisual: realImage(
      "bacteria-mrsa-cdc.jpg",
      "Amas de bactéries Staphylococcus aureus résistantes à la méticilline au microscope électronique",
      "Exemple réel : amas de MRSA colorisés, grossissement 9 560×. Toutes les bactéries ne ressemblent pas à cet exemple et ne sont pas pathogènes.",
      "CDC / Janice Haney Carr / Jeff Hageman",
      "Domaine public — CDC PHIL 10046",
      "https://wwwn.cdc.gov/phil/Details.aspx?pid=10046",
    ),
    biologyRole: [
      "Les bactéries sont des organismes unicellulaires procaryotes d’une immense diversité ; beaucoup sont neutres ou bénéfiques.",
      "Certaines bactéries pathogènes peuvent se multiplier, endommager un tissu, former des communautés ou déclencher une forte réponse innée.",
    ],
    modelChoice: [
      "Le modèle regroupe des stratégies en archétypes : cocci rapides, bacilles proliférants, forme résistante, biofilm et pression toxique.",
      "La forme, la couleur, l’armure et les règles de spawn rendent ces comportements lisibles sans prétendre à une espèce précise.",
    ],
    gameRole: "Attaquent les cellules et le tissu, déposent des débris et alimentent la réponse innée. Certaines prolifèrent ou bénéficient d’une zone de biofilm protectrice.",
    playerDecision: "Identifier s’il faut nettoyer un essaim, couper une source de prolifération ou casser d’abord le biofilm qui protège le foyer.",
    faithfulAspects: [
      "Diversité de comportements et importance de la réponse innée.",
      "Un biofilm peut rendre une communauté plus difficile à éliminer.",
    ],
    gameplaySimplifications: [
      "Les profils combinent plusieurs inspirations et ne sont pas des espèces médicalement exactes.",
      "Armure, dégâts et points de vie remplacent sensibilité, croissance et interactions moléculaires.",
    ],
    fieldNotes: ["Extracellulaire", "Débris antigéniques", "Plusieurs archétypes"],
    relatedIds: ["macrophage", "neutrophil", "plasmocyte"],
    pathogenClass: "bacterium",
    profileIds: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony", "toxicBacterium", "basicBacterium"],
  },
  {
    id: "virus",
    title: "Virus",
    shortTitle: "Virus",
    category: "infectiousAgents",
    categoryLabel: "Agent infectieux",
    accent: "#a98cff",
    tagline: "Particule libre, cellule infectée, nouvelles particules : casser la chaîne plutôt que poursuivre les symptômes.",
    shortDescription: "Agents dépendants d’une cellule hôte, représentés par une boucle d’infection lisible.",
    gameVisual: { kind: "image", src: virusIcon, alt: "Illustration de virus utilisée dans la campagne" },
    realVisual: realImage(
      "virus-influenza-cdc.jpg",
      "Particules de virus influenza observées au microscope électronique",
      "Exemple réel : virions influenza A (H1N1) colorisés. Cette image ne représente pas tous les virus du jeu.",
      "CDC / Cynthia Goldsmith",
      "Domaine public — CDC PHIL 11745",
      "https://phil.cdc.gov/Details.aspx?pid=11745",
    ),
    biologyRole: [
      "Un virus dépend d’une cellule hôte pour produire de nouvelles particules.",
      "Les réponses efficaces contre des virus intracellulaires ne sont pas identiques à celles dirigées contre des bactéries extracellulaires.",
    ],
    modelChoice: [
      "Le modèle retient une chaîne commune : virus libre → cellule infectée → émission périodique de nouveaux virus.",
      "Les variantes virales diffèrent surtout par vitesse, résistance et vulnérabilité ; leurs cycles réels ne sont pas simulés séparément.",
    ],
    gameRole: "Cherche une cellule saine, l’infecte au contact puis disparaît. La cellule infectée endommage le tissu et libère périodiquement de nouvelles particules.",
    playerDecision: "Ralentir les particules avec la protection antivirale tout en envoyant NK/T éliminer les cellules sources.",
    faithfulAspects: ["Dépendance à la cellule hôte et distinction entre particule libre et cellule infectée."],
    gameplaySimplifications: [
      "Réplication, latence, cytolyse et évasion deviennent des timers, statistiques ou profils.",
      "Une seule représentation visuelle agrège des virus biologiquement très différents.",
    ],
    fieldNotes: ["Intracellulaire", "Propagation", "Cible les cellules"],
    relatedIds: ["infected-cell", "interferons", "nk-cell"],
    pathogenClass: "virus",
    profileIds: ["respiratoryVirus", "cytolyticVirus", "latentVirus", "immuneEvasiveVirus", "reactivatedLatentVirus"],
  },
  {
    id: "fungus",
    title: "Champignons",
    shortTitle: "Champignons",
    category: "infectiousAgents",
    categoryLabel: "Agent infectieux",
    accent: "#dce785",
    tagline: "Une croissance lente devient un problème de contrôle de zone et de production de spores.",
    shortDescription: "Foyers persistants et spores : une famille enfin distinguée des bactéries dans l’encyclopédie.",
    gameVisual: { kind: "procedural", alt: "Représentation procédurale d’un foyer fongique", shape: "colony", symbol: "SP", color: "#dce785" },
    realVisual: realImage(
      "fungus-candida-cdc.jpg",
      "Spores de Candida albicans et tubes germinatifs observés en photomicrographie",
      "Exemple réel : Candida albicans développant des tubes germinatifs. Les champignons du jeu agrègent plusieurs morphologies.",
      "CDC / Dr Lucille K. Georg",
      "Domaine public — CDC PHIL 21794",
      "https://wwwn.cdc.gov/phil/Details.aspx?pid=21794",
    ),
    biologyRole: [
      "Les champignons comprennent des organismes très divers ; certaines levures ou formes filamenteuses peuvent provoquer des infections selon le tissu et l’état de l’hôte.",
      "Leur paroi, leur croissance et leurs morphologies les distinguent des bactéries et des virus.",
    ],
    modelChoice: [
      "Le modèle retient persistance locale, croissance et dissémination par unités de type spore.",
      "Les foyers et spores sont dessinés procéduralement ; aucun faux spritesheet n’est présenté ici.",
    ],
    gameRole: "Les foyers infligent une pression passive au tissu et à l’inflammation. Certaines colonies produisent périodiquement des spores fragiles mais nombreuses.",
    playerDecision: "Choisir entre détruire la source lente et nettoyer les spores qui étendent déjà la zone de menace.",
    faithfulAspects: ["Persistance, diversité morphologique et potentiel de dissémination."],
    gameplaySimplifications: [
      "Pas d’hyphes, de transitions morphologiques ni de réponse antifongique spécialisée.",
      "Les dommages de zone résument des interactions beaucoup plus complexes.",
    ],
    fieldNotes: ["Persistant", "Produit des spores", "Contrôle de zone"],
    relatedIds: ["neutrophil", "inflammation", "opportunistic-infections"],
    pathogenClass: "fungus",
    profileIds: ["fungalColony", "fungalSpore", "yeastOpportunist", "sporeMold", "cutaneousFungus", "opportunistYeastFlare"],
  },
  {
    id: "parasite",
    title: "Parasites",
    shortTitle: "Parasites",
    category: "infectiousAgents",
    categoryLabel: "Agent infectieux",
    accent: "#ffb36b",
    tagline: "Une catégorie immense condensée en trois silhouettes de menace, sans prétendre simuler leurs cycles.",
    shortDescription: "Helminthe massif, protozoaire mobile et larve migratrice : trois profils tactiques distincts.",
    gameVisual: { kind: "procedural", alt: "Représentation procédurale du parasite mini-boss", shape: "parasite", symbol: "PAR", color: "#ffb36b" },
    realVisual: realImage(
      "parasite-plasmodium-cdc.jpg",
      "Trophozoïte Plasmodium malariae en bande dans un frottis sanguin",
      "Exemple réel : Plasmodium malariae dans un globule rouge. Il illustre un protozoaire, pas tous les parasites.",
      "CDC / Dr Mae Melvin",
      "Domaine public — CDC PHIL 12099",
      "https://wwwn.cdc.gov/phil/Details.aspx?pid=12099",
    ),
    biologyRole: [
      "Le mot parasite recouvre des organismes et cycles de vie extrêmement différents, des protozoaires microscopiques aux helminthes pluricellulaires.",
      "Les réponses immunitaires dépendent fortement du type, du stade et du tissu concerné.",
    ],
    modelChoice: [
      "Le modèle garde trois contrastes tactiques : masse résistante, mobilité sanguine et migration tardive.",
      "Le cycle biologique, les hôtes intermédiaires et les réponses de type 2 sont hors simulation.",
    ],
    gameRole: "Menaces avancées utilisant mouvement et attaque génériques, avec forte pression inflammatoire. Taille, vitesse, armure et dégâts différencient les trois profils.",
    playerDecision: "Concentrer les unités et le burst sur la menace prioritaire sans laisser l’inflammation dépasser la capacité du tissu.",
    faithfulAspects: ["Grande diversité et importance du contexte tissulaire."],
    gameplaySimplifications: [
      "Aucun cycle de vie ni trajet hôte-vecteur n’est simulé.",
      "Éosinophiles, mastocytes, IgE et autres réponses spécialisées ne sont pas représentés.",
    ],
    fieldNotes: ["Mini-boss", "Mobile ou massif", "Très inflammatoire"],
    relatedIds: ["inflammation", "cytotoxic-t", "opportunistic-infections"],
    pathogenClass: "parasite",
    profileIds: ["parasiteHelminth", "bloodProtozoan", "migratoryLarva"],
  },
  {
    id: "infected-cell",
    title: "Cellule infectée",
    shortTitle: "Cellule infectée",
    category: "threatContexts",
    categoryLabel: "Tissu détourné",
    accent: "#a98cff",
    tagline: "La cible n’est plus seulement l’envahisseur : une cellule du corps est devenue la source.",
    shortDescription: "État du tissu distinct du virus libre, générant périodiquement de nouvelles particules.",
    gameVisual: sprite(
      "assets/sprites/tissue/tissue-cell/cell_civilian.png",
      "Animation de cellule tissulaire infectée dans Immunostrat",
      64,
      64,
      5,
      1,
      8,
    ),
    biologyRole: [
      "Un agent intracellulaire peut détourner une cellule hôte pour produire de nouvelles particules ou altérer son fonctionnement.",
      "Certaines réponses immunitaires ciblent alors la cellule infectée afin de supprimer la source.",
    ],
    modelChoice: [
      "Le modèle sépare clairement la particule libre de l’état infected du tissu.",
      "Une cellule infectée devient une usine à timer et une cible prioritaire pour NK/T.",
    ],
    gameRole: "Endommage progressivement le tissu et émet de nouveaux virus. La protection interféron peut coexister avec l’infection sans l’effacer.",
    playerDecision: "Éliminer la source assez tôt, tout en acceptant que détruire une cellule du tissu soit aussi un coût.",
    faithfulAspects: ["Distinction virus libre / cellule hôte infectée et ciblage cellulaire."],
    gameplaySimplifications: ["Une catégorie et un timer communs résument de nombreux états d’infection."],
    fieldNotes: ["Source virale", "Cible NK/T", "Coût tissulaire"],
    relatedIds: ["virus", "nk-cell", "interferons"],
  },
  {
    id: "abnormal-cells",
    title: "Cellules anormales",
    shortTitle: "Cellules anormales",
    category: "threatContexts",
    categoryLabel: "Menace interne — pas un pathogène",
    accent: "#ff7f8f",
    tagline: "Une menace du soi altéré : d’abord la détecter, puis décider de l’éliminer.",
    shortDescription: "Représentation stylisée de cellules transformées sous surveillance NK/T, et non simulation du cancer.",
    gameVisual: { kind: "procedural", alt: "Représentation procédurale d’une cellule anormale non détectée", shape: "abnormal", symbol: "?", color: "#ff7f8f" },
    realVisual: realImage(
      "abnormal-cells-cdc.jpg",
      "Biopsie colorée montrant des cellules d’adénocarcinome",
      "Exemple histologique : adénocarcinome coloré. Une image de tissu ne permet pas de généraliser l’apparence de tous les cancers.",
      "CDC / A. Elizabeth Plott",
      "Domaine public — CDC PHIL 14767",
      "https://phil.cdc.gov/Details.aspx?pid=14767",
    ),
    biologyRole: [
      "Des cellules transformées peuvent exprimer des signaux anormaux et être reconnues par certaines composantes de l’immunité.",
      "Le cancer implique évolution clonale, microenvironnement et échappement : bien plus qu’une simple cible étrangère.",
    ],
    modelChoice: [
      "Le modèle conserve la surveillance du soi altéré puis la condense en états caché/détecté.",
      "Une opacité réduite matérialise l’incertitude avant détection par NK/T.",
    ],
    gameRole: "Draine la santé du tissu et peut proliférer. NK et T cytotoxiques la détectent puis la traitent plus efficacement que les unités innées classiques.",
    playerDecision: "Investir dans la surveillance, révéler les cibles discrètes et les prioriser avant leur prolifération.",
    faithfulAspects: ["Surveillance immunitaire de cellules altérées et rôle des réponses cytotoxiques."],
    gameplaySimplifications: [
      "Ce n’est pas une simulation oncologique et aucune conclusion médicale ne doit en être tirée.",
      "Invasion, métastase et microenvironnement ne possèdent pas de systèmes dédiés en bataille.",
    ],
    fieldNotes: ["Pas un pathogène", "Cachée puis détectée", "Cible NK/T"],
    relatedIds: ["nk-cell", "cytotoxic-t", "inflammation"],
    pathogenClass: "cancerCell",
    profileIds: ["cancerCellCluster", "discreetAbnormalCell", "proliferativeCancerCell", "inflammatoryCancerCell", "invasiveCancerCell"],
  },
  {
    id: "opportunistic-infections",
    title: "Infections opportunistes",
    shortTitle: "Opportunistes",
    category: "threatContexts",
    categoryLabel: "Contexte — pas une famille",
    accent: "#f0c66c",
    tagline: "La menace vient du moment où elle surgit : un organisme déjà fragilisé a moins de marge.",
    shortDescription: "Pressions secondaires bactériennes, fongiques, virales ou mixtes placées au pire moment.",
    gameVisual: { kind: "procedural", alt: "Représentation procédurale d’un cluster opportuniste mixte", shape: "mixed", symbol: "MIX", color: "#f0c66c" },
    biologyRole: [
      "Opportuniste décrit un contexte où un microbe profite d’une barrière, d’un microbiote ou d’une réponse immunitaire perturbés.",
      "Ce n’est pas une famille taxonomique : bactéries, champignons ou virus peuvent être concernés selon la situation.",
    ],
    modelChoice: [
      "Le modèle raconte la fragilité par le timing des vagues et des crises de carte du corps.",
      "Il ne déclenche pas dynamiquement ces menaces selon un seuil local de microbiote ou d’immunodépression.",
    ],
    gameRole: "Petites vagues secondaires ou cluster mixte qui arrivent quand le joueur gère déjà une autre pression. Certaines gardent leur vraie classe fongique ou virale.",
    playerDecision: "Conserver une réserve mobile et traiter rapidement la seconde crise sans abandonner l’objectif principal.",
    faithfulAspects: ["La vulnérabilité dépend du contexte de l’hôte et du tissu."],
    gameplaySimplifications: [
      "Le contexte est scénarisé dans les vagues plutôt que simulé localement.",
      "Un cluster mixte agrège plusieurs pressions pour rester lisible.",
    ],
    fieldNotes: ["Pas une taxonomie", "Timing punitif", "Pression secondaire"],
    relatedIds: ["fungus", "bacteria", "inflammation"],
    pathogenClass: "opportunist",
    profileIds: ["opportunistBacterium", "secondaryBacterium", "opportunistYeastFlare", "reactivatedLatentVirus", "mixedOpportunistCluster"],
  },
];

export const encyclopediaEntries = entries;

export const encyclopediaEntryById = new Map(
  encyclopediaEntries.map((entry) => [entry.id, entry]),
);

export function getEntryProfiles(entry: EncyclopediaEntry) {
  return (entry.profileIds ?? [])
    .map((profileId) => pathogenDefinitions[profileId as keyof typeof pathogenDefinitions])
    .filter((profile): profile is (typeof pathogenDefinitions)[keyof typeof pathogenDefinitions] => Boolean(profile));
}

export const encyclopediaHomeVisuals = {
  bacteriaIcon,
  biofilmIcon,
  dendriticIcon,
  macrophageIcon,
  neutrophilIcon,
  nkIcon,
  pathogenIcon,
  plasmocyteIcon,
  tissueIcon,
  virusIcon,
};
