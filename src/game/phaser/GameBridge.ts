import type { GameCommand } from "../simulation/core/commands";
import type { GameState } from "../simulation/core/GameState";
import type { GameEntity } from "../simulation/entities";
import type { PathogenTypeId } from "../data/pathogens";
import type { MissionId } from "../data/missions";
import type { TreatmentId } from "../data/treatments";
import type { InfiniteRunInfo } from "../data/infiniteMode";
import type { ObjectiveStatus } from "../campaign/objectives";

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
  elapsedMs: number;
  atp: number;
  cytokines: number;
  antigens: number;
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
  entities: GameEntity[];
  debrisCount: number;
  biofilmCount: number;
  healthyTissueCells: number;
  infectedTissueCells: number;
  destroyedTissueCells: number;
  threatSummary: ThreatSummaryItem[];
  selectedEntityIds: GameState["selectedEntityIds"];
  infinite?: InfiniteRunInfo;
};

type SnapshotListener = (snapshot: GameSnapshot) => void;
type CommandListener = (command: GameCommand) => void;

export class GameBridge {
  private snapshotListeners = new Set<SnapshotListener>();
  private commandListeners = new Set<CommandListener>();

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
}
