import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import { distance, type EntityId, type Vector2 } from "../../types/shared";
import { isDendriticCell, isHostilePathogen, isImmuneUnit } from "../entities";
import { createInitialState } from "./createInitialState";
import type { GameState } from "./GameState";
import { cloneState } from "./cloneState";

export type GameCommand =
  | { type: "produceMacrophage" }
  | { type: "produceNeutrophil" }
  | { type: "produceDendriticCell" }
  | { type: "producePlasmocyte" }
  | { type: "produceNkCell" }
  | { type: "produceCytotoxicT" }
  | { type: "researchBacterialAnalysis" }
  | { type: "researchViralAnalysis" }
  | { type: "useMassiveNeutralization" }
  | { type: "useAntiviralSignal" }
  | { type: "selectEntity"; entityId: EntityId | null }
  | { type: "selectEntities"; entityIds: EntityId[] }
  | { type: "orderMove"; position: Vector2 }
  | { type: "orderAttack"; targetEntityId: EntityId }
  | { type: "orderAttackTissueCell"; tissueCellId: string }
  | { type: "orderCollectDebris"; debrisId: string }
  | { type: "orderReturnToLymphNode" }
  | { type: "restart" };

export function applyCommand(state: GameState, command: GameCommand): GameState {
  if (command.type === "restart") {
    return createInitialState(state.missionId);
  }

  if (state.status !== "running") {
    return state;
  }

  if (command.type === "produceMacrophage") {
    return produceImmuneUnit(state, "macrophage");
  }

  if (command.type === "produceNeutrophil") {
    return produceImmuneUnit(state, "neutrophil");
  }

  if (command.type === "produceDendriticCell") {
    return produceImmuneUnit(state, "dendriticCell");
  }

  if (command.type === "producePlasmocyte") {
    return producePlasmocyte(state);
  }

  if (command.type === "produceNkCell") {
    return produceImmuneUnit(state, "nkCell");
  }

  if (command.type === "produceCytotoxicT") {
    return produceCytotoxicT(state);
  }

  if (command.type === "researchBacterialAnalysis") {
    return researchBacterialAnalysis(state);
  }

  if (command.type === "researchViralAnalysis") {
    return researchViralAnalysis(state);
  }

  if (command.type === "useMassiveNeutralization") {
    return useMassiveNeutralization(state);
  }

  if (command.type === "useAntiviralSignal") {
    return useAntiviralSignal(state);
  }

  if (command.type === "selectEntity") {
    const next = cloneState(state);
    const entity = command.entityId ? next.entities[command.entityId] : null;
    next.selectedEntityIds =
      entity && isImmuneUnit(entity) && command.entityId ? [command.entityId] : [];

    return next;
  }

  if (command.type === "selectEntities") {
    const next = cloneState(state);
    next.selectedEntityIds = command.entityIds.filter(
      (entityId) => {
        const entity = next.entities[entityId];

        return entity ? isImmuneUnit(entity) : false;
      },
    );

    return next;
  }

  if (command.type === "orderMove") {
    const next = cloneState(state);
    const selectedIds = next.selectedEntityIds.filter((entityId) => {
      const selected = next.entities[entityId];

      return selected ? isImmuneUnit(selected) : false;
    });

    selectedIds.forEach((entityId, index) => {
      const selected = next.entities[entityId];

      if (selected && isImmuneUnit(selected)) {
        selected.targetPosition = getFormationPosition(
          command.position,
          index,
          selectedIds.length,
        );
        selected.idleTargetPosition = null;
      }
    });

    return next;
  }

  if (command.type === "orderAttack") {
    const next = cloneState(state);
    const target = next.entities[command.targetEntityId];

    if (!target || !isHostilePathogen(target)) {
      return next;
    }

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (selected && isImmuneUnit(selected) && selected.attackDamage > 0) {
        selected.targetPosition = { ...target.position };
        selected.idleTargetPosition = null;
      }
    }

    return next;
  }

  if (command.type === "orderCollectDebris") {
    const next = cloneState(state);
    const debris = next.debris.find((candidate) => candidate.id === command.debrisId);
    const dendritic = next.selectedEntityIds
      .map((entityId) => next.entities[entityId])
      .find((entity) => entity && isDendriticCell(entity));

    if (debris && dendritic && isDendriticCell(dendritic)) {
      dendritic.targetPosition = { ...debris.position };
      dendritic.idleTargetPosition = null;
    }

    return next;
  }

  if (command.type === "orderAttackTissueCell") {
    const next = cloneState(state);
    const cell = next.tissueCells.find(
      (candidate) => candidate.id === command.tissueCellId,
    );

    if (!cell || cell.status !== "infected") {
      return next;
    }

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (
        selected &&
        isImmuneUnit(selected) &&
        (selected.kind === "nkCell" || selected.kind === "cytotoxicT")
      ) {
        selected.targetPosition = { ...cell.position };
        selected.idleTargetPosition = null;
      }
    }

    return next;
  }

  if (command.type === "orderReturnToLymphNode") {
    const next = cloneState(state);
    const mission = missionDefinitions[next.missionId];

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (
        selected &&
        isDendriticCell(selected) &&
        selected.carriedDebrisCount > 0
      ) {
        selected.targetPosition = {
          x: mission.map.lymphNode.x,
          y: mission.map.lymphNode.y,
        };
        selected.idleTargetPosition = null;
      }
    }

    return next;
  }

  return state;
}

function getFormationPosition(
  center: Vector2,
  index: number,
  total: number,
): Vector2 {
  if (total <= 1) {
    return { ...center };
  }

  const spacing = balanceValues.groupFormationSpacing;
  const columns = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rows = Math.ceil(total / columns);

  return {
    x: center.x + (column - (columns - 1) / 2) * spacing,
    y: center.y + (row - (rows - 1) / 2) * spacing,
  };
}

function produceImmuneUnit(state: GameState, unitTypeId: UnitTypeId): GameState {
  const definition = unitDefinitions[unitTypeId];

  if (
    state.resources.atp < definition.atpCost ||
    state.resources.cytokines < definition.cytokineCost
  ) {
    return state;
  }

  if (
    unitTypeId === "neutrophil" &&
    state.productionCooldowns.neutrophilMs > 0
  ) {
    return state;
  }

  if (unitTypeId === "plasmocyte") {
    return producePlasmocyte(state);
  }

  const mission = missionDefinitions[state.missionId];
  const next = cloneState(state);
  const id = `${unitTypeId}-${next.nextEntityNumber}`;

  next.nextEntityNumber += 1;
  next.resources.atp = Math.max(0, next.resources.atp - definition.atpCost);
  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - definition.cytokineCost,
  );
  next.entities[id] = {
    id,
    kind: unitTypeId,
    unitTypeId,
    position: {
      ...(unitTypeId === "neutrophil" ||
      unitTypeId === "nkCell" ||
      unitTypeId === "cytotoxicT"
        ? definition.spawnPosition
        : mission.map.macrophageSpawn),
    },
    targetPosition: null,
    idleTargetPosition: null,
    nextIdleRetargetMs: state.elapsedMs + 1200,
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
      "lifetimeMs" in definition ? definition.lifetimeMs : undefined,
    carriedAntigenValue: 0,
    carriedDebrisCount: 0,
  };

  if (unitTypeId === "neutrophil") {
    next.productionCooldowns.neutrophilMs =
      balanceValues.neutrophilProductionCooldownMs;
    next.inflammation.value = Math.min(
      balanceValues.inflammation.maxValue,
      next.inflammation.value + balanceValues.inflammation.neutrophilSpawnIncrease,
    );
  }

  next.selectedEntityIds = [id];

  return next;
}

function produceCytotoxicT(state: GameState): GameState {
  const definition = unitDefinitions.cytotoxicT;
  const adaptive = balanceValues.adaptive;

  if (
    !state.adaptiveResearch.viralAnalysisComplete ||
    state.resources.atp < definition.atpCost ||
    state.resources.cytokines < definition.cytokineCost ||
    state.resources.antigens < adaptive.cytotoxicTAntigenCost
  ) {
    return state;
  }

  const next = produceImmuneUnit(state, "cytotoxicT");

  if (next === state) {
    return state;
  }

  next.resources.antigens = Math.max(
    0,
    next.resources.antigens - adaptive.cytotoxicTAntigenCost,
  );

  return next;
}

function producePlasmocyte(state: GameState): GameState {
  const definition = unitDefinitions.plasmocyte;
  const adaptive = balanceValues.adaptive;

  if (
    !state.adaptiveResearch.bacterialAnalysisComplete ||
    state.resources.atp < definition.atpCost ||
    state.resources.cytokines < definition.cytokineCost ||
    state.resources.antigens < adaptive.plasmocyteAntigenCost
  ) {
    return state;
  }

  const next = cloneState(state);
  const id = `plasmocyte-${next.nextEntityNumber}`;

  next.nextEntityNumber += 1;
  next.resources.atp = Math.max(0, next.resources.atp - definition.atpCost);
  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - definition.cytokineCost,
  );
  next.resources.antigens = Math.max(
    0,
    next.resources.antigens - adaptive.plasmocyteAntigenCost,
  );
  next.entities[id] = {
    id,
    kind: "plasmocyte",
    unitTypeId: "plasmocyte",
    position: { ...definition.spawnPosition },
    targetPosition: null,
    idleTargetPosition: null,
    nextIdleRetargetMs: state.elapsedMs + balanceValues.idleRetargetBaseMs,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed,
    idleMovementSpeed: definition.idleMovementSpeed,
    attackRange: definition.attackRange,
    attackDamage: definition.attackDamage,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
    lifeRemainingMs: undefined,
    carriedAntigenValue: 0,
    carriedDebrisCount: 0,
  };
  next.selectedEntityIds = [id];

  return next;
}

function researchBacterialAnalysis(state: GameState): GameState {
  const cost = balanceValues.adaptive.bacterialAnalysisAntigenCost;

  if (
    state.adaptiveResearch.bacterialAnalysisComplete ||
    state.resources.antigens < cost
  ) {
    return state;
  }

  const next = cloneState(state);
  next.resources.antigens = Math.max(0, next.resources.antigens - cost);
  next.adaptiveResearch.bacterialAnalysisComplete = true;

  return next;
}

function researchViralAnalysis(state: GameState): GameState {
  const cost = balanceValues.adaptive.viralAnalysisAntigenCost;

  if (
    state.adaptiveResearch.viralAnalysisComplete ||
    state.resources.antigens < cost
  ) {
    return state;
  }

  const next = cloneState(state);
  next.resources.antigens = Math.max(0, next.resources.antigens - cost);
  next.adaptiveResearch.viralAnalysisComplete = true;

  return next;
}

function useMassiveNeutralization(state: GameState): GameState {
  const adaptive = balanceValues.adaptive;

  if (
    !state.adaptiveResearch.bacterialAnalysisComplete ||
    state.productionCooldowns.massiveNeutralizationMs > 0 ||
    state.resources.antigens < adaptive.massiveNeutralizationAntigenCost ||
    state.resources.atp < adaptive.massiveNeutralizationAtpCost ||
    state.resources.cytokines < adaptive.massiveNeutralizationCytokineCost
  ) {
    return state;
  }

  const next = cloneState(state);
  next.resources.antigens = Math.max(
    0,
    next.resources.antigens - adaptive.massiveNeutralizationAntigenCost,
  );
  next.resources.atp = Math.max(
    0,
    next.resources.atp - adaptive.massiveNeutralizationAtpCost,
  );
  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - adaptive.massiveNeutralizationCytokineCost,
  );
  next.productionCooldowns.massiveNeutralizationMs =
    adaptive.massiveNeutralizationCooldownMs;

  for (const entity of Object.values(next.entities)) {
    if (entity.kind === "bacterium") {
      entity.health -= adaptive.massiveNeutralizationDamage;
      next.effects.push({
        id: `effect-${next.nextEffectNumber}`,
        kind: "adaptive",
        position: { ...entity.position },
        radius: entity.radius + 34,
        ttlMs: balanceValues.attackEffectTtlMs * 2,
      });
      next.nextEffectNumber += 1;
    }
  }

  return next;
}

function useAntiviralSignal(state: GameState): GameState {
  const antiviral = balanceValues.antiviral;
  const mission = missionDefinitions[state.missionId];

  if (
    state.productionCooldowns.antiviralSignalMs > 0 ||
    state.resources.cytokines < antiviral.cytokineCost
  ) {
    return state;
  }

  const next = cloneState(state);

  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - antiviral.cytokineCost,
  );
  next.antiviral.activeMs = antiviral.durationMs;
  next.antiviral.position = { ...mission.map.tissueCore };
  next.antiviral.radius = antiviral.radius;
  next.productionCooldowns.antiviralSignalMs = antiviral.cooldownMs;
  next.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    next.inflammation.value + antiviral.inflammationIncrease,
  );

  for (const cell of next.tissueCells) {
    if (
      (cell.status === "healthy" || cell.status === "infected") &&
      distance(cell.position, mission.map.tissueCore) <= antiviral.radius
    ) {
      cell.antiviralProtectedMs = balanceValues.tissueCells.antiviralProtectionMs;
      next.effects.push({
        id: `effect-${next.nextEffectNumber}`,
        kind: "antiviral",
        position: { ...cell.position },
        radius: cell.radius + 12,
        ttlMs: balanceValues.attackEffectTtlMs * 3,
      });
      next.nextEffectNumber += 1;
    }
  }

  return next;
}
