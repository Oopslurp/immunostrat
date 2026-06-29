import type { MissionId } from "../../data/missions";
import type { EntityId, GameStatus, Vector2 } from "../../types/shared";
import type { GameEntity } from "../entities";

export type GameResources = {
  atp: number;
  cytokines: number;
};

export type TissueState = {
  health: number;
  maxHealth: number;
};

export type WaveState = {
  currentWaveIndex: number;
  spawnedInCurrentWave: number;
};

export type InflammationState = {
  value: number;
};

export type InflammatoryZone = {
  id: string;
  position: Vector2;
  radius: number;
  intensity: number;
  ttlMs: number;
};

export type ProductionCooldowns = {
  neutrophilMs: number;
};

export type CombatEffect = {
  id: string;
  kind: "attack" | "tissueDamage";
  position: Vector2;
  radius: number;
  ttlMs: number;
};

export type GameState = {
  missionId: MissionId;
  elapsedMs: number;
  status: GameStatus;
  tissue: TissueState;
  resources: GameResources;
  inflammation: InflammationState;
  inflammatoryZones: InflammatoryZone[];
  productionCooldowns: ProductionCooldowns;
  waves: WaveState;
  entities: Record<EntityId, GameEntity>;
  selectedEntityIds: EntityId[];
  nextEntityNumber: number;
  nextEffectNumber: number;
  effects: CombatEffect[];
};
