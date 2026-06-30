import { cloneState } from "./cloneState";
import type { GameState } from "./GameState";
import { applyCombatSystem } from "../systems/combatSystem";
import { applyBiofilmSystem } from "../systems/biofilmSystem";
import { applyDebrisSystem } from "../systems/debrisSystem";
import { applyEndConditionSystem } from "../systems/endConditionSystem";
import { applyEffectSystem } from "../systems/effectSystem";
import { applyInflammationSystem } from "../systems/inflammationSystem";
import { applyImmuneLifecycleSystem } from "../systems/immuneLifecycleSystem";
import { applyMovementSystem } from "../systems/movementSystem";
import { applyPathogenSystem } from "../systems/pathogenSystem";
import { applyResourceSystem } from "../systems/resourceSystem";
import { applyTissueSystem } from "../systems/tissueSystem";
import { applyTreatmentSystem } from "../systems/treatmentSystem";
import { applyVirusSystem } from "../systems/virusSystem";
import { applyWaveSystem } from "../systems/waveSystem";

export function stepSimulation(state: GameState, deltaMs: number): GameState {
  if (state.status !== "running") {
    return state;
  }

  const next = cloneState(state);
  next.elapsedMs += deltaMs;

  applyResourceSystem(next, deltaMs);
  applyTreatmentSystem(next, deltaMs);
  applyEffectSystem(next, deltaMs);
  applyWaveSystem(next);
  applyPathogenSystem(next, deltaMs);
  applyBiofilmSystem(next);
  applyVirusSystem(next, deltaMs);
  applyMovementSystem(next, deltaMs);
  applyCombatSystem(next, deltaMs);
  applyDebrisSystem(next, deltaMs);
  applyBiofilmSystem(next);
  applyTissueSystem(next, deltaMs);
  applyInflammationSystem(next, deltaMs);
  next.missionStats.peakInflammation = Math.max(
    next.missionStats.peakInflammation,
    next.inflammation.value,
  );
  applyImmuneLifecycleSystem(next, deltaMs);
  applyEndConditionSystem(next);

  next.selectedEntityIds = next.selectedEntityIds.filter(
    (entityId) => {
      const entity = next.entities[entityId];

      return (
        entity?.kind === "macrophage" ||
        entity?.kind === "neutrophil" ||
        entity?.kind === "dendriticCell" ||
        entity?.kind === "plasmocyte" ||
        entity?.kind === "nkCell" ||
        entity?.kind === "cytotoxicT"
      );
    },
  );

  return next;
}
