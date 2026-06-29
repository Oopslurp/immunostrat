import type { PathogenTypeId } from "../data/pathogens";
import type { UnitTypeId } from "../data/units";
import type { EntityId, Vector2 } from "../types/shared";

export type ImmuneUnitKind =
  | "macrophage"
  | "neutrophil"
  | "dendriticCell"
  | "plasmocyte";

export type ImmuneUnitEntity = {
  id: EntityId;
  kind: ImmuneUnitKind;
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
  carriedAntigenValue: number;
  carriedDebrisCount: number;
};

export type MacrophageEntity = ImmuneUnitEntity & {
  kind: "macrophage";
  unitTypeId: "macrophage";
};

export type NeutrophilEntity = ImmuneUnitEntity & {
  kind: "neutrophil";
  unitTypeId: "neutrophil";
};

export type DendriticCellEntity = ImmuneUnitEntity & {
  kind: "dendriticCell";
  unitTypeId: "dendriticCell";
};

export type PlasmocyteEntity = ImmuneUnitEntity & {
  kind: "plasmocyte";
  unitTypeId: "plasmocyte";
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

export type GameEntity = ImmuneUnitEntity | BacteriumEntity;

export function isMacrophage(entity: GameEntity): entity is MacrophageEntity {
  return entity.kind === "macrophage";
}

export function isNeutrophil(entity: GameEntity): entity is NeutrophilEntity {
  return entity.kind === "neutrophil";
}

export function isImmuneUnit(entity: GameEntity): entity is ImmuneUnitEntity {
  return (
    entity.kind === "macrophage" ||
    entity.kind === "neutrophil" ||
    entity.kind === "dendriticCell" ||
    entity.kind === "plasmocyte"
  );
}

export function isDendriticCell(
  entity: GameEntity,
): entity is DendriticCellEntity {
  return entity.kind === "dendriticCell";
}

export function isPlasmocyte(entity: GameEntity): entity is PlasmocyteEntity {
  return entity.kind === "plasmocyte";
}

export function isBacterium(entity: GameEntity): entity is BacteriumEntity {
  return entity.kind === "bacterium";
}
