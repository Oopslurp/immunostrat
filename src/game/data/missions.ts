import { createInfiniteWaves, type InfiniteDifficulty } from "./infiniteMode";
import type { PathogenTypeId } from "./pathogens";
import {
  tacticalMapDefinitions,
  type TacticalMapId,
  type TacticalMapMode,
  type TacticalRegionType,
} from "./tacticalMaps";
import type { TreatmentId } from "./treatments";
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

export type MissionMapDefinition = {
  width: number;
  height: number;
  tacticalMapId?: TacticalMapId;
  playArea: { x: number; y: number; width: number; height: number; radius: number };
  grid: { startX: number; endX: number; startY: number; endY: number; stepX: number; skewX: number };
  tissueZone: { x: number; y: number; width: number; height: number };
  tissueCore: { x: number; y: number };
  lymphNode: { x: number; y: number; radius: number };
  lymphExit: { x: number; y: number; radius: number; localNodeId: string; regionalNodeId: string };
  immuneEntryPoints: Array<{
    id: string;
    label: string;
    kind: "vessel" | "diapedesis" | "lymph";
    position: { x: number; y: number };
    radius: number;
  }>;
  missionRegion: string;
  tissueCells: Array<{ x: number; y: number }>;
  bacteriaEntryZone: { x: number; yMin: number; yMax: number };
  macrophageSpawn: { x: number; y: number };
};

export type VaccinationOption = {
  id: string;
  displayName: string;
  targetProfile: "bacterial" | "viral";
  atpCost: number;
  antigenBonus: number;
  cytokineBonus: number;
  description: string;
};

export type MissionPreparation = {
  vaccinationId?: string | null;
  memoryProfiles?: Array<"bacterial" | "viral">;
  bodyRegionId?: string;
  globalReinforcements?: StartingUnitDefinition[];
  regionalNodeBonus?: {
    nodeId: string;
    active: boolean;
    antigenBonus: number;
    cytokineBonus: number;
  };
  infiniteDifficulty?: InfiniteDifficulty;
  tacticalMapSeed?: string;
  tacticalMapTemplateId?: TacticalMapId;
  tacticalMapMode?: TacticalMapMode;
  tacticalRegionType?: TacticalRegionType;
  tacticalThreatType?: string;
  tacticalDifficulty?: "easy" | "normal" | "hard";
};

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

export const bodyBattleMissionOrder = [
  "skinBacterialSkirmish",
  "skinBiofilmPressure",
  "skinFungalOutbreak",
  "lungViralSpread",
  "lungCancerSuspectCells",
  "intestineBacillusSwarm",
  "intestineParasiteBoss",
  "bloodMixedAlert",
  "opportunisticMixedFlare",
  "lymphNodeSignalResponse",
  "spleenBloodFiltering",
  "boneMarrowReinforcementPressure",
  "liverAbnormalGrowth",
] as const;

export const infiniteMissionOrder = ["infiniteSurvivalV8"] as const;

export type CampaignMissionId = (typeof campaignMissionOrder)[number];
export type BodyBattleMissionId = (typeof bodyBattleMissionOrder)[number];
export type InfiniteMissionId = (typeof infiniteMissionOrder)[number];
export type MissionId = CampaignMissionId | BodyBattleMissionId | InfiniteMissionId;

export type MissionDefinition = {
  id: string;
  mode?: "campaign" | "bodyBattle" | "infinite";
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
  unlockedTreatments: TreatmentId[];
  vaccinationOptions?: VaccinationOption[];
  memoryHintProfiles?: Array<"bacterial" | "viral">;
  allowedPathogens: PathogenTypeId[];
  initialInfectedTissueCells?: number;
  map: MissionMapDefinition;
  waves: MissionWaveDefinition[];
  tutorialHints?: TutorialHint[];
  nextMissionId?: MissionId;
  scoreReward?: number;
};

const baseMap: MissionMapDefinition = {
  width: 1500,
  height: 820,
  tacticalMapId: "skin_small_wound_fixed",
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
  lymphExit: { x: 350, y: 675, radius: 28, localNodeId: "skin-local-node", regionalNodeId: "future-skin-region" },
  immuneEntryPoints: [
    {
      id: "vessel-entry-left",
      label: "Vaisseau local",
      kind: "vessel",
      position: { x: 185, y: 384 },
      radius: 28,
    },
    {
      id: "diapedesis-upper",
      label: "Diapedese haute",
      kind: "diapedesis",
      position: { x: 255, y: 265 },
      radius: 24,
    },
    {
      id: "lymph-entry-lower",
      label: "Sortie lymphatique basse",
      kind: "lymph",
      position: { x: 330, y: 630 },
      radius: 24,
    },
  ],
  missionRegion: "skin-local",
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
};

function mapWithTacticalMap(tacticalMapId: TacticalMapId): MissionMapDefinition {
  const tacticalMap = tacticalMapDefinitions[tacticalMapId];
  const firstCombatSite = tacticalMap.combatSites[0];
  const firstEntryPoint =
    tacticalMap.reinforcementEntryPoints[0] ?? tacticalMap.diapedesisPoints[0];
  const firstLymphExit = tacticalMap.lymphaticExits[0];

  return {
    ...baseMap,
    tacticalMapId,
    width: tacticalMap.worldWidth,
    height: tacticalMap.worldHeight,
    playArea: {
      x: 90,
      y: 110,
      width: Math.max(900, tacticalMap.worldWidth - 180),
      height: Math.max(620, tacticalMap.worldHeight - 220),
      radius: 30,
    },
    grid: {
      ...baseMap.grid,
      endX: tacticalMap.worldWidth - 150,
      endY: tacticalMap.worldHeight - 140,
    },
    tissueCore: firstCombatSite?.position ?? baseMap.tissueCore,
    lymphNode: firstLymphExit
      ? {
          x: firstLymphExit.position.x,
          y: firstLymphExit.position.y,
          radius: firstLymphExit.radius + 14,
        }
      : baseMap.lymphNode,
    lymphExit: firstLymphExit
      ? {
          ...baseMap.lymphExit,
          x: firstLymphExit.position.x,
          y: firstLymphExit.position.y,
          radius: firstLymphExit.radius,
        }
      : baseMap.lymphExit,
    immuneEntryPoints: [
      ...tacticalMap.reinforcementEntryPoints.map((entryPoint, index) => ({
        id: entryPoint.id,
        label: entryPoint.name,
        kind: index === 0 ? "vessel" as const : "diapedesis" as const,
        position: entryPoint.position,
        radius: entryPoint.spawnRadius,
      })),
      ...tacticalMap.lymphaticExits.map((exit) => ({
        id: exit.id,
        label: exit.name,
        kind: "lymph" as const,
        position: exit.position,
        radius: exit.radius,
      })),
    ],
    bacteriaEntryZone: {
      x:
        tacticalMap.pathogenSpawnZones[0]?.position.x ??
        tacticalMap.worldWidth - 155,
      yMin: 180,
      yMax: tacticalMap.worldHeight - 180,
    },
    macrophageSpawn: firstEntryPoint?.position ?? baseMap.macrophageSpawn,
  };
}

const skinSmallWoundMap = mapWithTacticalMap("skin_small_wound_fixed");
const skinMultiWoundMap = mapWithTacticalMap("skin_multi_wound_template");
const lungBranchingMap = mapWithTacticalMap("lung_branching_vessels_template");
const intestineClusteredMap = mapWithTacticalMap("intestine_clustered_sites_template");
const bloodCrossroadsMap = mapWithTacticalMap("blood_vessel_crossroads_template");
const lymphSignalMap = mapWithTacticalMap("lymph_node_signal_template");
const infiniteLargeTissueMap = mapWithTacticalMap("infinite_large_tissue_template");

const easyFailure: DefeatCondition[] = [
  { kind: "tissueHealthZero" },
  { kind: "compromisedCellsRatioAtLeast", value: 0.9 },
];

export const missionDefinitions: Record<MissionId, MissionDefinition> = {
  infiniteSurvivalV8: {
    id: "infiniteSurvivalV8",
    mode: "infinite",
    title: "Mode infini - Survie immunitaire",
    displayName: "Survie infinie",
    subtitle: "V8 - score et phases",
    description:
      "Survis a des vagues de plus en plus dangereuses. Il n'y a pas de victoire finale.",
    briefing: [
      "Le mode infini est separe de la campagne et de la carte du corps.",
      "Les phases montent progressivement jusqu'a Nightmare.",
      "Les mutateurs changent les regles : lis-les avant de surproduire.",
    ],
    objectives: [
      { id: "clear", label: "Survivre le plus longtemps possible", kind: "clearThreats" },
      { id: "health30", label: "Garder le tissu au-dessus de 30%", kind: "tissueHealthAtLeast", value: 30 },
      { id: "inflam90", label: "Eviter une crise inflammatoire totale", kind: "inflammationBelow", value: 90 },
    ],
    victoryConditions: [],
    defeatConditions: easyFailure,
    startingResources: { atp: 160, cytokines: 68, antigens: 8 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "neutrophil", count: 1 },
    ],
    unlockedUnits: [
      "macrophage",
      "neutrophil",
      "dendriticCell",
      "plasmocyte",
      "nkCell",
      "cytotoxicT",
    ],
    unlockedAbilities: ["interferons", "massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis", "viralAnalysis"],
    unlockedTreatments: ["antibiotic", "antiviralDrug", "antiInflammatory"],
    memoryHintProfiles: ["bacterial", "viral"],
    allowedPathogens: [
      "cocciRapid",
      "proliferatingBacillus",
      "resistantBacterium",
      "biofilmColony",
      "toxicBacterium",
      "respiratoryVirus",
      "cytolyticVirus",
      "latentVirus",
      "immuneEvasiveVirus",
      "fungalColony",
      "fungalSpore",
      "yeastOpportunist",
      "sporeMold",
      "cutaneousFungus",
      "parasiteHelminth",
      "bloodProtozoan",
      "migratoryLarva",
      "cancerCellCluster",
      "discreetAbnormalCell",
      "proliferativeCancerCell",
      "inflammatoryCancerCell",
      "invasiveCancerCell",
      "opportunistBacterium",
      "secondaryBacterium",
      "opportunistYeastFlare",
      "reactivatedLatentVirus",
      "mixedOpportunistCluster",
    ],
    initialInfectedTissueCells: 0,
    map: infiniteLargeTissueMap,
    waves: createInfiniteWaves("normal"),
    tutorialHints: [
      { text: "Mode infini : chaque cycle contient trois vagues, puis la phase progresse." },
    ],
    scoreReward: 0,
  },
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
    unlockedTreatments: [],
    allowedPathogens: ["cocciRapid"],
    map: skinSmallWoundMap,
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
    unlockedTreatments: ["antiInflammatory"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus"],
    map: skinSmallWoundMap,
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
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony"],
    map: skinMultiWoundMap,
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
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium"],
    map: lymphSignalMap,
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
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony", "toxicBacterium"],
    map: lymphSignalMap,
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
    startingResources: { atp: 145, cytokines: 72, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "dendriticCell"],
    unlockedAbilities: ["interferons"],
    unlockedResearch: [],
    unlockedTreatments: ["antiviralDrug", "antiInflammatory"],
    vaccinationOptions: [
      {
        id: "viral-prime",
        displayName: "Vaccination antivirale",
        targetProfile: "viral",
        atpCost: 18,
        antigenBonus: 8,
        cytokineBonus: 8,
        description: "Preparation simple contre virus respiratoire : demarre avec antigenes et cytokines bonus.",
      },
    ],
    memoryHintProfiles: ["viral"],
    allowedPathogens: ["respiratoryVirus"],
    map: lungBranchingMap,
    waves: [
      { startsAtMs: 2500, pathogenTypeId: "respiratoryVirus", count: 2, spawnIntervalMs: 1800 },
      { startsAtMs: 23000, pathogenTypeId: "respiratoryVirus", count: 3, spawnIntervalMs: 1700 },
      { startsAtMs: 47000, pathogenTypeId: "respiratoryVirus", count: 4, spawnIntervalMs: 1450 },
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
    unlockedTreatments: ["antiviralDrug", "antiInflammatory"],
    vaccinationOptions: [
      {
        id: "viral-memory-prime",
        displayName: "Rappel antiviral",
        targetProfile: "viral",
        atpCost: 20,
        antigenBonus: 10,
        cytokineBonus: 6,
        description: "Prepare la reponse T contre une menace virale connue.",
      },
    ],
    memoryHintProfiles: ["viral"],
    allowedPathogens: ["respiratoryVirus"],
    initialInfectedTissueCells: 2,
    map: lungBranchingMap,
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
    unlockedTreatments: ["antibiotic", "antiviralDrug", "antiInflammatory"],
    vaccinationOptions: [
      {
        id: "mixed-bacterial-prime",
        displayName: "Preparation antibacterienne",
        targetProfile: "bacterial",
        atpCost: 20,
        antigenBonus: 8,
        cytokineBonus: 4,
        description: "Preparation adaptee aux colonies bacteriennes attendues.",
      },
      {
        id: "mixed-viral-prime",
        displayName: "Preparation antivirale",
        targetProfile: "viral",
        atpCost: 20,
        antigenBonus: 8,
        cytokineBonus: 6,
        description: "Preparation adaptee aux virus libres et cellules infectees.",
      },
    ],
    memoryHintProfiles: ["bacterial", "viral"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "resistantBacterium", "biofilmColony", "toxicBacterium", "respiratoryVirus"],
    initialInfectedTissueCells: 1,
    map: infiniteLargeTissueMap,
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
  skinBacterialSkirmish: {
    id: "skinBacterialSkirmish",
    title: "Bataille locale - Plaie bacterienne",
    displayName: "Plaie bacterienne",
    subtitle: "Partie normale - peau",
    description: "Contiens une entree bacterienne cutanee generee par la carte du corps.",
    briefing: [
      "Cette bataille vient de la carte du corps, pas de la campagne tutoriel.",
      "La peau favorise les bacteries rapides et les combats de contact.",
      "Une livraison lymphatique renforce le ganglion regional de la peau.",
    ],
    objectives: [
      { id: "clear", label: "Eliminer l'infection locale", kind: "clearThreats", required: true },
      { id: "health45", label: "Sauver au moins 45% du tissu", kind: "tissueHealthAtLeast", value: 45 },
      { id: "signals6", label: "Collecter 6 antigenes locaux", kind: "antigensAtLeast", value: 6 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 118, cytokines: 28, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell"],
    unlockedAbilities: [],
    unlockedResearch: [],
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus"],
    map: skinMultiWoundMap,
    waves: [
      { startsAtMs: 1300, pathogenTypeId: "cocciRapid", count: 5, spawnIntervalMs: 650 },
      { startsAtMs: 14500, pathogenTypeId: "proliferatingBacillus", count: 4, spawnIntervalMs: 1150 },
      { startsAtMs: 30000, pathogenTypeId: "cocciRapid", count: 7, spawnIntervalMs: 540 },
    ],
    tutorialHints: [{ text: "Bataille normale : gagne proprement pour reduire le risque de propagation." }],
    scoreReward: 120,
  },
  skinBiofilmPressure: {
    id: "skinBiofilmPressure",
    title: "Bataille locale - Biofilm cutane",
    displayName: "Biofilm cutane",
    subtitle: "Partie normale - peau",
    description: "Nettoie une colonie protegee avant qu'elle ne relance la plaie.",
    briefing: [
      "Le biofilm est une protection de groupe simplifiee.",
      "Les antibiotiques aident, mais n'effacent pas tout seuls une colonie.",
      "Les dendritiques peuvent transformer les debris en signaux regionaux.",
    ],
    objectives: [
      { id: "clear", label: "Detruire la colonie locale", kind: "clearThreats", required: true },
      { id: "inflam82", label: "Limiter l'inflammation sous 82", kind: "inflammationBelow", value: 82 },
      { id: "health35", label: "Eviter l'effondrement du tissu", kind: "tissueHealthAtLeast", value: 35 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 130, cytokines: 38, antigens: 2 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell"],
    unlockedAbilities: [],
    unlockedResearch: ["bacterialAnalysis"],
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["resistantBacterium", "biofilmColony", "cocciRapid"],
    map: skinMultiWoundMap,
    waves: [
      { startsAtMs: 1600, pathogenTypeId: "resistantBacterium", count: 2, spawnIntervalMs: 1800 },
      { startsAtMs: 17000, pathogenTypeId: "biofilmColony", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 33000, pathogenTypeId: "cocciRapid", count: 7, spawnIntervalMs: 560 },
    ],
    scoreReward: 135,
  },
  skinFungalOutbreak: {
    id: "skinFungalOutbreak",
    title: "Bataille locale - Foyer fongique cutane",
    displayName: "Foyer fongique",
    subtitle: "V9 - champignons",
    description: "Contiens une colonie fongique lente avant que les spores saturent la plaie.",
    briefing: [
      "Les champignons sont simplifies comme des foyers lents et persistants.",
      "La colonie produit des spores si elle reste ignoree.",
      "Les neutrophiles nettoient bien les spores, mais l'inflammation doit rester sous controle.",
    ],
    objectives: [
      { id: "clear", label: "Nettoyer le foyer fongique", kind: "clearThreats", required: true },
      { id: "inflam82", label: "Limiter l'inflammation sous 82", kind: "inflammationBelow", value: 82 },
      { id: "health40", label: "Garder le tissu au-dessus de 40%", kind: "tissueHealthAtLeast", value: 40 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 145, cytokines: 58, antigens: 6 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte"],
    unlockedAbilities: ["massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis"],
    unlockedTreatments: ["antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["fungalColony", "fungalSpore", "cutaneousFungus", "sporeMold", "yeastOpportunist"],
    map: skinMultiWoundMap,
    waves: [
      { startsAtMs: 1800, pathogenTypeId: "fungalSpore", count: 4, spawnIntervalMs: 950 },
      { startsAtMs: 17000, pathogenTypeId: "cutaneousFungus", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 34000, pathogenTypeId: "fungalSpore", count: 6, spawnIntervalMs: 760 },
      { startsAtMs: 48500, pathogenTypeId: "sporeMold", count: 1, spawnIntervalMs: 1000 },
    ],
    tutorialHints: [{ text: "V9 : une colonie fongique est lente, mais elle cree des spores si elle survit." }],
    scoreReward: 180,
  },
  lungViralSpread: {
    id: "lungViralSpread",
    title: "Bataille locale - Foyer viral respiratoire",
    displayName: "Foyer viral respiratoire",
    subtitle: "Partie normale - poumons",
    description: "Ralentis une propagation virale locale et protege les cellules pulmonaires.",
    briefing: [
      "Les poumons favorisent les virus et les cellules infectees.",
      "Les interferons et antiviraux gagnent du temps.",
      "NK et T cytotoxiques deviennent precieux si l'analyse avance.",
    ],
    objectives: [
      { id: "clear", label: "Controler virus et cellules infectees", kind: "clearThreats", required: true },
      { id: "infected4", label: "Finir avec moins de 5 cellules infectees", kind: "infectedCellsAtMost", value: 4 },
      { id: "interferons", label: "Utiliser les interferons", kind: "abilityUsed", abilityId: "interferons" },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 145, cytokines: 74, antigens: 4 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "dendriticCell", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons"],
    unlockedResearch: ["viralAnalysis"],
    unlockedTreatments: ["antiviralDrug", "antiInflammatory"],
    memoryHintProfiles: ["viral"],
    allowedPathogens: ["respiratoryVirus"],
    initialInfectedTissueCells: 1,
    map: lungBranchingMap,
    waves: [
      { startsAtMs: 2600, pathogenTypeId: "respiratoryVirus", count: 3, spawnIntervalMs: 1650 },
      { startsAtMs: 24500, pathogenTypeId: "respiratoryVirus", count: 4, spawnIntervalMs: 1400 },
      { startsAtMs: 48500, pathogenTypeId: "respiratoryVirus", count: 5, spawnIntervalMs: 1200 },
    ],
    scoreReward: 155,
  },
  lungCancerSuspectCells: {
    id: "lungCancerSuspectCells",
    title: "Bataille locale - Cellules suspectes pulmonaires",
    displayName: "Cellules suspectes",
    subtitle: "V9 - cellules anormales",
    description: "Repere et detruis des cellules anormales avant qu'elles n'affaiblissent le tissu.",
    briefing: [
      "Les cellules cancereuses sont traitees comme une menace interne tres simplifiee.",
      "Elles sont moins visibles tant qu'une NK ou un T cytotoxique ne s'approche pas.",
      "NK et T cytotoxiques sont les reponses principales dans ce prototype.",
    ],
    objectives: [
      { id: "clear", label: "Eliminer les cellules anormales", kind: "clearThreats", required: true },
      { id: "health45", label: "Garder le tissu au-dessus de 45%", kind: "tissueHealthAtLeast", value: 45 },
      { id: "analysis", label: "Completer l'analyse virale/adaptative", kind: "researchComplete", researchId: "viralAnalysis" },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 165, cytokines: 84, antigens: 14 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "dendriticCell", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons"],
    unlockedResearch: ["viralAnalysis"],
    unlockedTreatments: ["antiInflammatory"],
    memoryHintProfiles: ["viral"],
    allowedPathogens: [
      "cancerCellCluster",
      "discreetAbnormalCell",
      "proliferativeCancerCell",
      "inflammatoryCancerCell",
    ],
    map: lungBranchingMap,
    waves: [
      { startsAtMs: 2500, pathogenTypeId: "discreetAbnormalCell", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 21000, pathogenTypeId: "proliferativeCancerCell", count: 2, spawnIntervalMs: 3400 },
      { startsAtMs: 41000, pathogenTypeId: "inflammatoryCancerCell", count: 1, spawnIntervalMs: 1000 },
    ],
    tutorialHints: [{ text: "V9 : les cellules anormales sont plus sensibles aux NK et T cytotoxiques." }],
    scoreReward: 205,
  },
  intestineBacillusSwarm: {
    id: "intestineBacillusSwarm",
    title: "Bataille locale - Essaim intestinal",
    displayName: "Essaim intestinal",
    subtitle: "Partie normale - intestin",
    description: "Gere une pression bacterienne dense sans emballement inflammatoire.",
    briefing: [
      "L'intestin est simplifie comme une zone dense et exposee aux bacilles.",
      "Les vagues sont nombreuses, mais pas faites pour ecraser le joueur.",
      "Controle l'inflammation pour eviter les degats collateraux.",
    ],
    objectives: [
      { id: "clear", label: "Survivre aux vagues de bacilles", kind: "clearThreats", required: true },
      { id: "inflam78", label: "Garder l'inflammation sous 78", kind: "inflammationBelow", value: 78 },
      { id: "health38", label: "Garder le tissu au-dessus de 38%", kind: "tissueHealthAtLeast", value: 38 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 135, cytokines: 48, antigens: 0 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell"],
    unlockedAbilities: [],
    unlockedResearch: ["bacterialAnalysis"],
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["proliferatingBacillus", "resistantBacterium", "toxicBacterium"],
    map: intestineClusteredMap,
    waves: [
      { startsAtMs: 1500, pathogenTypeId: "proliferatingBacillus", count: 5, spawnIntervalMs: 950 },
      { startsAtMs: 18500, pathogenTypeId: "proliferatingBacillus", count: 6, spawnIntervalMs: 820 },
      { startsAtMs: 37000, pathogenTypeId: "resistantBacterium", count: 3, spawnIntervalMs: 1500 },
      { startsAtMs: 54000, pathogenTypeId: "toxicBacterium", count: 2, spawnIntervalMs: 1500 },
    ],
    scoreReward: 150,
  },
  intestineParasiteBoss: {
    id: "intestineParasiteBoss",
    title: "Bataille locale - Parasite intestinal",
    displayName: "Parasite intestinal",
    subtitle: "V9 - mini-boss parasite",
    description: "Coordonne tes cellules contre un parasite rare, solide et tres inflammatoire.",
    briefing: [
      "Les parasites sont representes ici par un mini-boss, pas par une simulation reelle.",
      "Il encaisse beaucoup et fait monter l'inflammation.",
      "La reponse adaptative et un bon controle des neutrophiles sont importants.",
    ],
    objectives: [
      { id: "clear", label: "Eliminer le parasite", kind: "clearThreats", required: true },
      { id: "inflam85", label: "Eviter une inflammation au-dessus de 85", kind: "inflammationBelow", value: 85 },
      { id: "health35", label: "Garder le tissu au-dessus de 35%", kind: "tissueHealthAtLeast", value: 35 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 185, cytokines: 82, antigens: 18 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte"],
    unlockedAbilities: ["massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis"],
    unlockedTreatments: ["antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["parasiteHelminth", "bloodProtozoan", "migratoryLarva", "secondaryBacterium"],
    map: intestineClusteredMap,
    waves: [
      { startsAtMs: 2200, pathogenTypeId: "secondaryBacterium", count: 4, spawnIntervalMs: 900 },
      { startsAtMs: 18000, pathogenTypeId: "parasiteHelminth", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 42000, pathogenTypeId: "bloodProtozoan", count: 3, spawnIntervalMs: 1100 },
      { startsAtMs: 59000, pathogenTypeId: "migratoryLarva", count: 1, spawnIntervalMs: 1000 },
    ],
    tutorialHints: [{ text: "V9 : le parasite est un mini-boss. Garde tes unites groupees et surveille l'inflammation." }],
    scoreReward: 230,
  },
  bloodMixedAlert: {
    id: "bloodMixedAlert",
    title: "Bataille locale - Alerte sanguine",
    displayName: "Alerte sanguine",
    subtitle: "Partie normale - sang",
    description: "Contiens une menace mixte avant qu'elle ne profite de la circulation.",
    briefing: [
      "Le sang est une route de circulation et de propagation.",
      "Cette bataille mixte demande de prioriser virus, bacteries et inflammation.",
      "Une defaite dans le sang rend la carte globale plus instable.",
    ],
    objectives: [
      { id: "clear", label: "Nettoyer la menace circulante", kind: "clearThreats", required: true },
      { id: "infected5", label: "Limiter les cellules infectees a 5", kind: "infectedCellsAtMost", value: 5 },
      { id: "health35", label: "Stabiliser au moins 35% du tissu", kind: "tissueHealthAtLeast", value: 35 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 160, cytokines: 82, antigens: 8 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons", "massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis", "viralAnalysis"],
    unlockedTreatments: ["antibiotic", "antiviralDrug", "antiInflammatory"],
    memoryHintProfiles: ["bacterial", "viral"],
    allowedPathogens: ["cocciRapid", "proliferatingBacillus", "respiratoryVirus"],
    initialInfectedTissueCells: 1,
    map: bloodCrossroadsMap,
    waves: [
      { startsAtMs: 1600, pathogenTypeId: "cocciRapid", count: 5, spawnIntervalMs: 620 },
      { startsAtMs: 13500, pathogenTypeId: "respiratoryVirus", count: 3, spawnIntervalMs: 1400 },
      { startsAtMs: 29000, pathogenTypeId: "proliferatingBacillus", count: 5, spawnIntervalMs: 900 },
      { startsAtMs: 48000, pathogenTypeId: "respiratoryVirus", count: 4, spawnIntervalMs: 1200 },
    ],
    scoreReward: 175,
  },
  opportunisticMixedFlare: {
    id: "opportunisticMixedFlare",
    title: "Bataille locale - Flare opportuniste",
    displayName: "Flare opportuniste",
    subtitle: "V9 - opportunistes",
    description: "Nettoie une infection secondaire qui profite d'une zone deja fragilisee.",
    briefing: [
      "Les opportunistes representent les menaces qui profitent d'un organisme fatigue.",
      "Ils ne sont pas les plus forts seuls, mais deviennent dangereux dans une infection mixte.",
      "Stabilise vite le tissu au lieu de poursuivre uniquement le score.",
    ],
    objectives: [
      { id: "clear", label: "Stopper le flare opportuniste", kind: "clearThreats", required: true },
      { id: "health40", label: "Garder le tissu au-dessus de 40%", kind: "tissueHealthAtLeast", value: 40 },
      { id: "infected5", label: "Limiter les cellules infectees a 5", kind: "infectedCellsAtMost", value: 5 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 170, cytokines: 80, antigens: 10 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "neutrophil", count: 1 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons", "massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis", "viralAnalysis"],
    unlockedTreatments: ["antibiotic", "antiviralDrug", "antiInflammatory"],
    memoryHintProfiles: ["bacterial", "viral"],
    allowedPathogens: [
      "opportunistBacterium",
      "secondaryBacterium",
      "reactivatedLatentVirus",
      "opportunistYeastFlare",
      "mixedOpportunistCluster",
      "respiratoryVirus",
      "fungalSpore",
    ],
    initialInfectedTissueCells: 1,
    map: infiniteLargeTissueMap,
    waves: [
      { startsAtMs: 1600, pathogenTypeId: "secondaryBacterium", count: 5, spawnIntervalMs: 720 },
      { startsAtMs: 17000, pathogenTypeId: "reactivatedLatentVirus", count: 3, spawnIntervalMs: 1350 },
      { startsAtMs: 32000, pathogenTypeId: "opportunistYeastFlare", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 49000, pathogenTypeId: "mixedOpportunistCluster", count: 2, spawnIntervalMs: 2200 },
    ],
    tutorialHints: [{ text: "V9 : les opportunistes punissent les zones affaiblies. Nettoie vite les petits groupes." }],
    scoreReward: 210,
  },
  lymphNodeSignalResponse: {
    id: "lymphNodeSignalResponse",
    title: "Bataille locale - Relais lymphatique",
    displayName: "Relais lymphatique",
    subtitle: "Partie normale - ganglion",
    description: "Protege la sortie lymphatique et convertis des debris en signaux utiles.",
    briefing: [
      "Le ganglion n'est pas une tour : c'est un centre d'analyse strategique.",
      "Les dendritiques doivent livrer des debris vers la lymphe.",
      "Plus les signaux sont nombreux, plus la carte globale profite du resultat.",
    ],
    objectives: [
      { id: "antigens14", label: "Livrer assez de signaux antigeniques", kind: "antigensAtLeast", value: 14, required: true },
      { id: "clear", label: "Proteger le relais local", kind: "clearThreats", required: true },
      { id: "health40", label: "Garder le tissu au-dessus de 40%", kind: "tissueHealthAtLeast", value: 40 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 135, cytokines: 56, antigens: 6 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 2 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "plasmocyte", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons", "massiveNeutralization"],
    unlockedResearch: ["bacterialAnalysis", "viralAnalysis"],
    unlockedTreatments: ["antibiotic", "antiviralDrug", "antiInflammatory"],
    memoryHintProfiles: ["bacterial", "viral"],
    allowedPathogens: ["cocciRapid", "respiratoryVirus", "proliferatingBacillus"],
    map: lymphSignalMap,
    waves: [
      { startsAtMs: 1800, pathogenTypeId: "cocciRapid", count: 4, spawnIntervalMs: 720 },
      { startsAtMs: 18000, pathogenTypeId: "respiratoryVirus", count: 3, spawnIntervalMs: 1500 },
      { startsAtMs: 38000, pathogenTypeId: "proliferatingBacillus", count: 4, spawnIntervalMs: 1100 },
    ],
    scoreReward: 165,
  },
  spleenBloodFiltering: {
    id: "spleenBloodFiltering",
    title: "Bataille locale - Filtrage splenique",
    displayName: "Filtrage splenique",
    subtitle: "Partie normale - rate",
    description: "Filtre une menace circulante moderee avant diffusion systemique.",
    briefing: [
      "La rate surveille le sang dans cette version simplifiee.",
      "Les menaces sont mixtes mais moins longues que dans une alerte sanguine complete.",
      "Un bon resultat stabilise la carte globale.",
    ],
    objectives: [
      { id: "clear", label: "Filtrer la menace sanguine", kind: "clearThreats", required: true },
      { id: "inflam80", label: "Limiter l'inflammation sous 80", kind: "inflammationBelow", value: 80 },
      { id: "health40", label: "Preserver 40% du tissu", kind: "tissueHealthAtLeast", value: 40 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 150, cytokines: 70, antigens: 8 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell", "nkCell", "cytotoxicT"],
    unlockedAbilities: ["interferons"],
    unlockedResearch: ["viralAnalysis", "bacterialAnalysis"],
    unlockedTreatments: ["antibiotic", "antiviralDrug", "antiInflammatory"],
    memoryHintProfiles: ["bacterial", "viral"],
    allowedPathogens: ["cocciRapid", "respiratoryVirus", "resistantBacterium"],
    map: bloodCrossroadsMap,
    waves: [
      { startsAtMs: 1400, pathogenTypeId: "cocciRapid", count: 4, spawnIntervalMs: 680 },
      { startsAtMs: 15500, pathogenTypeId: "respiratoryVirus", count: 3, spawnIntervalMs: 1450 },
      { startsAtMs: 34000, pathogenTypeId: "resistantBacterium", count: 2, spawnIntervalMs: 1800 },
    ],
    scoreReward: 155,
  },
  boneMarrowReinforcementPressure: {
    id: "boneMarrowReinforcementPressure",
    title: "Bataille locale - Pression sur la moelle",
    displayName: "Pression sur la moelle",
    subtitle: "Partie normale - moelle osseuse",
    description: "Defends la source de renforts immunitaires sans mecanique logistique lourde.",
    briefing: [
      "La moelle osseuse soutient la production de cellules immunitaires.",
      "Dans V7.1, elle donne surtout un enjeu strategique aux ressources globales.",
      "La bataille reste locale et lisible.",
    ],
    objectives: [
      { id: "clear", label: "Proteger la production de renforts", kind: "clearThreats", required: true },
      { id: "health50", label: "Garder la zone au-dessus de 50%", kind: "tissueHealthAtLeast", value: 50 },
      { id: "inflam70", label: "Limiter l'inflammation sous 70", kind: "inflammationBelow", value: 70 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 150, cytokines: 52, antigens: 2 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 3 },
      { unitTypeId: "dendriticCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "neutrophil", "dendriticCell"],
    unlockedAbilities: [],
    unlockedResearch: ["bacterialAnalysis"],
    unlockedTreatments: ["antibiotic", "antiInflammatory"],
    memoryHintProfiles: ["bacterial"],
    allowedPathogens: ["cocciRapid", "resistantBacterium"],
    map: bloodCrossroadsMap,
    waves: [
      { startsAtMs: 1700, pathogenTypeId: "cocciRapid", count: 5, spawnIntervalMs: 760 },
      { startsAtMs: 18500, pathogenTypeId: "resistantBacterium", count: 2, spawnIntervalMs: 1800 },
      { startsAtMs: 39000, pathogenTypeId: "cocciRapid", count: 6, spawnIntervalMs: 640 },
    ],
    scoreReward: 145,
  },
  liverAbnormalGrowth: {
    id: "liverAbnormalGrowth",
    title: "Bataille locale - Croissance anormale hepatique",
    displayName: "Croissance anormale",
    subtitle: "V9 - foyer interne",
    description: "Controle un foyer interne lent, accompagne d'opportunistes faibles.",
    briefing: [
      "Le foie sert ici de zone de stabilisation systemique simplifiee.",
      "Les cellules anormales demandent surtout NK/T, tandis que les opportunistes distraient la defense.",
      "Cette mission prepare la consolidation V9.5 sans ajouter de mecanique lourde.",
    ],
    objectives: [
      { id: "clear", label: "Eliminer le foyer interne", kind: "clearThreats", required: true },
      { id: "health45", label: "Garder le tissu au-dessus de 45%", kind: "tissueHealthAtLeast", value: 45 },
      { id: "inflam78", label: "Limiter l'inflammation sous 78", kind: "inflammationBelow", value: 78 },
    ],
    victoryConditions: [{ kind: "allWavesCleared" }, { kind: "requiredObjectivesComplete" }],
    defeatConditions: easyFailure,
    startingResources: { atp: 175, cytokines: 76, antigens: 14 },
    startingUnits: [
      { unitTypeId: "macrophage", count: 2 },
      { unitTypeId: "dendriticCell", count: 1 },
      { unitTypeId: "nkCell", count: 1 },
    ],
    unlockedUnits: ["macrophage", "dendriticCell", "nkCell", "cytotoxicT", "plasmocyte"],
    unlockedAbilities: ["interferons", "massiveNeutralization"],
    unlockedResearch: ["viralAnalysis", "bacterialAnalysis"],
    unlockedTreatments: ["antiInflammatory"],
    memoryHintProfiles: ["viral"],
    allowedPathogens: [
      "cancerCellCluster",
      "discreetAbnormalCell",
      "inflammatoryCancerCell",
      "invasiveCancerCell",
      "mixedOpportunistCluster",
      "opportunistBacterium",
    ],
    map: bloodCrossroadsMap,
    waves: [
      { startsAtMs: 2200, pathogenTypeId: "discreetAbnormalCell", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 19000, pathogenTypeId: "mixedOpportunistCluster", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 39000, pathogenTypeId: "inflammatoryCancerCell", count: 1, spawnIntervalMs: 1000 },
      { startsAtMs: 56000, pathogenTypeId: "invasiveCancerCell", count: 1, spawnIntervalMs: 1000 },
    ],
    tutorialHints: [{ text: "V9 : les cellules anormales ne sont pas des microbes, mais une menace interne simplifiee." }],
    scoreReward: 225,
  },
};

export function isMissionId(value: string): value is MissionId {
  return value in missionDefinitions;
}

export function getFirstMissionId(): MissionId {
  return campaignMissionOrder[0];
}
