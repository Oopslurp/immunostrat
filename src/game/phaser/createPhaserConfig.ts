import Phaser from "phaser";
import { balanceValues } from "../data/balance";
import type { MissionId, MissionPreparation } from "../data/missions";
import { createRuntimeTacticalMap } from "../data/runtimeTacticalMap";
import { BootScene } from "./scenes/BootScene";
import type { GameBridge } from "./GameBridge";
import { MissionScene } from "./scenes/MissionScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { UIScene } from "./scenes/UIScene";

export function createPhaserConfig(
  parent: HTMLElement,
  bridge: GameBridge,
  missionId: MissionId,
  preparation?: MissionPreparation,
): Phaser.Types.Core.GameConfig {
  const map = createRuntimeTacticalMap(missionId, preparation);
  const viewportWidth = Math.max(
    960,
    Math.min(parent.clientWidth || balanceValues.camera.viewportWidth, 1920),
  );
  const viewportHeight = Math.max(
    620,
    Math.min(parent.clientHeight || balanceValues.camera.viewportHeight, 1080),
  );

  return {
    type: Phaser.AUTO,
    parent,
    width: Math.min(map.width, viewportWidth),
    height: Math.min(map.height, viewportHeight),
    backgroundColor: "#101820",
    scene: [
      new BootScene(),
      new PreloadScene(),
      new MissionScene(bridge, missionId, preparation),
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
