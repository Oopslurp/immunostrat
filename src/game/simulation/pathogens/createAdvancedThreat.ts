import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import type { Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import type { AdvancedThreatEntity } from "../entities";
import { getRuntimeMapBalance } from "../systems/runtimeMapBalance";

export function spawnAdvancedThreat(
  state: GameState,
  pathogenTypeId: PathogenTypeId,
  position: Vector2,
): AdvancedThreatEntity {
  const definition = pathogenDefinitions[pathogenTypeId];

  if (
    definition.pathogenClass === "bacterium" ||
    definition.pathogenClass === "virus"
  ) {
    throw new Error(
      `Cannot spawn basic pathogen as advanced threat: ${pathogenTypeId}`,
    );
  }

  const id = `advanced-${state.nextEntityNumber}`;
  const mapBalance = getRuntimeMapBalance(state);
  state.nextEntityNumber += 1;

  const entity: AdvancedThreatEntity = {
    id,
    kind: "advancedThreat",
    pathogenTypeId,
    category: definition.pathogenClass,
    position: { ...position },
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed * mapBalance.pathogenSpeedMultiplier,
    tissueDamage: definition.tissueDamage,
    tissueAttackRange: definition.tissueAttackRange,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
    armor: definition.armor,
    antigenValue: definition.antigenValue,
    debrisDropChance: definition.debrisDropChance,
    inflammationPressureMultiplier: definition.inflammationPressureMultiplier,
    targetPriority: definition.targetPriority,
    specialCooldownRemainingMs: definition.spawn?.initialDelayMs ?? 0,
    spawnedChildrenCount: 0,
    detected: definition.pathogenClass !== "cancerCell",
  };

  state.entities[id] = entity;

  return entity;
}
