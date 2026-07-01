import type { MissionId, StartingUnitDefinition } from "../data/missions";
import type { PathogenTypeId } from "../data/pathogens";
import type { UnitTypeId } from "../data/units";

export type BodyRegionId =
  | "skin"
  | "lungs"
  | "intestine"
  | "blood"
  | "lymphNodes"
  | "spleen"
  | "boneMarrow"
  | "liver";

export type RegionalNodeId =
  | "skinNode"
  | "thoracicNode"
  | "gutNode"
  | "bloodNode";

export type BodyRegionStatus =
  | "healthy"
  | "alert"
  | "infected"
  | "critical"
  | "highInflammation"
  | "inBattle"
  | "controlled"
  | "weakened"
  | "lost";

export type BodyThreatProfile =
  | "none"
  | "bacterial"
  | "viral"
  | "fungal"
  | "parasite"
  | "cancer"
  | "opportunist"
  | "mixed";
export type BodyMapDifficulty = "easy" | "normal" | "hard";
export type BodyBattleQuality = "clean" | "strained" | "lost";
export type BodyMapRunStatus = "running" | "victory" | "defeat";
export type BodyMapDefeatCause =
  | "globalHealthCollapsed"
  | "globalInfectionOverrun"
  | "systemicInflammationRunaway"
  | "tooManyCriticalRegions"
  | "bloodCrisis";

export type BodyMapBattleStats = {
  won: number;
  lost: number;
  cleanVictories: number;
  treatmentsUsed: number;
  civilianCellsSaved: number;
  civilianCellsLost: number;
  advancedThreatsEncountered: number;
};

export type BodyMapFinalSummary = {
  status: Exclude<BodyMapRunStatus, "running">;
  title: string;
  cause: string;
  score: number;
  rank: "C" | "B" | "A" | "S";
  completedAt: string;
  difficulty: BodyMapDifficulty;
  strategicTurn: number;
  globalHealth: number;
  globalInfection: number;
  systemicInflammation: number;
  stabilizedRegions: number;
  criticalRegions: number;
  lostRegions: number;
  battleStats: BodyMapBattleStats;
};

export type BodyRegionDefinition = {
  id: BodyRegionId;
  name: string;
  regionType:
    | "barrier"
    | "respiratory"
    | "digestive"
    | "circulation"
    | "lymphatic"
    | "immuneOrgan"
    | "production"
    | "metabolic";
  mapPosition: { x: number; y: number };
  connections: BodyRegionId[];
  regionalNodeId: RegionalNodeId;
  linkedMissionId: MissionId;
  preferredThreat: BodyThreatProfile;
  pedagogy: string;
};

export type RegionalNodeDefinition = {
  id: RegionalNodeId;
  name: string;
  associatedRegionIds: BodyRegionId[];
  description: string;
};

export type BodyRegionState = {
  id: BodyRegionId;
  status: BodyRegionStatus;
  localHealth: number;
  infection: number;
  inflammation: number;
  threat: BodyThreatProfile;
  pathogens: PathogenTypeId[];
  assignedReinforcements: Partial<Record<UnitTypeId, number>>;
  activeBattleMissionId?: MissionId;
  lastBattleMissionId?: MissionId;
  lastBattleQuality?: BodyBattleQuality;
  treatedCount?: number;
};

export type RegionalNodeState = {
  id: RegionalNodeId;
  active: boolean;
  activation: number;
  antigenSignalsDelivered: number;
};

export type BodyGlobalResources = {
  atp: number;
  cytokines: number;
  antigens: number;
};

export type BodyMapState = {
  version: number;
  seed: string;
  difficulty: BodyMapDifficulty;
  runStatus: BodyMapRunStatus;
  strategicTurn: number;
  stabilizationStreak: number;
  defeatPressureTurns: number;
  finalSummary?: BodyMapFinalSummary;
  globalHealth: number;
  globalInfection: number;
  systemicInflammation: number;
  globalResources: BodyGlobalResources;
  regions: Record<BodyRegionId, BodyRegionState>;
  regionalNodes: Record<RegionalNodeId, RegionalNodeState>;
  alerts: string[];
  history: string[];
  treatedRegionIds: BodyRegionId[];
  battleStats: BodyMapBattleStats;
};

export type BodyBattleOutcome = {
  regionId: BodyRegionId;
  missionId: MissionId;
  status: "victory" | "defeat";
  score: number;
  tissueHealthRemaining?: number;
  tissueMaxHealth?: number;
  civilianCellsSaved?: number;
  civilianCellsLost?: number;
  infectedCellsRemaining?: number;
  enemiesRemaining?: number;
  inflammationPeak?: number;
  antigensCollected?: number;
  lymphSignalsDelivered?: number;
  adaptiveResearchCompleted?: boolean;
  treatmentsUsed?: Partial<Record<string, number>>;
  timeElapsedMs?: number;
  threatType?: BodyThreatProfile;
  pathogenTypesEncountered?: PathogenTypeId[];
};

export type ReinforcementCost = {
  unitTypeId: UnitTypeId;
  atp: number;
  cytokines: number;
  antigens: number;
};

export type BodyBattlePreparation = {
  regionId: BodyRegionId;
  missionId: MissionId;
  reinforcements: StartingUnitDefinition[];
  regionalNodeId: RegionalNodeId;
  regionalNodeActive: boolean;
};
