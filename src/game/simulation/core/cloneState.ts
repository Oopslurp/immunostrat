import type { GameState } from "./GameState";

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    tissue: { ...state.tissue },
    resources: { ...state.resources },
    waves: { ...state.waves },
    entities: Object.fromEntries(
      Object.entries(state.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          position: { ...entity.position },
          ...(entity.kind === "macrophage" && entity.targetPosition
            ? { targetPosition: { ...entity.targetPosition } }
            : {}),
          ...(entity.kind === "macrophage" && entity.idleTargetPosition
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
