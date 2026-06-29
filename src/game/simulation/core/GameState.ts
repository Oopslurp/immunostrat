import type { MissionId } from "../../data/missions";
import type { EntityId, GameStatus, Vector2 } from "../../types/shared";
import type { GameEntity } from "../entities";

export type GameResources = {
  atp: number;
};

export type TissueState = {
  health: number;
  maxHealth: number;
};

export type WaveState = {
  currentWaveIndex: number;
  spawnedInCurrentWave: number;
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
  waves: WaveState;
  entities: Record<EntityId, GameEntity>;
  selectedEntityIds: EntityId[];
  nextEntityNumber: number;
  nextEffectNumber: number;
  effects: CombatEffect[];
};
