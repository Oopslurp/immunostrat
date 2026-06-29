import type { PathogenTypeId } from "../data/pathogens";
import type { UnitTypeId } from "../data/units";
import type { EntityId, Vector2 } from "../types/shared";

export type MacrophageEntity = {
  id: EntityId;
  kind: "macrophage";
  unitTypeId: UnitTypeId;
  position: Vector2;
  targetPosition: Vector2 | null;
  idleTargetPosition: Vector2 | null;
  nextIdleRetargetMs: number;
  health: number;
  maxHealth: number;
  radius: number;
  movementSpeed: number;
  idleMovementSpeed: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownMs: number;
  attackCooldownRemainingMs: number;
};

export type BacteriumEntity = {
  id: EntityId;
  kind: "bacterium";
  pathogenTypeId: PathogenTypeId;
  position: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  movementSpeed: number;
  tissueDamage: number;
  tissueAttackRange: number;
  attackCooldownMs: number;
  attackCooldownRemainingMs: number;
};

export type GameEntity = MacrophageEntity | BacteriumEntity;

export function isMacrophage(entity: GameEntity): entity is MacrophageEntity {
  return entity.kind === "macrophage";
}

export function isBacterium(entity: GameEntity): entity is BacteriumEntity {
  return entity.kind === "bacterium";
}
