import type Phaser from "phaser";
import combatCoreSourceUrl from "../../assets/maps/v11/combat-sites/combat-core-source.png";

export type CombatCoreAnimationState =
  | "dormant"
  | "activation"
  | "active"
  | "destabilizing"
  | "destroyed";

export const COMBAT_CORE_SOURCE_ASSET = {
  key: "v11-combat-core-source",
  url: combatCoreSourceUrl,
} as const;

export const COMBAT_CORE_FRAME_SIZE = 96;

export const COMBAT_CORE_ANIMATION_KEYS: Record<
  CombatCoreAnimationState,
  string
> = {
  dormant: "combat-core.dormant",
  activation: "combat-core.activation",
  active: "combat-core.active",
  destabilizing: "combat-core.destabilizing",
  destroyed: "combat-core.destroyed",
};

type SourceRow = {
  centerY: number;
  centersX: number[];
  frameRate: number;
  repeat: number;
};

const SOURCE_ROWS: Record<CombatCoreAnimationState, SourceRow> = {
  dormant: {
    centerY: 116,
    centersX: [73, 177, 280, 385, 491, 594, 697, 800, 904, 1005, 1105, 1203, 1305, 1413],
    frameRate: 4,
    repeat: -1,
  },
  activation: {
    centerY: 314,
    centersX: [67, 170, 277, 379, 483, 588, 695, 802, 910, 1013, 1114, 1213, 1310, 1407],
    frameRate: 12,
    repeat: 0,
  },
  active: {
    centerY: 510,
    centersX: [72, 169, 267, 364, 461, 556, 652, 750, 847, 942, 1037, 1129, 1224, 1318, 1414],
    frameRate: 10,
    repeat: -1,
  },
  destabilizing: {
    centerY: 708,
    centersX: [73, 177, 280, 384, 484, 584, 682, 781, 880, 973, 1067, 1157, 1242, 1319, 1390],
    frameRate: 12,
    repeat: 0,
  },
  destroyed: {
    centerY: 906,
    centersX: Array.from({ length: 15 }, (_, index) => 69 + index * 99),
    frameRate: 12,
    repeat: 0,
  },
};

export function preloadCombatCoreSource(scene: Phaser.Scene): void {
  if (!scene.textures.exists(COMBAT_CORE_SOURCE_ASSET.key)) {
    scene.load.image(COMBAT_CORE_SOURCE_ASSET.key, COMBAT_CORE_SOURCE_ASSET.url);
  }
}

export function prepareCombatCoreTextures(scene: Phaser.Scene): boolean {
  if (!scene.textures.exists(COMBAT_CORE_SOURCE_ASSET.key)) {
    return false;
  }

  const source = scene.textures
    .get(COMBAT_CORE_SOURCE_ASSET.key)
    .getSourceImage() as HTMLImageElement | HTMLCanvasElement;

  for (const state of Object.keys(SOURCE_ROWS) as CombatCoreAnimationState[]) {
    const row = SOURCE_ROWS[state];

    row.centersX.forEach((centerX, frameIndex) => {
      const key = getCombatCoreFrameKey(state, frameIndex);

      if (scene.textures.exists(key)) {
        return;
      }

      const texture = scene.textures.createCanvas(
        key,
        COMBAT_CORE_FRAME_SIZE,
        COMBAT_CORE_FRAME_SIZE,
      );

      if (!texture) {
        return;
      }

      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, COMBAT_CORE_FRAME_SIZE, COMBAT_CORE_FRAME_SIZE);
      context.drawImage(
        source,
        Math.round(centerX - COMBAT_CORE_FRAME_SIZE / 2),
        Math.round(row.centerY - COMBAT_CORE_FRAME_SIZE / 2),
        COMBAT_CORE_FRAME_SIZE,
        COMBAT_CORE_FRAME_SIZE,
        0,
        0,
        COMBAT_CORE_FRAME_SIZE,
        COMBAT_CORE_FRAME_SIZE,
      );
      removeGreenBackground(context);
      texture.refresh();
    });
  }

  registerCombatCoreAnimations(scene);
  return true;
}

export function getCombatCoreFrameKey(
  state: CombatCoreAnimationState,
  frameIndex: number,
): string {
  return `combat-core.${state}.${frameIndex}`;
}

export function getCombatCoreFirstFrameKey(
  state: CombatCoreAnimationState,
): string {
  return getCombatCoreFrameKey(state, 0);
}

export function getCombatCoreFrameCount(
  state: CombatCoreAnimationState,
): number {
  return SOURCE_ROWS[state].centersX.length;
}

function registerCombatCoreAnimations(scene: Phaser.Scene): void {
  for (const state of Object.keys(SOURCE_ROWS) as CombatCoreAnimationState[]) {
    const animationKey = COMBAT_CORE_ANIMATION_KEYS[state];

    if (scene.anims.exists(animationKey)) {
      continue;
    }

    const row = SOURCE_ROWS[state];
    scene.anims.create({
      key: animationKey,
      frames: row.centersX.map((_, frameIndex) => ({
        key: getCombatCoreFrameKey(state, frameIndex),
      })),
      frameRate: row.frameRate,
      repeat: row.repeat,
    });
  }
}

function removeGreenBackground(context: CanvasRenderingContext2D): void {
  const image = context.getImageData(
    0,
    0,
    COMBAT_CORE_FRAME_SIZE,
    COMBAT_CORE_FRAME_SIZE,
  );

  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const dominance = green - Math.max(red, blue);

    if (green > 72 && dominance > 13) {
      image.data[index + 3] = 0;
      continue;
    }

    if (green > 58 && dominance > 5) {
      image.data[index + 3] = Math.round(
        image.data[index + 3] * clamp(1 - (dominance - 5) / 8, 0, 1),
      );
    }
  }

  context.putImageData(image, 0, 0);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
