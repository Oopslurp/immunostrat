import type { GameState } from "./GameState";
import { isImmuneUnit } from "../entities";

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    tissue: { ...state.tissue },
    resources: { ...state.resources },
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
