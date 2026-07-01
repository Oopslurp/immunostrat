import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { treatmentDefinitions, type TreatmentId } from "../../data/treatments";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import { distance, type EntityId, type Vector2 } from "../../types/shared";
import {
  isAdvancedThreat,
  isBacterium,
  isDendriticCell,
  isHostilePathogen,
  isImmuneUnit,
} from "../entities";
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
  | { type: "orderAttack"; targetEntityId: EntityId }
  | { type: "orderAttackTissueCell"; tissueCellId: string }
  | { type: "orderCollectDebris"; debrisId: string }
  | { type: "orderReturnToLymphNode" }
  | { type: "restart" };

export function applyCommand(state: GameState, command: GameCommand): GameState {
  if (command.type === "restart") {
    return createInitialState(state.missionId, state.preparation);
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

  if (command.type === "useTreatment") {
    return useTreatment(state, command.treatmentId);
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
    const lymphTarget = mission.map.lymphExit ?? mission.map.lymphNode;

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
  next.antiviral.position = { ...mission.map.tissueCore };
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
    addTreatmentEffect(next, mission.map.tissueCore, treatment.radius);
  }

  if (treatmentId === "antiInflammatory") {
    next.treatments.activeMs.antiInflammatory = treatment.durationMs;
    next.inflammation.value = Math.max(0, next.inflammation.value - 28);
    next.inflammatoryZones = next.inflammatoryZones.map((zone) => ({
      ...zone,
      intensity: zone.intensity * 0.48,
      ttlMs: zone.ttlMs * 0.62,
    }));
    addTreatmentEffect(next, mission.map.tissueCore, 220);
  }

  return next;
}

function applyAntibiotic(state: GameState): void {
  const mission = missionDefinitions[state.missionId];
  const treatment = treatmentDefinitions.antibiotic;

  for (const entity of Object.values(state.entities)) {
    const isAntibioticTarget =
      isBacterium(entity) ||
      (isAdvancedThreat(entity) && entity.category === "opportunist");

    if (!isAntibioticTarget) {
      continue;
    }

    if (distance(entity.position, mission.map.tissueCore) > treatment.radius) {
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
