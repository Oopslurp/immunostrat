import Phaser from "phaser";
import type { TacticalMapDefinition } from "../../data/tacticalMaps";
import {
  DIAPEDESIS_ENTRY_MARKER_ASSET,
  getLayerABackgroundForMap,
} from "../../mapVisuals/mapVisualAssets";

export class PreloadScene extends Phaser.Scene {
  constructor(private readonly tacticalMap: TacticalMapDefinition) {
    super("PreloadScene");
  }

  preload() {
    const background = getLayerABackgroundForMap(this.tacticalMap);

    if (!this.textures.exists(background.key)) {
      this.load.image(background.key, background.url);
    }

    if (!this.textures.exists(DIAPEDESIS_ENTRY_MARKER_ASSET.key)) {
      this.load.image(
        DIAPEDESIS_ENTRY_MARKER_ASSET.key,
        DIAPEDESIS_ENTRY_MARKER_ASSET.url,
      );
    }
  }

  create() {
    this.scene.start("MissionScene");
    this.scene.launch("UIScene");
  }
}
