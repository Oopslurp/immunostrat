import { balanceValues } from "../../data/balance";
import { pathogenDefinitions } from "../../data/pathogens";
import { missionDefinitions } from "../../data/missions";
import { distance } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium, isImmuneUnit, isNeutrophil, isVirus } from "../entities";
import { isTreatmentActive } from "./treatmentSystem";

export function applyInflammationSystem(
  state: GameState,
  deltaMs: number,
): void {
  const seconds = deltaMs / 1000;
  const bacteriaPressure = Object.values(state.entities)
    .filter(isBacterium)
    .reduce((pressure, bacterium) => {
      const definition = pathogenDefinitions[bacterium.pathogenTypeId];

      return pressure + (bacterium.inflammationPressureMultiplier ?? definition.inflammationPressureMultiplier);
    }, 0);
  const neutrophilCount = Object.values(state.entities).filter(isNeutrophil).length;
  const viralPressure =
    Object.values(state.entities).filter(isVirus).length * 0.35 +
    state.tissueCells.filter((cell) => cell.status === "infected").length * 0.55;
  const inflammation = balanceValues.inflammation;

  state.inflammatoryZones = state.inflammatoryZones
    .map((zone) => ({
      ...zone,
      ttlMs: zone.ttlMs - deltaMs,
      intensity: Math.max(0, zone.intensity - 0.05 * seconds),
    }))
    .filter((zone) => zone.ttlMs > 0 && zone.intensity > 0);

  const debrisPressure =
    state.debris.length * balanceValues.debris.inflammationPerDebrisPerSecond;
  const biofilmPressure = state.biofilmZones.reduce(
    (pressure, zone) => pressure + zone.inflammationPerSecond,
    0,
  );
  const pressure =
    bacteriaPressure * inflammation.bacteriaPerSecond +
    viralPressure * inflammation.bacteriaPerSecond * 0.45 +
    neutrophilCount * inflammation.neutrophilPerSecond +
    debrisPressure +
    biofilmPressure;
  const decay =
    bacteriaPressure === 0 && viralPressure === 0
      ? inflammation.decayPerSecond
      : 0;

  state.inflammation.value = clamp(
    state.inflammation.value + (pressure - decay) * seconds,
    0,
    inflammation.maxValue,
  );

  applyInflammationTissueDamage(state, seconds);
  applyCriticalInflammationImmuneDamage(state, seconds);
  applyInflammatoryZoneTissueDamage(state, seconds);
}

function applyInflammationTissueDamage(state: GameState, seconds: number): void {
  const inflammation = balanceValues.inflammation;

  if (state.inflammation.value < inflammation.dangerThreshold) {
    return;
  }

  const damagePerSecond =
    state.inflammation.value >= inflammation.criticalThreshold
      ? inflammation.criticalTissueDamagePerSecond
      : inflammation.dangerousTissueDamagePerSecond;
  const treatmentMultiplier = isTreatmentActive(state, "antiInflammatory")
    ? 0.45
    : 1;

  state.tissue.health = Math.max(
    0,
    state.tissue.health - damagePerSecond * treatmentMultiplier * seconds,
  );
}

function applyCriticalInflammationImmuneDamage(
  state: GameState,
  seconds: number,
): void {
  if (state.inflammation.value < balanceValues.inflammation.criticalThreshold) {
    return;
  }

  for (const entity of Object.values(state.entities)) {
    if (!isImmuneUnit(entity) || isNeutrophil(entity)) {
      continue;
    }

    entity.health = Math.max(
      0,
      entity.health -
        balanceValues.combat.criticalInflammationImmuneDamagePerSecond * seconds,
    );
  }
}

function applyInflammatoryZoneTissueDamage(
  state: GameState,
  seconds: number,
): void {
  const mission = missionDefinitions[state.missionId];
  const zoneConfig = balanceValues.inflammatoryZone;

  for (const zone of state.inflammatoryZones) {
    if (
      distance(zone.position, mission.map.tissueCore) >
      zoneConfig.tissueCoreDamageDistance
    ) {
      continue;
    }

    state.tissue.health = Math.max(
      0,
      state.tissue.health -
        zone.intensity * zoneConfig.tissueDamagePerSecondPerIntensity * seconds,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
