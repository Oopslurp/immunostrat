import { balanceValues } from "../../data/balance";
import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import type { Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import type { VirusEntity } from "../entities";

export function spawnVirus(
  state: GameState,
  pathogenTypeId: PathogenTypeId,
  position: Vector2,
): VirusEntity {
  const definition = pathogenDefinitions[pathogenTypeId];

  if (definition.pathogenClass !== "virus") {
    throw new Error(`Cannot spawn non-viral pathogen as virus: ${pathogenTypeId}`);
  }

  const id = `virus-${state.nextEntityNumber}`;
  state.nextEntityNumber += 1;

  const virus: VirusEntity = {
    id,
    kind: "virus",
    pathogenTypeId,
    position: { ...position },
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed,
    infectionRange: balanceValues.virus.infectionRange,
    antigenValue: definition.antigenValue,
    debrisDropChance: definition.debrisDropChance,
    targetPriority: definition.targetPriority,
    lifeRemainingMs: balanceValues.virus.freeLifetimeMs,
  };

  state.entities[id] = virus;

  return virus;
}
