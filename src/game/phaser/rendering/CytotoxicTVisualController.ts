import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import {
  isCytotoxicT,
  type CytotoxicTEntity,
} from "../../simulation/entities";
import { cytotoxicTSprite } from "../assets/entitySpriteManifest";
import {
  canInterruptCytotoxicTState,
  didCytotoxicTAttackTrigger,
  didCytotoxicTStrikeEffect,
  isLoopingCytotoxicTState,
  isOneShotCytotoxicTState,
  nextCytotoxicTStateAfterComplete,
  selectCytotoxicTVisualState,
  toCytotoxicTEntityVisualState,
  type CytotoxicTVisualState,
} from "./cytotoxicTVisualState";
import { resolveEntityVisual } from "./spriteResolver";

type CytotoxicTVisualRecord = {
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  lastHealth: number;
  lastAttackCooldownMs: number;
  facing: -1 | 1;
  state: CytotoxicTVisualState;
  animationKey: string | null;
  lockedState: CytotoxicTVisualState | null;
  moving: boolean;
};

const MOVEMENT_EPSILON_SQUARED = 0.05 * 0.05;

export class CytotoxicTVisualController {
  private readonly records = new Map<string, CytotoxicTVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const cells = Object.values(state.entities).filter(isCytotoxicT);
    const activeIds = new Set(cells.map((entity) => entity.id));

    for (const cell of cells) {
      const record = this.ensureRecord(cell);
      if (record) this.updateRecord(record, cell, state);
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

  private ensureRecord(cell: CytotoxicTEntity): CytotoxicTVisualRecord | null {
    const existing = this.records.get(cell.id);
    if (existing) return existing;

    const resolved = this.resolve("idle");
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[cytotoxic-t-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        cell.position.x + cytotoxicTSprite.visualOffset.x,
        cell.position.y + cytotoxicTSprite.visualOffset.y,
        cytotoxicTSprite.textureKey,
      )
      .setOrigin(cytotoxicTSprite.anchor.x, cytotoxicTSprite.anchor.y)
      .setScale(cytotoxicTSprite.scale)
      .setDepth(1);
    const record: CytotoxicTVisualRecord = {
      entityId: cell.id,
      sprite,
      lastPosition: { ...cell.position },
      lastHealth: cell.health,
      lastAttackCooldownMs: cell.attackCooldownRemainingMs,
      facing: 1,
      state: "idle",
      animationKey: null,
      lockedState: null,
      moving: false,
    };

    sprite.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) =>
        this.handleAnimationComplete(record, animation.key),
    );
    this.records.set(cell.id, record);
    this.playState(record, "idle");
    return record;
  }

  private updateRecord(
    record: CytotoxicTVisualRecord,
    cell: CytotoxicTEntity,
    state: GameState,
  ): void {
    const deltaX = cell.position.x - record.lastPosition.x;
    const deltaY = cell.position.y - record.lastPosition.y;
    const targetDeltaX =
      (cell.targetPosition?.x ?? cell.position.x) - cell.position.x;
    const moving =
      deltaX * deltaX + deltaY * deltaY >= MOVEMENT_EPSILON_SQUARED;
    const hurt = cell.health < record.lastHealth - 0.01;
    const attacking =
      didCytotoxicTAttackTrigger(
        record.lastAttackCooldownMs,
        cell.attackCooldownRemainingMs,
      ) && didCytotoxicTStrikeEffect(state.effects, cell.id);

    if (Math.abs(deltaX) > 0.05) {
      record.facing = deltaX < 0 ? -1 : 1;
    } else if (Math.abs(targetDeltaX) > 0.5) {
      record.facing = targetDeltaX < 0 ? -1 : 1;
    }

    record.moving = moving;
    record.sprite
      .setPosition(
        cell.position.x + cytotoxicTSprite.visualOffset.x,
        cell.position.y + cytotoxicTSprite.visualOffset.y,
      )
      .setFlipX(record.facing < 0)
      .setVisible(true);

    const desiredState = selectCytotoxicTVisualState({
      dead: cell.health <= 0,
      hurt,
      attacking,
      moving,
    });
    const stateToPlay =
      record.lockedState &&
      !canInterruptCytotoxicTState(record.lockedState, desiredState)
        ? record.lockedState
        : desiredState;

    this.playState(record, stateToPlay);
    record.lastPosition = { ...cell.position };
    record.lastHealth = cell.health;
    record.lastAttackCooldownMs = cell.attackCooldownRemainingMs;
  }

  private playState(
    record: CytotoxicTVisualRecord,
    requestedState: CytotoxicTVisualState,
  ): void {
    if (record.state === "death" && requestedState !== "death") return;

    const requestedVisualState = toCytotoxicTEntityVisualState(requestedState);
    const resolved = this.resolve(requestedState);
    if (
      resolved.kind !== "sprite" ||
      !resolved.animationKey ||
      resolved.resolvedState !== requestedVisualState
    ) {
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
        isLoopingCytotoxicTState(requestedState));
    if (shouldPlay) {
      record.sprite.play(resolved.animationKey);
      record.animationKey = resolved.animationKey;
    }
    record.state = requestedState;
    record.lockedState = isOneShotCytotoxicTState(requestedState)
      ? requestedState
      : null;
  }

  private handleAnimationComplete(
    record: CytotoxicTVisualRecord,
    animationKey: string,
  ): void {
    if (animationKey !== record.animationKey) return;
    if (record.state === "death") {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
      this.records.delete(record.entityId);
      return;
    }

    const nextState = nextCytotoxicTStateAfterComplete(
      record.state,
      record.moving,
    );
    record.lockedState = null;
    this.playState(record, nextState);
  }

  private resolve(state: CytotoxicTVisualState) {
    return resolveEntityVisual(
      "cytotoxicT",
      toCytotoxicTEntityVisualState(state),
      {
        hasTexture: (key) => this.scene.textures.exists(key),
        hasAnimation: (key) => this.scene.anims.exists(key),
      },
    );
  }

  private playProceduralDeathFallback(record: CytotoxicTVisualRecord): void {
    record.state = "death";
    record.lockedState = "death";
    record.sprite.setVisible(true);
    this.scene.tweens.add({
      targets: record.sprite,
      alpha: 0,
      scaleX: record.sprite.scaleX * 0.65,
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
