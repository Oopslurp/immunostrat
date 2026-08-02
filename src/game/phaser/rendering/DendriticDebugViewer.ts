import Phaser from "phaser";
import {
  dendriticCellSprite,
  type EntityVisualState,
} from "../assets/entitySpriteManifest";

const DEBUG_QUERY = "dendriticDebug";
const STATES: ReadonlyArray<Readonly<{ label: string; state: EntityVisualState }>> = [
  { label: "IDLE", state: "idle" },
  { label: "MOVE", state: "move" },
  { label: "COLLECT", state: "collect" },
  { label: "CARRY", state: "carry" },
  { label: "SIGNAL", state: "signal" },
  { label: "HURT", state: "hurt" },
  { label: "DEATH", state: "dead" },
  { label: "MOVE +1", state: "moveCarry1" },
  { label: "MOVE +2", state: "moveCarry2" },
  { label: "MOVE +3", state: "moveCarry3" },
];

export function isDendriticDebugRequested(
  search = window.location.search,
): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(search).get(DEBUG_QUERY) === "1"
  );
}

export class DendriticDebugViewer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    if (
      !isDendriticDebugRequested() ||
      !scene.textures.exists(dendriticCellSprite.textureKey)
    ) {
      return;
    }

    const panel = scene.add
      .rectangle(scene.scale.width / 2, 195, 680, 300, 0x071217, 0.94)
      .setScrollFactor(0)
      .setDepth(390)
      .setStrokeStyle(2, 0xb69cff, 0.9);
    const title = scene.add
      .text(scene.scale.width / 2, 62, "DENDRITIC SPRITE DEBUG", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "18px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(392);
    this.objects.push(panel, title);

    STATES.forEach(({ label, state }, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = scene.scale.width / 2 - 260 + column * 130;
      const y = 150 + row * 130;
      const animation = dendriticCellSprite.animations[state];
      const sprite = scene.add
        .sprite(x, y, dendriticCellSprite.textureKey)
        .setOrigin(dendriticCellSprite.anchor.x, dendriticCellSprite.anchor.y)
        .setScale(1.35)
        .setScrollFactor(0)
        .setDepth(391);
      const caption = scene.add
        .text(x, y + 15, label, {
          color: "#d9d0ff",
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
