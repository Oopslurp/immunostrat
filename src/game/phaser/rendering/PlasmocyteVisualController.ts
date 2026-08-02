import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import {
  isPlasmocyte,
  type PlasmocyteEntity,
} from "../../simulation/entities";
import { plasmocyteSprite } from "../assets/entitySpriteManifest";
import {
  canInterruptPlasmocyteState,
  didPlasmocyteAttackTrigger,
  isLoopingPlasmocyteState,
  isOneShotPlasmocyteState,
  nextPlasmocyteStateAfterComplete,
  selectPlasmocyteVisualState,
  toPlasmocyteEntityVisualState,
  type PlasmocyteVisualState,
} from "./plasmocyteVisualState";
import { resolveEntityVisual } from "./spriteResolver";

type PlasmocyteVisualRecord = {
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  lastHealth: number;
  lastAttackCooldownMs: number;
  facing: -1 | 1;
  state: PlasmocyteVisualState;
  animationKey: string | null;
  lockedState: PlasmocyteVisualState | null;
  moving: boolean;
};

const MOVEMENT_EPSILON_SQUARED = 0.05 * 0.05;

export class PlasmocyteVisualController {
  private readonly records = new Map<string, PlasmocyteVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const plasmocytes = Object.values(state.entities).filter(isPlasmocyte);
    const activeIds = new Set(plasmocytes.map((entity) => entity.id));

    for (const plasmocyte of plasmocytes) {
      const record = this.ensureRecord(plasmocyte);
      if (record) this.updateRecord(record, plasmocyte);
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
    plasmocyte: PlasmocyteEntity,
  ): PlasmocyteVisualRecord | null {
    const existing = this.records.get(plasmocyte.id);
    if (existing) return existing;

    const resolved = this.resolve("idle");
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[plasmocyte-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        plasmocyte.position.x + plasmocyteSprite.visualOffset.x,
        plasmocyte.position.y + plasmocyteSprite.visualOffset.y,
        plasmocyteSprite.textureKey,
      )
      .setOrigin(plasmocyteSprite.anchor.x, plasmocyteSprite.anchor.y)
      .setScale(plasmocyteSprite.scale)
      .setDepth(1);
    const record: PlasmocyteVisualRecord = {
      entityId: plasmocyte.id,
      sprite,
      lastPosition: { ...plasmocyte.position },
      lastHealth: plasmocyte.health,
      lastAttackCooldownMs: plasmocyte.attackCooldownRemainingMs,
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
    this.records.set(plasmocyte.id, record);
    this.playState(record, "idle");
    return record;
  }

  private updateRecord(
    record: PlasmocyteVisualRecord,
    plasmocyte: PlasmocyteEntity,
  ): void {
    const deltaX = plasmocyte.position.x - record.lastPosition.x;
    const deltaY = plasmocyte.position.y - record.lastPosition.y;
    const targetDeltaX =
      (plasmocyte.targetPosition?.x ?? plasmocyte.position.x) -
      plasmocyte.position.x;
    const moving =
      deltaX * deltaX + deltaY * deltaY >= MOVEMENT_EPSILON_SQUARED;
    const hurt = plasmocyte.health < record.lastHealth - 0.01;
    const attacking = didPlasmocyteAttackTrigger(
      record.lastAttackCooldownMs,
      plasmocyte.attackCooldownRemainingMs,
    );

    if (Math.abs(deltaX) > 0.05) {
      record.facing = deltaX < 0 ? -1 : 1;
    } else if (Math.abs(targetDeltaX) > 0.5) {
      record.facing = targetDeltaX < 0 ? -1 : 1;
    }

    record.moving = moving;
    record.sprite
      .setPosition(
        plasmocyte.position.x + plasmocyteSprite.visualOffset.x,
        plasmocyte.position.y + plasmocyteSprite.visualOffset.y,
      )
      .setFlipX(record.facing < 0)
      .setVisible(true);

    const desiredState = selectPlasmocyteVisualState({
      dead: plasmocyte.health <= 0,
      hurt,
      attacking,
      moving,
    });
    const stateToPlay =
      record.lockedState &&
      !canInterruptPlasmocyteState(record.lockedState, desiredState)
        ? record.lockedState
        : desiredState;

    this.playState(record, stateToPlay);
    record.lastPosition = { ...plasmocyte.position };
    record.lastHealth = plasmocyte.health;
    record.lastAttackCooldownMs = plasmocyte.attackCooldownRemainingMs;
  }

  private playState(
    record: PlasmocyteVisualRecord,
    requestedState: PlasmocyteVisualState,
  ): void {
    if (record.state === "death" && requestedState !== "death") return;

    const requestedVisualState =
      toPlasmocyteEntityVisualState(requestedState);
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
        isLoopingPlasmocyteState(requestedState));
    if (shouldPlay) {
      record.sprite.play(resolved.animationKey);
      record.animationKey = resolved.animationKey;
    }
    record.state = requestedState;
    record.lockedState = isOneShotPlasmocyteState(requestedState)
      ? requestedState
      : null;
  }

  private handleAnimationComplete(
    record: PlasmocyteVisualRecord,
    animationKey: string,
  ): void {
    if (animationKey !== record.animationKey) return;
    if (record.state === "death") {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
      this.records.delete(record.entityId);
      return;
    }

    const nextState = nextPlasmocyteStateAfterComplete(
      record.state,
      record.moving,
    );
    record.lockedState = null;
    this.playState(record, nextState);
  }

  private resolve(state: PlasmocyteVisualState) {
    return resolveEntityVisual(
      "plasmocyte",
      toPlasmocyteEntityVisualState(state),
      {
        hasTexture: (key) => this.scene.textures.exists(key),
        hasAnimation: (key) => this.scene.anims.exists(key),
      },
    );
  }

  private playProceduralDeathFallback(
    record: PlasmocyteVisualRecord,
  ): void {
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
