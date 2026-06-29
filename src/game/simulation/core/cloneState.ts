import type { GameState } from "./GameState";

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
    productionCooldowns: { ...state.productionCooldowns },
    waves: { ...state.waves },
    entities: Object.fromEntries(
      Object.entries(state.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          position: { ...entity.position },
          ...((entity.kind === "macrophage" || entity.kind === "neutrophil") &&
          entity.targetPosition
            ? { targetPosition: { ...entity.targetPosition } }
            : {}),
          ...((entity.kind === "macrophage" || entity.kind === "neutrophil") &&
          entity.idleTargetPosition
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
