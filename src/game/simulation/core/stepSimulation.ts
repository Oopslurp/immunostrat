import { cloneState } from "./cloneState";
import type { GameState } from "./GameState";
import { applyCombatSystem } from "../systems/combatSystem";
import { applyBiofilmSystem } from "../systems/biofilmSystem";
import { applyAdvancedThreatSystem } from "../systems/advancedThreatSystem";
import { applyAntibodyProjectileSystem } from "../systems/antibodyProjectileSystem";
import { applyDebrisSystem } from "../systems/debrisSystem";
import { applyEndConditionSystem } from "../systems/endConditionSystem";
import { trimTransientCollections } from "../systems/entityLimitSystem";
import { applyEffectSystem } from "../systems/effectSystem";
import { applyInflammationSystem } from "../systems/inflammationSystem";
import { applyImmuneLifecycleSystem } from "../systems/immuneLifecycleSystem";
import { applyMovementSystem } from "../systems/movementSystem";
import { applyNetTrapSystem } from "../systems/netTrapSystem";
import { applyPathogenSystem } from "../systems/pathogenSystem";
import { applyResourceSystem } from "../systems/resourceSystem";
import { applyTissueSystem } from "../systems/tissueSystem";
import { applyTissueRegenerationSystem } from "../systems/tissueRegenerationSystem";
import { applyTreatmentSystem } from "../systems/treatmentSystem";
import { applyVirusSystem } from "../systems/virusSystem";
import { applyWaveSystem } from "../systems/waveSystem";
import { isControllableImmuneUnit } from "../entities";

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
  applyNetTrapSystem(next, deltaMs);
  applyPathogenSystem(next, deltaMs);
  applyAdvancedThreatSystem(next, deltaMs);
  applyBiofilmSystem(next);
  applyVirusSystem(next, deltaMs);
  applyMovementSystem(next, deltaMs);
  applyCombatSystem(next, deltaMs);
  applyAntibodyProjectileSystem(next, deltaMs);
  applyDebrisSystem(next, deltaMs);
  applyTissueSystem(next, deltaMs);
  applyInflammationSystem(next, deltaMs);
  applyTissueRegenerationSystem(next, deltaMs);
  next.missionStats.peakInflammation = Math.max(
    next.missionStats.peakInflammation,
    next.inflammation.value,
  );
  applyImmuneLifecycleSystem(next, deltaMs);
  trimTransientCollections(next);
  applyEndConditionSystem(next);

  next.selectedEntityIds = next.selectedEntityIds.filter(
    (entityId) => {
      const entity = next.entities[entityId];

      return entity ? isControllableImmuneUnit(entity) : false;
    },
  );

  return next;
}
