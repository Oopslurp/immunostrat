import type { PathogenClass, PathogenTypeId } from "../data/pathogens";
import type { UnitTypeId } from "../data/units";
import type { ImmuneUnitKind } from "../types/immune";
import type { EntityId, Vector2 } from "../types/shared";

export type { ImmuneUnitKind };

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
  tacticalState?:
    | "idle"
    | "movingToPoint"
    | "movingToSite"
    | "guardingArea"
    | "engagingNearbyTarget"
    | "collectingAntigen"
    | "deliveringToLymph"
    | "inLymphTransit"
    | "retreating"
    | "holdingPosition";
  orderAnchor?: Vector2 | null;
  engagementRadius?: number;
  leashRadius?: number;
  guardRadius?: number;
  orderAreaRadius?: number | null;
  explicitTargetEntityId?: EntityId | null;
  lastOrderFeedback?: string;
  lifeRemainingMs?: number;
  carriedAntigenValue: number;
  carriedDebrisCount: number;
  lymphTransit?: {
    exitId: string;
    routePointIndex: number;
    routePathLength: number;
    phase: "following" | "away";
    returnRemainingMs: number;
    visualAlpha: number;
  };
};

export type MacrophageEntity = ImmuneUnitEntity & {
  kind: "macrophage";
  unitTypeId: "macrophage";
};

export type NeutrophilEntity = ImmuneUnitEntity & {
  kind: "neutrophil";
  unitTypeId: "neutrophil";
  deathState?: "death" | "netBurst";
  deathRemainingMs?: number;
  netTrapCreated?: boolean;
};

export type NetAffectedPathogenFields = {
  netTrapId?: string;
  netMovementMultiplier?: number;
};

export type DendriticCellEntity = ImmuneUnitEntity & {
  kind: "dendriticCell";
  unitTypeId: "dendriticCell";
};

export type PlasmocyteEntity = ImmuneUnitEntity & {
  kind: "plasmocyte";
  unitTypeId: "plasmocyte";
};

export type NkCellEntity = ImmuneUnitEntity & {
  kind: "nkCell";
  unitTypeId: "nkCell";
  detectionState?: {
    targetId: EntityId;
    targetKind: "tissueCell" | "cancerCell";
    outcome: "normal" | "abnormal";
    remainingMs: number;
  };
  scannedNormalCellIds?: EntityId[];
};

export type CytotoxicTEntity = ImmuneUnitEntity & {
  kind: "cytotoxicT";
  unitTypeId: "cytotoxicT";
};

export type BacteriumEntity = NetAffectedPathogenFields & {
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
  immobilizedRemainingMs?: number;
  phagocytosedByEntityId?: EntityId;
  phagocytosisRemainingMs?: number;
  armor?: number;
  antigenValue?: number;
  debrisDropChance?: number;
  inflammationPressureMultiplier?: number;
  targetPriority?: number;
  specialCooldownRemainingMs?: number;
  spawnedChildrenCount?: number;
  duplicationCooldownMs?: number;
  attackCloneGeneration?: number;
  attackClonesCreated?: number;
};

export type VirusEntity = NetAffectedPathogenFields & {
  id: EntityId;
  kind: "virus";
  pathogenTypeId: PathogenTypeId;
  position: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  movementSpeed: number;
  infectionRange: number;
  antigenValue: number;
  debrisDropChance: number;
  targetPriority: number;
  lifeRemainingMs: number;
  infiltrationTargetCellId?: string;
  infiltrationRemainingMs?: number;
};

export type AdvancedThreatEntity = NetAffectedPathogenFields & {
  id: EntityId;
  kind: "advancedThreat";
  pathogenTypeId: PathogenTypeId;
  category: Exclude<PathogenClass, "bacterium" | "virus">;
  position: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  movementSpeed: number;
  tissueDamage: number;
  tissueAttackRange: number;
  attackCooldownMs: number;
  attackCooldownRemainingMs: number;
  armor: number;
  antigenValue: number;
  debrisDropChance: number;
  inflammationPressureMultiplier: number;
  targetPriority: number;
  specialCooldownRemainingMs: number;
  spawnedChildrenCount: number;
  detected: boolean;
};

export type GameEntity = ImmuneUnitEntity | BacteriumEntity | VirusEntity | AdvancedThreatEntity;

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
    entity.kind === "plasmocyte" ||
    entity.kind === "nkCell" ||
    entity.kind === "cytotoxicT"
  );
}

export function isControllableImmuneUnit(
  entity: GameEntity,
): entity is ImmuneUnitEntity {
  return isImmuneUnit(entity) && !(isNeutrophil(entity) && entity.deathState);
}

export function isDendriticCell(
  entity: GameEntity,
): entity is DendriticCellEntity {
  return entity.kind === "dendriticCell";
}

export function isPlasmocyte(entity: GameEntity): entity is PlasmocyteEntity {
  return entity.kind === "plasmocyte";
}

export function isNkCell(entity: GameEntity): entity is NkCellEntity {
  return entity.kind === "nkCell";
}

export function isCytotoxicT(entity: GameEntity): entity is CytotoxicTEntity {
  return entity.kind === "cytotoxicT";
}

export function isBacterium(entity: GameEntity): entity is BacteriumEntity {
  return entity.kind === "bacterium";
}

export function isVirus(entity: GameEntity): entity is VirusEntity {
  return entity.kind === "virus";
}

export function isAdvancedThreat(
  entity: GameEntity,
): entity is AdvancedThreatEntity {
  return entity.kind === "advancedThreat";
}

export function isHostilePathogen(
  entity: GameEntity,
): entity is BacteriumEntity | VirusEntity | AdvancedThreatEntity {
  return (
    entity.kind === "bacterium" ||
    entity.kind === "virus" ||
    entity.kind === "advancedThreat"
  );
}
