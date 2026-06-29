import type { GameCommand } from "../simulation/core/commands";
import type { GameState } from "../simulation/core/GameState";
import type { GameEntity } from "../simulation/entities";

export type GameSnapshot = {
  status: GameState["status"];
  tissueHealth: number;
  tissueMaxHealth: number;
  atp: number;
  cytokines: number;
  inflammation: number;
  neutrophilCooldownMs: number;
  currentWave: number;
  totalWaves: number;
  entities: GameEntity[];
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
