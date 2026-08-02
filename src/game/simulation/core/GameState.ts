import type { MissionId, MissionPreparation } from "../../data/missions";
import type { GeneratedTacticalMapDefinition } from "../../data/tacticalMapGenerator";
import type { PathogenTypeId } from "../../data/pathogens";
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
  pathogenKills: Partial<Record<string, number>>;
  infectedCellsEliminated: number;
  peakInflammation: number;
  antigensCollected: number;
  lymphSignalsDelivered: number;
  threatScoreBonus: number;
};

export type TreatmentState = {
  cooldowns: Partial<Record<TreatmentId, number>>;
  activeMs: Partial<Record<TreatmentId, number>>;
};

export type TissueState = {
  health: number;
  maxHealth: number;
};

export type TissueRepairState = {
  stableMs: number;
  status: "recovering" | "waiting" | "blocked";
  blockedReason: "infection" | "inflammation" | "combat" | null;
  ratePerSecond: number;
};

export type TissueCellState = {
  id: string;
  position: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  status: "healthy" | "infected" | "destroyed";
  infectedByPathogenTypeId?: PathogenTypeId;
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

export type NetTrapState = {
  id: string;
  sourceEntityId: EntityId;
  position: Vector2;
  remainingMs: number;
  tickAccumulatorMs: number;
  capturedEntityIds: EntityId[];
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
  sourceEntityId?: EntityId;
  kind:
    | "attack"
    | "tissueDamage"
    | "antibody"
    | "antibodyImpact"
    | "adaptive"
    | "phagocytosis"
    | "infection"
    | "antiviral"
    | "cytotoxic"
    | "treatment"
    | "netTrap";
  position: Vector2;
  radius: number;
  ttlMs: number;
};

export type AntibodyProjectile = {
  id: string;
  sourceEntityId: EntityId;
  targetEntityId: EntityId;
  position: Vector2;
  startPosition: Vector2;
  damage: number;
  elapsedMs: number;
  durationMs: number;
  launchDelayMs: number;
  ttlMs: number;
  arcDirection: -1 | 1;
  arcHeight: number;
};

export type GameState = {
  missionId: MissionId;
  preparation: MissionPreparation;
  tacticalMap: GeneratedTacticalMapDefinition;
  elapsedMs: number;
  status: GameStatus;
  tissue: TissueState;
  tissueRepair: TissueRepairState;
  tissueCells: TissueCellState[];
  resources: GameResources;
  missionStats: MissionRuntimeStats;
  treatments: TreatmentState;
  inflammation: InflammationState;
  inflammatoryZones: InflammatoryZone[];
  biofilmZones: BiofilmZone[];
  netTraps: NetTrapState[];
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
  nextNetTrapNumber: number;
  antibodyProjectiles: AntibodyProjectile[];
  effects: CombatEffect[];
};
