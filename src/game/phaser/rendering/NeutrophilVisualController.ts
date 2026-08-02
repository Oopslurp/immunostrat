import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import {
  isNeutrophil,
  type NeutrophilEntity,
} from "../../simulation/entities";
import { neutrophilSprite } from "../assets/entitySpriteManifest";
import { resolveEntityVisual } from "./spriteResolver";

type NeutrophilVisualState =
  | "idle"
  | "move"
  | "attack"
  | "hurt"
  | "death"
  | "netBurst";

type NeutrophilVisualRecord = {
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  lastHealth: number;
  lastAttackCooldownMs: number;
  facing: -1 | 1;
  state: NeutrophilVisualState;
  animationKey: string | null;
  lockedState: NeutrophilVisualState | null;
  moving: boolean;
};

const MOVEMENT_EPSILON_SQUARED = 0.05 * 0.05;

export class NeutrophilVisualController {
  private readonly records = new Map<string, NeutrophilVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const neutrophils = Object.values(state.entities).filter(isNeutrophil);
    const activeIds = new Set(neutrophils.map((entity) => entity.id));

    for (const neutrophil of neutrophils) {
      const record = this.ensureRecord(neutrophil);
      if (record) {
        this.updateRecord(record, neutrophil);
      }
    }

    for (const [entityId, record] of this.records) {
      if (!activeIds.has(entityId)) {
        record.sprite.removeAllListeners();
        record.sprite.destroy();
        this.records.delete(entityId);
      }
    }
  }

  hasVisual(entityId: string): boolean {
    const record = this.records.get(entityId);
    return Boolean(record?.sprite.active && record.sprite.visible);
  }

  destroy(): void {
    for (const record of this.records.values()) {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
    }
    this.records.clear();
  }

  private ensureRecord(
    neutrophil: NeutrophilEntity,
  ): NeutrophilVisualRecord | null {
    const existing = this.records.get(neutrophil.id);
    if (existing) {
      return existing;
    }

    const resolved = resolveEntityVisual("neutrophil", "idle", {
      hasTexture: (key) => this.scene.textures.exists(key),
      hasAnimation: (key) => this.scene.anims.exists(key),
    });
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[neutrophil-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        neutrophil.position.x + neutrophilSprite.visualOffset.x,
        neutrophil.position.y + neutrophilSprite.visualOffset.y,
        neutrophilSprite.textureKey,
      )
      .setOrigin(neutrophilSprite.anchor.x, neutrophilSprite.anchor.y)
      .setScale(neutrophilSprite.scale)
      .setDepth(1);
    const record: NeutrophilVisualRecord = {
      entityId: neutrophil.id,
      sprite,
      lastPosition: { ...neutrophil.position },
      lastHealth: neutrophil.health,
      lastAttackCooldownMs: neutrophil.attackCooldownRemainingMs,
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
    this.records.set(neutrophil.id, record);
    this.playState(record, "idle");
    return record;
  }

  private updateRecord(
    record: NeutrophilVisualRecord,
    neutrophil: NeutrophilEntity,
  ): void {
    const deltaX = neutrophil.position.x - record.lastPosition.x;
    const deltaY = neutrophil.position.y - record.lastPosition.y;
    const targetDeltaX =
      (neutrophil.targetPosition?.x ?? neutrophil.position.x) -
      neutrophil.position.x;
    const moving =
      deltaX * deltaX + deltaY * deltaY >= MOVEMENT_EPSILON_SQUARED;
    const hurt = neutrophil.health < record.lastHealth - 0.01;
    const attacking =
      neutrophil.attackCooldownRemainingMs >
      record.lastAttackCooldownMs + 0.01;

    if (Math.abs(deltaX) > 0.05) {
      record.facing = deltaX < 0 ? -1 : 1;
    } else if (Math.abs(targetDeltaX) > 0.5) {
      record.facing = targetDeltaX < 0 ? -1 : 1;
    }

    record.moving = moving;
    record.sprite
      .setPosition(
        neutrophil.position.x + neutrophilSprite.visualOffset.x,
        neutrophil.position.y + neutrophilSprite.visualOffset.y,
      )
      .setFlipX(record.facing < 0)
      .setVisible(true);

    const desiredState = selectState(neutrophil, hurt, attacking, moving);
    const stateToPlay =
      record.lockedState && !canInterrupt(record.lockedState, desiredState)
        ? record.lockedState
        : desiredState;

    this.playState(record, stateToPlay);
    record.lastPosition = { ...neutrophil.position };
    record.lastHealth = neutrophil.health;
    record.lastAttackCooldownMs = neutrophil.attackCooldownRemainingMs;
  }

  private playState(
    record: NeutrophilVisualRecord,
    requestedState: NeutrophilVisualState,
  ): void {
    const resolved = resolveEntityVisual(
      "neutrophil",
      requestedState === "death" ? "dead" : requestedState,
      {
        hasTexture: (key) => this.scene.textures.exists(key),
        hasAnimation: (key) => this.scene.anims.exists(key),
      },
    );

    if (resolved.kind !== "sprite" || !resolved.animationKey) {
      record.sprite.setVisible(false);
      return;
    }

    if (
      resolved.animationKey !== record.animationKey ||
      (!record.sprite.anims.isPlaying && isLoopingState(requestedState))
    ) {
      record.sprite.play(resolved.animationKey);
      record.animationKey = resolved.animationKey;
    }
    record.state = requestedState;
    record.lockedState = isOneShotState(requestedState)
      ? requestedState
      : null;
  }

  private handleAnimationComplete(
    record: NeutrophilVisualRecord,
    animationKey: string,
  ): void {
    if (animationKey !== record.animationKey) {
      return;
    }
    if (record.state === "death" || record.state === "netBurst") {
      record.sprite.anims.pause();
      return;
    }

    record.lockedState = null;
    this.playState(record, record.moving ? "move" : "idle");
  }
}

function selectState(
  neutrophil: NeutrophilEntity,
  hurt: boolean,
  attacking: boolean,
  moving: boolean,
): NeutrophilVisualState {
  if (neutrophil.deathState === "netBurst") {
    return "netBurst";
  }
  if (neutrophil.deathState === "death" || neutrophil.health <= 0) {
    return "death";
  }
  if (hurt) {
    return "hurt";
  }
  if (attacking) {
    return "attack";
  }
  return moving ? "move" : "idle";
}

function canInterrupt(
  current: NeutrophilVisualState,
  requested: NeutrophilVisualState,
): boolean {
  const priority: Record<NeutrophilVisualState, number> = {
    idle: 0,
    move: 1,
    attack: 2,
    hurt: 3,
    death: 4,
    netBurst: 5,
  };

  return priority[requested] > priority[current];
}

function isOneShotState(state: NeutrophilVisualState): boolean {
  return state === "attack" || state === "hurt" || state === "death" || state === "netBurst";
}

function isLoopingState(state: NeutrophilVisualState): boolean {
  return state === "idle" || state === "move";
}
