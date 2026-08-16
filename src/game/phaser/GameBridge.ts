import type { GameCommand } from "../simulation/core/commands";
import type { GameState } from "../simulation/core/GameState";
import type { GameEntity } from "../simulation/entities";
import type { PathogenTypeId } from "../data/pathogens";
import type { MissionId } from "../data/missions";
import type { TreatmentId } from "../data/treatments";
import type { InfiniteRunInfo } from "../data/infiniteMode";
import type { TacticalMapGenerationSummary } from "../data/tacticalMaps";
import type { ObjectiveStatus } from "../campaign/objectives";
import type { EntityId } from "../types/shared";

export type ThreatSummaryItem = {
  pathogenTypeId: PathogenTypeId;
  count: number;
};

export type GameSnapshot = {
  missionId: MissionId;
  missionTitle: string;
  status: GameState["status"];
  tissueHealth: number;
  tissueMaxHealth: number;
  tissueRepairStatus: GameState["tissueRepair"]["status"];
  tissueRepairBlockedReason: GameState["tissueRepair"]["blockedReason"];
  tissueRepairRatePerSecond: number;
  elapsedMs: number;
  atp: number;
  atpPerSecond: number;
  cytokines: number;
  cytokinesPerSecond: number;
  antigens: number;
  antigensPerSecond: number;
  inflammation: number;
  neutrophilCooldownMs: number;
  massiveNeutralizationCooldownMs: number;
  antiviralSignalCooldownMs: number;
  antiviralActiveMs: number;
  treatmentCooldowns: Partial<Record<TreatmentId, number>>;
  activeTreatments: Partial<Record<TreatmentId, number>>;
  bacterialAnalysisComplete: boolean;
  viralAnalysisComplete: boolean;
  objectives: ObjectiveStatus[];
  score: number;
  rank: "C" | "B" | "A" | "S";
  peakInflammation: number;
  antigensCollected: number;
  lymphSignalsDelivered: number;
  treatmentsUsed: Partial<Record<string, number>>;
  currentWave: number;
  totalWaves: number;
  waveAlert?: {
    message: string;
    secondsRemaining: number;
  };
  entities: GameEntity[];
  debrisCount: number;
  biofilmCount: number;
  healthyTissueCells: number;
  infectedTissueCells: number;
  destroyedTissueCells: number;
  threatSummary: ThreatSummaryItem[];
  selectedEntityIds: GameState["selectedEntityIds"];
  tacticalMapSummary?: TacticalMapGenerationSummary;
  infinite?: InfiniteRunInfo;
};

type SnapshotListener = (snapshot: GameSnapshot) => void;
type CommandListener = (command: GameCommand) => void;
type PresentationFocusListener = (entityId: EntityId | null) => void;

export class GameBridge {
  private snapshotListeners = new Set<SnapshotListener>();
  private commandListeners = new Set<CommandListener>();
  private presentationFocusListeners = new Set<PresentationFocusListener>();

  subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);

    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  subscribeCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);

    return () => {
      this.commandListeners.delete(listener);
    };
  }

  subscribePresentationFocus(listener: PresentationFocusListener): () => void {
    this.presentationFocusListeners.add(listener);

    return () => {
      this.presentationFocusListeners.delete(listener);
    };
  }

  publishSnapshot(snapshot: GameSnapshot): void {
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }

  dispatch(command: GameCommand): void {
    for (const listener of this.commandListeners) {
      listener(command);
    }
  }

  setPresentationFocus(entityId: EntityId | null): void {
    for (const listener of this.presentationFocusListeners) {
      listener(entityId);
    }
  }
}
