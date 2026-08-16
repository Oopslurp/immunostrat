import type { EntityId } from "../../types/shared";

export const SELECTION_RING_COLOR = 0xffc76b;
export const SELECTION_RING_WIDTH = 1;
export const SELECTION_RING_RADIUS_PADDING = 7;
export const RANGE_OVERLAY_COLOR = 0xd9a75a;
export const RANGE_OVERLAY_WIDTH = 1;

type PresentedRangeInput = Readonly<{
  selectedEntityIds: readonly EntityId[];
  hoveredSelectedUnitId: EntityId | null;
  focusedSelectedUnitId: EntityId | null;
}>;

export function resolvePresentedRangeEntityId({
  selectedEntityIds,
  hoveredSelectedUnitId,
  focusedSelectedUnitId,
}: PresentedRangeInput): EntityId | null {
  if (selectedEntityIds.length === 0) {
    return null;
  }

  if (selectedEntityIds.length === 1) {
    return selectedEntityIds[0];
  }

  return firstSelected(
    selectedEntityIds,
    hoveredSelectedUnitId,
    focusedSelectedUnitId,
  );
}

export function getSelectionRingAlpha(selectionSize: number): number {
  if (selectionSize >= 8) {
    return 0.68;
  }

  if (selectionSize >= 3) {
    return 0.76;
  }

  return 0.88;
}

export function getPresentedAttackRangeRadius(
  attackRange: number,
): number | null {
  return attackRange > 0 ? attackRange : null;
}

function firstSelected(
  selectedEntityIds: readonly EntityId[],
  ...candidates: Array<EntityId | null>
): EntityId | null {
  for (const candidate of candidates) {
    if (candidate && selectedEntityIds.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}
