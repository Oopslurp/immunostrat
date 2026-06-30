import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { distance } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium, isImmuneUnit } from "../entities";

export function applyTissueSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];

  for (const entity of Object.values(state.entities)) {
    if (!isBacterium(entity)) {
      continue;
    }

    entity.attackCooldownRemainingMs = Math.max(
      0,
      entity.attackCooldownRemainingMs - deltaMs,
    );

    if (entity.attackCooldownRemainingMs > 0) {
      continue;
    }

    const immuneTarget = findNearestImmuneUnitTarget(state, entity.position);

    if (
      immuneTarget &&
      distance(entity.position, immuneTarget.position) <=
        entity.tissueAttackRange + immuneTarget.radius
    ) {
      immuneTarget.health = Math.max(
        0,
        immuneTarget.health -
          entity.tissueDamage *
            balanceValues.combat.bacteriumContactImmuneDamageMultiplier,
      );
      state.effects.push({
        id: `effect-${state.nextEffectNumber}`,
        kind: "attack",
        position: { ...immuneTarget.position },
        radius: immuneTarget.radius + balanceValues.attackEffectRadiusBonus,
        ttlMs: balanceValues.attackEffectTtlMs,
      });
      state.nextEffectNumber += 1;
      entity.attackCooldownRemainingMs = entity.attackCooldownMs;
      continue;
    }

    const targetCell = findNearestAttackableTissueCell(state, entity.position);

    if (
      targetCell &&
      distance(entity.position, targetCell.position) <=
        entity.tissueAttackRange + targetCell.radius
    ) {
      targetCell.health = Math.max(0, targetCell.health - entity.tissueDamage);
      state.tissue.health = Math.max(
        0,
        state.tissue.health - entity.tissueDamage * 0.55,
      );

      if (targetCell.health <= 0 && targetCell.status !== "destroyed") {
        targetCell.status = "destroyed";
        state.tissue.health = Math.max(
          0,
          state.tissue.health - balanceValues.tissueCells.destroyedTissueDamage,
        );
      }
    } else if (
      distance(entity.position, mission.map.tissueCore) <= entity.tissueAttackRange
    ) {
      state.tissue.health = Math.max(0, state.tissue.health - entity.tissueDamage);
    } else {
      continue;
    }

    entity.attackCooldownRemainingMs = entity.attackCooldownMs;
    state.effects.push({
      id: `effect-${state.nextEffectNumber}`,
      kind: "tissueDamage",
      position: { ...mission.map.tissueCore },
      radius: balanceValues.tissueDamageEffectRadius,
      ttlMs: balanceValues.tissueDamageEffectTtlMs,
    });
    state.nextEffectNumber += 1;
  }
}

function findNearestImmuneUnitTarget(
  state: GameState,
  position: { x: number; y: number },
) {
  let nearest = null as GameState["entities"][string] | null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entity of Object.values(state.entities)) {
    if (!isImmuneUnit(entity)) {
      continue;
    }

    const currentDistance = distance(position, entity.position);

    if (currentDistance < nearestDistance) {
      nearest = entity;
      nearestDistance = currentDistance;
    }
  }

  return nearest && isImmuneUnit(nearest) ? nearest : null;
}

function findNearestAttackableTissueCell(
  state: GameState,
  position: { x: number; y: number },
) {
  let nearest = null as GameState["tissueCells"][number] | null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const cell of state.tissueCells) {
    if (cell.status === "destroyed") {
      continue;
    }

    const currentDistance = distance(position, cell.position);

    if (currentDistance < nearestDistance) {
      nearest = cell;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}
