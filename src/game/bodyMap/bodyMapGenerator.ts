import type { PathogenTypeId } from "../data/pathogens";
import type { BodyBattleMissionId } from "../data/missions";
import { createRunSeed, createSeededRandom } from "../data/tacticalMapSeed";
import { bodyRegionDefinitions, bodyRegionOrder } from "./bodyRegions";
import {
  createDefaultBodyMapState,
  getDifficultyConfig,
  normalizeBodyMapState,
} from "./bodyMapSystem";
import type {
  BodyMapDifficulty,
  BodyMapState,
  BodyRegionId,
  BodyThreatProfile,
} from "./bodyMapTypes";

type CrisisTemplate = {
  id: string;
  regionId: BodyRegionId;
  threat: BodyThreatProfile;
  pathogens: PathogenTypeId[];
  battleMissionId: BodyBattleMissionId;
  minDifficulty?: BodyMapDifficulty;
  infectionRange: [number, number];
  inflammationRange: [number, number];
  healthRange: [number, number];
  alert: string;
};

const crisisTemplates: CrisisTemplate[] = [
  {
    id: "skin-cocci",
    regionId: "skin",
    threat: "bacterial",
    pathogens: ["cocciRapid"],
    battleMissionId: "skinBacterialSkirmish",
    infectionRange: [42, 62],
    inflammationRange: [22, 42],
    healthRange: [72, 90],
    alert: "Plaie cutanee bacterienne detectee.",
  },
  {
    id: "skin-biofilm",
    regionId: "skin",
    threat: "bacterial",
    pathogens: ["resistantBacterium", "biofilmColony"],
    battleMissionId: "skinBiofilmPressure",
    infectionRange: [48, 66],
    inflammationRange: [28, 48],
    healthRange: [68, 86],
    alert: "Biofilm cutane en formation.",
  },
  {
    id: "skin-fungus",
    regionId: "skin",
    threat: "fungal",
    pathogens: ["cutaneousFungus", "fungalSpore"],
    battleMissionId: "skinFungalOutbreak",
    infectionRange: [38, 58],
    inflammationRange: [26, 48],
    healthRange: [70, 88],
    alert: "Foyer fongique cutane detecte.",
  },
  {
    id: "lung-virus",
    regionId: "lungs",
    threat: "viral",
    pathogens: ["respiratoryVirus", "cytolyticVirus"],
    battleMissionId: "lungViralSpread",
    infectionRange: [40, 64],
    inflammationRange: [18, 36],
    healthRange: [72, 88],
    alert: "Foyer viral respiratoire detecte.",
  },
  {
    id: "lung-cancer",
    regionId: "lungs",
    threat: "cancer",
    pathogens: ["discreetAbnormalCell", "inflammatoryCancerCell"],
    battleMissionId: "lungCancerSuspectCells",
    minDifficulty: "hard",
    infectionRange: [28, 44],
    inflammationRange: [16, 34],
    healthRange: [74, 90],
    alert: "Cellules pulmonaires anormales detectees.",
  },
  {
    id: "lung-mold",
    regionId: "lungs",
    threat: "fungal",
    pathogens: ["sporeMold", "fungalSpore"],
    battleMissionId: "skinFungalOutbreak",
    minDifficulty: "normal",
    infectionRange: [34, 54],
    inflammationRange: [24, 46],
    healthRange: [70, 88],
    alert: "Moisissure a spores detectee dans les poumons.",
  },
  {
    id: "lung-evasive-virus",
    regionId: "lungs",
    threat: "viral",
    pathogens: ["immuneEvasiveVirus"],
    battleMissionId: "lungViralSpread",
    minDifficulty: "hard",
    infectionRange: [38, 58],
    inflammationRange: [20, 42],
    healthRange: [70, 88],
    alert: "Virus immuno-evasif respiratoire detecte.",
  },
  {
    id: "intestine-bacillus",
    regionId: "intestine",
    threat: "bacterial",
    pathogens: ["proliferatingBacillus", "resistantBacterium", "secondaryBacterium"],
    battleMissionId: "intestineBacillusSwarm",
    infectionRange: [42, 68],
    inflammationRange: [24, 50],
    healthRange: [70, 88],
    alert: "Essaim de bacilles dans l'intestin.",
  },
  {
    id: "intestine-yeast",
    regionId: "intestine",
    threat: "fungal",
    pathogens: ["yeastOpportunist"],
    battleMissionId: "skinFungalOutbreak",
    minDifficulty: "normal",
    infectionRange: [32, 52],
    inflammationRange: [20, 42],
    healthRange: [72, 90],
    alert: "Levure opportuniste intestinale en croissance.",
  },
  {
    id: "intestine-parasite",
    regionId: "intestine",
    threat: "parasite",
    pathogens: ["parasiteHelminth", "bloodProtozoan"],
    battleMissionId: "intestineParasiteBoss",
    minDifficulty: "hard",
    infectionRange: [44, 62],
    inflammationRange: [32, 58],
    healthRange: [66, 84],
    alert: "Parasite intestinal rare signale.",
  },
  {
    id: "blood-mixed",
    regionId: "blood",
    threat: "mixed",
    pathogens: ["cocciRapid", "respiratoryVirus"],
    battleMissionId: "bloodMixedAlert",
    infectionRange: [34, 56],
    inflammationRange: [18, 38],
    healthRange: [76, 92],
    alert: "Alerte mixte dans la circulation sanguine.",
  },
  {
    id: "blood-opportunist",
    regionId: "blood",
    threat: "opportunist",
    pathogens: ["secondaryBacterium", "reactivatedLatentVirus"],
    battleMissionId: "opportunisticMixedFlare",
    infectionRange: [34, 58],
    inflammationRange: [22, 44],
    healthRange: [72, 90],
    alert: "Flare opportuniste dans la circulation.",
  },
  {
    id: "blood-protozoan",
    regionId: "blood",
    threat: "parasite",
    pathogens: ["bloodProtozoan", "migratoryLarva"],
    battleMissionId: "intestineParasiteBoss",
    minDifficulty: "hard",
    infectionRange: [36, 58],
    inflammationRange: [24, 46],
    healthRange: [70, 88],
    alert: "Protozoaire sanguin mobile signale.",
  },
  {
    id: "lymph-signal",
    regionId: "lymphNodes",
    threat: "mixed",
    pathogens: ["cocciRapid", "respiratoryVirus"],
    battleMissionId: "lymphNodeSignalResponse",
    infectionRange: [30, 50],
    inflammationRange: [22, 40],
    healthRange: [78, 92],
    alert: "Ganglion regional surcharge de signaux.",
  },
  {
    id: "liver-abnormal",
    regionId: "liver",
    threat: "cancer",
    pathogens: ["invasiveCancerCell", "mixedOpportunistCluster"],
    battleMissionId: "liverAbnormalGrowth",
    minDifficulty: "normal",
    infectionRange: [30, 50],
    inflammationRange: [18, 38],
    healthRange: [72, 90],
    alert: "Croissance anormale hepatique sous surveillance.",
  },
  {
    id: "spleen-filter",
    regionId: "spleen",
    threat: "mixed",
    pathogens: ["cocciRapid", "respiratoryVirus"],
    battleMissionId: "spleenBloodFiltering",
    infectionRange: [28, 48],
    inflammationRange: [18, 36],
    healthRange: [78, 94],
    alert: "La rate filtre une menace circulante.",
  },
  {
    id: "marrow-pressure",
    regionId: "boneMarrow",
    threat: "bacterial",
    pathogens: ["cocciRapid", "resistantBacterium"],
    battleMissionId: "boneMarrowReinforcementPressure",
    infectionRange: [30, 52],
    inflammationRange: [16, 34],
    healthRange: [76, 94],
    alert: "Pression bacterienne proche de la moelle osseuse.",
  },
];

export function createGeneratedBodyMapState(
  difficulty: BodyMapDifficulty = "normal",
  seed = createRunSeed("normal"),
): BodyMapState {
  const random = createSeededRandom(seed);
  const config = getDifficultyConfig(difficulty);
  const state = createDefaultBodyMapState();

  state.seed = seed;
  state.difficulty = difficulty;
  state.strategicTurn = 1;
  state.globalHealth = config.startingGlobalHealth;
  state.globalResources = {
    atp: config.startingAtp,
    cytokines: config.startingCytokines,
    antigens: config.startingAntigens,
  };
  state.alerts = [];
  state.history = [`Tour 1 : nouvelle partie normale (${difficulty}, seed ${seed}).`];
  state.treatedRegionIds = [];

  for (const regionId of bodyRegionOrder) {
    const region = state.regions[regionId];
    const definition = bodyRegionDefinitions[regionId];

    region.localHealth = 90 + Math.floor(random() * 8);
    region.infection = definition.preferredThreat === "none" ? 0 : Math.floor(random() * 12);
    region.inflammation = 8 + Math.floor(random() * 12);
    region.threat = "none";
    region.pathogens = [];
    region.assignedReinforcements = {};
    region.activeBattleMissionId = definition.linkedMissionId;
    region.lastBattleMissionId = undefined;
    region.lastBattleQuality = undefined;
    region.treatedCount = 0;
  }

  const selectedTemplates = pickCrisisTemplates(
    config.infectedRegionCount,
    random,
    difficulty,
  );

  for (const template of selectedTemplates) {
    const region = state.regions[template.regionId];

    region.threat = template.threat;
    region.pathogens = [...template.pathogens];
    region.activeBattleMissionId = template.battleMissionId;
    region.infection = randomInRange(template.infectionRange, random);
    region.inflammation = randomInRange(template.inflammationRange, random);
    region.localHealth = randomInRange(template.healthRange, random);
    state.alerts.push(template.alert);
    state.history.unshift(`Tour 1 : ${template.alert}`);
  }

  state.alerts.push(
    "Chaque partie normale génère des foyers différents. Les menaces avancées apparaissent selon la difficulté.",
  );

  return normalizeBodyMapState(state);
}

export function hasBodyMapSave(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem("immunostrat-body-map-v1") !== null;
}

function pickCrisisTemplates(
  count: number,
  random: () => number,
  difficulty: BodyMapDifficulty,
): CrisisTemplate[] {
  const pool = crisisTemplates.filter((template) =>
    isDifficultyAllowed(template.minDifficulty, difficulty),
  );
  const picked: CrisisTemplate[] = [];
  const usedRegions = new Set<BodyRegionId>();

  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const [candidate] = pool.splice(index, 1);

    if (usedRegions.has(candidate.regionId)) {
      continue;
    }

    picked.push(candidate);
    usedRegions.add(candidate.regionId);
  }

  return picked;
}

function isDifficultyAllowed(
  minDifficulty: BodyMapDifficulty | undefined,
  currentDifficulty: BodyMapDifficulty,
): boolean {
  if (!minDifficulty) {
    return true;
  }

  const ranks: Record<BodyMapDifficulty, number> = {
    easy: 1,
    normal: 2,
    hard: 3,
  };

  return ranks[currentDifficulty] >= ranks[minDifficulty];
}

function randomInRange(range: [number, number], random: () => number): number {
  return Math.round(range[0] + (range[1] - range[0]) * random());
}
