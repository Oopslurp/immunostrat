import type { PathogenTypeId } from "../data/pathogens";
import type { BodyBattleMissionId } from "../data/missions";
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
    id: "lung-virus",
    regionId: "lungs",
    threat: "viral",
    pathogens: ["respiratoryVirus"],
    battleMissionId: "lungViralSpread",
    infectionRange: [40, 64],
    inflammationRange: [18, 36],
    healthRange: [72, 88],
    alert: "Foyer viral respiratoire detecte.",
  },
  {
    id: "intestine-bacillus",
    regionId: "intestine",
    threat: "bacterial",
    pathogens: ["proliferatingBacillus", "resistantBacterium"],
    battleMissionId: "intestineBacillusSwarm",
    infectionRange: [42, 68],
    inflammationRange: [24, 50],
    healthRange: [70, 88],
    alert: "Essaim de bacilles dans l'intestin.",
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
  seed = createSeed(),
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
    "Chaque partie normale genere des foyers differents. Le mode infini reste pour V8.",
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
): CrisisTemplate[] {
  const pool = [...crisisTemplates];
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

function randomInRange(range: [number, number], random: () => number): number {
  return Math.round(range[0] + (range[1] - range[0]) * random());
}

function createSeed(): string {
  return `normal-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)
    .toString(36)
    .padStart(3, "0")}`;
}

function createSeededRandom(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;

    return (hash >>> 0) / 4294967296;
  };
}
