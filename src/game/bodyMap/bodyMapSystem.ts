import type { CampaignProgress } from "../campaign/progress";
import { balanceValues } from "../data/balance";
import type { MissionPreparation, StartingUnitDefinition } from "../data/missions";
import { pathogenDefinitions } from "../data/pathogens";
import { unitDefinitions, type UnitTypeId } from "../data/units";
import {
  bodyRegionDefinitions,
  bodyRegionOrder,
  initialBodyRegions,
  regionalNodeDefinitions,
} from "./bodyRegions";
import type {
  BodyBattleOutcome,
  BodyMapBattleStats,
  BodyMapDefeatCause,
  BodyBattlePreparation,
  BodyBattleQuality,
  BodyMapFinalSummary,
  BodyMapDifficulty,
  BodyMapRunStatus,
  BodyMapState,
  BodyMapVictoryBlocker,
  BodyRegionId,
  BodyRegionState,
  BodyRegionStatus,
  BodyThreatProfile,
  RegionalNodeId,
  ReinforcementCost,
} from "./bodyMapTypes";

export const BODY_MAP_SAVE_VERSION = 1;

export const bodyMapEndingRules = balanceValues.bodyMapEnding;

export const reinforcementCosts: Record<UnitTypeId, ReinforcementCost> = {
  macrophage: { unitTypeId: "macrophage", atp: 12, cytokines: 0, antigens: 0 },
  neutrophil: { unitTypeId: "neutrophil", atp: 10, cytokines: 8, antigens: 0 },
  dendriticCell: { unitTypeId: "dendriticCell", atp: 14, cytokines: 6, antigens: 0 },
  plasmocyte: { unitTypeId: "plasmocyte", atp: 22, cytokines: 8, antigens: 5 },
  nkCell: { unitTypeId: "nkCell", atp: 18, cytokines: 10, antigens: 0 },
  cytotoxicT: { unitTypeId: "cytotoxicT", atp: 24, cytokines: 10, antigens: 6 },
};

export function createDefaultBodyMapState(): BodyMapState {
  return recalculateGlobalMetrics({
    version: BODY_MAP_SAVE_VERSION,
    seed: "v7-default",
    difficulty: "normal",
    runStatus: "running",
    strategicTurn: 1,
    stabilizationStreak: 0,
    defeatPressureTurns: 0,
    globalHealth: 90,
    globalInfection: 0,
    systemicInflammation: 0,
    globalResources: {
      atp: 230,
      cytokines: 86,
      antigens: 18,
    },
    regions: cloneRegions(initialBodyRegions),
    regionalNodes: {
      skinNode: {
        id: "skinNode",
        active: false,
        activation: 0,
        antigenSignalsDelivered: 0,
      },
      thoracicNode: {
        id: "thoracicNode",
        active: false,
        activation: 0,
        antigenSignalsDelivered: 0,
      },
      gutNode: {
        id: "gutNode",
        active: false,
        activation: 0,
        antigenSignalsDelivered: 0,
      },
      bloodNode: {
        id: "bloodNode",
        active: true,
        activation: 1,
        antigenSignalsDelivered: 1,
      },
    },
    alerts: [
      "Infection detectee dans la peau.",
      "Les poumons sont sous surveillance virale.",
      "Le sang peut propager une infection vers plusieurs organes.",
    ],
    history: [
      "Tour 1 : partie normale initialisee.",
      "Tour 1 : infection detectee dans la peau.",
    ],
    treatedRegionIds: [],
    battleStats: createEmptyBattleStats(),
  });
}

export function isBodyMapUnlocked(progress: CampaignProgress): boolean {
  return Boolean(
    progress.completedMissions.viralCleanupV7 ||
      progress.unlockedMissionIds.includes("mixedInfectionV8"),
  );
}

export function normalizeBodyMapState(
  partial: Partial<BodyMapState>,
): BodyMapState {
  if (partial.version !== BODY_MAP_SAVE_VERSION) {
    return createDefaultBodyMapState();
  }

  const defaults = createDefaultBodyMapState();
  const regions = cloneRegions(defaults.regions);
  const regionalNodes = { ...defaults.regionalNodes };

  for (const regionId of bodyRegionOrder) {
    const region = partial.regions?.[regionId];

    if (region) {
      regions[regionId] = sanitizeRegion(region, defaults.regions[regionId]);
    }
  }

  for (const nodeId of Object.keys(regionalNodeDefinitions) as RegionalNodeId[]) {
    const node = partial.regionalNodes?.[nodeId];

    if (node) {
      regionalNodes[nodeId] = {
        id: nodeId,
        active: Boolean(node.active),
        activation: clamp(node.activation, 0, 5),
        antigenSignalsDelivered: Math.max(0, node.antigenSignalsDelivered ?? 0),
      };
    }
  }

  return recalculateGlobalMetrics({
    version: BODY_MAP_SAVE_VERSION,
    seed: partial.seed ?? defaults.seed,
    difficulty: sanitizeDifficulty(partial.difficulty),
    runStatus:
      partial.runStatus === "victory" || partial.runStatus === "defeat"
        ? partial.runStatus
        : "running",
    strategicTurn: Math.max(1, partial.strategicTurn ?? defaults.strategicTurn),
    stabilizationStreak: Math.max(0, partial.stabilizationStreak ?? 0),
    defeatPressureTurns: Math.max(0, partial.defeatPressureTurns ?? 0),
    finalSummary: sanitizeFinalSummary(partial.finalSummary),
    globalHealth: clamp(partial.globalHealth ?? defaults.globalHealth, 0, 100),
    globalInfection: clamp(
      partial.globalInfection ?? defaults.globalInfection,
      0,
      100,
    ),
    systemicInflammation: clamp(
      partial.systemicInflammation ?? defaults.systemicInflammation,
      0,
      100,
    ),
    globalResources: {
      atp: Math.max(0, partial.globalResources?.atp ?? defaults.globalResources.atp),
      cytokines: Math.max(
        0,
        partial.globalResources?.cytokines ?? defaults.globalResources.cytokines,
      ),
      antigens: Math.max(
        0,
        partial.globalResources?.antigens ?? defaults.globalResources.antigens,
      ),
    },
    regions,
    regionalNodes,
    alerts: (partial.alerts ?? defaults.alerts).slice(0, 8),
    history: (partial.history ?? defaults.history).slice(0, 12),
    treatedRegionIds: (partial.treatedRegionIds ?? []).filter(
      (regionId): regionId is BodyRegionId => regionId in bodyRegionDefinitions,
    ),
    battleStats: sanitizeBattleStats(partial.battleStats),
  });
}

export function assignReinforcement(
  state: BodyMapState,
  regionId: BodyRegionId,
  unitTypeId: UnitTypeId,
): BodyMapState {
  if (state.runStatus !== "running") {
    return state;
  }

  const cost = reinforcementCosts[unitTypeId];

  if (
    state.globalResources.atp < cost.atp ||
    state.globalResources.cytokines < cost.cytokines ||
    state.globalResources.antigens < cost.antigens
  ) {
    return state;
  }

  const next = cloneBodyMapState(state);
  const region = next.regions[regionId];

  next.globalResources.atp = Math.max(0, next.globalResources.atp - cost.atp);
  next.globalResources.cytokines = Math.max(
    0,
    next.globalResources.cytokines - cost.cytokines,
  );
  next.globalResources.antigens = Math.max(
    0,
    next.globalResources.antigens - cost.antigens,
  );
  region.assignedReinforcements[unitTypeId] =
    (region.assignedReinforcements[unitTypeId] ?? 0) + 1;
  next.alerts = pushAlert(
    next.alerts,
    `${unitDefinitions[unitTypeId].displayName} envoye vers ${bodyRegionDefinitions[regionId].name}.`,
  );

  return next;
}

export function activateRegionalNode(
  state: BodyMapState,
  nodeId: RegionalNodeId,
): BodyMapState {
  if (state.runStatus !== "running") {
    return state;
  }

  if (
    state.regionalNodes[nodeId].active ||
    state.globalResources.cytokines < 14 ||
    state.globalResources.antigens < 6
  ) {
    return state;
  }

  const next = cloneBodyMapState(state);
  const node = next.regionalNodes[nodeId];

  next.globalResources.cytokines = Math.max(0, next.globalResources.cytokines - 14);
  next.globalResources.antigens = Math.max(0, next.globalResources.antigens - 6);
  node.active = true;
  node.activation = Math.max(node.activation, 1);
  next.alerts = pushAlert(
    next.alerts,
    `${regionalNodeDefinitions[nodeId].name} active : analyse regionale acceleree.`,
  );

  return next;
}

export function prepareBodyBattle(
  state: BodyMapState,
  regionId: BodyRegionId,
): BodyBattlePreparation {
  const region = state.regions[regionId];
  const definition = bodyRegionDefinitions[regionId];
  const node = state.regionalNodes[definition.regionalNodeId];

  return {
    regionId,
    missionId: region.activeBattleMissionId ?? definition.linkedMissionId,
    reinforcements: toStartingUnits(region.assignedReinforcements),
    regionalNodeId: definition.regionalNodeId,
    regionalNodeActive: node.active,
  };
}

export function toMissionPreparation(
  bodyPreparation: BodyBattlePreparation,
  progress: CampaignProgress,
): MissionPreparation {
  return {
    bodyRegionId: bodyPreparation.regionId,
    globalReinforcements: bodyPreparation.reinforcements,
    memoryProfiles: progress.immuneMemory.knownProfiles,
    regionalNodeBonus: {
      nodeId: bodyPreparation.regionalNodeId,
      active: bodyPreparation.regionalNodeActive,
      antigenBonus: bodyPreparation.regionalNodeActive ? 4 : 0,
      cytokineBonus: bodyPreparation.regionalNodeActive ? 4 : 0,
    },
  };
}

export function applyBodyBattleOutcome(
  state: BodyMapState,
  outcome: BodyBattleOutcome,
): BodyMapState {
  if (state.runStatus !== "running") {
    return state;
  }

  const next = cloneBodyMapState(state);
  const region = next.regions[outcome.regionId];
  const definition = bodyRegionDefinitions[outcome.regionId];
  const node = next.regionalNodes[definition.regionalNodeId];

  region.lastBattleMissionId = outcome.missionId;
  region.lastBattleQuality = getBattleQuality(outcome);
  region.treatedCount = (region.treatedCount ?? 0) + 1;
  region.assignedReinforcements = {};
  addBattleStats(next, outcome);

  if (outcome.status === "victory") {
    const quality = getBattleQuality(outcome);
    const tissueRatio =
      outcome.tissueMaxHealth && outcome.tissueMaxHealth > 0
        ? (outcome.tissueHealthRemaining ?? 0) / outcome.tissueMaxHealth
        : 0.7;
    const infectionDrop =
      quality === "clean" ? 56 : quality === "strained" ? 36 : 20;
    const healthDelta = quality === "clean" ? 12 : tissueRatio >= 0.45 ? 4 : -7;
    const inflammationPeak = outcome.inflammationPeak ?? 0;
    const inflammationDelta =
      inflammationPeak >= 82 ? -4 : quality === "clean" ? -22 : -12;

    region.infection = clamp(region.infection - infectionDrop, 0, 100);
    region.inflammation = clamp(region.inflammation + inflammationDelta, 0, 100);
    next.systemicInflammation = clamp(
      next.systemicInflammation +
        (inflammationPeak >= 85 ? 5 : quality === "clean" ? -6 : -2),
      0,
      100,
    );
    region.localHealth = clamp(
      region.localHealth + healthDelta - (outcome.civilianCellsLost ?? 0) * 1.5,
      0,
      100,
    );
    region.status = getRegionStatus(region);
    node.antigenSignalsDelivered += Math.max(1, outcome.lymphSignalsDelivered ?? 0);
    node.activation = clamp(
      node.activation +
        Math.max(1, Math.ceil((outcome.lymphSignalsDelivered ?? 0) / 2)),
      0,
      5,
    );
    node.active = node.active || node.activation >= 2;
    next.globalResources.antigens += Math.max(4, outcome.antigensCollected ?? 0);
    next.treatedRegionIds = Array.from(
      new Set([...next.treatedRegionIds, outcome.regionId]),
    );
    next.alerts = pushAlert(
      next.alerts,
      quality === "clean"
        ? `Victoire propre dans ${definition.name} : propagation fortement reduite.`
        : `Victoire difficile dans ${definition.name} : infection reduite mais zone fragile.`,
    );
    next.history = pushHistory(
      next.history,
      `Tour ${next.strategicTurn} : ${definition.name} stabilise (${quality}).`,
    );
  } else {
    region.infection = clamp(
      region.infection + 22 + (outcome.enemiesRemaining ?? 0) * 1.4,
      0,
      100,
    );
    region.inflammation = clamp(region.inflammation + 16, 0, 100);
    region.localHealth = clamp(
      region.localHealth - 18 - (outcome.civilianCellsLost ?? 0) * 1.2,
      0,
      100,
    );
    region.status = getRegionStatus(region);
    next.systemicInflammation = clamp(next.systemicInflammation + 10, 0, 100);
    next.globalHealth = clamp(next.globalHealth - 8, 0, 100);
    next.alerts = pushAlert(
      next.alerts,
      `Bataille perdue dans ${definition.name} : risque de propagation augmente.`,
    );
    next.history = pushHistory(
      next.history,
      `Tour ${next.strategicTurn} : defaite locale dans ${definition.name}.`,
    );
  }

  return advanceStrategicTurn(next);
}

export function advanceStrategicTurn(state: BodyMapState): BodyMapState {
  if (state.runStatus !== "running") {
    return state;
  }

  const next = cloneBodyMapState(state);
  const spreadAlerts: string[] = [];

  next.strategicTurn += 1;

  for (const regionId of bodyRegionOrder) {
    const region = next.regions[regionId];

    if (region.infection <= 0) {
      region.inflammation = clamp(region.inflammation - 2, 0, 100);
      region.status = getRegionStatus(region);
      continue;
    }

    const node = next.regionalNodes[bodyRegionDefinitions[regionId].regionalNodeId];
    const nodeReduction = node.active ? 0.72 : 1;
    const recentOutcomeFactor =
      region.lastBattleQuality === "clean"
        ? 0.6
        : region.lastBattleQuality === "lost"
          ? 1.3
          : 1;
    const growth =
      (regionId === "blood" ? 7 : region.infection >= 60 ? 5 : 3) *
      nodeReduction *
      recentOutcomeFactor *
      getDifficultyConfig(next.difficulty).spreadMultiplier;
    region.infection = clamp(region.infection + growth, 0, 100);
    region.inflammation = clamp(region.inflammation + growth * 0.45, 0, 100);
    region.localHealth = clamp(region.localHealth - growth * 0.18, 0, 100);

    if (shouldAttemptSpread(next, regionId)) {
      const targetId = findSpreadTarget(next, regionId);

      if (targetId) {
        const target = next.regions[targetId];
        const sourceDefinition = bodyRegionDefinitions[regionId];
        const targetDefinition = bodyRegionDefinitions[targetId];

        const intensity = getSpreadIntensity(region.threat, regionId, next.difficulty);

        target.infection = clamp(target.infection + intensity, 0, 100);
        target.inflammation = clamp(target.inflammation + intensity * 0.45, 0, 100);
        if (target.status !== "controlled" && target.status !== "healthy") {
          target.threat = inheritThreat(target.threat, region.threat);
        } else {
          target.threat = region.threat;
        }
        target.pathogens = Array.from(
          new Set([...target.pathogens, ...region.pathogens]),
        );
        target.activeBattleMissionId =
          target.activeBattleMissionId ?? bodyRegionDefinitions[targetId].linkedMissionId;
        spreadAlerts.push(
          `Propagation ${formatThreat(region.threat)} detectee : ${sourceDefinition.name} vers ${targetDefinition.name}.`,
        );
      }
    }

    region.status = getRegionStatus(region);
  }

  next.globalResources.atp += next.regions.boneMarrow.localHealth >= 55 ? 16 : 8;
  next.globalResources.cytokines += Math.max(
    4,
    Math.round(next.systemicInflammation / 18),
  );
  next.alerts = [...spreadAlerts, ...next.alerts].slice(0, 8);
  next.history = [
    ...spreadAlerts.map((alert) => `Tour ${next.strategicTurn} : ${alert}`),
    ...next.history,
  ].slice(0, 12);

  return updateBodyMapEndState(recalculateGlobalMetrics(next));
}

export function getDifficultyConfig(difficulty: BodyMapDifficulty): {
  infectedRegionCount: number;
  spreadMultiplier: number;
  startingGlobalHealth: number;
  startingAtp: number;
  startingCytokines: number;
  startingAntigens: number;
} {
  if (difficulty === "easy") {
    return {
      infectedRegionCount: 1,
      spreadMultiplier: 0.78,
      startingGlobalHealth: 96,
      startingAtp: 270,
      startingCytokines: 108,
      startingAntigens: 24,
    };
  }

  if (difficulty === "hard") {
    return {
      infectedRegionCount: 3,
      spreadMultiplier: 1.18,
      startingGlobalHealth: 84,
      startingAtp: 205,
      startingCytokines: 72,
      startingAntigens: 12,
    };
  }

  return {
    infectedRegionCount: 2,
    spreadMultiplier: 1,
    startingGlobalHealth: 90,
    startingAtp: 230,
    startingCytokines: 86,
    startingAntigens: 18,
  };
}

export function getAvailableReinforcements(
  progress: CampaignProgress,
): UnitTypeId[] {
  const available: UnitTypeId[] = ["macrophage"];

  if (progress.unlockedMissionIds.includes("persistentInfectionV3")) {
    available.push("neutrophil");
  }

  if (progress.unlockedMissionIds.includes("adaptiveResponseV5")) {
    available.push("dendriticCell");
  }

  if (progress.unlockedMissionIds.includes("viralInfectionV6")) {
    available.push("plasmocyte");
  }

  if (progress.unlockedMissionIds.includes("mixedInfectionV8")) {
    available.push("nkCell", "cytotoxicT");
  }

  return available;
}

export function getBodyMapVictoryProgress(state: BodyMapState): {
  stableTurns: number;
  requiredStableTurns: number;
  infectedRegions: number;
  criticalRegions: number;
  lostRegions: number;
  canWinNow: boolean;
  ready: boolean;
  blockers: string[];
  blockerDetails: BodyMapVictoryBlocker[];
} {
  const regions = bodyRegionOrder.map((regionId) => state.regions[regionId]);
  const infectedRegions = regions.filter(
    (region) => region.infection > bodyMapEndingRules.victoryMaxRegionInfection,
  ).length;
  const criticalRegions = regions.filter((region) => isCriticalRegion(region)).length;
  const lostRegions = regions.filter((region) => region.status === "lost").length;
  const blockerDetails: BodyMapVictoryBlocker[] = [];

  for (const regionId of bodyRegionOrder) {
    const region = state.regions[regionId];
    const definition = bodyRegionDefinitions[regionId];

    if (region.infection > bodyMapEndingRules.victoryMaxRegionInfection) {
      blockerDetails.push({
        id: `${regionId}-infection`,
        type: "regionInfection",
        regionId,
        regionName: definition.name,
        currentValue: Math.round(region.infection),
        requiredValue: bodyMapEndingRules.victoryMaxRegionInfection,
        message: `${definition.name} encore infecte : ${Math.round(region.infection)}% > seuil ${bodyMapEndingRules.victoryMaxRegionInfection}%`,
        severity: region.infection >= 60 ? "danger" : "warning",
      });
    }

    if (region.status === "critical") {
      blockerDetails.push({
        id: `${regionId}-critical`,
        type: "regionCritical",
        regionId,
        regionName: definition.name,
        currentValue: Math.round(region.localHealth),
        requiredValue: 23,
        message: `${definition.name} en etat critique : sante ${Math.round(region.localHealth)}%`,
        severity: "danger",
      });
    }

    if (region.status === "lost") {
      blockerDetails.push({
        id: `${regionId}-lost`,
        type: "regionLost",
        regionId,
        regionName: definition.name,
        currentValue: 0,
        requiredValue: 1,
        message: `${definition.name} perdue : relance une nouvelle stabilisation globale`,
        severity: "danger",
      });
    }

    if (
      region.threat !== "none" &&
      region.infection > bodyMapEndingRules.victoryMaxRegionInfection
    ) {
      blockerDetails.push({
        id: `${regionId}-crisis`,
        type: "activeCrisis",
        regionId,
        regionName: definition.name,
        currentValue: Math.round(region.infection),
        requiredValue: bodyMapEndingRules.victoryMaxRegionInfection,
        message: `Crise active non controlee : ${formatThreat(region.threat)} dans ${definition.name}`,
        severity: region.infection >= 45 ? "danger" : "warning",
      });
    }
  }

  if (state.systemicInflammation > bodyMapEndingRules.victoryMaxSystemicInflammation) {
    blockerDetails.push({
      id: "systemic-inflammation",
      type: "systemicInflammation",
      currentValue: Math.round(state.systemicInflammation),
      requiredValue: bodyMapEndingRules.victoryMaxSystemicInflammation,
      message: `Inflammation systemique trop elevee : ${Math.round(state.systemicInflammation)}% > ${bodyMapEndingRules.victoryMaxSystemicInflammation}%`,
      severity: state.systemicInflammation >= 80 ? "danger" : "warning",
    });
  }

  if (state.globalInfection > bodyMapEndingRules.victoryMaxGlobalInfection) {
    blockerDetails.push({
      id: "global-infection",
      type: "globalInfection",
      currentValue: Math.round(state.globalInfection),
      requiredValue: bodyMapEndingRules.victoryMaxGlobalInfection,
      message: `Infection globale trop elevee : ${Math.round(state.globalInfection)}% > ${bodyMapEndingRules.victoryMaxGlobalInfection}%`,
      severity: state.globalInfection >= 45 ? "danger" : "warning",
    });
  }

  if (state.globalHealth < bodyMapEndingRules.victoryMinGlobalHealth) {
    blockerDetails.push({
      id: "global-health",
      type: "globalHealth",
      currentValue: Math.round(state.globalHealth),
      requiredValue: bodyMapEndingRules.victoryMinGlobalHealth,
      message: `Sante globale trop basse : ${Math.round(state.globalHealth)}% < ${bodyMapEndingRules.victoryMinGlobalHealth}%`,
      severity: "danger",
    });
  }

  if (
    blockerDetails.length === 0 &&
    state.stabilizationStreak < bodyMapEndingRules.victoryRequiredStableTurns
  ) {
    blockerDetails.push({
      id: "stabilization-turns",
      type: "stabilizationTurns",
      currentValue: state.stabilizationStreak,
      requiredValue: bodyMapEndingRules.victoryRequiredStableTurns,
      message: `Stabilisation globale : ${state.stabilizationStreak}/${bodyMapEndingRules.victoryRequiredStableTurns} tours`,
      severity: "info",
    });
  }

  const activeBlockers = blockerDetails.filter(
    (blocker) => blocker.type !== "stabilizationTurns",
  );

  return {
    stableTurns: state.stabilizationStreak,
    requiredStableTurns: bodyMapEndingRules.victoryRequiredStableTurns,
    infectedRegions,
    criticalRegions,
    lostRegions,
    canWinNow: activeBlockers.length === 0,
    ready: activeBlockers.length === 0,
    blockers: blockerDetails.map((blocker) => blocker.message),
    blockerDetails,
  };
}

export function calculateBodyMapScore(state: BodyMapState): number {
  const regions = bodyRegionOrder.map((regionId) => state.regions[regionId]);
  const stabilizedRegions = regions.filter(
    (region) => region.status === "healthy" || region.status === "controlled",
  ).length;
  const criticalRegions = regions.filter((region) => isCriticalRegion(region)).length;
  const difficultyMultiplier =
    state.difficulty === "hard" ? 1.3 : state.difficulty === "easy" ? 0.85 : 1;
  const base =
    state.globalHealth * 9 +
    (100 - state.globalInfection) * 6 +
    (100 - state.systemicInflammation) * 4 +
    stabilizedRegions * 95 +
    state.battleStats.won * 70 +
    state.battleStats.cleanVictories * 45 +
    state.battleStats.civilianCellsSaved * 4 +
    state.battleStats.advancedThreatsEncountered * 18;
  const penalties =
    state.strategicTurn * 18 +
    criticalRegions * 130 +
    state.battleStats.lost * 120 +
    state.battleStats.civilianCellsLost * 8 +
    state.battleStats.treatmentsUsed * 8;

  return Math.max(0, Math.round((base - penalties) * difficultyMultiplier));
}

export function getBodyMapRank(score: number): "C" | "B" | "A" | "S" {
  if (score >= 1500) {
    return "S";
  }

  if (score >= 1150) {
    return "A";
  }

  if (score >= 780) {
    return "B";
  }

  return "C";
}

function toStartingUnits(
  assigned: Partial<Record<UnitTypeId, number>>,
): StartingUnitDefinition[] {
  return (Object.keys(assigned) as UnitTypeId[])
    .map((unitTypeId) => ({
      unitTypeId,
      count: assigned[unitTypeId] ?? 0,
    }))
    .filter((unit) => unit.count > 0);
}

function findSpreadTarget(
  state: BodyMapState,
  sourceRegionId: BodyRegionId,
): BodyRegionId | null {
  const source = bodyRegionDefinitions[sourceRegionId];
  const candidates = source.connections.filter((targetId) => {
    const target = state.regions[targetId];

    return target.infection < 45 && target.localHealth > 0;
  });

  return candidates[0] ?? null;
}

function shouldAttemptSpread(
  state: BodyMapState,
  regionId: BodyRegionId,
): boolean {
  const region = state.regions[regionId];

  if (region.infection < 58) {
    return false;
  }

  const node = state.regionalNodes[bodyRegionDefinitions[regionId].regionalNodeId];
  const bloodBonus = regionId === "blood" || state.regions.blood.infection >= 45 ? 18 : 0;
  const viralBonus = region.threat === "viral" ? 8 : region.threat === "mixed" ? 12 : 0;
  const advancedBonus =
    region.threat === "parasite" || region.threat === "cancer"
      ? 10
      : region.threat === "fungal" || region.threat === "opportunist"
        ? 6
        : 0;
  const localRisk =
    region.infection * 0.55 +
    region.inflammation * 0.18 +
    (100 - region.localHealth) * 0.12 +
    bloodBonus +
    viralBonus +
    advancedBonus;
  const nodePenalty = node.active ? 14 : 0;
  const recentPenalty = region.lastBattleQuality === "clean" ? 12 : 0;
  const recentBonus = region.lastBattleQuality === "lost" ? 14 : 0;
  const threshold =
    state.difficulty === "easy" ? 76 : state.difficulty === "hard" ? 62 : 68;
  const roll = deterministicRoll(`${state.seed}-${state.strategicTurn}-${regionId}`);

  return localRisk - nodePenalty - recentPenalty + recentBonus + roll * 20 >= threshold;
}

function getSpreadIntensity(
  threat: BodyThreatProfile,
  sourceRegionId: BodyRegionId,
  difficulty: BodyMapDifficulty,
): number {
  const base =
    threat === "viral"
      ? 15
      : threat === "mixed"
        ? 18
        : threat === "parasite" || threat === "cancer"
          ? 16
          : threat === "fungal" || threat === "opportunist"
            ? 15
            : threat === "bacterial"
              ? 14
              : 10;
  const bloodBonus = sourceRegionId === "blood" ? 6 : 0;
  const difficultyBonus = difficulty === "hard" ? 4 : difficulty === "easy" ? -3 : 0;

  return Math.max(8, base + bloodBonus + difficultyBonus);
}

function deterministicRoll(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}

function inheritThreat(
  currentThreat: BodyThreatProfile,
  incomingThreat: BodyThreatProfile,
): BodyThreatProfile {
  if (currentThreat === "none") {
    return incomingThreat;
  }

  if (currentThreat === incomingThreat) {
    return currentThreat;
  }

  return "mixed";
}

function recalculateGlobalMetrics(state: BodyMapState): BodyMapState {
  const next = cloneBodyMapState(state);
  const regions = bodyRegionOrder.map((regionId) => next.regions[regionId]);
  const averageHealth =
    regions.reduce((sum, region) => sum + region.localHealth, 0) / regions.length;
  const averageInfection =
    regions.reduce((sum, region) => sum + region.infection, 0) / regions.length;
  const averageInflammation =
    regions.reduce((sum, region) => sum + region.inflammation, 0) / regions.length;
  const infectedRegions = regions.filter((region) => region.infection >= 45).length;

  next.globalInfection = clamp(averageInfection + infectedRegions * 3, 0, 100);
  next.systemicInflammation = clamp(
    Math.max(next.systemicInflammation * 0.65, averageInflammation + infectedRegions * 2),
    0,
    100,
  );
  next.globalHealth = clamp(
    Math.min(next.globalHealth, averageHealth) -
      Math.max(0, next.systemicInflammation - 70) * 0.04,
    0,
    100,
  );

  for (const regionId of bodyRegionOrder) {
    next.regions[regionId].status = getRegionStatus(next.regions[regionId]);
  }

  if (next.systemicInflammation >= 70) {
    next.alerts = pushAlert(
      next.alerts,
      "Inflammation systemique elevee : l'organisme fatigue.",
    );
  }

  return next;
}

function getRegionStatus(region: BodyRegionState): BodyRegionStatus {
  if (region.localHealth <= 0) {
    return "lost";
  }

  if (region.localHealth <= 22 || region.infection >= 82) {
    return "critical";
  }

  if (region.localHealth <= 35) {
    return "weakened";
  }

  if (region.inflammation >= 72) {
    return "highInflammation";
  }

  if (region.infection >= 45) {
    return "infected";
  }

  if (region.infection >= 18 || region.inflammation >= 34) {
    return "alert";
  }

  if (region.infection <= 5 && region.localHealth >= 88) {
    return "controlled";
  }

  return "healthy";
}

function sanitizeRegion(
  region: BodyRegionState,
  fallback: BodyRegionState,
): BodyRegionState {
  return {
    id: fallback.id,
    status: sanitizeRegionStatus(region.status, fallback.status),
    localHealth: clamp(region.localHealth, 0, 100),
    infection: clamp(region.infection, 0, 100),
    inflammation: clamp(region.inflammation, 0, 100),
    threat: region.threat ?? fallback.threat,
    pathogens: region.pathogens ?? fallback.pathogens,
    assignedReinforcements: { ...region.assignedReinforcements },
    activeBattleMissionId: region.activeBattleMissionId,
    lastBattleMissionId: region.lastBattleMissionId,
    lastBattleQuality: region.lastBattleQuality,
    treatedCount: Math.max(0, region.treatedCount ?? 0),
  };
}

function cloneBodyMapState(state: BodyMapState): BodyMapState {
  return {
    ...state,
    globalResources: { ...state.globalResources },
    regions: cloneRegions(state.regions),
    regionalNodes: Object.fromEntries(
      Object.entries(state.regionalNodes).map(([id, node]) => [id, { ...node }]),
    ) as BodyMapState["regionalNodes"],
    alerts: [...state.alerts],
    history: [...state.history],
    treatedRegionIds: [...state.treatedRegionIds],
    battleStats: { ...state.battleStats },
    finalSummary: state.finalSummary
      ? {
          ...state.finalSummary,
          battleStats: { ...state.finalSummary.battleStats },
        }
      : undefined,
  };
}

function cloneRegions(
  regions: Record<BodyRegionId, BodyRegionState>,
): Record<BodyRegionId, BodyRegionState> {
  return Object.fromEntries(
    bodyRegionOrder.map((regionId) => {
      const region = regions[regionId];

      return [
        regionId,
        {
          ...region,
          pathogens: [...region.pathogens],
          assignedReinforcements: { ...region.assignedReinforcements },
        },
      ];
    }),
  ) as Record<BodyRegionId, BodyRegionState>;
}

function pushAlert(alerts: string[], alert: string): string[] {
  return [alert, ...alerts.filter((candidate) => candidate !== alert)].slice(0, 8);
}

function pushHistory(history: string[], entry: string): string[] {
  return [entry, ...history.filter((candidate) => candidate !== entry)].slice(0, 12);
}

function sanitizeDifficulty(
  difficulty: BodyMapDifficulty | undefined,
): BodyMapDifficulty {
  if (difficulty === "easy" || difficulty === "hard") {
    return difficulty;
  }

  return "normal";
}

function getBattleQuality(outcome: BodyBattleOutcome): BodyBattleQuality {
  if (outcome.status === "defeat") {
    return "lost";
  }

  const tissueRatio =
    outcome.tissueMaxHealth && outcome.tissueMaxHealth > 0
      ? (outcome.tissueHealthRemaining ?? 0) / outcome.tissueMaxHealth
      : 0.7;

  if (
    tissueRatio >= 0.65 &&
    (outcome.inflammationPeak ?? 0) < 78 &&
    (outcome.enemiesRemaining ?? 0) === 0
  ) {
    return "clean";
  }

  return "strained";
}

function formatThreat(threat: BodyThreatProfile): string {
  if (threat === "viral") {
    return "virale";
  }

  if (threat === "fungal") {
    return "fongique";
  }

  if (threat === "parasite") {
    return "parasitaire";
  }

  if (threat === "cancer") {
    return "cellulaire anormale";
  }

  if (threat === "opportunist") {
    return "opportuniste";
  }

  if (threat === "bacterial") {
    return "bacterienne";
  }

  if (threat === "mixed") {
    return "mixte";
  }

  return "locale";
}

function updateBodyMapEndState(state: BodyMapState): BodyMapState {
  if (state.runStatus !== "running") {
    return state;
  }

  const next = cloneBodyMapState(state);
  const defeatCause = getDefeatCause(next);

  if (defeatCause) {
    next.runStatus = "defeat";
    next.finalSummary = createFinalSummary(next, "defeat", defeatCause);
    next.alerts = pushAlert(next.alerts, next.finalSummary.cause);
    next.history = pushHistory(
      next.history,
      `Tour ${next.strategicTurn} : defaite globale - ${next.finalSummary.cause}.`,
    );
    return next;
  }

  const progress = getBodyMapVictoryProgress(next);
  next.stabilizationStreak = progress.ready ? next.stabilizationStreak + 1 : 0;
  next.defeatPressureTurns =
    next.systemicInflammation >= bodyMapEndingRules.defeatMaxSystemicInflammation
      ? next.defeatPressureTurns + 1
      : 0;

  if (next.stabilizationStreak >= bodyMapEndingRules.victoryRequiredStableTurns) {
    next.runStatus = "victory";
    next.finalSummary = createFinalSummary(next, "victory");
    next.alerts = pushAlert(next.alerts, "Organisme stabilise : partie normale gagnee.");
    next.history = pushHistory(
      next.history,
      `Tour ${next.strategicTurn} : victoire globale, organisme stabilise.`,
    );
  }

  return next;
}

function getDefeatCause(state: BodyMapState): BodyMapDefeatCause | null {
  const regions = bodyRegionOrder.map((regionId) => state.regions[regionId]);
  const criticalRegions = regions.filter((region) => isCriticalRegion(region)).length;
  const blood = state.regions.blood;

  if (state.globalHealth <= 0) {
    return "globalHealthCollapsed";
  }

  if (state.globalInfection >= bodyMapEndingRules.defeatMaxGlobalInfection) {
    return "globalInfectionOverrun";
  }

  if (
    state.systemicInflammation >= bodyMapEndingRules.defeatMaxSystemicInflammation &&
    state.defeatPressureTurns + 1 >= bodyMapEndingRules.defeatInflammationTurns
  ) {
    return "systemicInflammationRunaway";
  }

  if (criticalRegions >= bodyMapEndingRules.defeatCriticalRegions) {
    return "tooManyCriticalRegions";
  }

  if (
    isCriticalRegion(blood) &&
    state.globalHealth < bodyMapEndingRules.defeatBloodGlobalHealth
  ) {
    return "bloodCrisis";
  }

  return null;
}

function createFinalSummary(
  state: BodyMapState,
  status: Exclude<BodyMapRunStatus, "running">,
  defeatCause?: BodyMapDefeatCause,
): BodyMapFinalSummary {
  const regions = bodyRegionOrder.map((regionId) => state.regions[regionId]);
  const score = calculateBodyMapScore(state);

  return {
    status,
    title: status === "victory" ? "Organisme stabilise" : "Organisme submerge",
    cause:
      status === "victory"
        ? "Stabilisation maintenue sur plusieurs tours strategiques"
        : formatDefeatCause(defeatCause ?? "globalHealthCollapsed"),
    score,
    rank: getBodyMapRank(score),
    completedAt: new Date().toISOString(),
    difficulty: state.difficulty,
    strategicTurn: state.strategicTurn,
    globalHealth: Math.round(state.globalHealth),
    globalInfection: Math.round(state.globalInfection),
    systemicInflammation: Math.round(state.systemicInflammation),
    stabilizedRegions: regions.filter(
      (region) => region.status === "healthy" || region.status === "controlled",
    ).length,
    criticalRegions: regions.filter((region) => isCriticalRegion(region)).length,
    lostRegions: regions.filter((region) => region.status === "lost").length,
    battleStats: { ...state.battleStats },
  };
}

function formatDefeatCause(cause: BodyMapDefeatCause): string {
  const labels: Record<BodyMapDefeatCause, string> = {
    globalHealthCollapsed: "Sante globale effondree",
    globalInfectionOverrun: "Propagation systemique incontrolee",
    systemicInflammationRunaway: "Inflammation systemique excessive",
    tooManyCriticalRegions: "Trop de regions critiques",
    bloodCrisis: "Infection du sang non controlee",
  };

  return labels[cause];
}

function addBattleStats(state: BodyMapState, outcome: BodyBattleOutcome): void {
  if (outcome.status === "victory") {
    state.battleStats.won += 1;
  } else {
    state.battleStats.lost += 1;
  }

  if (getBattleQuality(outcome) === "clean") {
    state.battleStats.cleanVictories += 1;
  }

  const treatmentUses = Object.values(outcome.treatmentsUsed ?? {}).reduce<number>(
    (sum, count) => sum + (count ?? 0),
    0,
  );

  state.battleStats.treatmentsUsed += treatmentUses;
  state.battleStats.civilianCellsSaved += outcome.civilianCellsSaved ?? 0;
  state.battleStats.civilianCellsLost += outcome.civilianCellsLost ?? 0;
  state.battleStats.advancedThreatsEncountered += (
    outcome.pathogenTypesEncountered ?? []
  ).filter((pathogenTypeId) =>
    (pathogenDefinitions[pathogenTypeId]?.tags ?? []).includes("advanced"),
  ).length;
}

function createEmptyBattleStats(): BodyMapBattleStats {
  return {
    won: 0,
    lost: 0,
    cleanVictories: 0,
    treatmentsUsed: 0,
    civilianCellsSaved: 0,
    civilianCellsLost: 0,
    advancedThreatsEncountered: 0,
  };
}

function sanitizeBattleStats(
  stats: Partial<BodyMapBattleStats> | undefined,
): BodyMapBattleStats {
  const defaults = createEmptyBattleStats();

  return {
    won: Math.max(0, stats?.won ?? defaults.won),
    lost: Math.max(0, stats?.lost ?? defaults.lost),
    cleanVictories: Math.max(0, stats?.cleanVictories ?? defaults.cleanVictories),
    treatmentsUsed: Math.max(0, stats?.treatmentsUsed ?? defaults.treatmentsUsed),
    civilianCellsSaved: Math.max(
      0,
      stats?.civilianCellsSaved ?? defaults.civilianCellsSaved,
    ),
    civilianCellsLost: Math.max(
      0,
      stats?.civilianCellsLost ?? defaults.civilianCellsLost,
    ),
    advancedThreatsEncountered: Math.max(
      0,
      stats?.advancedThreatsEncountered ?? defaults.advancedThreatsEncountered,
    ),
  };
}

function sanitizeFinalSummary(
  summary: BodyMapFinalSummary | undefined,
): BodyMapFinalSummary | undefined {
  if (!summary || (summary.status !== "victory" && summary.status !== "defeat")) {
    return undefined;
  }

  return {
    ...summary,
    score: Math.max(0, summary.score),
    battleStats: sanitizeBattleStats(summary.battleStats),
  };
}

function sanitizeRegionStatus(
  status: BodyRegionStatus | undefined,
  fallback: BodyRegionStatus,
): BodyRegionStatus {
  const validStatuses: BodyRegionStatus[] = [
    "healthy",
    "alert",
    "infected",
    "critical",
    "highInflammation",
    "inBattle",
    "controlled",
    "weakened",
    "lost",
  ];

  return status && validStatuses.includes(status) ? status : fallback;
}

function isCriticalRegion(region: BodyRegionState): boolean {
  return (
    region.status === "critical" ||
    region.status === "lost" ||
    region.localHealth <= 22 ||
    region.infection >= 82
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
