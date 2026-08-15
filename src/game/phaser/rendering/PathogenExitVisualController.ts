import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import {
  isAdvancedThreat,
  isBacterium,
  isHostilePathogen,
  type BacteriumEntity,
} from "../../simulation/entities";
import { distanceSquared } from "../../types/shared";
import type { CapturedTargetVisual } from "./MacrophageVisualController";
import {
  drawProceduralPathogen,
  type PathogenExitMode,
} from "./drawProceduralPathogen";

type PathogenSnapshot = Readonly<{
  id: string;
  pathogenTypeId: BacteriumEntity["pathogenTypeId"];
  kind: "bacterium" | "virus" | "advancedThreat";
  x: number;
  y: number;
  radius: number;
  scale: number;
  alpha: number;
  health: number;
  phagocytosed: boolean;
}>;

type ExitRecord = Readonly<{
  snapshot: PathogenSnapshot;
  mode: PathogenExitMode;
  durationMs: number;
  target?: Readonly<{ x: number; y: number }>;
}> & {
  remainingMs: number;
};

export type CapturedPathogenVisualResolver = (
  bacterium: BacteriumEntity,
) => CapturedTargetVisual | null;

/** Keeps removed pathogens alive only in the view long enough to finish a short exit animation. */
export class PathogenExitVisualController {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly previousSnapshots = new Map<string, PathogenSnapshot>();
  private readonly exitRecords = new Map<string, ExitRecord>();
  private visibleEffectIds = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0.45);
  }

  update(
    state: GameState,
    deltaMs: number,
    resolveCapturedVisual?: CapturedPathogenVisualResolver,
  ): void {
    const currentSnapshots = new Map<string, PathogenSnapshot>();
    const freshInfectionEffects = state.effects.filter(
      (effect) =>
        effect.kind === "infection" && !this.visibleEffectIds.has(effect.id),
    );
    const consumedInfectionEffectIds = new Set<string>();

    for (const entity of Object.values(state.entities).filter(isHostilePathogen)) {
      const capturedVisual =
        isBacterium(entity) && resolveCapturedVisual
          ? resolveCapturedVisual(entity)
          : null;
      currentSnapshots.set(entity.id, {
        id: entity.id,
        pathogenTypeId: entity.pathogenTypeId,
        kind: entity.kind,
        x: capturedVisual?.x ?? entity.position.x,
        y: capturedVisual?.y ?? entity.position.y,
        radius: entity.radius,
        scale: capturedVisual?.scale ?? 1,
        alpha: isAdvancedThreat(entity) && !entity.detected ? 0.48 : 0.95,
        health: entity.health,
        phagocytosed: isBacterium(entity) && Boolean(entity.phagocytosedByEntityId),
      });
    }

    for (const [id, snapshot] of this.previousSnapshots) {
      if (
        currentSnapshots.has(id) ||
        this.exitRecords.has(id) ||
        snapshot.phagocytosed
      ) {
        continue;
      }

      const infectionEffect =
        snapshot.kind === "virus" && snapshot.health > 0
          ? freshInfectionEffects.find(
              (effect) =>
                !consumedInfectionEffectIds.has(effect.id) &&
                distanceSquared(snapshot, effect.position) <=
                  (snapshot.radius + effect.radius + 18) ** 2,
            )
          : undefined;
      if (infectionEffect) {
        consumedInfectionEffectIds.add(infectionEffect.id);
      }

      const mode: PathogenExitMode = infectionEffect ? "infection" : "death";
      const durationMs = mode === "infection" ? 220 : 280;
      this.exitRecords.set(id, {
        snapshot,
        mode,
        durationMs,
        target: infectionEffect
          ? { x: infectionEffect.position.x, y: infectionEffect.position.y }
          : undefined,
        remainingMs: durationMs,
      });
    }

    this.graphics.clear();
    for (const [id, record] of this.exitRecords) {
      record.remainingMs = Math.max(0, record.remainingMs - deltaMs);
      const progress = 1 - record.remainingMs / record.durationMs;

      drawProceduralPathogen(this.graphics, {
        identity: record.snapshot.id,
        pathogenTypeId: record.snapshot.pathogenTypeId,
        x: record.snapshot.x,
        y: record.snapshot.y,
        radius: record.snapshot.radius,
        scale: record.snapshot.scale,
        alpha: record.snapshot.alpha,
        elapsedMs: state.elapsedMs,
        exitMode: record.mode,
        exitProgress: progress,
        exitTarget: record.target,
      });

      if (record.remainingMs <= 0) {
        this.exitRecords.delete(id);
      }
    }

    this.previousSnapshots.clear();
    for (const [id, snapshot] of currentSnapshots) {
      this.previousSnapshots.set(id, snapshot);
    }
    this.visibleEffectIds = new Set(state.effects.map((effect) => effect.id));
  }

  destroy(): void {
    this.graphics.destroy();
    this.previousSnapshots.clear();
    this.exitRecords.clear();
    this.visibleEffectIds.clear();
  }
}
