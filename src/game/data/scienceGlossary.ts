export type ScienceGlossaryEntry = {
  id: string;
  title: string;
  gameplayDescription: string;
  scienceDescription: string;
  simplificationNote: string;
};

export const scienceGlossaryEntries: ScienceGlossaryEntry[] = [
  {
    id: "macrophage",
    title: "Macrophage",
    gameplayDescription: "Unite lente et resistante qui nettoie bacteries et debris proches.",
    scienceDescription: "Cellule de l'immunite innee capable d'engloutir des pathogenes.",
    simplificationNote: "La phagocytose est acceleree pour rendre l'action lisible.",
  },
  {
    id: "neutrophil",
    title: "Neutrophile",
    gameplayDescription: "Unite rapide et agressive, forte contre bacteries mais inflammatoire.",
    scienceDescription: "Cellule innee de premiere ligne, puissante mais courte duree.",
    simplificationNote: "Son cout inflammatoire represente les degats collateraux.",
  },
  {
    id: "dendriticCell",
    title: "Cellule dendritique",
    gameplayDescription: "Collecte jusqu'a trois debris puis livre l'information via la lymphe.",
    scienceDescription: "Cellule presentatrice d'antigenes qui relie immunite innee et adaptative.",
    simplificationNote: "Le ganglion est local et simplifie, sans carte globale du corps.",
  },
  {
    id: "plasmocyte",
    title: "Plasmocyte",
    gameplayDescription: "Produit une reponse anticorps efficace apres analyse bacterienne.",
    scienceDescription: "Cellule derivee des lymphocytes B qui secrete des anticorps.",
    simplificationNote: "Les anticorps sont representes par une attaque automatique simple.",
  },
  {
    id: "cytokines",
    title: "Cytokines",
    gameplayDescription: "Ressource de signalisation pour recruter des unites et activer certains soins.",
    scienceDescription: "Molecules de communication qui coordonnent l'inflammation et le recrutement.",
    simplificationNote: "Toutes les cytokines sont regroupees en une ressource unique.",
  },
  {
    id: "inflammation",
    title: "Inflammation",
    gameplayDescription: "Utile a dose moyenne, dangereuse quand elle devient excessive.",
    scienceDescription: "Reaction locale qui aide la defense mais peut abimer les tissus.",
    simplificationNote: "La jauge condense beaucoup de mecanismes reels.",
  },
  {
    id: "interferons",
    title: "Interferons",
    gameplayDescription: "Capacite qui protege temporairement les cellules contre les virus.",
    scienceDescription: "Signaux antiviraux qui ralentissent la propagation virale.",
    simplificationNote: "Ils ralentissent, mais ne guerissent pas instantanement.",
  },
  {
    id: "nkCell",
    title: "Cellule NK",
    gameplayDescription: "Reponse rapide contre cellules infectees.",
    scienceDescription: "Cellule innee qui detecte des cellules anormales ou infectees.",
    simplificationNote: "Le ciblage est simplifie pour eviter la frustration.",
  },
  {
    id: "cytotoxicT",
    title: "T cytotoxique",
    gameplayDescription: "Unite adaptative puissante contre cellules infectees apres analyse virale.",
    scienceDescription: "Lymphocyte T capable de tuer des cellules infectees.",
    simplificationNote: "Le CMH et les sous-types precis sont hors scope.",
  },
  {
    id: "bacteria",
    title: "Bacteries",
    gameplayDescription: "Menaces extracellulaires qui attaquent tissu et cellules civiles.",
    scienceDescription: "Organismes vivants pouvant proliferer dans une plaie.",
    simplificationNote: "Les profils sont inspires, pas des especes medicalement exactes.",
  },
  {
    id: "virus",
    title: "Virus",
    gameplayDescription: "Particules fragiles qui infectent les cellules civiles et se propagent.",
    scienceDescription: "Agents infectieux dependants des cellules pour se repliquer.",
    simplificationNote: "La replication est reduite a un timer et des vagues de virus.",
  },
  {
    id: "fungus",
    title: "Champignons",
    gameplayDescription: "Foyers lents qui produisent des spores et controlent une zone.",
    scienceDescription: "Certains champignons peuvent provoquer des infections persistantes, surtout selon le contexte du tissu et de l'hote.",
    simplificationNote: "Le jeu les transforme en colonies visibles et spores pour un role tactique lisible.",
  },
  {
    id: "parasite",
    title: "Parasites",
    gameplayDescription: "Mini-boss rares, tres robustes et inflammatoires.",
    scienceDescription: "Les parasites regroupent des organismes tres varies, souvent plus complexes que bacteries ou virus.",
    simplificationNote: "Le jeu les représente par une seule menace massive, sans simuler toute l'immunologie antiparasitaire.",
  },
  {
    id: "cancerCell",
    title: "Cellules cancereuses",
    gameplayDescription: "Menaces internes lentes, mieux gerees par NK et T cytotoxiques.",
    scienceDescription: "Des cellules anormales peuvent etre reconnues et eliminees par certaines reponses immunitaires.",
    simplificationNote: "Le jeu parle de cellules anormales stylisees, sans simuler un cancer reel ni un traitement medical.",
  },
  {
    id: "opportunist",
    title: "Pathogenes opportunistes",
    gameplayDescription: "Menaces secondaires qui profitent d'une zone affaiblie ou d'une crise mixte.",
    scienceDescription: "Un organisme affaibli ou un tissu perturbe peut devenir plus vulnerable a certains microbes.",
    simplificationNote: "Le jeu les résume en vagues rapides de pression secondaire.",
  },
  {
    id: "infectedCell",
    title: "Cellule infectee",
    gameplayDescription: "Cellule du tissu devenue source de nouveaux virus.",
    scienceDescription: "Cellule hijackee par un virus pour produire d'autres particules.",
    simplificationNote: "La destruction par NK/T cree un dilemme gameplay.",
  },
  {
    id: "vaccination",
    title: "Vaccination",
    gameplayDescription: "Preparation optionnelle avant mission qui donne des antigenes initiaux.",
    scienceDescription: "Inspire le principe de preparer une reponse specifique avant exposition.",
    simplificationNote: "C'est un bonus de campagne simple, pas une simulation vaccinale.",
  },
  {
    id: "immuneMemory",
    title: "Memoire immunitaire",
    gameplayDescription: "Bonus leger quand une famille de menace a deja ete analysee.",
    scienceDescription: "Capacite de repondre plus vite a un antigene deja rencontre.",
    simplificationNote: "Stockee en progression locale sous forme de profils connus.",
  },
];
