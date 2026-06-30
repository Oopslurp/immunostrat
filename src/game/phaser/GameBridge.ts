import type { GameCommand } from "../simulation/core/commands";
import type { GameState } from "../simulation/core/GameState";
import type { GameEntity } from "../simulation/entities";
import type { PathogenTypeId } from "../data/pathogens";

export type ThreatSummaryItem = {
  pathogenTypeId: PathogenTypeId;
  count: number;
};

export type GameSnapshot = {
  status: GameState["status"];
  tissueHealth: number;
  tissueMaxHealth: number;
  atp: number;
  cytokines: number;
  antigens: number;
  inflammation: number;
  neutrophilCooldownMs: number;
  massiveNeutralizationCooldownMs: number;
  bacterialAnalysisComplete: boolean;
  currentWave: number;
  totalWaves: number;
  entities: GameEntity[];
  debrisCount: number;
  biofilmCount: number;
  threatSummary: ThreatSummaryItem[];
  selectedEntityIds: GameState["selectedEntityIds"];
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
