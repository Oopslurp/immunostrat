import {
  getMapScaleBalance,
  type RuntimeMapBalance,
} from "../../data/mapScaleBalance";
import type { GameState } from "../core/GameState";

export function getRuntimeMapBalance(state: GameState): RuntimeMapBalance {
  const summary = state.tacticalMap.generationSummary;

  return getMapScaleBalance({
    mode: summary.mode,
    mapSizeCategory: state.tacticalMap.mapSizeCategory,
    difficulty: summary.difficulty,
    waveIndex: state.waves.currentWaveIndex,
  });
}
