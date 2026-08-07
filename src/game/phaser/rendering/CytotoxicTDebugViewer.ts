import Phaser from "phaser";
import {
  cytotoxicTSprite,
  type EntityVisualState,
} from "../assets/entitySpriteManifest";

const DEBUG_QUERY = "cytotoxicTDebug";
const STATES: ReadonlyArray<
  Readonly<{ label: string; state: EntityVisualState }>
> = [
  { label: "IDLE", state: "idle" },
  { label: "MOVE", state: "move" },
  { label: "STRIKE", state: "special" },
  { label: "HURT", state: "hurt" },
  { label: "DEATH", state: "dead" },
  { label: "DETECT OK", state: "detectNormal" },
  { label: "DETECT KO", state: "detectAbnormal" },
];

export function isCytotoxicTDebugRequested(
  search = window.location.search,
): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(search).get(DEBUG_QUERY) === "1"
  );
}

export class CytotoxicTDebugViewer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    if (
      !isCytotoxicTDebugRequested() ||
      !scene.textures.exists(cytotoxicTSprite.textureKey)
    ) {
      return;
    }

    const panel = scene.add
      .rectangle(scene.scale.width / 2, 185, 680, 260, 0x071217, 0.94)
      .setScrollFactor(0)
      .setDepth(390)
      .setStrokeStyle(2, 0xf06cd6, 0.9);
    const title = scene.add
      .text(scene.scale.width / 2, 70, "CYTOTOXIC T SPRITE DEBUG", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "18px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(392);
    this.objects.push(panel, title);

    STATES.forEach(({ label, state }, index) => {
      const x = scene.scale.width / 2 - 270 + index * 90;
      const y = 185;
      const animation = cytotoxicTSprite.animations[state];
      const sprite = scene.add
        .sprite(x, y, cytotoxicTSprite.textureKey)
        .setOrigin(cytotoxicTSprite.anchor.x, cytotoxicTSprite.anchor.y)
        .setScale(1.25)
        .setScrollFactor(0)
        .setDepth(391);
      const caption = scene.add
        .text(x, y + 18, label, {
          color: "#ffb5ed",
          fontFamily: "monospace",
          fontSize: "12px",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(392);

      if (animation && scene.anims.exists(animation.key)) {
        sprite.play(animation.key);
      }
      this.objects.push(sprite, caption);
    });
  }

  destroy(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }
}
