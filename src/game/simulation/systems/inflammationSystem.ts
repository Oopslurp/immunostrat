import { balanceValues } from "../../data/balance";
import { pathogenDefinitions } from "../../data/pathogens";
import { missionDefinitions } from "../../data/missions";
import { distance } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium, isNeutrophil } from "../entities";

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
    neutrophilCount * inflammation.neutrophilPerSecond +
    debrisPressure +
    biofilmPressure;
  const decay = bacteriaPressure === 0 ? inflammation.decayPerSecond : 0;

  state.inflammation.value = clamp(
    state.inflammation.value + (pressure - decay) * seconds,
    0,
    inflammation.maxValue,
  );

  applyInflammationTissueDamage(state, seconds);
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

  state.tissue.health = Math.max(
    0,
    state.tissue.health - damagePerSecond * seconds,
  );
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
