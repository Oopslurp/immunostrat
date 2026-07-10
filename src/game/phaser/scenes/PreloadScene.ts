import Phaser from "phaser";
import type { TacticalMapDefinition } from "../../data/tacticalMaps";
import { getLayerABackgroundForMap } from "../../mapVisuals/mapVisualAssets";

export class PreloadScene extends Phaser.Scene {
  constructor(private readonly tacticalMap: TacticalMapDefinition) {
    super("PreloadScene");
  }

  preload() {
    const background = getLayerABackgroundForMap(this.tacticalMap);

    if (!this.textures.exists(background.key)) {
      this.load.image(background.key, background.url);
    }

  }

  create() {
    this.scene.start("MissionScene");
    this.scene.launch("UIScene");
  }
}
