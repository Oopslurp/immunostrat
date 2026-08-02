import Phaser from "phaser";
import {
  antibodyImpactSprite,
  antibodyProjectileSprite,
  type EntityVisualState,
} from "../assets/entitySpriteManifest";

const DEBUG_QUERY = "antibodyDebug";
const DIRECTIONS: ReadonlyArray<
  Readonly<{ label: string; state: EntityVisualState }>
> = [
  { label: "RIGHT", state: "right" },
  { label: "UP-RIGHT", state: "upRight" },
  { label: "DOWN-RIGHT", state: "downRight" },
  { label: "LEFT", state: "left" },
];

export function isAntibodyDebugRequested(
  search = window.location.search,
): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(search).get(DEBUG_QUERY) === "1"
  );
}

export class AntibodyDebugViewer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    if (
      !isAntibodyDebugRequested() ||
      !scene.textures.exists(antibodyProjectileSprite.textureKey) ||
      !scene.textures.exists(antibodyImpactSprite.textureKey)
    ) {
      return;
    }

    const centerX = scene.scale.width / 2;
    const panel = scene.add
      .rectangle(centerX, 470, 860, 240, 0x071217, 0.95)
      .setScrollFactor(0)
      .setDepth(395)
      .setStrokeStyle(2, 0xb69cff, 0.9);
    const title = scene.add
      .text(centerX, 365, "ANTIBODY GUIDED MISSILE DEBUG", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "18px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(397);
    this.objects.push(panel, title);

    DIRECTIONS.forEach(({ label, state }, index) => {
      const x = centerX - 305 + index * 145;
      const y = 415;
      const animation = antibodyProjectileSprite.animations[state];
      const sprite = scene.add
        .sprite(x, y, antibodyProjectileSprite.textureKey)
        .setScrollFactor(0)
        .setDepth(396);
      const caption = scene.add
        .text(x, y + 32, label, {
          color: "#cbbcff",
          fontFamily: "monospace",
          fontSize: "11px",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(397);
      if (animation && scene.anims.exists(animation.key)) {
        sprite.play(animation.key);
      }
      this.objects.push(sprite, caption);
    });

    this.addImpactSample(centerX + 315, 415, "IMPACT", "impact");
    this.addImpactSample(centerX + 315, 490, "FIXED", "fixed");
    this.addCurvedSalvo(centerX);
  }

  destroy(): void {
    for (const tween of this.tweens) tween.destroy();
    for (const object of this.objects) object.destroy();
    this.tweens.length = 0;
    this.objects.length = 0;
  }

  private addImpactSample(
    x: number,
    y: number,
    label: string,
    state: "impact" | "fixed",
  ): void {
    const sprite = this.scene.add
      .sprite(x, y, antibodyImpactSprite.textureKey)
      .setScrollFactor(0)
      .setDepth(396);
    const caption = this.scene.add
      .text(x, y + 30, label, {
        color: "#f7d9a8",
        fontFamily: "monospace",
        fontSize: "11px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(397);
    const animation = antibodyImpactSprite.animations[state];
    if (animation && this.scene.anims.exists(animation.key)) {
      sprite.play(animation.key);
    }
    this.objects.push(sprite, caption);
  }

  private addCurvedSalvo(centerX: number): void {
    const start = { x: centerX - 330, y: 535 };
    const target = { x: centerX + 205, y: 535 };
    const guide = this.scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(395);
    guide.lineStyle(1, 0xb69cff, 0.22);
    guide.lineBetween(start.x, start.y, target.x, target.y);
    guide.fillStyle(0xf06cd6, 0.9);
    guide.fillCircle(target.x, target.y, 7);
    this.objects.push(guide);

    [-58, 0, 58].forEach((arc, index) => {
      const sprite = this.scene.add
        .sprite(start.x, start.y, antibodyProjectileSprite.textureKey)
        .setScrollFactor(0)
        .setDepth(396);
      const animation = antibodyProjectileSprite.animations.right;
      if (animation && this.scene.anims.exists(animation.key)) {
        sprite.play(animation.key);
      }
      const tween = this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1200,
        delay: index * 100,
        repeat: -1,
        repeatDelay: 300,
        onUpdate: (activeTween) => {
          const progress = activeTween.getValue() ?? 0;
          const inverse = 1 - progress;
          const controlX = (start.x + target.x) / 2;
          const controlY = (start.y + target.y) / 2 + arc;
          sprite.setPosition(
            inverse * inverse * start.x +
              2 * inverse * progress * controlX +
              progress * progress * target.x,
            inverse * inverse * start.y +
              2 * inverse * progress * controlY +
              progress * progress * target.y,
          );
        },
      });
      this.objects.push(sprite);
      this.tweens.push(tween);
    });

    const caption = this.scene.add
      .text(centerX - 330, 575, "SALVE x3 — trajectoires courbes", {
        color: "#cbbcff",
        fontFamily: "monospace",
        fontSize: "12px",
      })
      .setScrollFactor(0)
      .setDepth(397);
    this.objects.push(caption);
  }
}
