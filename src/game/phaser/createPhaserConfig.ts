import Phaser from "phaser";
import { missionDefinitions } from "../data/missions";
import { BootScene } from "./scenes/BootScene";
import type { GameBridge } from "./GameBridge";
import { MissionScene } from "./scenes/MissionScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { UIScene } from "./scenes/UIScene";

export function createPhaserConfig(
  parent: HTMLElement,
  bridge: GameBridge,
): Phaser.Types.Core.GameConfig {
  const map = missionDefinitions.woundBacteriaV1.map;

  return {
    type: Phaser.AUTO,
    parent,
    width: map.width,
    height: map.height,
    backgroundColor: "#101820",
    scene: [
      new BootScene(),
      new PreloadScene(),
      new MissionScene(bridge),
      new UIScene(),
    ],
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
