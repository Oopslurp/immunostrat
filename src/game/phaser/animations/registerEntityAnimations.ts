import type Phaser from "phaser";
import {
  entitySpriteManifest,
  validateEntitySpriteManifest,
  type EntitySpriteDefinition,
} from "../assets/entitySpriteManifest";

const NEAREST_FILTER_MODE = 1 as Phaser.Textures.FilterMode;

export type AnimationRegistrationReport = Readonly<{
  registeredKeys: string[];
  existingKeys: string[];
  skippedEntityTypes: string[];
}>;

export function registerEntityAnimations(
  scene: Phaser.Scene,
  manifest: readonly EntitySpriteDefinition[] = entitySpriteManifest,
): AnimationRegistrationReport {
  const invalidEntityTypes = new Set(
    validateEntitySpriteManifest(manifest).map((issue) => issue.entityType),
  );
  const registeredKeys: string[] = [];
  const existingKeys: string[] = [];
  const skippedEntityTypes: string[] = [];

  for (const definition of manifest) {
    if (
      !definition.enabled ||
      invalidEntityTypes.has(definition.entityType) ||
      !scene.textures.exists(definition.textureKey)
    ) {
      skippedEntityTypes.push(definition.entityType);
      continue;
    }

    scene.textures
      .get(definition.textureKey)
      .setFilter(NEAREST_FILTER_MODE);

    for (const animation of Object.values(definition.animations)) {
      if (!animation) {
        continue;
      }
      if (scene.anims.exists(animation.key)) {
        existingKeys.push(animation.key);
        continue;
      }

      scene.anims.create({
        key: animation.key,
        frames: scene.anims.generateFrameNumbers(definition.textureKey, {
          start: animation.startFrame,
          end: animation.endFrame,
        }),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
      registeredKeys.push(animation.key);
    }
  }

  return { registeredKeys, existingKeys, skippedEntityTypes };
}
