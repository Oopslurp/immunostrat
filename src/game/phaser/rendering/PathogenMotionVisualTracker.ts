import type { GameState } from "../../simulation/core/GameState";
import { isHostilePathogen } from "../../simulation/entities";
import { stableHash } from "../../types/shared";

export type PathogenMotionVisual = Readonly<{
  facingAngle: number;
  movementIntensity: number;
  movementPhase: number;
}>;

export type PathogenMotionRecord = PathogenMotionVisual & {
  x: number;
  y: number;
};

export type PathogenMotionStepInput = Readonly<{
  identity: string;
  x: number;
  y: number;
  movementSpeed: number;
  deltaMs: number;
}>;

/** Derives renderer-only locomotion data from consecutive simulation snapshots. */
export function advancePathogenMotionVisual(
  previous: Readonly<PathogenMotionRecord> | undefined,
  input: PathogenMotionStepInput,
): PathogenMotionRecord {
  const dx = previous ? input.x - previous.x : 0;
  const dy = previous ? input.y - previous.y : 0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const expectedDistance = Math.max(
    0.1,
    input.movementSpeed * (Math.max(1, input.deltaMs) / 1000),
  );
  const rawIntensity = Math.min(1, distance / expectedDistance);
  const movementIntensity =
    distance > 0.04
      ? rawIntensity
      : (previous?.movementIntensity ?? 0) *
        Math.max(0, 1 - input.deltaMs / 120);
  const facingAngle =
    distance > 0.04
      ? Math.atan2(dy, dx)
      : previous?.facingAngle ??
        ((stableHash(input.identity) % 360) * Math.PI) / 180;
  const movementPhase =
    (previous?.movementPhase ??
      ((stableHash(`${input.identity}:motion`) % 628) / 100)) +
    distance * 0.34;

  return {
    x: input.x,
    y: input.y,
    facingAngle,
    movementIntensity,
    movementPhase,
  };
}

export class PathogenMotionVisualTracker {
  private readonly records = new Map<string, PathogenMotionRecord>();

  update(state: GameState, deltaMs: number): void {
    const activeIds = new Set<string>();

    for (const entity of Object.values(state.entities).filter(isHostilePathogen)) {
      activeIds.add(entity.id);
      this.records.set(
        entity.id,
        advancePathogenMotionVisual(this.records.get(entity.id), {
          identity: entity.id,
          x: entity.position.x,
          y: entity.position.y,
          movementSpeed: entity.movementSpeed,
          deltaMs,
        }),
      );
    }

    for (const id of this.records.keys()) {
      if (!activeIds.has(id)) {
        this.records.delete(id);
      }
    }
  }

  get(entityId: string): PathogenMotionVisual | undefined {
    return this.records.get(entityId);
  }

  destroy(): void {
    this.records.clear();
  }
}
