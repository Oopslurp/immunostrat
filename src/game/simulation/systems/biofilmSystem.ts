import { pathogenDefinitions } from "../../data/pathogens";
import type { GameState } from "../core/GameState";
import { isBacterium } from "../entities";

export function applyBiofilmSystem(state: GameState): void {
  state.biofilmZones = Object.values(state.entities)
    .filter(isBacterium)
    .flatMap((bacterium) => {
      const definition = pathogenDefinitions[bacterium.pathogenTypeId];

      if (!definition.biofilm || bacterium.health <= 0) {
        return [];
      }

      return [
        {
          id: `biofilm-${bacterium.id}`,
          sourceEntityId: bacterium.id,
          pathogenTypeId: bacterium.pathogenTypeId,
          position: { ...bacterium.position },
          radius: definition.biofilm.radius,
          damageTakenMultiplier: definition.biofilm.damageTakenMultiplier,
          immuneSlowMultiplier: definition.biofilm.immuneSlowMultiplier,
          inflammationPerSecond: definition.biofilm.inflammationPerSecond,
        },
      ];
    });
}
