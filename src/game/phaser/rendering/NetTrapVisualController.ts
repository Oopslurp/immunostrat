import Phaser from "phaser";
import { balanceValues } from "../../data/balance";
import type { GameState, NetTrapState } from "../../simulation/core/GameState";
import { neutrophilSprite } from "../assets/entitySpriteManifest";
import { resolveEntityVisual } from "./spriteResolver";

export class NetTrapVisualController {
  private readonly sprites = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const activeIds = new Set(state.netTraps.map((trap) => trap.id));

    for (const trap of state.netTraps) {
      this.updateTrap(trap);
    }

    for (const [trapId, sprite] of this.sprites) {
      if (!activeIds.has(trapId)) {
        sprite.destroy();
        this.sprites.delete(trapId);
      }
    }
  }

  hasVisual(trapId: string): boolean {
    return Boolean(this.sprites.get(trapId)?.active);
  }

  destroy(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
  }

  private updateTrap(trap: NetTrapState): void {
    let sprite = this.sprites.get(trap.id);

    if (!sprite) {
      const resolved = resolveEntityVisual("neutrophil", "netTrap", {
        hasTexture: (key) => this.scene.textures.exists(key),
        hasAnimation: (key) => this.scene.anims.exists(key),
      });
      if (resolved.kind !== "sprite" || !resolved.animationKey) {
        return;
      }

      sprite = this.scene.add
        .sprite(
          trap.position.x,
          trap.position.y,
          neutrophilSprite.textureKey,
        )
        .setOrigin(0.5, 0.5)
        .setScale(1.35)
        .setDepth(0.5)
        .play(resolved.animationKey);
      this.sprites.set(trap.id, sprite);
    }

    const lifeRatio = Phaser.Math.Clamp(
      trap.remainingMs / balanceValues.netosis.durationMs,
      0,
      1,
    );
    sprite
      .setPosition(trap.position.x, trap.position.y)
      .setAlpha(0.48 + lifeRatio * 0.42);
  }
}
