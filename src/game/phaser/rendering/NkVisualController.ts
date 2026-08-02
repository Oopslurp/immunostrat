import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import { isNkCell, type NkCellEntity } from "../../simulation/entities";
import { nkCellSprite } from "../assets/entitySpriteManifest";
import {
  canInterruptNkState,
  didNkAttackTrigger,
  didNkCytotoxicStrike,
  isLoopingNkState,
  isOneShotNkState,
  nextNkStateAfterComplete,
  selectNkVisualState,
  toNkEntityVisualState,
  type NkVisualState,
} from "./nkVisualState";
import { resolveEntityVisual } from "./spriteResolver";

type NkVisualRecord = {
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  lastHealth: number;
  lastAttackCooldownMs: number;
  facing: -1 | 1;
  state: NkVisualState;
  animationKey: string | null;
  lockedState: NkVisualState | null;
  moving: boolean;
};

const MOVEMENT_EPSILON_SQUARED = 0.05 * 0.05;

export class NkVisualController {
  private readonly records = new Map<string, NkVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const nkCells = Object.values(state.entities).filter(isNkCell);
    const activeIds = new Set(nkCells.map((entity) => entity.id));

    for (const nkCell of nkCells) {
      const record = this.ensureRecord(nkCell);
      if (record) this.updateRecord(record, nkCell, state);
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

  private ensureRecord(nkCell: NkCellEntity): NkVisualRecord | null {
    const existing = this.records.get(nkCell.id);
    if (existing) return existing;

    const resolved = this.resolve("idle");
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[nk-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        nkCell.position.x + nkCellSprite.visualOffset.x,
        nkCell.position.y + nkCellSprite.visualOffset.y,
        nkCellSprite.textureKey,
      )
      .setOrigin(nkCellSprite.anchor.x, nkCellSprite.anchor.y)
      .setScale(nkCellSprite.scale)
      .setDepth(1);
    const record: NkVisualRecord = {
      entityId: nkCell.id,
      sprite,
      lastPosition: { ...nkCell.position },
      lastHealth: nkCell.health,
      lastAttackCooldownMs: nkCell.attackCooldownRemainingMs,
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
    this.records.set(nkCell.id, record);
    this.playState(record, "idle");
    return record;
  }

  private updateRecord(
    record: NkVisualRecord,
    nkCell: NkCellEntity,
    state: GameState,
  ): void {
    const deltaX = nkCell.position.x - record.lastPosition.x;
    const deltaY = nkCell.position.y - record.lastPosition.y;
    const targetDeltaX =
      (nkCell.targetPosition?.x ?? nkCell.position.x) - nkCell.position.x;
    const moving =
      deltaX * deltaX + deltaY * deltaY >= MOVEMENT_EPSILON_SQUARED;
    const hurt = nkCell.health < record.lastHealth - 0.01;
    const attacking = didNkAttackTrigger(
      record.lastAttackCooldownMs,
      nkCell.attackCooldownRemainingMs,
    );
    const cytotoxicStrike =
      attacking && didNkCytotoxicStrike(state.effects, nkCell.id);

    if (Math.abs(deltaX) > 0.05) {
      record.facing = deltaX < 0 ? -1 : 1;
    } else if (Math.abs(targetDeltaX) > 0.5) {
      record.facing = targetDeltaX < 0 ? -1 : 1;
    }

    record.moving = moving;
    record.sprite
      .setPosition(
        nkCell.position.x + nkCellSprite.visualOffset.x,
        nkCell.position.y + nkCellSprite.visualOffset.y,
      )
      .setFlipX(record.facing < 0)
      .setVisible(true);

    const desiredState = selectNkVisualState({
      dead: nkCell.health <= 0,
      hurt,
      attacking,
      cytotoxicStrike,
      moving,
    });
    const stateToPlay =
      record.lockedState &&
      !canInterruptNkState(record.lockedState, desiredState)
        ? record.lockedState
        : desiredState;

    this.playState(record, stateToPlay);
    record.lastPosition = { ...nkCell.position };
    record.lastHealth = nkCell.health;
    record.lastAttackCooldownMs = nkCell.attackCooldownRemainingMs;
  }

  private playState(
    record: NkVisualRecord,
    requestedState: NkVisualState,
  ): void {
    if (record.state === "death" && requestedState !== "death") return;

    const requestedVisualState = toNkEntityVisualState(requestedState);
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
      (!record.sprite.anims.isPlaying && isLoopingNkState(requestedState));
    if (shouldPlay) {
      record.sprite.play(resolved.animationKey);
      record.animationKey = resolved.animationKey;
    }
    record.state = requestedState;
    record.lockedState = isOneShotNkState(requestedState)
      ? requestedState
      : null;
  }

  private handleAnimationComplete(
    record: NkVisualRecord,
    animationKey: string,
  ): void {
    if (animationKey !== record.animationKey) return;
    if (record.state === "death") {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
      this.records.delete(record.entityId);
      return;
    }

    const nextState = nextNkStateAfterComplete(record.state, record.moving);
    record.lockedState = null;
    this.playState(record, nextState);
  }

  private resolve(state: NkVisualState) {
    return resolveEntityVisual("nkCell", toNkEntityVisualState(state), {
      hasTexture: (key) => this.scene.textures.exists(key),
      hasAnimation: (key) => this.scene.anims.exists(key),
    });
  }

  private playProceduralDeathFallback(record: NkVisualRecord): void {
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
