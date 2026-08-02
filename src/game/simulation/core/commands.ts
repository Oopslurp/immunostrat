import { balanceValues } from "../../data/balance";
import { missionDefinitions, type MissionMapDefinition } from "../../data/missions";
import {
  getEntryPointForUnitFromTacticalMap,
  getLymphExitForMissionMap,
  type TacticalMapDefinition,
} from "../../data/tacticalMaps";
import { treatmentDefinitions, type TreatmentId } from "../../data/treatments";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import { distance, type EntityId, type Vector2 } from "../../types/shared";
import {
  isAdvancedThreat,
  isBacterium,
  isControllableImmuneUnit,
  isDendriticCell,
  isHostilePathogen,
  isNeutrophil,
} from "../entities";
import { spawnBacterium } from "../pathogens/createBacterium";
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
  | { type: "useTreatment"; treatmentId: TreatmentId }
  | { type: "selectEntity"; entityId: EntityId | null }
  | { type: "selectEntities"; entityIds: EntityId[] }
  | { type: "orderMove"; position: Vector2 }
  | { type: "orderGuardArea"; position: Vector2; radius: number }
  | { type: "orderAttack"; targetEntityId: EntityId }
  | { type: "orderAttackTissueCell"; tissueCellId: string }
  | { type: "orderCollectDebris"; debrisId: string }
  | { type: "orderReturnToLymphNode" }
  | { type: "orderHoldPosition" }
  | { type: "orderRetreat" }
  | { type: "debugSpawnNeutrophil" }
  | { type: "debugExpireNeutrophil" }
  | { type: "debugKillNeutrophil" }
  | { type: "debugToggleNearbyPathogen" }
  | { type: "debugToggleNearbyCivilian" }
  | { type: "restart" };

export function applyCommand(state: GameState, command: GameCommand): GameState {
  if (command.type === "restart") {
    return createInitialState(state.missionId, state.preparation);
  }

  if (state.status !== "running") {
    return state;
  }

  if (import.meta.env.DEV && isNeutrophilDebugCommand(command)) {
    return applyNeutrophilDebugCommand(state, command);
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

  if (command.type === "useTreatment") {
    return useTreatment(state, command.treatmentId);
  }

  if (command.type === "selectEntity") {
    const next = cloneState(state);
    const entity = command.entityId ? next.entities[command.entityId] : null;
    next.selectedEntityIds =
      entity && isControllableImmuneUnit(entity) && command.entityId
        ? [command.entityId]
        : [];

    return next;
  }

  if (command.type === "selectEntities") {
    const next = cloneState(state);
    next.selectedEntityIds = command.entityIds.filter(
      (entityId) => {
        const entity = next.entities[entityId];

        return entity ? isControllableImmuneUnit(entity) : false;
      },
    );

    return next;
  }

  if (command.type === "orderMove") {
    const next = cloneState(state);
    const selectedIds = next.selectedEntityIds.filter((entityId) => {
      const selected = next.entities[entityId];

      return selected ? isControllableImmuneUnit(selected) : false;
    });

    selectedIds.forEach((entityId, index) => {
      const selected = next.entities[entityId];

      if (selected && isControllableImmuneUnit(selected)) {
        selected.targetPosition = getFormationPosition(
          command.position,
          index,
          selectedIds.length,
        );
        selected.orderAnchor = { ...selected.targetPosition };
        selected.guardRadius = unitDefinitions[selected.unitTypeId].guardRadius;
        selected.leashRadius = unitDefinitions[selected.unitTypeId].leashRadius;
        selected.idleTargetPosition = null;
        selected.explicitTargetEntityId = null;
        selected.tacticalState = "movingToPoint";
        selected.lastOrderFeedback = "Unite envoyee en garde locale";
      }
    });

    return next;
  }

  if (command.type === "orderGuardArea") {
    const next = cloneState(state);
    const selectedIds = next.selectedEntityIds.filter((entityId) => {
      const selected = next.entities[entityId];

      return selected ? isControllableImmuneUnit(selected) : false;
    });

    selectedIds.forEach((entityId, index) => {
      const selected = next.entities[entityId];

      if (!selected || !isControllableImmuneUnit(selected)) {
        return;
      }

      const definition = unitDefinitions[selected.unitTypeId];
      const formationPosition = getFormationPosition(
        command.position,
        index,
        selectedIds.length,
      );
      const maximumFormationOffset = Math.max(
        0,
        command.radius * balanceValues.combatSiteOrders.formationRadiusRatio -
          selected.radius,
      );

      selected.targetPosition = clampPositionAroundAnchor(
        formationPosition,
        command.position,
        maximumFormationOffset,
      );
      selected.orderAnchor = { ...command.position };
      selected.guardRadius = Math.min(
        definition.guardRadius,
        command.radius * balanceValues.combatSiteOrders.patrolRadiusRatio,
      );
      selected.leashRadius = Math.max(
        selected.attackRange + selected.radius,
        command.radius * balanceValues.combatSiteOrders.leashRadiusRatio,
      );
      selected.idleTargetPosition = null;
      selected.explicitTargetEntityId = null;
      selected.tacticalState = "movingToSite";
      selected.lastOrderFeedback = "Patrouille assignee au foyer";
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

      if (
        selected &&
        isControllableImmuneUnit(selected) &&
        selected.attackDamage > 0
      ) {
        selected.orderAnchor = selected.orderAnchor ?? { ...selected.position };
        selected.targetPosition = { ...target.position };
        selected.idleTargetPosition = null;
        selected.explicitTargetEntityId = target.id;
        selected.tacticalState = "engagingNearbyTarget";
        selected.lastOrderFeedback = "Engagement local";
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
      dendritic.orderAnchor = { ...debris.position };
      dendritic.idleTargetPosition = null;
      dendritic.explicitTargetEntityId = null;
      dendritic.tacticalState = "collectingAntigen";
      dendritic.lastOrderFeedback = "Dendritique envoyee collecter";
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
        isControllableImmuneUnit(selected) &&
        (selected.kind === "nkCell" || selected.kind === "cytotoxicT")
      ) {
        selected.targetPosition = { ...cell.position };
        selected.orderAnchor = selected.orderAnchor ?? { ...selected.position };
        selected.idleTargetPosition = null;
        selected.explicitTargetEntityId = null;
        selected.tacticalState = "engagingNearbyTarget";
        selected.lastOrderFeedback = "Cible infectee indiquee";
      }
    }

    return next;
  }

  if (command.type === "orderReturnToLymphNode") {
    const next = cloneState(state);
    const mission = missionDefinitions[next.missionId];
    const lymphTarget =
      getLymphExitForMissionMap(next.tacticalMap) ??
      mission.map.lymphExit ??
      mission.map.lymphNode;

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (
        selected &&
        isDendriticCell(selected) &&
        selected.carriedDebrisCount > 0
      ) {
        selected.targetPosition = {
          x: lymphTarget.x,
          y: lymphTarget.y,
        };
        selected.orderAnchor = { ...selected.targetPosition };
        selected.idleTargetPosition = null;
        selected.explicitTargetEntityId = null;
        selected.tacticalState = "deliveringToLymph";
        selected.lastOrderFeedback = "Dendritique livre un signal lymphatique";
      }
    }

    return next;
  }

  if (command.type === "orderHoldPosition") {
    const next = cloneState(state);

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (selected && isControllableImmuneUnit(selected)) {
        selected.targetPosition = null;
        selected.idleTargetPosition = null;
        selected.explicitTargetEntityId = null;
        selected.orderAnchor = { ...selected.position };
        selected.tacticalState = "holdingPosition";
        selected.lastOrderFeedback = "Position tenue";
      }
    }

    return next;
  }

  if (command.type === "orderRetreat") {
    const next = cloneState(state);

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (selected && isControllableImmuneUnit(selected)) {
        const target = getEntryPointForUnit(
          next.tacticalMap,
          missionDefinitions[next.missionId].map,
          selected.unitTypeId,
        );

        selected.targetPosition = { ...target };
        selected.orderAnchor = { ...target };
        selected.idleTargetPosition = null;
        selected.explicitTargetEntityId = null;
        selected.tacticalState = "retreating";
        selected.lastOrderFeedback = "Unite en repli";
      }
    }

    return next;
  }

  return state;
}

function isNeutrophilDebugCommand(
  command: GameCommand,
): command is Extract<GameCommand, { type: `debug${string}` }> {
  return command.type.startsWith("debug");
}

function applyNeutrophilDebugCommand(
  state: GameState,
  command: Extract<GameCommand, { type: `debug${string}` }>,
): GameState {
  if (command.type === "debugSpawnNeutrophil") {
    const next = cloneState(state);
    const definition = unitDefinitions.neutrophil;
    const id = `neutrophil-${next.nextEntityNumber}`;
    const position = getEntryPointForUnit(
      next.tacticalMap,
      missionDefinitions[next.missionId].map,
      "neutrophil",
      getSelectedCommandAnchor(next),
    );

    next.nextEntityNumber += 1;
    next.entities[id] = {
      id,
      kind: "neutrophil",
      unitTypeId: "neutrophil",
      position: { ...position },
      targetPosition: null,
      idleTargetPosition: null,
      nextIdleRetargetMs: next.elapsedMs + 1200,
      health: definition.maxHealth,
      maxHealth: definition.maxHealth,
      radius: definition.radius,
      movementSpeed: definition.movementSpeed,
      idleMovementSpeed: definition.idleMovementSpeed,
      attackRange: definition.attackRange,
      attackDamage: definition.attackDamage,
      attackCooldownMs: definition.attackCooldownMs,
      attackCooldownRemainingMs: 0,
      tacticalState: "guardingArea",
      orderAnchor: { ...position },
      engagementRadius: definition.engagementRadius,
      leashRadius: definition.leashRadius,
      guardRadius: definition.guardRadius,
      explicitTargetEntityId: null,
      lastOrderFeedback: "Neutrophile debug",
      lifeRemainingMs: definition.lifetimeMs,
      carriedAntigenValue: 0,
      carriedDebrisCount: 0,
    };
    next.selectedEntityIds = [id];
    return next;
  }

  const next = cloneState(state);
  const neutrophil =
    next.selectedEntityIds
      .map((id) => next.entities[id])
      .find((entity) => entity && isNeutrophil(entity) && !entity.deathState) ??
    Object.values(next.entities).find(
      (entity) => isNeutrophil(entity) && !entity.deathState,
    );

  if (!neutrophil || !isNeutrophil(neutrophil)) {
    return next;
  }

  if (command.type === "debugExpireNeutrophil") {
    neutrophil.lifeRemainingMs = 1;
    return next;
  }

  if (command.type === "debugKillNeutrophil") {
    neutrophil.health = 0;
    return next;
  }

  if (command.type === "debugToggleNearbyPathogen") {
    const nearby = Object.values(next.entities)
      .filter(isHostilePathogen)
      .find(
        (pathogen) =>
          distance(pathogen.position, neutrophil.position) <=
          balanceValues.netosis.triggerRadius + pathogen.radius,
      );

    if (nearby) {
      delete next.entities[nearby.id];
    } else {
      spawnBacterium(next, "cocciRapid", {
        x: neutrophil.position.x + balanceValues.netosis.captureRadius + 18,
        y: neutrophil.position.y,
      });
    }
    return next;
  }

  const civilian = next.tissueCells.find((cell) => cell.status !== "destroyed");
  if (civilian) {
    const isNearby =
      distance(civilian.position, neutrophil.position) <=
      balanceValues.netosis.triggerRadius + civilian.radius;
    civilian.position = {
      x:
        neutrophil.position.x +
        (isNearby
          ? balanceValues.netosis.triggerRadius + civilian.radius + 80
          : balanceValues.netosis.captureRadius),
      y: neutrophil.position.y,
    };
  }
  return next;
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

function clampPositionAroundAnchor(
  position: Vector2,
  anchor: Vector2,
  maximumDistance: number,
): Vector2 {
  const dx = position.x - anchor.x;
  const dy = position.y - anchor.y;
  const currentDistance = Math.sqrt(dx * dx + dy * dy);

  if (currentDistance <= maximumDistance || currentDistance === 0) {
    return { ...position };
  }

  return {
    x: anchor.x + (dx / currentDistance) * maximumDistance,
    y: anchor.y + (dy / currentDistance) * maximumDistance,
  };
}

function produceImmuneUnit(state: GameState, unitTypeId: UnitTypeId): GameState {
  const mission = missionDefinitions[state.missionId];
  const definition = unitDefinitions[unitTypeId];

  if (!mission.unlockedUnits.includes(unitTypeId)) {
    return state;
  }

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

  const next = cloneState(state);
  const id = `${unitTypeId}-${next.nextEntityNumber}`;

  next.nextEntityNumber += 1;
  next.resources.atp = Math.max(0, next.resources.atp - definition.atpCost);
  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - definition.cytokineCost,
  );
  const entryPoint = getEntryPointForUnit(
    next.tacticalMap,
    mission.map,
    unitTypeId,
    getSelectedCommandAnchor(next),
  );

  next.entities[id] = {
    id,
    kind: unitTypeId,
    unitTypeId,
    position: { ...entryPoint },
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
    tacticalState: "guardingArea",
    orderAnchor: { ...entryPoint },
    engagementRadius: definition.engagementRadius,
    leashRadius: definition.leashRadius,
    guardRadius: definition.guardRadius,
    explicitTargetEntityId: null,
    lastOrderFeedback: `${definition.displayName} arrive par diapedese`,
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

  next.missionStats.producedUnits[unitTypeId] =
    (next.missionStats.producedUnits[unitTypeId] ?? 0) + 1;
  next.selectedEntityIds = [id];

  return next;
}

function produceCytotoxicT(state: GameState): GameState {
  const definition = unitDefinitions.cytotoxicT;
  const adaptive = balanceValues.adaptive;

  if (
    !missionDefinitions[state.missionId].unlockedUnits.includes("cytotoxicT") ||
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
    !missionDefinitions[state.missionId].unlockedUnits.includes("plasmocyte") ||
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
  const entryPoint = getEntryPointForUnit(
    next.tacticalMap,
    missionDefinitions[state.missionId].map,
    "plasmocyte",
    getSelectedCommandAnchor(next),
  );

  next.entities[id] = {
    id,
    kind: "plasmocyte",
    unitTypeId: "plasmocyte",
    position: { ...entryPoint },
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
    tacticalState: "guardingArea",
    orderAnchor: { ...entryPoint },
    engagementRadius: definition.engagementRadius,
    leashRadius: definition.leashRadius,
    guardRadius: definition.guardRadius,
    explicitTargetEntityId: null,
    lastOrderFeedback: "Plasmocyte arrive par relais immunitaire",
    lifeRemainingMs: undefined,
    carriedAntigenValue: 0,
    carriedDebrisCount: 0,
  };
  next.selectedEntityIds = [id];

  return next;
}

function getEntryPointForUnit(
  tacticalMap: TacticalMapDefinition,
  map: MissionMapDefinition,
  unitTypeId: UnitTypeId,
  preferredPosition?: Vector2 | null,
): Vector2 {
  const entryPoints = map.immuneEntryPoints;

  if (unitTypeId === "dendriticCell") {
    return (
      getEntryPointForUnitFromTacticalMap(tacticalMap, unitTypeId, preferredPosition) ??
      entryPoints.find((entry) => entry.kind === "lymph")?.position ??
      map.lymphExit
    );
  }

  if (unitTypeId === "neutrophil" || unitTypeId === "nkCell" || unitTypeId === "cytotoxicT") {
    return (
      getEntryPointForUnitFromTacticalMap(tacticalMap, unitTypeId, preferredPosition) ??
      entryPoints.find((entry) => entry.kind === "diapedesis")?.position ??
      unitDefinitions[unitTypeId].spawnPosition
    );
  }

  return (
    getEntryPointForUnitFromTacticalMap(tacticalMap, unitTypeId, preferredPosition) ??
    entryPoints.find((entry) => entry.kind === "vessel")?.position ??
    map.macrophageSpawn
  );
}

function getSelectedCommandAnchor(state: GameState): Vector2 | null {
  for (const entityId of state.selectedEntityIds) {
    const entity = state.entities[entityId];

    if (entity && isControllableImmuneUnit(entity)) {
      return entity.orderAnchor ?? entity.targetPosition ?? entity.position;
    }
  }

  return null;
}

function researchBacterialAnalysis(state: GameState): GameState {
  const cost = balanceValues.adaptive.bacterialAnalysisAntigenCost;

  if (
    !missionDefinitions[state.missionId].unlockedResearch.includes("bacterialAnalysis") ||
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
    !missionDefinitions[state.missionId].unlockedResearch.includes("viralAnalysis") ||
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
    !missionDefinitions[state.missionId].unlockedAbilities.includes(
      "massiveNeutralization",
    ) ||
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
  next.missionStats.usedAbilities.massiveNeutralization =
    (next.missionStats.usedAbilities.massiveNeutralization ?? 0) + 1;

  for (const entity of Object.values(next.entities)) {
    if (
      entity.kind === "bacterium" ||
      (isAdvancedThreat(entity) && entity.category !== "cancerCell")
    ) {
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
  const focusPosition = getMissionFocusPosition(state);

  if (
    !mission.unlockedAbilities.includes("interferons") ||
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
  next.antiviral.position = { ...focusPosition };
  next.antiviral.radius = antiviral.radius;
  next.productionCooldowns.antiviralSignalMs = antiviral.cooldownMs;
  next.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    next.inflammation.value + antiviral.inflammationIncrease,
  );
  next.missionStats.usedAbilities.interferons =
    (next.missionStats.usedAbilities.interferons ?? 0) + 1;

  for (const cell of next.tissueCells) {
    if (
      (cell.status === "healthy" || cell.status === "infected") &&
      distance(cell.position, focusPosition) <= antiviral.radius
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

function useTreatment(state: GameState, treatmentId: TreatmentId): GameState {
  const mission = missionDefinitions[state.missionId];
  const treatment = treatmentDefinitions[treatmentId];

  if (
    !mission.unlockedTreatments.includes(treatmentId) ||
    (state.treatments.cooldowns[treatmentId] ?? 0) > 0 ||
    state.resources.atp < treatment.atpCost ||
    state.resources.cytokines < treatment.cytokineCost ||
    state.resources.antigens < treatment.antigenCost
  ) {
    return state;
  }

  const next = cloneState(state);

  next.resources.atp = Math.max(0, next.resources.atp - treatment.atpCost);
  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - treatment.cytokineCost,
  );
  next.resources.antigens = Math.max(
    0,
    next.resources.antigens - treatment.antigenCost,
  );
  next.treatments.cooldowns[treatmentId] = treatment.cooldownMs;
  next.missionStats.usedAbilities[treatmentId] =
    (next.missionStats.usedAbilities[treatmentId] ?? 0) + 1;

  if (treatmentId === "antibiotic") {
    applyAntibiotic(next);
  }

  if (treatmentId === "antiviralDrug") {
    next.treatments.activeMs.antiviralDrug = treatment.durationMs;
    addTreatmentEffect(next, getMissionFocusPosition(next), treatment.radius);
  }

  if (treatmentId === "antiInflammatory") {
    next.treatments.activeMs.antiInflammatory = treatment.durationMs;
    next.inflammation.value = Math.max(0, next.inflammation.value - 28);
    next.inflammatoryZones = next.inflammatoryZones.map((zone) => ({
      ...zone,
      intensity: zone.intensity * 0.48,
      ttlMs: zone.ttlMs * 0.62,
    }));
    addTreatmentEffect(next, getMissionFocusPosition(next), 220);
  }

  return next;
}

function applyAntibiotic(state: GameState): void {
  const treatment = treatmentDefinitions.antibiotic;
  const focusPosition = getMissionFocusPosition(state);

  for (const entity of Object.values(state.entities)) {
    const isAntibioticTarget =
      isBacterium(entity) ||
      (isAdvancedThreat(entity) && entity.category === "opportunist");

    if (!isAntibioticTarget) {
      continue;
    }

    if (distance(entity.position, focusPosition) > treatment.radius) {
      continue;
    }

    const biofilmProtected = state.biofilmZones.some(
      (zone) => distance(zone.position, entity.position) <= zone.radius,
    );
    const damage = isAdvancedThreat(entity)
      ? biofilmProtected
        ? 8
        : 16
      : biofilmProtected
        ? 14
        : 28;

    entity.health -= damage;
    entity.movementSpeed *= biofilmProtected ? 0.86 : 0.72;
    addTreatmentEffect(state, entity.position, entity.radius + 22);
  }
}

function getMissionFocusPosition(state: GameState): Vector2 {
  for (const entityId of state.selectedEntityIds) {
    const entity = state.entities[entityId];

    if (entity && isControllableImmuneUnit(entity)) {
      return {
        ...(entity.orderAnchor ?? entity.targetPosition ?? entity.position),
      };
    }
  }

  return (
    state.tacticalMap.combatSites[0]?.position ??
    missionDefinitions[state.missionId].map.tissueCore
  );
}

function addTreatmentEffect(
  state: GameState,
  position: Vector2,
  radius: number,
): void {
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "treatment",
    position: { ...position },
    radius,
    ttlMs: balanceValues.attackEffectTtlMs * 3,
  });
  state.nextEffectNumber += 1;
}
