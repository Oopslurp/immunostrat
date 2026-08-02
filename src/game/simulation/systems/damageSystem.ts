import { balanceValues } from "../../data/balance";
import type { GameState, TissueCellState } from "../core/GameState";
import type {
  AdvancedThreatEntity,
  BacteriumEntity,
  VirusEntity,
} from "../entities";

export type DamageablePathogen =
  | BacteriumEntity
  | VirusEntity
  | AdvancedThreatEntity;

/** Central simulation-side pathogen damage entry point. */
export function applyPathogenDamage(
  pathogen: DamageablePathogen,
  amount: number,
): number {
  if (pathogen.health <= 0 || amount <= 0) {
    return 0;
  }

  const previousHealth = pathogen.health;
  pathogen.health = Math.max(0, pathogen.health - amount);
  return previousHealth - pathogen.health;
}

/** Central civilian-cell damage entry point, including one-time destruction effects. */
export function applyTissueCellDamage(
  state: GameState,
  cell: TissueCellState,
  amount: number,
): number {
  if (cell.status === "destroyed" || cell.health <= 0 || amount <= 0) {
    return 0;
  }

  const previousHealth = cell.health;
  const wasInfected = cell.status === "infected";
  cell.health = Math.max(0, cell.health - amount);

  if (cell.health <= 0) {
    cell.status = "destroyed";
    cell.infectedByPathogenTypeId = undefined;
    cell.infectedElapsedMs = 0;
    cell.nextVirusBurstMs = 0;
    cell.antiviralProtectedMs = 0;
    state.tissue.health = Math.max(
      0,
      state.tissue.health - balanceValues.tissueCells.destroyedTissueDamage,
    );

    if (wasInfected) {
      state.missionStats.infectedCellsEliminated += 1;
    }
  }

  return previousHealth - cell.health;
}
