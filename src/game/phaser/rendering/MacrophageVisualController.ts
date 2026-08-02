import Phaser from "phaser";
import { balanceValues } from "../../data/balance";
import type { GameState } from "../../simulation/core/GameState";
import {
  isMacrophage,
  type BacteriumEntity,
  type MacrophageEntity,
} from "../../simulation/entities";
import { macrophagePilotSprite } from "../assets/entitySpriteManifest";
import { resolveEntityVisual } from "./spriteResolver";
import { calculatePhagocytosisVisualTransform } from "./macrophagePhagocytosisVisual";
import {
  canInterruptMacrophageState,
  didMacrophageAttackTrigger,
  isOneShotMacrophageState,
  resolveStableHorizontalFacing,
  selectMacrophageVisualState,
  shouldPlayMacrophageAnimation,
  stateAfterMacrophageAnimationComplete,
  toEntityVisualState,
  type MacrophageVisualState,
} from "./macrophageVisualState";

type MacrophageVisualRecord = {
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  lastHealth: number;
  lastAttackCooldownMs: number;
  facing: -1 | 1;
  currentState: MacrophageVisualState;
  currentAnimationKey: string | null;
  lockedState: MacrophageVisualState | null;
  hurtCooldownMs: number;
  moving: boolean;
  phagocytosisTargetId: string | null;
  completedPhagocytosisTargetId: string | null;
};

export type CapturedTargetVisual = Readonly<{
  x: number;
  y: number;
  scale: number;
  progress: number;
}>;

const MOVEMENT_DISTANCE_SQUARED = 0.05 * 0.05;
const HURT_VISUAL_COOLDOWN_MS = 480;

export class MacrophageVisualController {
  private readonly records = new Map<string, MacrophageVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState, deltaMs: number): void {
    const macrophages = Object.values(state.entities).filter(isMacrophage);
    const activeIds = new Set(macrophages.map((entity) => entity.id));

    for (const macrophage of macrophages) {
      const record = this.ensureRecord(macrophage);
      if (record) {
        this.updateRecord(record, macrophage, state, deltaMs);
      }
    }

    for (const record of this.records.values()) {
      if (!activeIds.has(record.entityId) && record.currentState !== "death") {
        this.playState(record, "death");
      }
    }
  }

  hasVisual(entityId: string): boolean {
    const record = this.records.get(entityId);
    return Boolean(record?.sprite.active && record.sprite.visible);
  }

  getCapturedTargetVisual(
    bacterium: BacteriumEntity,
    state: GameState,
  ): CapturedTargetVisual | null {
    const macrophageId = bacterium.phagocytosedByEntityId;
    const remainingMs = bacterium.phagocytosisRemainingMs;
    if (!macrophageId || remainingMs === undefined) {
      return null;
    }

    const macrophage = state.entities[macrophageId];
    const record = this.records.get(macrophageId);
    if (!macrophage || !isMacrophage(macrophage) || !record) {
      return null;
    }

    const attachment = macrophagePilotSprite.attachmentPoints.phagocytosis ?? {
      x: 17,
      y: -2,
    };
    return calculatePhagocytosisVisualTransform({
      bacteriumPosition: bacterium.position,
      macrophagePosition: macrophage.position,
      attachmentPoint: attachment,
      facing: record.facing,
      remainingMs,
      durationMs: balanceValues.combat.macrophagePhagocytosisDurationMs,
    });
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
    macrophage: MacrophageEntity,
  ): MacrophageVisualRecord | null {
    const existing = this.records.get(macrophage.id);
    if (existing) {
      return existing;
    }

    const resolved = resolveEntityVisual("macrophage", "idle", {
      hasTexture: (key) => this.scene.textures.exists(key),
      hasAnimation: (key) => this.scene.anims.exists(key),
    });
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[macrophage-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const definition = resolved.definition;
    const sprite = this.scene.add
      .sprite(
        macrophage.position.x + definition.visualOffset.x,
        macrophage.position.y + definition.visualOffset.y,
        definition.textureKey,
      )
      .setOrigin(definition.anchor.x, definition.anchor.y)
      .setScale(definition.scale)
      .setDepth(1);

    const record: MacrophageVisualRecord = {
      entityId: macrophage.id,
      sprite,
      lastPosition: { ...macrophage.position },
      lastHealth: macrophage.health,
      lastAttackCooldownMs: macrophage.attackCooldownRemainingMs,
      facing: 1,
      currentState: "idle",
      currentAnimationKey: null,
      lockedState: null,
      hurtCooldownMs: 0,
      moving: false,
      phagocytosisTargetId: null,
      completedPhagocytosisTargetId: null,
    };

    sprite.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) =>
        this.handleAnimationComplete(record, animation.key),
    );
    this.records.set(macrophage.id, record);
    this.playState(record, "idle");
    return record;
  }

  private updateRecord(
    record: MacrophageVisualRecord,
    macrophage: MacrophageEntity,
    state: GameState,
    deltaMs: number,
  ): void {
    const definition = macrophagePilotSprite;
    const deltaX = macrophage.position.x - record.lastPosition.x;
    const deltaY = macrophage.position.y - record.lastPosition.y;
    const targetDeltaX = (macrophage.targetPosition?.x ?? macrophage.position.x) -
      macrophage.position.x;
    const moving = deltaX * deltaX + deltaY * deltaY >= MOVEMENT_DISTANCE_SQUARED;
    const hurt =
      macrophage.health < record.lastHealth - 0.01 && record.hurtCooldownMs <= 0;
    const attackTriggered = didMacrophageAttackTrigger(
      record.lastAttackCooldownMs,
      macrophage.attackCooldownRemainingMs,
    );
    const phagocytosisTarget = Object.values(state.entities).find(
      (entity): entity is BacteriumEntity =>
        entity.kind === "bacterium" &&
        entity.phagocytosedByEntityId === macrophage.id,
    );

    if (phagocytosisTarget?.id !== record.phagocytosisTargetId) {
      record.phagocytosisTargetId = phagocytosisTarget?.id ?? null;
      record.completedPhagocytosisTargetId = null;
    }

    record.hurtCooldownMs = Math.max(0, record.hurtCooldownMs - deltaMs);
    if (hurt) {
      record.hurtCooldownMs = HURT_VISUAL_COOLDOWN_MS;
    }
    record.facing = resolveStableHorizontalFacing(
      record.facing,
      deltaX,
      targetDeltaX,
    );
    record.moving = moving;
    record.sprite
      .setPosition(
        macrophage.position.x + definition.visualOffset.x,
        macrophage.position.y + definition.visualOffset.y,
      )
      .setFlipX(record.facing < 0)
      .setVisible(true);

    const desiredState = selectMacrophageVisualState({
      dead: macrophage.health <= 0,
      hurt,
      phagocytosing:
        Boolean(phagocytosisTarget) &&
        phagocytosisTarget?.id !== record.completedPhagocytosisTargetId,
      attacking: attackTriggered,
      moving,
    });
    const stateToPlay =
      record.lockedState &&
      !canInterruptMacrophageState(record.lockedState, desiredState)
        ? record.lockedState
        : desiredState;

    this.playState(record, stateToPlay);
    record.lastPosition = { ...macrophage.position };
    record.lastHealth = macrophage.health;
    record.lastAttackCooldownMs = macrophage.attackCooldownRemainingMs;
  }

  private playState(
    record: MacrophageVisualRecord,
    requestedState: MacrophageVisualState,
  ): void {
    if (record.currentState === "death" && requestedState !== "death") {
      return;
    }

    const resolved = resolveEntityVisual(
      "macrophage",
      toEntityVisualState(requestedState),
      {
        hasTexture: (key) => this.scene.textures.exists(key),
        hasAnimation: (key) => this.scene.anims.exists(key),
      },
    );
    if (resolved.kind !== "sprite" || !resolved.animationKey) {
      if (requestedState === "death") {
        this.playProceduralDeathFallback(record);
      } else {
        record.sprite.setVisible(false);
      }
      return;
    }

    record.sprite.setVisible(true);
    if (
      shouldPlayMacrophageAnimation(
        record.currentAnimationKey,
        resolved.animationKey,
        record.sprite.anims.isPlaying,
      )
    ) {
      record.sprite.play(resolved.animationKey);
      record.currentAnimationKey = resolved.animationKey;
    }
    record.currentState = requestedState;
    record.lockedState = isOneShotMacrophageState(requestedState)
      ? requestedState
      : null;
  }

  private handleAnimationComplete(
    record: MacrophageVisualRecord,
    animationKey: string,
  ): void {
    if (animationKey !== record.currentAnimationKey) {
      return;
    }
    if (record.currentState === "death") {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
      this.records.delete(record.entityId);
      return;
    }
    if (record.currentState === "phagocytosis") {
      record.completedPhagocytosisTargetId = record.phagocytosisTargetId;
    }

    const nextState = stateAfterMacrophageAnimationComplete(
      record.currentState,
      record.moving,
    );
    record.lockedState = null;
    this.playState(record, nextState);
  }

  private playProceduralDeathFallback(record: MacrophageVisualRecord): void {
    record.currentState = "death";
    record.lockedState = "death";
    this.scene.tweens.add({
      targets: record.sprite,
      alpha: 0,
      scaleX: record.sprite.scaleX * 0.65,
      scaleY: record.sprite.scaleY * 0.3,
      duration: 420,
      onComplete: () => {
        record.sprite.removeAllListeners();
        record.sprite.destroy();
        this.records.delete(record.entityId);
      },
    });
  }
}
