import type { PathogenTypeId } from "./pathogens";
import type { UnitTypeId } from "./units";

export type MissionWaveDefinition = {
  startsAtMs: number;
  pathogenTypeId: PathogenTypeId;
  count: number;
  spawnIntervalMs: number;
};

export type MissionResourceState = {
  atp: number;
  cytokines: number;
  antigens: number;
};

export type StartingUnitDefinition = {
  unitTypeId: UnitTypeId;
  count: number;
};

export type MissionAbilityId = "interferons" | "massiveNeutralization";
export type MissionResearchId = "bacterialAnalysis" | "viralAnalysis";

export type MissionObjective =
  | {
      id: string;
      label: string;
      kind: "clearThreats";
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "tissueHealthAtLeast";
      value: number;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "antigensAtLeast";
      value: number;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "researchComplete";
      researchId: MissionResearchId;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "infectedCellsAtMost";
      value: number;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "inflammationBelow";
      value: number;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "unitProduced";
      unitTypeId: UnitTypeId;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      kind: "abilityUsed";
      abilityId: MissionAbilityId;
      required?: boolean;
    };

export type VictoryCondition =
  | { kind: "allWavesCleared" }
  | { kind: "requiredObjectivesComplete" };

export type DefeatCondition =
  | { kind: "tissueHealthZero" }
  | { kind: "compromisedCellsRatioAtLeast"; value: number };

export type TutorialHint = {
  text: string;
};

export type MissionMapDefinition = typeof baseMap;

export const campaignMissionOrder = [
  "woundBacteriaV1",
  "inflammatoryReactionV2",
  "persistentInfectionV3",
  "antigenAnalysisV4",
  "adaptiveResponseV5",
  "viralInfectionV6",
  "viralCleanupV7",
  "mixedInfectionV8",
] as const;

export type MissionId = (typeof campaignMissionOrder)[number];

export type MissionDefinition = {
  id: string;
  title: string;
  displayName: string;
  subtitle?: string;
  description: string;
  briefing: string[];
  objectives: MissionObjective[];
  victoryConditions: VictoryCondition[];
  defeatConditions: DefeatCondition[];
  startingResources: MissionResourceState;
  startingUnits: StartingUnitDefinition[];
  unlockedUnits: UnitTypeId[];
  unlockedAbilities: MissionAbilityId[];
  unlockedResearch: MissionResearchId[];
  allowedPathogens: PathogenTypeId[];
  initialInfectedTissueCells?: number;
  map: MissionMapDefinition;
  waves: MissionWaveDefinition[];
  tutorialHints?: TutorialHint[];
  nextMissionId?: MissionId;
  scoreReward?: number;
};

const baseMap = {
  width: 1500,
  height: 820,
  playArea: {
    x: 92,
    y: 118,
    width: 1320,
    height: 600,
    radius: 26,
  },
  grid: {
    startX: 142,
    endX: 1350,
    startY: 152,
    endY: 686,
    stepX: 92,
    skewX: 52,
  },
  tissueZone: {
    x: 130,
    y: 245,
    width: 210,
    height: 330,
  },
  tissueCore: { x: 235, y: 410 },
  lymphNode: { x: 410, y: 650, radius: 46 },
  tissueCells: [
    { x: 210, y: 315 },
    { x: 285, y: 305 },
    { x: 360, y: 335 },
    { x: 230, y: 405 },
    { x: 315, y: 405 },
    { x: 395, y: 430 },
    { x: 245, y: 500 },
    { x: 340, y: 520 },
    { x: 455, y: 500 },
    { x: 520, y: 385 },
    { x: 560, y: 475 },
    { x: 470, y: 305 },
  ],
  bacteriaEntryZone: {
    x: 1345,
    yMin: 220,
    yMax: 625,
  },
  macrophageSpawn: { x: 280, y: 410 },
} as const;

const easyFailure: DefeatCondition[] = [
  { kind: "tissueHealthZero" },
  { kind: "compromisedCellsRatioAtLeast", value: 0.9 },
];

export const missionDefinitions: Record<MissionId, MissionDefinition> = {
  woundBacteriaV1: {
    id: "woundBacteriaV1",
    title: "Mission 1 - Plaie cutanee",
    displayName: "Plaie cutanee",
    subtitle: "Macrophages et bacteries simples",
    description: "Apprends a selectionner, deplacer et utiliser les macrophages.",
    briefing: [
      "Une petite plaie laisse entrer des bacteries rapides.",
      "Les macrophages sont l'infanterie lente mais robuste de l'immunite innee.",
      "Selectionne un macrophage avec clic gauche, puis clique sur la carte pour le deplacer.",
    ],
    objectives: [
      { id: "clear", label: "Eliminer toutes les bacteries", kind: "clearThreats", required: true },
      { id: "health40", label: "Garder le tissu au-dessus de 40%", kind: "tissueHealthAtLeast", value: 40 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 85, cytokines: 0, antigens: 0 },
    startingUnits: [{ unitTypeId: "macrophage", count: 2 }],
    unlockedUnits: ["macrophage"],
    unlockedAbilities: [],
    unlockedResearch: [],
    allowedPathogens: ["cocciRapid"],
    map: baseMap,
    waves: [
      { startsAtMs: 1200, pathogenTypeId: "cocciRapid", count: 4, spawnIntervalMs: 900 },
      { startsAtMs: 10000, pathogenTypeId: "cocciRapid", count: 5, spawnIntervalMs: 760 },
    ],
    tutorialHints: [
      { text: "Clic gauche sur une unite pour la selectionner, clic gauche sur le sol pour donner un ordre." },
    ],
    nextMissionId: "inflammatoryReactionV2",
    scoreReward: 100,
  },
  inflammatoryReactionV2: {
    id: "inflammatoryReactionV2",
    title: "Mission 2 - Reaction inflammatoire",
    displayName: "Reaction inflammatoire",
    subtitle: "Cytokines et neutrophiles",
    description: "Utilise les neutrophiles sans laisser l'inflammation deraper.",
    briefing: [
      "Les cytokines recrutent vite des renforts.",
      "Les neutrophiles frappent fort, mais ils rendent la zone plus inflammatoire.",
      "Ne les spamme pas : une inflammation excessive abime le tissu.",
    ],
    objectives: [
      { id: "clear", label: "Survivre aux vagues bacteriennes", kind: "clearThreats", required: true },
      { id: "neutrophil", label: "Produire au moins un neutrophile", kind: "unitProduced", unitTypeId: "neutrophil" },
      { id: "inflam75", label: "Limiter l'inflammation sous 75", kind: "inflammationBelow", value: 75 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 105, cytokines: 28, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil"],
    unlockedAbilities: [],
    unlockedResearch: [],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus"],
    map: baseMap,
    waves: [
      { startsAtMs: 1200, pathogenTypeId: "cocciRapid", count: 6, spawnIntervalMs: 650 },
      { startsAtMs: 12000, pathogenTypeId: "proliferatingBacillus", count: 4, spawnIntervalMs: 1100 },
      { startsAtMs: 24500, pathogenTypeId: "cocciRapid", count: 7, spawnIntervalMs: 540 },
    ],
    tutorialHints: [{ text: "Les neutrophiles sont rapides, mais chaque recrutement augmente l'inflammation." }],
    nextMissionId: "persistentInfectionV3",
    scoreReward: 120,
  },
  persistentInfectionV3: {
    id: "persistentInfectionV3",
    title: "Mission 3 - Infection persistante",
    displayName: "Infection persistante",
    subtitle: "Colonies, resistance et biofilm leger",
    description: "Cible les colonies et gere une pression plus lente mais plus solide.",
    briefing: [
      "Certaines bacteries resistent mieux ou forment une protection de groupe.",
      "Les colonies a biofilm ne sont pas rapides, mais elles rendent les combats plus longs.",
      "Garde des macrophages au contact et utilise les neutrophiles avec retenue.",
    ],
    objectives: [
      { id: "clear", label: "Détruire les colonies et survivre", kind: "clearThreats", required: true },
      { id: "inflam80", label: "Garder l'inflammation sous 80", kind: "inflammationBelow", value: 80 },
      { id: "health35", label: "Garder le tissu au-dessus de 35%", kind: "tissueHealthAtLeast", value: 35 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 120, cytokines: 34, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil"],
    unlockedAbilities: [],
    unlockedResearch: [],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony"],
    map: baseMap,
    waves: [
      { startsAtMs: 1500, pathogenTypeId: "proliferatingBacillus", count: 4, spawnIntervalMs: 1250 },
      { startsAtMs: 17000, pathogenTypeId: "resistantBacterium", count: 2, spawnIntervalMs: 1800 },
      { startsAtMs: 33000, pathogenTypeId: "biofilmColony", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 44000, pathogenTypeId: "cocciRapid", count: 8, spawnIntervalMs: 560 },
    ],
    nextMissionId: "antigenAnalysisV4",
    scoreReward: 140,
  },
  antigenAnalysisV4: {
    id: "antigenAnalysisV4",
    title: "Mission 4 - Analyse antigenique",
    displayName: "Analyse antigenique",
    subtitle: "Dendritiques, debris et ganglion",
    description: "Collecte les debris pathogenes pour generer des antigenes.",
    briefing: [
      "Les cellules dendritiques ne sont pas offensives.",
      "Elles collectent les debris, puis les apportent au ganglion pour produire des antigenes.",
      "Ces antigenes serviront a debloquer les reponses adaptatives.",
    ],
    objectives: [
      { id: "clear", label: "Survivre aux vagues", kind: "clearThreats", required: true },
      { id: "antigens12", label: "Collecter 12 antigenes", kind: "antigensAtLeast", value: 12, required: true },
      { id: "health35", label: "Garder le tissu au-dessus de 35%", kind: "tissueHealthAtLeast", value: 35 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 125, cytokines: 38, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell"],
    unlockedAbilities: [],
    unlockedResearch: [],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium"],
    map: baseMap,
    waves: [
      { startsAtMs: 1500, pathogenTypeId: "proliferatingBacillus", count: 5, spawnIntervalMs: 1100 },
      { startsAtMs: 19000, pathogenTypeId: "resistantBacterium", count: 2, spawnIntervalMs: 1900 },
      { startsAtMs: 36000, pathogenTypeId: "cocciRapid", count: 8, spawnIntervalMs: 600 },
    ],
    tutorialHints: [{ text: "Les dendritiques peuvent porter 3 debris avant de retourner au ganglion." }],
    nextMissionId: "adaptiveResponseV5",
    scoreReward: 160,
  },
  adaptiveResponseV5: {
    id: "adaptiveResponseV5",
    title: "Mission 5 - Reponse adaptative",
    displayName: "Reponse adaptative",
    subtitle: "Analyse bacterienne et anticorps",
    description: "Debloque la recherche bacterienne, les plasmocytes et la neutralisation massive.",
    briefing: [
      "La reponse adaptative arrive plus tard, mais elle frappe plus specifiquement.",
      "Collecte assez d'antigenes, lance l'analyse bacterienne, puis produis des plasmocytes.",
      "La neutralisation massive est puissante, mais couteuse.",
    ],
    objectives: [
      { id: "analysis", label: "Completer l'analyse bacterienne", kind: "researchComplete", researchId: "bacterialAnalysis", required: true },
      { id: "clear", label: "Eliminer l'infection", kind: "clearThreats", required: true },
      { id: "health35", label: "Garder le tissu au-dessus de 35%", kind: "tissueHealthAtLeast", value: 35 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 135, cytokines: 45, antigens: 6 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte"],
    unlockedAbilities: ["massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony", "toxicBacterium"],
    map: baseMap,
    waves: [
      { startsAtMs: 1500, pathogenTypeId: "proliferatingBacillus", count: 5, spawnIntervalMs: 1100 },
      { startsAtMs: 17500, pathogenTypeId: "resistantBacterium", count: 3, spawnIntervalMs: 1600 },
      { startsAtMs: 35500, pathogenTypeId: "biofilmColony", count: 2, spawnIntervalMs: 3300 },
      { startsAtMs: 54000, pathogenTypeId: "toxicBacterium", count: 3, spawnIntervalMs: 1300 },
    ],
    nextMissionId: "viralInfectionV6",
    scoreReward: 180,
  },
  viralInfectionV6: {
    id: "viralInfectionV6",
    title: "Mission 6 - Infection virale",
    displayName: "Infection virale",
    subtitle: "Virus, cellules infectees et interferons",
    description: "Les virus infectent les cellules civiles au lieu d'attaquer directement le tissu.",
    briefing: [
      "Un virus libre cherche une cellule saine et la transforme en cellule infectee.",
      "Les cellules infectees produisent ensuite de nouveaux virus.",
      "Les interferons ralentissent la propagation, mais ne nettoient pas tout seuls.",
    ],
    objectives: [
      { id: "clear", label: "Controler les virus libres", kind: "clearThreats", required: true },
      { id: "infected4", label: "Garder moins de 5 cellules infectees", kind: "infectedCellsAtMost", value: 4 },
      { id: "interferons", label: "Utiliser les interferons", kind: "abilityUsed", abilityId: "interferons" },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 125, cytokines: 55, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "dendriticCell"],
    unlockedAbilities: ["interferons"],
    unlockedResearch: [],
    allowedPathogens: ["respiratoryVirus"],
    map: baseMap,
    waves: [
      { startsAtMs: 1500, pathogenTypeId: "respiratoryVirus", count: 4, spawnIntervalMs: 1400 },
      { startsAtMs: 18000, pathogenTypeId: "respiratoryVirus", count: 5, spawnIntervalMs: 1250 },
      { startsAtMs: 38000, pathogenTypeId: "respiratoryVirus", count: 7, spawnIntervalMs: 950 },
    ],
    tutorialHints: [{ text: "Les interferons protegent temporairement les cellules dans la zone du tissu." }],
    nextMissionId: "viralCleanupV7",
    scoreReward: 200,
  },
  viralCleanupV7: {
    id: "viralCleanupV7",
    title: "Mission 7 - Nettoyage viral",
    displayName: "Nettoyage viral",
    subtitle: "NK et T cytotoxiques",
    description: "Detruis les cellules infectees avec NK puis debloque la reponse T cytotoxique.",
    briefing: [
      "Certaines cellules sont deja infectees au debut.",
      "Les cellules NK repondent vite, les T cytotoxiques demandent une analyse virale.",
      "Detruire une cellule infectee coute du tissu, mais sauve l'ensemble.",
    ],
    objectives: [
      { id: "viralAnalysis", label: "Completer l'analyse virale", kind: "researchComplete", researchId: "viralAnalysis", required: true },
      { id: "clear", label: "Eliminer les virus et cellules infectees", kind: "clearThreats", required: true },
      { id: "infected3", label: "Finir avec moins de 4 cellules infectees", kind: "infectedCellsAtMost", value: 3 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 145, cytokines: 70, antigens: 12 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "dendriticCell", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons"],
    unlockedResearch: ["viralAnalysis"],
    allowedPathogens: ["respiratoryVirus"],
    initialInfectedTissueCells: 2,
    map: baseMap,
    waves: [
      { startsAtMs: 2500, pathogenTypeId: "respiratoryVirus", count: 5, spawnIntervalMs: 1200 },
      { startsAtMs: 21000, pathogenTypeId: "respiratoryVirus", count: 7, spawnIntervalMs: 900 },
      { startsAtMs: 42000, pathogenTypeId: "respiratoryVirus", count: 8, spawnIntervalMs: 820 },
    ],
    nextMissionId: "mixedInfectionV8",
    scoreReward: 220,
  },
  mixedInfectionV8: {
    id: "mixedInfectionV8",
    title: "Mission 8 - Infection mixte",
    displayName: "Infection mixte",
    subtitle: "Priorisation finale",
    description: "Combine bacteries, biofilm, virus, inflammation et reponse adaptative.",
    briefing: [
      "Tout arrive en meme temps : bacteries, virus libres et cellules infectees.",
      "Priorise les menaces : biofilm, propagation virale, inflammation, tissu.",
      "Tu as acces a tout l'arsenal actuel du prototype.",
    ],
    objectives: [
      { id: "clear", label: "Survivre a l'infection mixte", kind: "clearThreats", required: true },
      { id: "health40", label: "Garder le tissu au-dessus de 40%", kind: "tissueHealthAtLeast", value: 40 },
      { id: "inflam85", label: "Eviter une inflammation finale au-dessus de 85", kind: "inflammationBelow", value: 85 },
      { id: "infected4", label: "Limiter les cellules infectees a 4", kind: "infectedCellsAtMost", value: 4 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 160, cytokines: 85, antigens: 12 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons", "massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis", "viralAnalysis"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony", "toxicBacterium", "respiratoryVirus"],
    initialInfectedTissueCells: 1,
    map: baseMap,
    waves: [
      { startsAtMs: 1500, pathogenTypeId: "cocciRapid", count: 7, spawnIntervalMs: 560 },
      { startsAtMs: 12000, pathogenTypeId: "respiratoryVirus", count: 5, spawnIntervalMs: 1100 },
      { startsAtMs: 24500, pathogenTypeId: "proliferatingBacillus", count: 5, spawnIntervalMs: 900 },
      { startsAtMs: 38000, pathogenTypeId: "biofilmColony", count: 2, spawnIntervalMs: 3600 },
      { startsAtMs: 54000, pathogenTypeId: "respiratoryVirus", count: 8, spawnIntervalMs: 800 },
      { startsAtMs: 68000, pathogenTypeId: "resistantBacterium", count: 3, spawnIntervalMs: 1500 },
      { startsAtMs: 82000, pathogenTypeId: "toxicBacterium", count: 3, spawnIntervalMs: 1300 },
    ],
    scoreReward: 260,
  },
};

export function isMissionId(value: string): value is MissionId {
  return value in missionDefinitions;
}

export function getFirstMissionId(): MissionId {
  return campaignMissionOrder[0];
}
