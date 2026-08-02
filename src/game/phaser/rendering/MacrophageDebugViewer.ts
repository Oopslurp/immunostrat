import Phaser from "phaser";
import { macrophagePilotSprite } from "../assets/entitySpriteManifest";
import { toEntityVisualState, type MacrophageVisualState } from "./macrophageVisualState";

const DEBUG_QUERY = "macrophageDebug";

export function isMacrophageDebugRequested(search = window.location.search): boolean {
  return import.meta.env.DEV && new URLSearchParams(search).get(DEBUG_QUERY) === "1";
}

export class MacrophageDebugViewer {
  private sprite?: Phaser.GameObjects.Sprite;
  private text?: Phaser.GameObjects.Text;
  private markers?: Phaser.GameObjects.Graphics;
  private currentState: MacrophageVisualState = "idle";

  constructor(private readonly scene: Phaser.Scene) {
    if (!isMacrophageDebugRequested() || !scene.textures.exists(macrophagePilotSprite.textureKey)) {
      return;
    }

    const previewX = scene.scale.width * 0.55;
    const previewY = scene.scale.height * 0.5;
    this.sprite = scene.add
      .sprite(previewX, previewY, macrophagePilotSprite.textureKey)
      .setOrigin(macrophagePilotSprite.anchor.x, macrophagePilotSprite.anchor.y)
      .setScale(2)
      .setScrollFactor(0)
      .setDepth(300);
    this.markers = scene.add.graphics().setScrollFactor(0).setDepth(301);
    this.text = scene.add
      .text(previewX - 150, previewY - 165, "", {
        color: "#f5fbff",
        backgroundColor: "#071217dd",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: { x: 10, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(302);

    this.play("idle");
    scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.handleKeyDown, this);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.sprite?.destroy();
    this.text?.destroy();
    this.markers?.destroy();
    this.sprite = undefined;
    this.text = undefined;
    this.markers = undefined;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const states: Partial<Record<string, MacrophageVisualState>> = {
      "1": "idle",
      "2": "move",
      "3": "attack",
      "4": "phagocytosis",
      "5": "hurt",
      "6": "death",
    };
    const state = states[event.key];
    if (state) {
      this.play(state);
      return;
    }
    if (event.key.toLowerCase() === "f") {
      this.sprite?.toggleFlipX();
    } else if (event.key === "[") {
      if (this.sprite) this.sprite.anims.timeScale = Math.max(0.25, this.sprite.anims.timeScale - 0.25);
    } else if (event.key === "]") {
      if (this.sprite) this.sprite.anims.timeScale = Math.min(3, this.sprite.anims.timeScale + 0.25);
    }
  }

  private play(state: MacrophageVisualState): void {
    const sprite = this.sprite;
    const animation = macrophagePilotSprite.animations[toEntityVisualState(state)];
    if (!sprite || !animation || !this.scene.anims.exists(animation.key)) {
      return;
    }
    this.currentState = state;
    sprite.play(animation.key);
  }

  private update(): void {
    const sprite = this.sprite;
    if (!sprite) return;

    this.markers?.clear();
    this.markers?.lineStyle(2, 0xffc76b, 1);
    this.markers?.lineBetween(sprite.x - 8, sprite.y, sprite.x + 8, sprite.y);
    this.markers?.lineBetween(sprite.x, sprite.y - 8, sprite.x, sprite.y + 8);
    const point = macrophagePilotSprite.attachmentPoints.phagocytosis;
    if (point && this.markers) {
      const centerY = sprite.y - macrophagePilotSprite.visualOffset.y * 2;
      const pointX = sprite.x + point.x * 2 * (sprite.flipX ? -1 : 1);
      const pointY = centerY + point.y * 2;
      this.markers.fillStyle(0xf06cd6, 1);
      this.markers.fillCircle(pointX, pointY, 4);
    }

    this.text?.setText([
      "MACROPHAGE DEBUG (dev only)",
      "1 idle  2 move  3 attack",
      "4 phago 5 hurt  6 death",
      "F flip  [/] vitesse",
      `state: ${this.currentState}`,
      `frame: ${sprite.anims.currentFrame?.index ?? 0}`,
      `timeScale: ${sprite.anims.timeScale.toFixed(2)}`,
    ]);
  }
}
