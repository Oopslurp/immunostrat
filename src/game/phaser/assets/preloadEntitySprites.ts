import Phaser from "phaser";
import {
  entitySpriteManifest,
  validateEntitySpriteManifest,
  type EntitySpriteDefinition,
} from "./entitySpriteManifest";

export type SpritePreloadReport = Readonly<{
  queuedTextureKeys: string[];
  skippedEntityTypes: string[];
}>;

export function preloadEntitySprites(
  scene: Phaser.Scene,
  manifest: readonly EntitySpriteDefinition[] = entitySpriteManifest,
): SpritePreloadReport {
  const issues = validateEntitySpriteManifest(manifest);
  const invalidEntityTypes = new Set(issues.map((issue) => issue.entityType));
  const queuedTextureKeys: string[] = [];
  const skippedEntityTypes: string[] = [];

  for (const issue of issues) {
    console.warn(
      `[sprite-manifest] ${issue.entityType}.${issue.field}: ${issue.message}`,
    );
  }

  for (const definition of manifest) {
    if (
      !definition.enabled ||
      invalidEntityTypes.has(definition.entityType) ||
      scene.textures.exists(definition.textureKey)
    ) {
      skippedEntityTypes.push(definition.entityType);
      continue;
    }

    if (definition.assetType === "spritesheet") {
      scene.load.spritesheet(definition.textureKey, definition.path, {
        frameWidth: definition.frameWidth,
        frameHeight: definition.frameHeight,
        endFrame: definition.frameCount - 1,
      });
    } else if (definition.assetType === "atlas") {
      scene.load.atlas(
        definition.textureKey,
        definition.path,
        definition.atlasDataPath,
      );
    } else {
      scene.load.image(definition.textureKey, definition.path);
    }

    queuedTextureKeys.push(definition.textureKey);
  }

  return { queuedTextureKeys, skippedEntityTypes };
}
