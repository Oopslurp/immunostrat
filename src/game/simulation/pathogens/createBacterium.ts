import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import type { Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import type { BacteriumEntity } from "../entities";
import { getRuntimeMapBalance } from "../systems/runtimeMapBalance";

export function spawnBacterium(
  state: GameState,
  pathogenTypeId: PathogenTypeId,
  position: Vector2,
): BacteriumEntity {
  const definition = pathogenDefinitions[pathogenTypeId];

  if (definition.pathogenClass !== "bacterium") {
    throw new Error(`Cannot spawn non-bacterial pathogen as bacterium: ${pathogenTypeId}`);
  }
  const id = `bacterium-${state.nextEntityNumber}`;
  const mapBalance = getRuntimeMapBalance(state);

  state.nextEntityNumber += 1;

  const bacterium: BacteriumEntity = {
    id,
    kind: "bacterium",
    pathogenTypeId,
    position: { ...position },
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed * mapBalance.pathogenSpeedMultiplier,
    tissueDamage: definition.tissueDamage,
    tissueAttackRange: definition.tissueAttackRange,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
    immobilizedRemainingMs: 0,
    phagocytosisRemainingMs: 0,
    armor: definition.armor,
    antigenValue: definition.antigenValue,
    debrisDropChance: definition.debrisDropChance,
    inflammationPressureMultiplier: definition.inflammationPressureMultiplier,
    targetPriority: definition.targetPriority,
    specialCooldownRemainingMs: definition.spawn?.initialDelayMs ?? 0,
    spawnedChildrenCount: 0,
  };

  state.entities[id] = bacterium;

  return bacterium;
}

export function isPathogenTypeId(value: string): value is PathogenTypeId {
  return value in pathogenDefinitions;
}
