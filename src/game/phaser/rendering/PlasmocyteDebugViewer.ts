import Phaser from "phaser";
import {
  plasmocyteSprite,
  type EntityVisualState,
} from "../assets/entitySpriteManifest";

const DEBUG_QUERY = "plasmocyteDebug";
const STATES: ReadonlyArray<Readonly<{ label: string; state: EntityVisualState }>> = [
  { label: "IDLE", state: "idle" },
  { label: "MOVE", state: "move" },
  { label: "PRODUCE", state: "special" },
  { label: "SECRETE", state: "attack" },
  { label: "HURT", state: "hurt" },
  { label: "DEATH", state: "dead" },
];

export function isPlasmocyteDebugRequested(
  search = window.location.search,
): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(search).get(DEBUG_QUERY) === "1"
  );
}

export class PlasmocyteDebugViewer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    if (
      !isPlasmocyteDebugRequested() ||
      !scene.textures.exists(plasmocyteSprite.textureKey)
    ) {
      return;
    }

    const panel = scene.add
      .rectangle(scene.scale.width / 2, 185, 720, 260, 0x071217, 0.94)
      .setScrollFactor(0)
      .setDepth(390)
      .setStrokeStyle(2, 0xf7d9a8, 0.9);
    const title = scene.add
      .text(scene.scale.width / 2, 70, "PLASMOCYTE SPRITE DEBUG", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "18px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(392);
    this.objects.push(panel, title);

    STATES.forEach(({ label, state }, index) => {
      const x = scene.scale.width / 2 - 290 + index * 116;
      const y = 185;
      const animation = plasmocyteSprite.animations[state];
      const sprite = scene.add
        .sprite(x, y, plasmocyteSprite.textureKey)
        .setOrigin(plasmocyteSprite.anchor.x, plasmocyteSprite.anchor.y)
        .setScale(1.4)
        .setScrollFactor(0)
        .setDepth(391);
      const caption = scene.add
        .text(x, y + 18, label, {
          color: "#f7d9a8",
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
