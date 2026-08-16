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
import type { GameAudioEvent } from "../../audio/audioEvents";

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
type AudioEventListener = (event: GameAudioEvent) => void;

export type SessionPresentationState = Readonly<{
  paused: boolean;
  inputBlocked: boolean;
}>;

type SessionPresentationListener = (state: SessionPresentationState) => void;

export type SelectionPresentationState = Readonly<{
  hoveredSelectedUnitId: EntityId | null;
  focusedSelectedUnitId: EntityId | null;
}>;

export type SelectionPresentationCommand =
  | Readonly<{
      type: "hoverSelectedUnit";
      entityId: EntityId | null;
    }>
  | Readonly<{
      type: "toggleFocusedSelectedUnit";
      entityId: EntityId;
    }>;

type SelectionPresentationListener = (
  state: SelectionPresentationState,
) => void;
type SelectionPresentationCommandListener = (
  command: SelectionPresentationCommand,
) => void;

const EMPTY_SELECTION_PRESENTATION: SelectionPresentationState = {
  hoveredSelectedUnitId: null,
  focusedSelectedUnitId: null,
};

const ACTIVE_SESSION_PRESENTATION: SessionPresentationState = {
  paused: false,
  inputBlocked: false,
};

export class GameBridge {
  private snapshotListeners = new Set<SnapshotListener>();
  private commandListeners = new Set<CommandListener>();
  private selectionPresentationListeners =
    new Set<SelectionPresentationListener>();
  private selectionPresentationCommandListeners =
    new Set<SelectionPresentationCommandListener>();
  private selectionPresentation = EMPTY_SELECTION_PRESENTATION;
  private audioEventListeners = new Set<AudioEventListener>();
  private sessionPresentationListeners = new Set<SessionPresentationListener>();
  private sessionPresentation = ACTIVE_SESSION_PRESENTATION;

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

  subscribeAudioEvent(listener: AudioEventListener): () => void {
    this.audioEventListeners.add(listener);
    return () => this.audioEventListeners.delete(listener);
  }

  subscribeSessionPresentation(
    listener: SessionPresentationListener,
  ): () => void {
    this.sessionPresentationListeners.add(listener);
    listener(this.sessionPresentation);
    return () => this.sessionPresentationListeners.delete(listener);
  }

  subscribeSelectionPresentation(
    listener: SelectionPresentationListener,
  ): () => void {
    this.selectionPresentationListeners.add(listener);
    listener(this.selectionPresentation);

    return () => {
      this.selectionPresentationListeners.delete(listener);
    };
  }

  subscribeSelectionPresentationCommand(
    listener: SelectionPresentationCommandListener,
  ): () => void {
    this.selectionPresentationCommandListeners.add(listener);

    return () => {
      this.selectionPresentationCommandListeners.delete(listener);
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

  publishAudioEvent(event: GameAudioEvent): void {
    for (const listener of this.audioEventListeners) {
      listener(event);
    }
  }

  setSessionPresentation(state: SessionPresentationState): void {
    if (
      state.paused === this.sessionPresentation.paused &&
      state.inputBlocked === this.sessionPresentation.inputBlocked
    ) {
      return;
    }
    this.sessionPresentation = state;
    for (const listener of this.sessionPresentationListeners) {
      listener(state);
    }
  }

  isGameplayInputEnabled(): boolean {
    return !this.sessionPresentation.paused && !this.sessionPresentation.inputBlocked;
  }

  publishSelectionPresentation(state: SelectionPresentationState): void {
    if (
      state.hoveredSelectedUnitId ===
        this.selectionPresentation.hoveredSelectedUnitId &&
      state.focusedSelectedUnitId ===
        this.selectionPresentation.focusedSelectedUnitId
    ) {
      return;
    }

    this.selectionPresentation = state;

    for (const listener of this.selectionPresentationListeners) {
      listener(state);
    }
  }

  dispatchSelectionPresentation(command: SelectionPresentationCommand): void {
    if (!this.isGameplayInputEnabled()) {
      return;
    }
    for (const listener of this.selectionPresentationCommandListeners) {
      listener(command);
    }
  }
}
