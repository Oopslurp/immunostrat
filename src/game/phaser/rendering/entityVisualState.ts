import type { ImmuneUnitEntity } from "../../simulation/entities";
import type { EntityVisualState } from "../assets/entitySpriteManifest";

export function mapTacticalStateToVisualState(
  tacticalState: ImmuneUnitEntity["tacticalState"],
): EntityVisualState {
  switch (tacticalState) {
    case "movingToPoint":
    case "movingToSite":
    case "deliveringToLymph":
    case "inLymphTransit":
    case "retreating":
      return "move";
    case "engagingNearbyTarget":
      return "attack";
    case "collectingAntigen":
      return "collect";
    default:
      return "idle";
  }
}

/** Translates simulation data into view state without mutating gameplay state. */
export function resolveImmuneUnitVisualState(
  entity: Pick<
    ImmuneUnitEntity,
    "health" | "tacticalState" | "carriedDebrisCount"
  >,
): EntityVisualState {
  if (entity.health <= 0) {
    return "dead";
  }
  if (
    entity.carriedDebrisCount > 0 &&
    (entity.tacticalState === "deliveringToLymph" ||
      entity.tacticalState === "inLymphTransit")
  ) {
    return "carry";
  }
  return mapTacticalStateToVisualState(entity.tacticalState);
}
