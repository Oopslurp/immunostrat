import type { MissionId, MissionPreparation } from "../../data/missions";
import type { TreatmentId } from "../../data/treatments";
import type { EntityId, GameStatus, Vector2 } from "../../types/shared";
import type { GameEntity } from "../entities";

export type GameResources = {
  atp: number;
  cytokines: number;
  antigens: number;
};

export type MissionRuntimeStats = {
  producedUnits: Partial<Record<string, number>>;
  usedAbilities: Partial<Record<string, number>>;
  peakInflammation: number;
};

export type TreatmentState = {
  cooldowns: Partial<Record<TreatmentId, number>>;
  activeMs: Partial<Record<TreatmentId, number>>;
};

export type TissueState = {
  health: number;
  maxHealth: number;
};

export type TissueCellState = {
  id: string;
  position: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  status: "healthy" | "infected" | "destroyed";
  infectedElapsedMs: number;
  nextVirusBurstMs: number;
  antiviralProtectedMs: number;
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

export type BiofilmZone = {
  id: string;
  sourceEntityId: EntityId;
  pathogenTypeId: string;
  position: Vector2;
  radius: number;
  damageTakenMultiplier: number;
  immuneSlowMultiplier: number;
  inflammationPerSecond: number;
};

export type ProductionCooldowns = {
  neutrophilMs: number;
  massiveNeutralizationMs: number;
  antiviralSignalMs: number;
};

export type AdaptiveResearchState = {
  bacterialAnalysisComplete: boolean;
  viralAnalysisComplete: boolean;
};

export type AntiviralState = {
  activeMs: number;
  position: Vector2 | null;
  radius: number;
};

export type PathogenDebris = {
  id: string;
  position: Vector2;
  pathogenTypeId: string;
  antigenProfileId: string;
  antigenValue: number;
  ttlMs: number;
};

export type CombatEffect = {
  id: string;
  kind:
    | "attack"
    | "tissueDamage"
    | "antibody"
    | "adaptive"
    | "phagocytosis"
    | "infection"
    | "antiviral"
    | "cytotoxic"
    | "treatment";
  position: Vector2;
  radius: number;
  ttlMs: number;
};

export type GameState = {
  missionId: MissionId;
  preparation: MissionPreparation;
  elapsedMs: number;
  status: GameStatus;
  tissue: TissueState;
  tissueCells: TissueCellState[];
  resources: GameResources;
  missionStats: MissionRuntimeStats;
  treatments: TreatmentState;
  inflammation: InflammationState;
  inflammatoryZones: InflammatoryZone[];
  biofilmZones: BiofilmZone[];
  productionCooldowns: ProductionCooldowns;
  adaptiveResearch: AdaptiveResearchState;
  antiviral: AntiviralState;
  debris: PathogenDebris[];
  waves: WaveState;
  entities: Record<EntityId, GameEntity>;
  selectedEntityIds: EntityId[];
  nextEntityNumber: number;
  nextEffectNumber: number;
  nextDebrisNumber: number;
  effects: CombatEffect[];
};
