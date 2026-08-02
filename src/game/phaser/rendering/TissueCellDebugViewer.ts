import Phaser from "phaser";
import {
  tissueCellSprite,
  type EntityVisualState,
} from "../assets/entitySpriteManifest";

const DEBUG_QUERY = "tissueCellDebug";
const STATES = [
  "healthy",
  "infected",
  "destroyed",
  "protected",
  "infectedProtected",
] as const satisfies readonly EntityVisualState[];

export class TissueCellDebugViewer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    const requested =
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get(DEBUG_QUERY) === "1";
    if (!requested || !scene.textures.exists(tissueCellSprite.textureKey)) return;

    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;
    const panel = scene.add
      .rectangle(centerX, centerY, 700, 210, 0x071217, 0.94)
      .setScrollFactor(0)
      .setDepth(310);
    const title = scene.add
      .text(centerX, centerY - 78, "TISSUE CELLS — DEBUG VISUEL", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "16px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(312);
    this.objects.push(panel, title);

    STATES.forEach((state, index) => {
      const x = centerX - 260 + index * 130;
      const animation = tissueCellSprite.animations[state];
      if (!animation || !scene.anims.exists(animation.key)) return;
      const sprite = scene.add
        .sprite(x, centerY, tissueCellSprite.textureKey)
        .setScale(1.7)
        .setScrollFactor(0)
        .setDepth(311);
      sprite.play(animation.key);
      const label = scene.add
        .text(x, centerY + 62, state.toUpperCase(), {
          color: state.includes("Protected") || state === "protected"
            ? "#68d8ff"
            : "#d8f4f0",
          fontFamily: "monospace",
          fontSize: state === "infectedProtected" ? "10px" : "12px",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(312);
      this.objects.push(sprite, label);
    });
  }

  destroy(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }
}
