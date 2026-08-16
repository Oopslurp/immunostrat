import {
  isImmuneUnit,
  type GameEntity,
  type ImmuneUnitEntity,
} from "../../simulation/entities";
import type { EntityId } from "../../types/shared";

export function getSelectedImmuneUnits(
  entities: readonly GameEntity[],
  selectedEntityIds: readonly EntityId[],
): ImmuneUnitEntity[] {
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));

  return selectedEntityIds.flatMap((entityId) => {
    const entity = entitiesById.get(entityId);

    return entity && isImmuneUnit(entity) ? [entity] : [];
  });
}

export function getUnitHealthRatio(unit: ImmuneUnitEntity): number {
  if (unit.maxHealth <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, unit.health / unit.maxHealth));
}
