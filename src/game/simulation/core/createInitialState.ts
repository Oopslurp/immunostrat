import { balanceValues } from "../../data/balance";
import { infiniteDifficultySettings } from "../../data/infiniteMode";
import {
  missionDefinitions,
  type MissionId,
  type MissionPreparation,
} from "../../data/missions";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import type { Vector2 } from "../../types/shared";
import type { ImmuneUnitEntity } from "../entities";
import type { GameState } from "./GameState";

export function createInitialState(
  missionId: MissionId = "woundBacteriaV1",
  preparation: MissionPreparation = {},
): GameState {
  const mission = missionDefinitions[missionId];
  const vaccination = mission.vaccinationOptions?.find(
    (option) => option.id === preparation.vaccinationId,
  );
  const memoryBonusProfiles = new Set(preparation.memoryProfiles ?? []);
  const memoryAntigenBonus = (mission.memoryHintProfiles ?? []).reduce(
    (bonus, profile) => bonus + (memoryBonusProfiles.has(profile) ? 6 : 0),
    0,
  );
  const regionalNodeAntigenBonus =
    preparation.regionalNodeBonus?.active === true
      ? preparation.regionalNodeBonus.antigenBonus
      : 0;
  const regionalNodeCytokineBonus =
    preparation.regionalNodeBonus?.active === true
      ? preparation.regionalNodeBonus.cytokineBonus
      : 0;
  const infiniteResourceMultiplier =
    mission.mode === "infinite"
      ? infiniteDifficultySettings[preparation.infiniteDifficulty ?? "normal"]
          .resourceMultiplier
      : 1;
  const startingUnits = [
    ...mission.startingUnits,
    ...(preparation.globalReinforcements ?? []),
  ];
  const entities: GameState["entities"] = {};
  let nextEntityNumber = 1;

  for (const startingUnit of startingUnits) {
    for (let index = 0; index < startingUnit.count; index += 1) {
      const unitTypeId = startingUnit.unitTypeId;
      const id = `${unitTypeId}-${nextEntityNumber}`;
      nextEntityNumber += 1;
      entities[id] = createImmuneUnit(
        id,
        unitTypeId,
        getSpawnPosition(mission.map.macrophageSpawn, unitTypeId, index),
        1100 + nextEntityNumber * 90,
      );
    }
  }

  return {
    missionId,
    preparation,
    elapsedMs: 0,
    status: "running",
    tissue: {
      health: balanceValues.startingTissueHealth,
      maxHealth: balanceValues.startingTissueHealth,
    },
    tissueCells: mission.map.tissueCells.map((position, index) => {
      const infected = index < (mission.initialInfectedTissueCells ?? 0);

      return {
        id: `tissue-cell-${index + 1}`,
        position: { ...position },
        health: balanceValues.tissueCells.maxHealth,
        maxHealth: balanceValues.tissueCells.maxHealth,
        radius: balanceValues.tissueCells.radius,
        status: infected ? "infected" : "healthy",
        infectedElapsedMs: infected ? balanceValues.tissueCells.infectedInitialDelayMs : 0,
        nextVirusBurstMs: balanceValues.tissueCells.infectedInitialDelayMs,
        antiviralProtectedMs: 0,
      };
    }),
    resources: {
      atp: Math.max(
        0,
        mission.startingResources.atp * infiniteResourceMultiplier -
          (vaccination?.atpCost ?? 0),
      ),
      cytokines: Math.min(
        balanceValues.maxCytokines,
        mission.startingResources.cytokines * infiniteResourceMultiplier +
          (vaccination?.cytokineBonus ?? 0) +
          regionalNodeCytokineBonus,
      ),
      antigens: Math.min(
        balanceValues.maxAntigens,
        mission.startingResources.antigens * infiniteResourceMultiplier +
          (vaccination?.antigenBonus ?? 0) +
          memoryAntigenBonus +
          regionalNodeAntigenBonus,
      ),
    },
    missionStats: {
      producedUnits: {},
      usedAbilities: {},
      peakInflammation: balanceValues.inflammation.startingValue,
      antigensCollected: 0,
      lymphSignalsDelivered: 0,
    },
    inflammation: {
      value: balanceValues.inflammation.startingValue,
    },
    treatments: {
      cooldowns: {},
      activeMs: {},
    },
    inflammatoryZones: [],
    biofilmZones: [],
    productionCooldowns: {
      neutrophilMs: 0,
      massiveNeutralizationMs: 0,
      antiviralSignalMs: 0,
    },
    adaptiveResearch: {
      bacterialAnalysisComplete: false,
      viralAnalysisComplete: false,
    },
    antiviral: {
      activeMs: 0,
      position: null,
      radius: balanceValues.antiviral.radius,
    },
    debris: [],
    waves: {
      currentWaveIndex: 0,
      spawnedInCurrentWave: 0,
    },
    entities,
    selectedEntityIds: [],
    nextEntityNumber,
    nextEffectNumber: 1,
    nextDebrisNumber: 1,
    effects: [],
  };
}

function createImmuneUnit(
  id: string,
  unitTypeId: UnitTypeId,
  position: Vector2,
  nextIdleRetargetMs: number,
): ImmuneUnitEntity {
  const definition = unitDefinitions[unitTypeId];

  return {
    id,
    kind: unitTypeId,
    unitTypeId,
    position,
    targetPosition: null,
    idleTargetPosition: null,
    nextIdleRetargetMs,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed,
    idleMovementSpeed: definition.idleMovementSpeed,
    attackRange: definition.attackRange,
    attackDamage: definition.attackDamage,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
    lifeRemainingMs:
      unitTypeId === "neutrophil" ? balanceValues.neutrophilLifetimeMs : undefined,
    carriedAntigenValue: 0,
    carriedDebrisCount: 0,
  };
}

function offsetPosition(origin: Vector2, index: number, spacing: number): Vector2 {
  return {
    x: origin.x + (index % 2) * spacing,
    y: origin.y + Math.floor(index / 2) * spacing,
  };
}

function getSpawnPosition(
  macrophageSpawn: Vector2,
  unitTypeId: UnitTypeId,
  index: number,
): Vector2 {
  if (unitTypeId === "macrophage") {
    return offsetPosition(macrophageSpawn, index, 34);
  }

  return offsetPosition(unitDefinitions[unitTypeId].spawnPosition, index, 32);
}
