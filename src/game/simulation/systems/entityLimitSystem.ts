import { balanceValues } from "../../data/balance";
import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import type { GameState } from "../core/GameState";
import { isAdvancedThreat, isBacterium, isHostilePathogen, isVirus } from "../entities";

export type EntityLimitCounts = {
  pathogens: number;
  bacteria: number;
  viruses: number;
  spores: number;
  fungalFoci: number;
  cancerCells: number;
  parasites: number;
  opportunists: number;
  debris: number;
  effects: number;
};

export function getEntityLimitCounts(state: GameState): EntityLimitCounts {
  const counts: EntityLimitCounts = {
    pathogens: 0,
    bacteria: 0,
    viruses: 0,
    spores: 0,
    fungalFoci: 0,
    cancerCells: 0,
    parasites: 0,
    opportunists: 0,
    debris: state.debris.length,
    effects: state.effects.length,
  };

  for (const entity of Object.values(state.entities)) {
    if (!isHostilePathogen(entity) || entity.health <= 0) {
      continue;
    }

    counts.pathogens += 1;

    if (isBacterium(entity)) {
      counts.bacteria += 1;
      continue;
    }

    if (isVirus(entity)) {
      counts.viruses += 1;
      continue;
    }

    if (!isAdvancedThreat(entity)) {
      continue;
    }

    if (entity.pathogenTypeId === "fungalSpore") {
      counts.spores += 1;
    }

    if (entity.category === "fungus" && entity.pathogenTypeId !== "fungalSpore") {
      counts.fungalFoci += 1;
    }

    if (entity.category === "cancerCell") {
      counts.cancerCells += 1;
    }

    if (entity.category === "parasite") {
      counts.parasites += 1;
    }

    if (entity.category === "opportunist") {
      counts.opportunists += 1;
    }
  }

  return counts;
}

export function canSpawnPathogen(
  state: GameState,
  pathogenTypeId: PathogenTypeId,
): boolean {
  const definition = pathogenDefinitions[pathogenTypeId];
  const counts = getEntityLimitCounts(state);
  const limits = balanceValues.entityLimits;

  if (counts.pathogens >= limits.maxActivePathogens) {
    return false;
  }

  if (definition.pathogenClass === "bacterium") {
    return counts.bacteria < limits.maxActiveBacteria;
  }

  if (definition.pathogenClass === "virus") {
    return counts.viruses < limits.maxActiveViruses;
  }

  if (definition.pathogenClass === "fungus") {
    return pathogenTypeId === "fungalSpore"
      ? counts.spores < limits.maxActiveSpores
      : counts.fungalFoci < limits.maxActiveFungalFoci;
  }

  if (definition.pathogenClass === "cancerCell") {
    return counts.cancerCells < limits.maxActiveCancerCells;
  }

  if (definition.pathogenClass === "parasite") {
    return counts.parasites < limits.maxActiveParasites;
  }

  if (definition.pathogenClass === "opportunist") {
    return counts.opportunists < limits.maxActiveOpportunists;
  }

  return true;
}

export function canCreateDebris(state: GameState): boolean {
  return state.debris.length < balanceValues.entityLimits.maxActiveDebris;
}

export function trimTransientCollections(state: GameState): void {
  const limits = balanceValues.entityLimits;

  if (state.effects.length > limits.maxActiveEffects) {
    state.effects = state.effects.slice(-limits.maxActiveEffects);
  }

  if (state.debris.length > limits.maxActiveDebris) {
    state.debris = state.debris
      .sort((a, b) => a.ttlMs - b.ttlMs)
      .slice(-limits.maxActiveDebris);
  }
}
