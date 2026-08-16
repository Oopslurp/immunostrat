import Phaser from "phaser";
import type { ImmuneUnitEntity } from "../../simulation/entities";
import { FOCUS_SPOTLIGHT_BANDS } from "./selectionInspectionPresentation";

const SPOTLIGHT_DEPTH = 30;
const HOVER_ARROW_DEPTH = 42;
const SPOTLIGHT_TWEEN_DURATION_MS = 210;

type SpotlightBand = {
  overlay: Phaser.GameObjects.Graphics;
  maskShape: Phaser.GameObjects.Graphics;
};

export class SelectionInspectionVisualController {
  private readonly hoverArrow: Phaser.GameObjects.Graphics;
  private readonly spotlightBands: SpotlightBand[] = [];
  private spotlightTween?: Phaser.Tweens.Tween;
  private spotlightActive = false;

  constructor(
    private readonly scene: Phaser.Scene,
    worldWidth: number,
    worldHeight: number,
  ) {
    this.hoverArrow = this.createHoverArrow();

    if (scene.game.renderer.type === Phaser.WEBGL) {
      this.createSpotlightBands(worldWidth, worldHeight);
    }
  }

  setFocusActive(active: boolean, animate = true): void {
    if (active === this.spotlightActive && animate) {
      return;
    }

    this.spotlightActive = active;
    this.spotlightTween?.stop();
    this.spotlightTween = undefined;

    const overlays = this.spotlightBands.map((band) => band.overlay);

    if (active) {
      overlays.forEach((overlay) => overlay.setVisible(true));
    }

    if (!animate || overlays.length === 0) {
      overlays.forEach((overlay) =>
        overlay.setAlpha(active ? 1 : 0).setVisible(active),
      );
      return;
    }

    this.spotlightTween = this.scene.tweens.add({
      targets: overlays,
      alpha: active ? 1 : 0,
      duration: SPOTLIGHT_TWEEN_DURATION_MS,
      ease: "Expo.Out",
      onComplete: () => {
        if (!this.spotlightActive) {
          overlays.forEach((overlay) => overlay.setVisible(false));
        }
        this.spotlightTween = undefined;
      },
    });
  }

  update(
    hoveredUnit: ImmuneUnitEntity | null,
    focusedUnit: ImmuneUnitEntity | null,
    elapsedMs: number,
  ): void {
    if (hoveredUnit) {
      const bobOffset = Math.round(Math.sin(elapsedMs / 360) * 1.25);
      this.hoverArrow
        .setPosition(
          Math.round(hoveredUnit.position.x),
          Math.round(
            hoveredUnit.position.y - hoveredUnit.radius - 13 + bobOffset,
          ),
        )
        .setVisible(true);
    } else {
      this.hoverArrow.setVisible(false);
    }

    if (focusedUnit) {
      const x = Math.round(focusedUnit.position.x);
      const y = Math.round(focusedUnit.position.y);
      this.spotlightBands.forEach(({ maskShape }) => maskShape.setPosition(x, y));
    }
  }

  reset(): void {
    this.hoverArrow.setVisible(false);
    this.setFocusActive(false, false);
  }

  destroy(): void {
    this.spotlightTween?.stop();
    this.spotlightTween = undefined;
    this.hoverArrow.destroy();

    this.spotlightBands.forEach(({ overlay, maskShape }) => {
      overlay.clearMask(true);
      overlay.destroy();
      maskShape.destroy();
    });
    this.spotlightBands.length = 0;
  }

  private createHoverArrow(): Phaser.GameObjects.Graphics {
    const arrow = this.scene.add.graphics().setDepth(HOVER_ARROW_DEPTH);

    arrow.fillStyle(0x211505, 0.96);
    arrow.fillRect(-4, -4, 8, 5);
    arrow.fillTriangle(-5, 0, 5, 0, 0, 7);
    arrow.fillStyle(0xffc76b, 1);
    arrow.fillRect(-2, -3, 4, 4);
    arrow.fillTriangle(-4, 0, 4, 0, 0, 5);

    return arrow.setVisible(false);
  }

  private createSpotlightBands(worldWidth: number, worldHeight: number): void {
    FOCUS_SPOTLIGHT_BANDS.forEach((band) => {
      const overlay = this.scene.add
        .graphics()
        .setDepth(SPOTLIGHT_DEPTH)
        .setAlpha(0)
        .setVisible(false);
      overlay.fillStyle(0x02070b, band.alpha);
      overlay.fillRect(0, 0, worldWidth, worldHeight);

      const maskShape = this.scene.make.graphics({ x: 0, y: 0 }, false);
      maskShape.fillStyle(0xffffff, 1);
      maskShape.fillCircle(0, 0, band.radius);
      overlay.setMask(maskShape.createGeometryMask().setInvertAlpha(true));
      this.spotlightBands.push({ overlay, maskShape });
    });
  }
}
