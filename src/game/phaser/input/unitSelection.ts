import type { EntityId, Vector2 } from "../../types/shared";

export type SelectableUnit = Readonly<{
  id: EntityId;
  position: Vector2;
  radius: number;
}>;

export const UNIT_SELECTION_HIT_PADDING_PX = 8;

export function findSelectableUnitAtPoint(
  units: readonly SelectableUnit[],
  point: Vector2,
  cameraZoom: number,
): EntityId | null {
  let bestMatch: EntityId | null = null;
  let bestNormalizedDistance = Number.POSITIVE_INFINITY;

  for (const unit of units) {
    const hitRadius = getUnitSelectionHitRadius(unit, cameraZoom);
    const dx = point.x - unit.position.x;
    const dy = point.y - unit.position.y;
    const normalizedDistance = (dx * dx + dy * dy) / (hitRadius * hitRadius);

    if (normalizedDistance <= 1 && normalizedDistance < bestNormalizedDistance) {
      bestMatch = unit.id;
      bestNormalizedDistance = normalizedDistance;
    }
  }

  return bestMatch;
}

export function findSelectableUnitsIntersectingRect(
  units: readonly SelectableUnit[],
  start: Vector2,
  end: Vector2,
  cameraZoom: number,
): EntityId[] {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  return units
    .filter((unit) => {
      const closestX = clamp(unit.position.x, minX, maxX);
      const closestY = clamp(unit.position.y, minY, maxY);
      const dx = unit.position.x - closestX;
      const dy = unit.position.y - closestY;
      const hitRadius = getUnitSelectionHitRadius(unit, cameraZoom);

      return dx * dx + dy * dy <= hitRadius * hitRadius;
    })
    .map((unit) => unit.id);
}

function getUnitSelectionHitRadius(
  unit: SelectableUnit,
  cameraZoom: number,
): number {
  const safeZoom = Math.max(0.1, cameraZoom);

  return unit.radius + UNIT_SELECTION_HIT_PADDING_PX / safeZoom;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
