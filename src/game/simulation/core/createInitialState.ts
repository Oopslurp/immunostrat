import { balanceValues } from "../../data/balance";
import { missionDefinitions, type MissionId } from "../../data/missions";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import type { Vector2 } from "../../types/shared";
import type { ImmuneUnitEntity } from "../entities";
import type { GameState } from "./GameState";

export function createInitialState(
  missionId: MissionId = "woundBacteriaV1",
): GameState {
  const mission = missionDefinitions[missionId];
  const entities: GameState["entities"] = {};
  let nextEntityNumber = 1;

  for (let index = 0; index < balanceValues.startingUnits.macrophages; index += 1) {
    const id = `macrophage-${nextEntityNumber}`;
    nextEntityNumber += 1;
    entities[id] = createImmuneUnit(
      id,
      "macrophage",
      offsetPosition(mission.map.macrophageSpawn, index, 34),
      1100 + index * 120,
    );
  }

  for (let index = 0; index < balanceValues.startingUnits.neutrophils; index += 1) {
    const id = `neutrophil-${nextEntityNumber}`;
    nextEntityNumber += 1;
    entities[id] = createImmuneUnit(
      id,
      "neutrophil",
      offsetPosition(unitDefinitions.neutrophil.spawnPosition, index, 32),
      1200,
    );
  }

  for (let index = 0; index < balanceValues.startingUnits.dendriticCells; index += 1) {
    const id = `dendriticCell-${nextEntityNumber}`;
    nextEntityNumber += 1;
    entities[id] = createImmuneUnit(
      id,
      "dendriticCell",
      offsetPosition(unitDefinitions.dendriticCell.spawnPosition, index, 32),
      1300,
    );
  }

  return {
    missionId,
    elapsedMs: 0,
    status: "running",
    tissue: {
      health: balanceValues.startingTissueHealth,
      maxHealth: balanceValues.startingTissueHealth,
    },
    tissueCells: mission.map.tissueCells.map((position, index) => ({
      id: `tissue-cell-${index + 1}`,
      position: { ...position },
      health: balanceValues.tissueCells.maxHealth,
      maxHealth: balanceValues.tissueCells.maxHealth,
      radius: balanceValues.tissueCells.radius,
      status: "healthy",
      infectedElapsedMs: 0,
      nextVirusBurstMs: balanceValues.tissueCells.infectedInitialDelayMs,
      antiviralProtectedMs: 0,
    })),
    resources: {
      atp: balanceValues.startingAtp,
      cytokines: balanceValues.startingCytokines,
      antigens: balanceValues.startingAntigens,
    },
    inflammation: {
      value: balanceValues.inflammation.startingValue,
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
