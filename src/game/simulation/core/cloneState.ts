import type { GameState } from "./GameState";
import { isImmuneUnit } from "../entities";

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    preparation: {
      ...state.preparation,
      memoryProfiles: state.preparation.memoryProfiles
        ? [...state.preparation.memoryProfiles]
        : undefined,
      globalReinforcements: state.preparation.globalReinforcements?.map(
        (unit) => ({ ...unit }),
      ),
      regionalNodeBonus: state.preparation.regionalNodeBonus
        ? { ...state.preparation.regionalNodeBonus }
        : undefined,
    },
    tissue: { ...state.tissue },
    tissueRepair: { ...state.tissueRepair },
    tissueCells: state.tissueCells.map((cell) => ({
      ...cell,
      position: { ...cell.position },
    })),
    resources: { ...state.resources },
    missionStats: {
      producedUnits: { ...state.missionStats.producedUnits },
      usedAbilities: { ...state.missionStats.usedAbilities },
      pathogenKills: { ...state.missionStats.pathogenKills },
      infectedCellsEliminated: state.missionStats.infectedCellsEliminated,
      peakInflammation: state.missionStats.peakInflammation,
      antigensCollected: state.missionStats.antigensCollected,
      lymphSignalsDelivered: state.missionStats.lymphSignalsDelivered,
      threatScoreBonus: state.missionStats.threatScoreBonus,
    },
    treatments: {
      cooldowns: { ...state.treatments.cooldowns },
      activeMs: { ...state.treatments.activeMs },
    },
    inflammation: { ...state.inflammation },
    inflammatoryZones: state.inflammatoryZones.map((zone) => ({
      ...zone,
      position: { ...zone.position },
    })),
    biofilmZones: state.biofilmZones.map((zone) => ({
      ...zone,
      position: { ...zone.position },
    })),
    productionCooldowns: { ...state.productionCooldowns },
    adaptiveResearch: { ...state.adaptiveResearch },
    antiviral: {
      ...state.antiviral,
      position: state.antiviral.position ? { ...state.antiviral.position } : null,
    },
    debris: state.debris.map((debris) => ({
      ...debris,
      position: { ...debris.position },
    })),
    waves: { ...state.waves },
    entities: Object.fromEntries(
      Object.entries(state.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          position: { ...entity.position },
          ...(isImmuneUnit(entity) && entity.targetPosition
            ? { targetPosition: { ...entity.targetPosition } }
            : {}),
          ...(isImmuneUnit(entity) && entity.idleTargetPosition
            ? { idleTargetPosition: { ...entity.idleTargetPosition } }
            : {}),
          ...(isImmuneUnit(entity) && entity.orderAnchor
            ? { orderAnchor: { ...entity.orderAnchor } }
            : {}),
        },
      ]),
    ),
    selectedEntityIds: [...state.selectedEntityIds],
    effects: state.effects.map((effect) => ({
      ...effect,
      position: { ...effect.position },
    })),
  };
}
