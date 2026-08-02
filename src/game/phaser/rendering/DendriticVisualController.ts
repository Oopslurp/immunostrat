import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import {
  isDendriticCell,
  type DendriticCellEntity,
} from "../../simulation/entities";
import { dendriticCellSprite } from "../assets/entitySpriteManifest";
import {
  canInterruptDendriticState,
  didDendriticCollect,
  didDendriticSignal,
  isLoopingDendriticState,
  isOneShotDendriticState,
  selectDendriticVisualState,
  toDendriticEntityVisualState,
  type DendriticVisualState,
} from "./dendriticVisualState";
import { resolveEntityVisual } from "./spriteResolver";

type DendriticVisualRecord = {
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  lastHealth: number;
  lastCarriedDebrisCount: number;
  facing: -1 | 1;
  state: DendriticVisualState;
  animationKey: string | null;
  lockedState: DendriticVisualState | null;
  moving: boolean;
  carriedDebrisCount: number;
  away: boolean;
  signalPosition: { x: number; y: number } | null;
};

const MOVEMENT_EPSILON_SQUARED = 0.05 * 0.05;

export class DendriticVisualController {
  private readonly records = new Map<string, DendriticVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const dendriticCells = Object.values(state.entities).filter(isDendriticCell);
    const activeIds = new Set(dendriticCells.map((entity) => entity.id));

    for (const dendriticCell of dendriticCells) {
      const record = this.ensureRecord(dendriticCell);
      if (record) this.updateRecord(record, dendriticCell, state);
    }

    for (const record of this.records.values()) {
      if (!activeIds.has(record.entityId) && record.state !== "death") {
        this.playState(record, "death");
      }
    }
  }

  hasVisual(entityId: string): boolean {
    const record = this.records.get(entityId);
    return Boolean(record?.sprite.active && record.sprite.visible);
  }

  destroy(): void {
    for (const record of this.records.values()) {
      this.scene.tweens.killTweensOf(record.sprite);
      record.sprite.removeAllListeners();
      record.sprite.destroy();
    }
    this.records.clear();
  }

  private ensureRecord(
    dendriticCell: DendriticCellEntity,
  ): DendriticVisualRecord | null {
    const existing = this.records.get(dendriticCell.id);
    if (existing) return existing;

    const resolved = this.resolve("idle");
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[dendritic-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        dendriticCell.position.x + dendriticCellSprite.visualOffset.x,
        dendriticCell.position.y + dendriticCellSprite.visualOffset.y,
        dendriticCellSprite.textureKey,
      )
      .setOrigin(dendriticCellSprite.anchor.x, dendriticCellSprite.anchor.y)
      .setScale(dendriticCellSprite.scale)
      .setDepth(1);
    const record: DendriticVisualRecord = {
      entityId: dendriticCell.id,
      sprite,
      lastPosition: { ...dendriticCell.position },
      lastHealth: dendriticCell.health,
      lastCarriedDebrisCount: dendriticCell.carriedDebrisCount,
      facing: 1,
      state: "idle",
      animationKey: null,
      lockedState: null,
      moving: false,
      carriedDebrisCount: dendriticCell.carriedDebrisCount,
      away: dendriticCell.lymphTransit?.phase === "away",
      signalPosition: null,
    };

    sprite.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) =>
        this.handleAnimationComplete(record, animation.key),
    );
    this.records.set(dendriticCell.id, record);
    this.playState(record, "idle");
    return record;
  }

  private updateRecord(
    record: DendriticVisualRecord,
    dendriticCell: DendriticCellEntity,
    state: GameState,
  ): void {
    const deltaX = dendriticCell.position.x - record.lastPosition.x;
    const deltaY = dendriticCell.position.y - record.lastPosition.y;
    const targetDeltaX =
      (dendriticCell.targetPosition?.x ?? dendriticCell.position.x) -
      dendriticCell.position.x;
    const moving =
      deltaX * deltaX + deltaY * deltaY >= MOVEMENT_EPSILON_SQUARED;
    const hurt = dendriticCell.health < record.lastHealth - 0.01;
    const collected = didDendriticCollect(
      record.lastCarriedDebrisCount,
      dendriticCell.carriedDebrisCount,
    );
    const signalled = didDendriticSignal(
      record.lastCarriedDebrisCount,
      dendriticCell.carriedDebrisCount,
      dendriticCell.lymphTransit?.phase,
    );
    const away = dendriticCell.lymphTransit?.phase === "away";

    if (Math.abs(deltaX) > 0.05) {
      record.facing = deltaX < 0 ? -1 : 1;
    } else if (Math.abs(targetDeltaX) > 0.5) {
      record.facing = targetDeltaX < 0 ? -1 : 1;
    }

    if (signalled) {
      const signalExit = state.tacticalMap.lymphaticExits.find(
        (exit) => exit.id === dendriticCell.lymphTransit?.exitId,
      );
      record.signalPosition = signalExit
        ? { ...signalExit.position }
        : { ...record.lastPosition };
    }

    record.moving = moving;
    record.carriedDebrisCount = dendriticCell.carriedDebrisCount;
    record.away = away;

    const desiredState = selectDendriticVisualState({
      dead: dendriticCell.health <= 0,
      hurt,
      collected,
      signalled,
      moving,
      carriedDebrisCount: dendriticCell.carriedDebrisCount,
    });
    const stateToPlay =
      record.lockedState &&
      !canInterruptDendriticState(record.lockedState, desiredState)
        ? record.lockedState
        : desiredState;
    const isPlayingSignal = stateToPlay === "signal";
    const visualPosition =
      isPlayingSignal && record.signalPosition
        ? record.signalPosition
        : dendriticCell.position;

    record.sprite
      .setPosition(
        visualPosition.x + dendriticCellSprite.visualOffset.x,
        visualPosition.y + dendriticCellSprite.visualOffset.y,
      )
      .setFlipX(record.facing < 0)
      .setAlpha(isPlayingSignal ? 1 : dendriticCell.lymphTransit?.visualAlpha ?? 1)
      .setVisible(!away || isPlayingSignal);

    if (!away || isPlayingSignal) {
      this.playState(record, stateToPlay);
    }

    record.lastPosition = { ...dendriticCell.position };
    record.lastHealth = dendriticCell.health;
    record.lastCarriedDebrisCount = dendriticCell.carriedDebrisCount;
  }

  private playState(
    record: DendriticVisualRecord,
    requestedState: DendriticVisualState,
  ): void {
    if (record.state === "death" && requestedState !== "death") return;

    const resolved = this.resolve(requestedState);
    if (resolved.kind !== "sprite" || !resolved.animationKey) {
      if (requestedState === "death") {
        this.playProceduralDeathFallback(record);
      } else {
        record.sprite.setVisible(false);
      }
      return;
    }

    const shouldPlay =
      resolved.animationKey !== record.animationKey ||
      (!record.sprite.anims.isPlaying &&
        isLoopingDendriticState(requestedState));
    if (shouldPlay) {
      record.sprite.play(resolved.animationKey);
      record.animationKey = resolved.animationKey;
    }
    record.state = requestedState;
    record.lockedState = isOneShotDendriticState(requestedState)
      ? requestedState
      : null;
  }

  private handleAnimationComplete(
    record: DendriticVisualRecord,
    animationKey: string,
  ): void {
    if (animationKey !== record.animationKey) return;
    if (record.state === "death") {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
      this.records.delete(record.entityId);
      return;
    }
    if (record.state === "signal") {
      record.lockedState = null;
      record.signalPosition = null;
      record.sprite.setVisible(false);
      return;
    }

    record.lockedState = null;
    this.playState(
      record,
      selectDendriticVisualState({
        dead: false,
        hurt: false,
        collected: false,
        signalled: false,
        moving: record.moving,
        carriedDebrisCount: record.carriedDebrisCount,
      }),
    );
  }

  private resolve(state: DendriticVisualState) {
    return resolveEntityVisual(
      "dendriticCell",
      toDendriticEntityVisualState(state),
      {
        hasTexture: (key) => this.scene.textures.exists(key),
        hasAnimation: (key) => this.scene.anims.exists(key),
      },
    );
  }

  private playProceduralDeathFallback(record: DendriticVisualRecord): void {
    record.state = "death";
    record.lockedState = "death";
    record.sprite.setVisible(true);
    this.scene.tweens.add({
      targets: record.sprite,
      alpha: 0,
      scaleX: record.sprite.scaleX * 0.7,
      scaleY: record.sprite.scaleY * 0.25,
      duration: 420,
      onComplete: () => {
        record.sprite.removeAllListeners();
        record.sprite.destroy();
        this.records.delete(record.entityId);
      },
    });
  }
}
