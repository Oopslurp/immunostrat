import { pathogenDefinitions, type PathogenTypeId } from "../data/pathogens";
import { unitDefinitions, type UnitTypeId } from "../data/units";
import {
  getEntitySpriteDefinition,
  type EntityVisualState,
} from "../phaser/assets/entitySpriteManifest";

export const spriteLabLayout = {
  startX: 112,
  unitY: 228,
  pathogenY: 455,
  unitSpacing: 158,
  pathogenSpacing: 142,
  endPadding: 120,
} as const;

export type SpriteLabUnitEntry = Readonly<{
  id: UnitTypeId;
  label: string;
  x: number;
  y: number;
  hasSprite: boolean;
  animationStates: readonly EntityVisualState[];
}>;

export type SpriteLabPathogenEntry = Readonly<{
  id: PathogenTypeId;
  label: string;
  x: number;
  y: number;
}>;

const unitIds = Object.keys(unitDefinitions) as UnitTypeId[];
const pathogenIds = Object.keys(pathogenDefinitions) as PathogenTypeId[];

export const spriteLabUnits: readonly SpriteLabUnitEntry[] = unitIds.map(
  (id, index) => {
    const sprite = getEntitySpriteDefinition(id);

    return {
      id,
      label: unitDefinitions[id].displayName,
      x: spriteLabLayout.startX + index * spriteLabLayout.unitSpacing,
      y: spriteLabLayout.unitY,
      hasSprite: Boolean(sprite?.enabled),
      animationStates: sprite
        ? (Object.keys(sprite.animations) as EntityVisualState[])
        : [],
    };
  },
);

export const spriteLabPathogens: readonly SpriteLabPathogenEntry[] =
  pathogenIds.map((id, index) => ({
    id,
    label: pathogenDefinitions[id].displayName,
    x: spriteLabLayout.startX + index * spriteLabLayout.pathogenSpacing,
    y: spriteLabLayout.pathogenY,
  }));

export const spriteLabWorldWidth = Math.max(
  spriteLabUnits.at(-1)?.x ?? 0,
  spriteLabPathogens.at(-1)?.x ?? 0,
) + spriteLabLayout.endPadding;
