import type { MissionId } from "../../data/missions";
import type { EntityId, GameStatus, Vector2 } from "../../types/shared";
import type { GameEntity } from "../entities";

export type GameResources = {
  atp: number;
  cytokines: number;
  antigens: number;
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
  massiveNeutralizationMs: number;
};

export type AdaptiveResearchState = {
  bacterialAnalysisComplete: boolean;
};

export type PathogenDebris = {
  id: string;
  position: Vector2;
  antigenValue: number;
  ttlMs: number;
};

export type CombatEffect = {
  id: string;
  kind: "attack" | "tissueDamage" | "antibody" | "adaptive";
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
  adaptiveResearch: AdaptiveResearchState;
  debris: PathogenDebris[];
  waves: WaveState;
  entities: Record<EntityId, GameEntity>;
  selectedEntityIds: EntityId[];
  nextEntityNumber: number;
  nextEffectNumber: number;
  nextDebrisNumber: number;
  effects: CombatEffect[];
};
