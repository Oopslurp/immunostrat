import Phaser from "phaser";
import { SpriteLabScene } from "./scenes/SpriteLabScene";

export function createSpriteLabConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: Math.max(960, Math.min(parent.clientWidth || 1280, 1600)),
    height: 700,
    backgroundColor: "#071217",
    scene: [new SpriteLabScene()],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
  };
}
