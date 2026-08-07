import { pathogenDefinitions, type PathogenTypeId } from "../data/pathogens";
import { unitDefinitions, type UnitTypeId } from "../data/units";
import { spriteLabPathogens, spriteLabUnits } from "./spriteLabRoster";

export type SpriteLabUnitMode = "idle" | "dragging" | "moving" | "attacking";
export type SpriteLabAnimationState = "idle" | "move" | "attack" | "collect";

export type SpriteLabUnitState = Readonly<{
  id: UnitTypeId;
  homePosition: Readonly<{ x: number; y: number }>;
  position: Readonly<{ x: number; y: number }>;
  targetPathogenId: PathogenTypeId | null;
  mode: SpriteLabUnitMode;
  animationState: SpriteLabAnimationState;
  attackCooldownRemainingMs: number;
  attackAnimationRemainingMs: number;
}>;

export type SpriteLabPathogenState = Readonly<{
  id: PathogenTypeId;
  position: Readonly<{ x: number; y: number }>;
  impactCount: number;
}>;

export type SpriteLabSimulationState = Readonly<{
  units: Readonly<Record<UnitTypeId, SpriteLabUnitState>>;
  pathogens: Readonly<Record<PathogenTypeId, SpriteLabPathogenState>>;
}>;

export type SpriteLabEvent = Readonly<{
  kind: "attack" | "collect";
  unitId: UnitTypeId;
  pathogenId: PathogenTypeId;
}>;

export function createSpriteLabSimulation(): SpriteLabSimulationState {
  const units = {} as Record<UnitTypeId, SpriteLabUnitState>;
  const pathogens = {} as Record<PathogenTypeId, SpriteLabPathogenState>;

  for (const entry of spriteLabUnits) {
    units[entry.id] = {
      id: entry.id,
      homePosition: { x: entry.x, y: entry.y },
      position: { x: entry.x, y: entry.y },
      targetPathogenId: null,
      mode: "idle",
      animationState: "idle",
      attackCooldownRemainingMs: 0,
      attackAnimationRemainingMs: 0,
    };
  }

  for (const entry of spriteLabPathogens) {
    pathogens[entry.id] = {
      id: entry.id,
      position: { x: entry.x, y: entry.y },
      impactCount: 0,
    };
  }

  return { units, pathogens };
}

export function beginSpriteLabDrag(
  state: SpriteLabSimulationState,
  unitId: UnitTypeId,
): SpriteLabSimulationState {
  return updateUnit(state, unitId, (unit) => ({
    ...unit,
    targetPathogenId: null,
    mode: "dragging",
    animationState: "move",
    attackAnimationRemainingMs: 0,
  }));
}

export function dragSpriteLabUnit(
  state: SpriteLabSimulationState,
  unitId: UnitTypeId,
  position: Readonly<{ x: number; y: number }>,
): SpriteLabSimulationState {
  return updateUnit(state, unitId, (unit) => ({
    ...unit,
    position: { x: position.x, y: position.y },
    mode: "dragging",
    animationState: "move",
  }));
}

export function assignSpriteLabTarget(
  state: SpriteLabSimulationState,
  unitId: UnitTypeId,
  pathogenId: PathogenTypeId,
): SpriteLabSimulationState {
  return updateUnit(state, unitId, (unit) => ({
    ...unit,
    targetPathogenId: pathogenId,
    mode: "moving",
    animationState: "move",
    attackCooldownRemainingMs: 0,
    attackAnimationRemainingMs: 0,
  }));
}

export function stopSpriteLabUnit(
  state: SpriteLabSimulationState,
  unitId: UnitTypeId,
): SpriteLabSimulationState {
  return updateUnit(state, unitId, (unit) => ({
    ...unit,
    targetPathogenId: null,
    mode: "idle",
    animationState: "idle",
    attackCooldownRemainingMs: 0,
    attackAnimationRemainingMs: 0,
  }));
}

export function resetSpriteLabUnit(
  state: SpriteLabSimulationState,
  unitId: UnitTypeId,
): SpriteLabSimulationState {
  const unit = state.units[unitId];

  return updateUnit(state, unitId, () => ({
    ...unit,
    position: { ...unit.homePosition },
    targetPathogenId: null,
    mode: "idle",
    animationState: "idle",
    attackCooldownRemainingMs: 0,
    attackAnimationRemainingMs: 0,
  }));
}

export function findNearestSpriteLabPathogen(
  state: SpriteLabSimulationState,
  position: Readonly<{ x: number; y: number }>,
): PathogenTypeId {
  let nearest = spriteLabPathogens[0].id;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const pathogen of Object.values(state.pathogens)) {
    const dx = pathogen.position.x - position.x;
    const dy = pathogen.position.y - position.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < nearestDistanceSquared) {
      nearest = pathogen.id;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearest;
}

export function stepSpriteLabSimulation(
  state: SpriteLabSimulationState,
  deltaMs: number,
): Readonly<{ state: SpriteLabSimulationState; events: readonly SpriteLabEvent[] }> {
  const units = { ...state.units };
  const pathogens = { ...state.pathogens };
  const events: SpriteLabEvent[] = [];
  const safeDeltaMs = Math.max(0, deltaMs);

  for (const sourceUnit of Object.values(state.units)) {
    if (sourceUnit.mode === "dragging" || !sourceUnit.targetPathogenId) {
      continue;
    }

    const target = state.pathogens[sourceUnit.targetPathogenId];
    const definition = unitDefinitions[sourceUnit.id];
    const dx = target.position.x - sourceUnit.position.x;
    const dy = target.position.y - sourceUnit.position.y;
    const distance = Math.hypot(dx, dy);
    const interactionRange = Math.max(
      sourceUnit.id === "dendriticCell" ? 34 : definition.attackRange,
      24,
    ) + pathogenDefinitions[target.id].radius;
    const cooldownRemainingMs = Math.max(
      0,
      sourceUnit.attackCooldownRemainingMs - safeDeltaMs,
    );
    const attackAnimationRemainingMs = Math.max(
      0,
      sourceUnit.attackAnimationRemainingMs - safeDeltaMs,
    );

    if (distance > interactionRange) {
      const travelDistance = Math.min(
        distance - interactionRange,
        definition.movementSpeed * (safeDeltaMs / 1000),
      );
      const ratio = distance > 0 ? travelDistance / distance : 0;

      units[sourceUnit.id] = {
        ...sourceUnit,
        position: {
          x: sourceUnit.position.x + dx * ratio,
          y: sourceUnit.position.y + dy * ratio,
        },
        mode: "moving",
        animationState: "move",
        attackCooldownRemainingMs: cooldownRemainingMs,
        attackAnimationRemainingMs: 0,
      };
      continue;
    }

    if (cooldownRemainingMs <= 0) {
      const kind = sourceUnit.id === "dendriticCell" ? "collect" : "attack";

      units[sourceUnit.id] = {
        ...sourceUnit,
        mode: "attacking",
        animationState: kind,
        attackCooldownRemainingMs: definition.attackCooldownMs,
        attackAnimationRemainingMs: Math.min(620, definition.attackCooldownMs),
      };
      pathogens[target.id] = {
        ...target,
        impactCount: target.impactCount + 1,
      };
      events.push({ kind, unitId: sourceUnit.id, pathogenId: target.id });
      continue;
    }

    units[sourceUnit.id] = {
      ...sourceUnit,
      mode: attackAnimationRemainingMs > 0 ? "attacking" : "idle",
      animationState:
        attackAnimationRemainingMs > 0
          ? sourceUnit.id === "dendriticCell"
            ? "collect"
            : "attack"
          : "idle",
      attackCooldownRemainingMs: cooldownRemainingMs,
      attackAnimationRemainingMs,
    };
  }

  return { state: { units, pathogens }, events };
}

function updateUnit(
  state: SpriteLabSimulationState,
  unitId: UnitTypeId,
  update: (unit: SpriteLabUnitState) => SpriteLabUnitState,
): SpriteLabSimulationState {
  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: update(state.units[unitId]),
    },
  };
}
