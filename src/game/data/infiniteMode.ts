import type { MissionWaveDefinition } from "./missions";
import type { PathogenTypeId } from "./pathogens";

export type InfiniteDifficulty = "normal" | "hard" | "nightmare";

export type InfinitePhaseDefinition = {
  id: number;
  name: string;
  description: string;
  startsAtCycle: number;
  threatPool: PathogenTypeId[];
};

export type InfiniteMutatorId =
  | "bacterialSpeedUp"
  | "bacterialResistanceUp"
  | "viralReplicationUp"
  | "biofilmStrengthUp"
  | "inflammationDamageUp"
  | "resourceProductionDown"
  | "tissueFragilityUp"
  | "adaptiveResearchCostUp"
  | "advancedThreatPressure";

export type InfiniteMutatorDefinition = {
  id: InfiniteMutatorId;
  name: string;
  description: string;
  phaseMin: number;
  intensity: number;
  weight: number;
  tags: string[];
};

export type InfiniteRunInfo = {
  difficulty: InfiniteDifficulty;
  score: number;
  cycle: number;
  wave: number;
  phase: InfinitePhaseDefinition;
  nextPhaseAtCycle: number | null;
  activeMutators: InfiniteMutatorDefinition[];
  maxActivePathogens: number;
};

export type InfiniteBestScore = {
  score: number;
  cycle: number;
  wave: number;
  phase: number;
  difficulty: InfiniteDifficulty;
  completedAt: string;
};

export const infiniteDifficultySettings: Record<
  InfiniteDifficulty,
  {
    label: string;
    scoreMultiplier: number;
    waveCountMultiplier: number;
    resourceMultiplier: number;
    maxActivePathogens: number;
    mutatorExtraFrequency: number;
  }
> = {
  normal: {
    label: "Normal",
    scoreMultiplier: 1,
    waveCountMultiplier: 1,
    resourceMultiplier: 1,
    maxActivePathogens: 72,
    mutatorExtraFrequency: 0,
  },
  hard: {
    label: "Difficile",
    scoreMultiplier: 1.5,
    waveCountMultiplier: 1.18,
    resourceMultiplier: 0.88,
    maxActivePathogens: 86,
    mutatorExtraFrequency: 1,
  },
  nightmare: {
    label: "Nightmare",
    scoreMultiplier: 2,
    waveCountMultiplier: 1.36,
    resourceMultiplier: 0.76,
    maxActivePathogens: 96,
    mutatorExtraFrequency: 2,
  },
};

export const infinitePhases: InfinitePhaseDefinition[] = [
  {
    id: 1,
    name: "Contamination simple",
    description: "Bacteries faibles, installation de la defense.",
    startsAtCycle: 1,
    threatPool: ["cocciRapid", "basicBacterium"],
  },
  {
    id: 2,
    name: "Expansion bacterienne",
    description: "Groupes plus nombreux, cytokines et neutrophiles importants.",
    startsAtCycle: 3,
    threatPool: ["cocciRapid", "proliferatingBacillus"],
  },
  {
    id: 3,
    name: "Resistance",
    description: "Bacteries resistantes, biofilm et besoin d'antigenes.",
    startsAtCycle: 5,
    threatPool: ["resistantBacterium", "biofilmColony", "proliferatingBacillus"],
  },
  {
    id: 4,
    name: "Infection virale",
    description: "Virus respiratoire et cytolytique, cellules infectees, interferons.",
    startsAtCycle: 7,
    threatPool: ["respiratoryVirus", "cytolyticVirus", "cocciRapid"],
  },
  {
    id: 5,
    name: "Infection mixte",
    description: "Priorisation entre bacteries, virus et opportunistes simples.",
    startsAtCycle: 9,
    threatPool: [
      "respiratoryVirus",
      "proliferatingBacillus",
      "resistantBacterium",
      "secondaryBacterium",
      "reactivatedLatentVirus",
    ],
  },
  {
    id: 6,
    name: "Mutation",
    description: "Affixes qui cassent les automatismes et premiers foyers avances.",
    startsAtCycle: 11,
    threatPool: [
      "immuneEvasiveVirus",
      "latentVirus",
      "biofilmColony",
      "toxicBacterium",
      "fungalSpore",
    ],
  },
  {
    id: 7,
    name: "Crise systemique",
    description: "Inflammation, opportunistes et ressources deviennent instables.",
    startsAtCycle: 13,
    threatPool: [
      "toxicBacterium",
      "resistantBacterium",
      "respiratoryVirus",
      "opportunistBacterium",
      "fungalColony",
      "yeastOpportunist",
      "sporeMold",
      "opportunistYeastFlare",
      "mixedOpportunistCluster",
    ],
  },
  {
    id: 8,
    name: "Nightmare",
    description: "Menaces combinees avec champignons, parasites et cellules anormales.",
    startsAtCycle: 15,
    threatPool: [
      "respiratoryVirus",
      "biofilmColony",
      "toxicBacterium",
      "resistantBacterium",
      "proliferatingBacillus",
      "fungalColony",
      "sporeMold",
      "parasiteHelminth",
      "bloodProtozoan",
      "migratoryLarva",
      "cancerCellCluster",
      "discreetAbnormalCell",
      "proliferativeCancerCell",
      "inflammatoryCancerCell",
      "invasiveCancerCell",
      "opportunistBacterium",
      "immuneEvasiveVirus",
      "mixedOpportunistCluster",
    ],
  },
];

export const infiniteMutators: InfiniteMutatorDefinition[] = [
  {
    id: "bacterialSpeedUp",
    name: "Adaptation bacterienne : vitesse +",
    description: "Les bacteries se deplacent plus vite.",
    phaseMin: 2,
    intensity: 0.14,
    weight: 8,
    tags: ["bacteria", "movement"],
  },
  {
    id: "bacterialResistanceUp",
    name: "Resistance bacterienne",
    description: "Les bacteries ont plus de points de vie.",
    phaseMin: 3,
    intensity: 0.18,
    weight: 7,
    tags: ["bacteria", "durability"],
  },
  {
    id: "viralReplicationUp",
    name: "Vitesse virale +",
    description: "Les virus libres survivent et circulent mieux.",
    phaseMin: 4,
    intensity: 0.16,
    weight: 7,
    tags: ["virus"],
  },
  {
    id: "biofilmStrengthUp",
    name: "Biofilm renforce",
    description: "Les colonies protegent mieux les foyers bacteriens.",
    phaseMin: 5,
    intensity: 0.15,
    weight: 5,
    tags: ["bacteria", "biofilm"],
  },
  {
    id: "inflammationDamageUp",
    name: "Crise inflammatoire",
    description: "L'inflammation devient plus dangereuse.",
    phaseMin: 6,
    intensity: 0.18,
    weight: 6,
    tags: ["systemic"],
  },
  {
    id: "resourceProductionDown",
    name: "Fatigue metabolique",
    description: "Les ressources deviennent plus tendues.",
    phaseMin: 7,
    intensity: 0.16,
    weight: 5,
    tags: ["resources"],
  },
  {
    id: "tissueFragilityUp",
    name: "Tissu fragilise",
    description: "Les erreurs coutent plus cher en sante du tissu.",
    phaseMin: 7,
    intensity: 0.14,
    weight: 5,
    tags: ["tissue"],
  },
  {
    id: "adaptiveResearchCostUp",
    name: "Nouvel antigene",
    description: "La reponse adaptative doit se reconfigurer.",
    phaseMin: 6,
    intensity: 0.18,
    weight: 4,
    tags: ["adaptive"],
  },
  {
    id: "advancedThreatPressure",
    name: "Menaces avancees",
    description: "Champignons, parasites, cellules anormales ou opportunistes encaissent mieux.",
    phaseMin: 8,
    intensity: 0.16,
    weight: 3,
    tags: ["advanced", "fungus", "parasite", "cancer"],
  },
];

export function createInfiniteWaves(
  difficulty: InfiniteDifficulty = "normal",
  waveLimit = 160,
): MissionWaveDefinition[] {
  const waves: MissionWaveDefinition[] = [];

  for (let waveIndex = 0; waveIndex < waveLimit; waveIndex += 1) {
    waves.push(createInfiniteWave(waveIndex + 1, difficulty));
  }

  return waves;
}

export function createInfiniteWave(
  waveNumber: number,
  difficulty: InfiniteDifficulty = "normal",
): MissionWaveDefinition {
  const settings = infiniteDifficultySettings[difficulty];
  const cycle = getInfiniteCycle(waveNumber);
  const phase = getInfinitePhase(cycle);
  const pathogenTypeId =
    phase.threatPool[(waveNumber + phase.id) % phase.threatPool.length];
  const baseCount = 3 + phase.id + Math.floor(waveNumber / 4);

  return {
    startsAtMs: 1500 + (waveNumber - 1) * Math.max(7600, 13200 - phase.id * 720),
    pathogenTypeId,
    count: Math.min(
      32,
      Math.max(2, Math.round(baseCount * settings.waveCountMultiplier)),
    ),
    spawnIntervalMs: Math.max(340, 980 - phase.id * 48),
  };
}

export function getInfiniteCycle(wave: number): number {
  return Math.max(1, Math.ceil(wave / 3));
}

export function getInfinitePhase(cycle: number): InfinitePhaseDefinition {
  return [...infinitePhases]
    .reverse()
    .find((phase) => cycle >= phase.startsAtCycle) ?? infinitePhases[0];
}

export function getNextPhaseAtCycle(cycle: number): number | null {
  return (
    infinitePhases.find((phase) => phase.startsAtCycle > cycle)?.startsAtCycle ??
    null
  );
}

export function getActiveInfiniteMutators(
  cycle: number,
  difficulty: InfiniteDifficulty,
): InfiniteMutatorDefinition[] {
  const phase = getInfinitePhase(cycle);
  const settings = infiniteDifficultySettings[difficulty];
  const maxMutators = Math.min(
    5,
    Math.max(0, phase.id - 2) + settings.mutatorExtraFrequency,
  );

  if (maxMutators <= 0) {
    return [];
  }

  const availableMutators = infiniteMutators.filter(
    (mutator) => mutator.phaseMin <= phase.id,
  );
  const selectedMutators = availableMutators.filter(
    (_, index) => (index + cycle + phase.id) % 2 === 0,
  );
  const advancedThreatMutator = availableMutators.find(
    (mutator) => mutator.id === "advancedThreatPressure",
  );

  if (
    advancedThreatMutator &&
    !selectedMutators.some((mutator) => mutator.id === advancedThreatMutator.id)
  ) {
    selectedMutators.unshift(advancedThreatMutator);
  }

  return selectedMutators.slice(0, maxMutators);
}

export function calculateInfiniteScore(
  params: {
    wave: number;
    cycle: number;
    tissueHealth: number;
    healthyCells: number;
    destroyedCells: number;
    infectedCells: number;
    peakInflammation: number;
    antigensCollected: number;
    threatScoreBonus?: number;
  },
  difficulty: InfiniteDifficulty,
): number {
  const settings = infiniteDifficultySettings[difficulty];
  const base =
    params.wave * 92 +
    params.cycle * 140 +
    params.tissueHealth * 2 +
    params.healthyCells * 18 +
    params.antigensCollected * 8 +
    (params.threatScoreBonus ?? 0);
  const penalties =
    params.destroyedCells * 45 +
    params.infectedCells * 22 +
    Math.max(0, params.peakInflammation - 65) * 6;

  return Math.max(0, Math.round((base - penalties) * settings.scoreMultiplier));
}
