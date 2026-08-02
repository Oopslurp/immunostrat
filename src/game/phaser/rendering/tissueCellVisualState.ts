import type { TissueCellState } from "../../simulation/core/GameState";

export type TissueCellVisualState =
  | "healthy"
  | "infected"
  | "destroyed"
  | "protected"
  | "infectedProtected";

/**
 * Maps the two independent simulation signals to their combined visual row.
 */
export function selectTissueCellVisualState(
  cell: Pick<TissueCellState, "status" | "antiviralProtectedMs">,
): TissueCellVisualState {
  if (cell.status === "destroyed") return "destroyed";
  if (cell.status === "infected" && cell.antiviralProtectedMs > 0) {
    return "infectedProtected";
  }
  if (cell.status === "infected") return "infected";
  if (cell.antiviralProtectedMs > 0) return "protected";
  return "healthy";
}
