import { balanceValues } from "../../data/balance";
import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import { stableHash, type Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium } from "../entities";
import { isPathogenTypeId, spawnBacterium } from "../pathogens/createBacterium";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export function applyPathogenSystem(state: GameState, deltaMs: number): void {
  const bacteria = Object.values(state.entities).filter(isBacterium);
  const spreadRateMultiplier = getRuntimeMapBalance(state).spreadRateMultiplier;

  for (const bacterium of bacteria) {
    const definition = pathogenDefinitions[bacterium.pathogenTypeId];

    if (!definition.spawn || bacterium.health <= 0) {
      continue;
    }

    bacterium.specialCooldownRemainingMs = Math.max(
      0,
      (bacterium.specialCooldownRemainingMs ?? definition.spawn.initialDelayMs) -
        deltaMs * spreadRateMultiplier,
    );

    if (
      bacterium.specialCooldownRemainingMs > 0 ||
      (bacterium.spawnedChildrenCount ?? 0) >= definition.spawn.maxChildren ||
      !isPathogenTypeId(definition.spawn.childTypeId)
    ) {
      continue;
    }

    spawnBacterium(
      state,
      definition.spawn.childTypeId,
      createChildPosition(
        bacterium.position,
        definition.spawn.spawnRadius,
        `${bacterium.id}-${bacterium.spawnedChildrenCount ?? 0}`,
      ),
    );
    bacterium.spawnedChildrenCount = (bacterium.spawnedChildrenCount ?? 0) + 1;
    bacterium.specialCooldownRemainingMs = definition.spawn.intervalMs;
  }
}

function createChildPosition(
  origin: Vector2,
  radius: number,
  seedInput: string,
): Vector2 {
  const seed = stableHash(seedInput);
  const angle =
    ((seed + balanceValues.pathogenSpawn.childJitterSeedStep) % 360) *
    (Math.PI / 180);
  const distance = radius * (0.35 + (seed % 55) / 100);

  return {
    x: origin.x + Math.cos(angle) * distance,
    y: origin.y + Math.sin(angle) * distance,
  };
}
