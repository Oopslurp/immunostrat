import Phaser from "phaser";
import type { GameState } from "../../simulation/core/GameState";
import {
  antibodyImpactSprite,
  antibodyProjectileSprite,
  type EntityVisualState,
} from "../assets/entitySpriteManifest";

type ProjectileRecord = {
  sprite: Phaser.GameObjects.Sprite;
  lastPosition: { x: number; y: number };
  animationState: EntityVisualState | null;
};

export class AntibodyProjectileVisualController {
  private readonly projectileRecords = new Map<string, ProjectileRecord>();
  private readonly impactSprites = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    this.updateProjectiles(state);
    this.updateImpacts(state);
  }

  hasProjectileVisual(id: string): boolean {
    return this.projectileRecords.get(id)?.sprite.visible ?? false;
  }

  hasImpactVisual(id: string): boolean {
    return this.impactSprites.get(id)?.visible ?? false;
  }

  destroy(): void {
    for (const record of this.projectileRecords.values()) {
      record.sprite.removeAllListeners();
      record.sprite.destroy();
    }
    for (const sprite of this.impactSprites.values()) {
      sprite.removeAllListeners();
      sprite.destroy();
    }
    this.projectileRecords.clear();
    this.impactSprites.clear();
  }

  private updateProjectiles(state: GameState): void {
    const activeIds = new Set(
      state.antibodyProjectiles.map((projectile) => projectile.id),
    );

    for (const projectile of state.antibodyProjectiles) {
      const record = this.ensureProjectile(projectile.id, projectile.position);
      if (!record) continue;

      if (projectile.launchDelayMs > 0) {
        record.sprite.setVisible(false);
        record.lastPosition = { ...projectile.position };
        continue;
      }

      const deltaX = projectile.position.x - record.lastPosition.x;
      const deltaY = projectile.position.y - record.lastPosition.y;
      const target = state.entities[projectile.targetEntityId];
      const headingX =
        Math.abs(deltaX) + Math.abs(deltaY) > 0.05
          ? deltaX
          : (target?.position.x ?? projectile.position.x) - projectile.position.x;
      const headingY =
        Math.abs(deltaX) + Math.abs(deltaY) > 0.05
          ? deltaY
          : (target?.position.y ?? projectile.position.y) - projectile.position.y;
      const { state: animationState, flipX } = selectDirection(
        headingX,
        headingY,
      );
      const animation = antibodyProjectileSprite.animations[animationState];

      record.sprite
        .setPosition(projectile.position.x, projectile.position.y)
        .setFlipX(flipX);

      if (!animation || !this.scene.anims.exists(animation.key)) {
        record.sprite.setVisible(false);
        record.lastPosition = { ...projectile.position };
        continue;
      }

      record.sprite.setVisible(true);
      if (record.animationState !== animationState) {
        record.sprite.play(animation.key);
        record.animationState = animationState;
      }

      record.lastPosition = { ...projectile.position };
    }

    for (const [id, record] of this.projectileRecords) {
      if (activeIds.has(id)) continue;
      record.sprite.removeAllListeners();
      record.sprite.destroy();
      this.projectileRecords.delete(id);
    }
  }

  private updateImpacts(state: GameState): void {
    const impacts = state.effects.filter(
      (effect) => effect.kind === "antibodyImpact",
    );
    const activeIds = new Set(impacts.map((effect) => effect.id));

    for (const effect of impacts) {
      const existing = this.impactSprites.get(effect.id);
      if (existing) {
        existing.setPosition(effect.position.x, effect.position.y);
        continue;
      }

      if (
        !this.scene.textures.exists(antibodyImpactSprite.textureKey) ||
        !this.scene.anims.exists(
          antibodyImpactSprite.animations.impact?.key ?? "",
        )
      ) {
        continue;
      }

      const sprite = this.scene.add
        .sprite(
          effect.position.x,
          effect.position.y,
          antibodyImpactSprite.textureKey,
        )
        .setOrigin(
          antibodyImpactSprite.anchor.x,
          antibodyImpactSprite.anchor.y,
        )
        .setScale(antibodyImpactSprite.scale)
        .setDepth(6);
      const impactKey = antibodyImpactSprite.animations.impact?.key;
      const fixedKey = antibodyImpactSprite.animations.fixed?.key;

      if (impactKey) {
        sprite.play(impactKey);
        sprite.on(
          Phaser.Animations.Events.ANIMATION_COMPLETE,
          (animation: Phaser.Animations.Animation) => {
            if (
              animation.key === impactKey &&
              fixedKey &&
              this.scene.anims.exists(fixedKey) &&
              sprite.active
            ) {
              sprite.play(fixedKey);
            }
          },
        );
      }
      this.impactSprites.set(effect.id, sprite);
    }

    for (const [id, sprite] of this.impactSprites) {
      if (activeIds.has(id)) continue;
      sprite.removeAllListeners();
      sprite.destroy();
      this.impactSprites.delete(id);
    }
  }

  private ensureProjectile(
    id: string,
    position: { x: number; y: number },
  ): ProjectileRecord | null {
    const existing = this.projectileRecords.get(id);
    if (existing) return existing;

    if (
      !this.scene.textures.exists(antibodyProjectileSprite.textureKey)
    ) {
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        position.x,
        position.y,
        antibodyProjectileSprite.textureKey,
      )
      .setOrigin(
        antibodyProjectileSprite.anchor.x,
        antibodyProjectileSprite.anchor.y,
      )
      .setScale(antibodyProjectileSprite.scale)
      .setDepth(5)
      .setVisible(false);
    const record: ProjectileRecord = {
      sprite,
      lastPosition: { ...position },
      animationState: null,
    };
    this.projectileRecords.set(id, record);
    return record;
  }
}

function selectDirection(
  deltaX: number,
  deltaY: number,
): { state: EntityVisualState; flipX: boolean } {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absY <= absX * 0.48) {
    return deltaX < 0
      ? { state: "left", flipX: false }
      : { state: "right", flipX: false };
  }

  return {
    state: deltaY < 0 ? "upRight" : "downRight",
    flipX: deltaX < 0,
  };
}
