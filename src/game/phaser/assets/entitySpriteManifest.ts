export type EntitySpriteCategory = "unit" | "tissue" | "pathogen" | "effect";

export type EntitySpriteAssetType = "image" | "spritesheet" | "atlas";

export type EntityVisualState =
  | "idle"
  | "move"
  | "attack"
  | "phagocytosis"
  | "special"
  | "collect"
  | "carry"
  | "signal"
  | "moveCarry1"
  | "moveCarry2"
  | "moveCarry3"
  | "hurt"
  | "netBurst"
  | "netTrap"
  | "dying"
  | "dead"
  | "healthy"
  | "infected"
  | "destroyed"
  | "protected"
  | "infectedProtected"
  | "right"
  | "upRight"
  | "downRight"
  | "left"
  | "impact"
  | "fixed";

export type SpriteOrientation =
  | "none"
  | "flipHorizontal"
  | "fourDirections"
  | "eightDirections";

export type SpritePoint = Readonly<{ x: number; y: number }>;

export type SpriteAttachmentPoints = Readonly<{
  attack?: SpritePoint;
  projectile?: SpritePoint;
  antigenCollection?: SpritePoint;
  carriedAntigen?: SpritePoint;
  phagocytosis?: SpritePoint;
  impact?: SpritePoint;
  visualCenter?: SpritePoint;
  groundEffect?: SpritePoint;
}>;

export type SpriteAnimationDefinition = Readonly<{
  key: string;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
  impactFrame?: number;
}>;

export type EntitySpriteDefinition = Readonly<{
  entityType: string;
  category: EntitySpriteCategory;
  enabled: boolean;
  textureKey: string;
  path: string;
  assetType: EntitySpriteAssetType;
  atlasDataPath?: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns: number;
  rows: number;
  anchor: SpritePoint;
  visualOffset: SpritePoint;
  scale: number;
  orientation: SpriteOrientation;
  allowProceduralFallback: boolean;
  animations: Partial<Record<EntityVisualState, SpriteAnimationDefinition>>;
  attachmentPoints: SpriteAttachmentPoints;
}>;

export type SpriteManifestIssue = Readonly<{
  entityType: string;
  field: string;
  message: string;
}>;

/** V11.3B macrophage sheet: six rows of eight normalized 64 px frames. */
export const macrophagePilotSprite: EntitySpriteDefinition = {
  entityType: "macrophage",
  category: "unit",
  enabled: true,
  textureKey: "unit_macrophage",
  path: "/assets/sprites/units/macrophage/unit_macrophage.png",
  assetType: "spritesheet",
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 48,
  columns: 8,
  rows: 6,
  anchor: { x: 0.5, y: 1 },
  visualOffset: { x: 0, y: 24 },
  scale: 1,
  orientation: "flipHorizontal",
  allowProceduralFallback: true,
  animations: {
    idle: {
      key: "unit.macrophage.idle",
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1,
    },
    move: {
      key: "unit.macrophage.move",
      startFrame: 8,
      endFrame: 15,
      frameRate: 10,
      repeat: -1,
    },
    attack: {
      key: "unit.macrophage.attack",
      startFrame: 16,
      endFrame: 23,
      frameRate: 12,
      repeat: 0,
      impactFrame: 20,
    },
    phagocytosis: {
      key: "unit.macrophage.phagocytosis",
      startFrame: 24,
      endFrame: 31,
      frameRate: 10,
      repeat: 0,
      impactFrame: 29,
    },
    hurt: {
      key: "unit.macrophage.hurt",
      startFrame: 32,
      endFrame: 39,
      frameRate: 14,
      repeat: 0,
    },
    dead: {
      key: "unit.macrophage.death",
      startFrame: 40,
      endFrame: 47,
      frameRate: 9,
      repeat: 0,
    },
  },
  attachmentPoints: {
    attack: { x: 22, y: -2 },
    phagocytosis: { x: 17, y: -2 },
    impact: { x: 0, y: -5 },
    visualCenter: { x: 0, y: 0 },
    groundEffect: { x: 0, y: 24 },
  },
};

/** V11.3D neutrophil sheet: seven rows, with two seven-frame terminal rows. */
export const neutrophilSprite: EntitySpriteDefinition = {
  entityType: "neutrophil",
  category: "unit",
  enabled: true,
  textureKey: "unit_neutrophil",
  path: "/assets/sprites/units/neutrophil/unit_neutrophil.png",
  assetType: "spritesheet",
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 56,
  columns: 8,
  rows: 7,
  anchor: { x: 0.5, y: 1 },
  visualOffset: { x: 0, y: 18 },
  scale: 1,
  orientation: "flipHorizontal",
  allowProceduralFallback: true,
  animations: {
    idle: {
      key: "unit.neutrophil.idle",
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1,
    },
    move: {
      key: "unit.neutrophil.move",
      startFrame: 8,
      endFrame: 15,
      frameRate: 11,
      repeat: -1,
    },
    attack: {
      key: "unit.neutrophil.attack",
      startFrame: 16,
      endFrame: 22,
      frameRate: 13,
      repeat: 0,
      impactFrame: 20,
    },
    netBurst: {
      key: "unit.neutrophil.netBurst",
      startFrame: 24,
      endFrame: 30,
      frameRate: 12,
      repeat: 0,
      impactFrame: 28,
    },
    netTrap: {
      key: "hazard.netTrap.active",
      startFrame: 32,
      endFrame: 39,
      frameRate: 8,
      repeat: -1,
    },
    hurt: {
      key: "unit.neutrophil.hurt",
      startFrame: 40,
      endFrame: 47,
      frameRate: 14,
      repeat: 0,
    },
    dead: {
      key: "unit.neutrophil.death",
      startFrame: 48,
      endFrame: 55,
      frameRate: 10,
      repeat: 0,
    },
  },
  attachmentPoints: {
    attack: { x: 20, y: -1 },
    impact: { x: 0, y: -4 },
    visualCenter: { x: 0, y: 0 },
    groundEffect: { x: 0, y: 18 },
  },
};

/** V11.3E dendritic-cell sheet: seven core rows plus three carried-antigen move rows. */
export const dendriticCellSprite: EntitySpriteDefinition = {
  entityType: "dendriticCell",
  category: "unit",
  enabled: true,
  textureKey: "unit_dendritic",
  path: "/assets/sprites/units/dendritic/unit_dendritic.png",
  assetType: "spritesheet",
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 80,
  columns: 8,
  rows: 10,
  anchor: { x: 0.5, y: 1 },
  visualOffset: { x: 0, y: 20 },
  scale: 1,
  orientation: "flipHorizontal",
  allowProceduralFallback: true,
  animations: {
    idle: {
      key: "unit.dendritic.idle",
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1,
    },
    move: {
      key: "unit.dendritic.move",
      startFrame: 8,
      endFrame: 15,
      frameRate: 10,
      repeat: -1,
    },
    collect: {
      key: "unit.dendritic.collect",
      startFrame: 16,
      endFrame: 23,
      frameRate: 12,
      repeat: 0,
      impactFrame: 21,
    },
    carry: {
      key: "unit.dendritic.carry",
      startFrame: 24,
      endFrame: 31,
      frameRate: 7,
      repeat: -1,
    },
    signal: {
      key: "unit.dendritic.signal",
      startFrame: 32,
      endFrame: 39,
      frameRate: 10,
      repeat: 0,
      impactFrame: 36,
    },
    hurt: {
      key: "unit.dendritic.hurt",
      startFrame: 40,
      endFrame: 47,
      frameRate: 14,
      repeat: 0,
    },
    dead: {
      key: "unit.dendritic.death",
      startFrame: 48,
      endFrame: 55,
      frameRate: 9,
      repeat: 0,
    },
    moveCarry1: {
      key: "unit.dendritic.move-carry-1",
      startFrame: 56,
      endFrame: 63,
      frameRate: 10,
      repeat: -1,
    },
    moveCarry2: {
      key: "unit.dendritic.move-carry-2",
      startFrame: 64,
      endFrame: 71,
      frameRate: 10,
      repeat: -1,
    },
    moveCarry3: {
      key: "unit.dendritic.move-carry-3",
      startFrame: 72,
      endFrame: 79,
      frameRate: 10,
      repeat: -1,
    },
  },
  attachmentPoints: {
    antigenCollection: { x: 22, y: -2 },
    carriedAntigen: { x: 22, y: -4 },
    impact: { x: 0, y: -4 },
    visualCenter: { x: 0, y: 0 },
    groundEffect: { x: 0, y: 20 },
  },
};

/** V11.3F plasmocyte sheet: six rows of eight normalized 80 by 64 frames. */
export const plasmocyteSprite: EntitySpriteDefinition = {
  entityType: "plasmocyte",
  category: "unit",
  enabled: true,
  textureKey: "unit_plasmocyte",
  path: "/assets/sprites/units/plasmocyte/unit_plasmocyte.png",
  assetType: "spritesheet",
  frameWidth: 80,
  frameHeight: 64,
  frameCount: 48,
  columns: 8,
  rows: 6,
  anchor: { x: 0.5, y: 1 },
  visualOffset: { x: 0, y: 19 },
  scale: 1,
  orientation: "flipHorizontal",
  allowProceduralFallback: true,
  animations: {
    idle: {
      key: "unit.plasmocyte.idle",
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1,
    },
    move: {
      key: "unit.plasmocyte.move",
      startFrame: 8,
      endFrame: 15,
      frameRate: 10,
      repeat: -1,
    },
    special: {
      key: "unit.plasmocyte.produce",
      startFrame: 16,
      endFrame: 23,
      frameRate: 18,
      repeat: 0,
    },
    attack: {
      key: "unit.plasmocyte.secrete",
      startFrame: 24,
      endFrame: 31,
      frameRate: 18,
      repeat: 0,
      impactFrame: 27,
    },
    hurt: {
      key: "unit.plasmocyte.hurt",
      startFrame: 32,
      endFrame: 39,
      frameRate: 14,
      repeat: 0,
    },
    dead: {
      key: "unit.plasmocyte.death",
      startFrame: 40,
      endFrame: 47,
      frameRate: 9,
      repeat: 0,
    },
  },
  attachmentPoints: {
    attack: { x: 25, y: -6 },
    projectile: { x: 28, y: -7 },
    impact: { x: 0, y: -4 },
    visualCenter: { x: -4, y: 0 },
    groundEffect: { x: 0, y: 19 },
  },
};

/** V11.3H NK-cell sheet: six rows of eight normalized 72 by 64 frames. */
export const nkCellSprite: EntitySpriteDefinition = {
  entityType: "nkCell",
  category: "unit",
  enabled: true,
  textureKey: "unit_nk",
  path: "/assets/sprites/units/nk-cell/unit_nk.png",
  assetType: "spritesheet",
  frameWidth: 72,
  frameHeight: 64,
  frameCount: 48,
  columns: 8,
  rows: 6,
  anchor: { x: 0.5, y: 1 },
  visualOffset: { x: 0, y: 20 },
  scale: 1,
  orientation: "flipHorizontal",
  allowProceduralFallback: true,
  animations: {
    idle: {
      key: "unit.nk.idle",
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1,
    },
    move: {
      key: "unit.nk.move",
      startFrame: 8,
      endFrame: 15,
      frameRate: 11,
      repeat: -1,
    },
    attack: {
      key: "unit.nk.attack",
      startFrame: 16,
      endFrame: 23,
      frameRate: 14,
      repeat: 0,
      impactFrame: 20,
    },
    special: {
      key: "unit.nk.cytotoxic-strike",
      startFrame: 24,
      endFrame: 31,
      frameRate: 14,
      repeat: 0,
      impactFrame: 28,
    },
    hurt: {
      key: "unit.nk.hurt",
      startFrame: 32,
      endFrame: 39,
      frameRate: 14,
      repeat: 0,
    },
    dead: {
      key: "unit.nk.death",
      startFrame: 40,
      endFrame: 47,
      frameRate: 10,
      repeat: 0,
    },
  },
  attachmentPoints: {
    attack: { x: 23, y: -5 },
    impact: { x: 0, y: -4 },
    visualCenter: { x: 0, y: 0 },
    groundEffect: { x: 0, y: 20 },
  },
};

/** V11.3G guided antibody projectile: four directional rows of four frames. */
export const antibodyProjectileSprite: EntitySpriteDefinition = {
  entityType: "antibodyProjectile",
  category: "effect",
  enabled: true,
  textureKey: "effect_antibody_projectile",
  path: "/assets/sprites/effects/antibody-projectile/effect_antibody_projectile.png",
  assetType: "spritesheet",
  frameWidth: 48,
  frameHeight: 40,
  frameCount: 16,
  columns: 4,
  rows: 4,
  anchor: { x: 0.5, y: 0.5 },
  visualOffset: { x: 0, y: 0 },
  scale: 1,
  orientation: "eightDirections",
  allowProceduralFallback: true,
  animations: {
    right: {
      key: "effect.antibody-projectile.right",
      startFrame: 0,
      endFrame: 3,
      frameRate: 14,
      repeat: -1,
    },
    upRight: {
      key: "effect.antibody-projectile.up-right",
      startFrame: 4,
      endFrame: 7,
      frameRate: 14,
      repeat: -1,
    },
    downRight: {
      key: "effect.antibody-projectile.down-right",
      startFrame: 8,
      endFrame: 11,
      frameRate: 14,
      repeat: -1,
    },
    left: {
      key: "effect.antibody-projectile.left",
      startFrame: 12,
      endFrame: 15,
      frameRate: 14,
      repeat: -1,
    },
  },
  attachmentPoints: {
    visualCenter: { x: 0, y: 0 },
    impact: { x: 18, y: 0 },
  },
};

/** V11.3G antibody binding effect: impact then fixed/bound loop. */
export const antibodyImpactSprite: EntitySpriteDefinition = {
  entityType: "antibodyImpact",
  category: "effect",
  enabled: true,
  textureKey: "effect_antibody_impact",
  path: "/assets/sprites/effects/antibody-impact/effect_antibody_impact.png",
  assetType: "spritesheet",
  frameWidth: 48,
  frameHeight: 40,
  frameCount: 16,
  columns: 8,
  rows: 2,
  anchor: { x: 0.5, y: 0.5 },
  visualOffset: { x: 0, y: 0 },
  scale: 1,
  orientation: "none",
  allowProceduralFallback: true,
  animations: {
    impact: {
      key: "effect.antibody-impact.impact",
      startFrame: 0,
      endFrame: 7,
      frameRate: 18,
      repeat: 0,
      impactFrame: 3,
    },
    fixed: {
      key: "effect.antibody-impact.fixed",
      startFrame: 8,
      endFrame: 15,
      frameRate: 10,
      repeat: -1,
    },
  },
  attachmentPoints: {
    visualCenter: { x: 0, y: 0 },
    impact: { x: 0, y: 0 },
  },
};

/** V11.3 tissue-cell sheet: five biological states of eight normalized frames. */
export const tissueCellSprite: EntitySpriteDefinition = {
  entityType: "tissueCell",
  category: "tissue",
  enabled: true,
  textureKey: "cell_civilian",
  path: "/assets/sprites/tissue/tissue-cell/cell_civilian.png",
  assetType: "spritesheet",
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 40,
  columns: 8,
  rows: 5,
  anchor: { x: 0.5, y: 0.5 },
  visualOffset: { x: 0, y: 0 },
  scale: 1,
  orientation: "none",
  allowProceduralFallback: true,
  animations: {
    healthy: {
      key: "tissue.cell.healthy",
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1,
    },
    infected: {
      key: "tissue.cell.infected",
      startFrame: 8,
      endFrame: 15,
      frameRate: 8,
      repeat: -1,
    },
    destroyed: {
      key: "tissue.cell.destroyed",
      startFrame: 16,
      endFrame: 23,
      frameRate: 9,
      repeat: 0,
    },
    protected: {
      key: "tissue.cell.protected",
      startFrame: 24,
      endFrame: 31,
      frameRate: 8,
      repeat: -1,
    },
    infectedProtected: {
      key: "tissue.cell.infected-protected",
      startFrame: 32,
      endFrame: 39,
      frameRate: 8,
      repeat: -1,
    },
  },
  attachmentPoints: {
    visualCenter: { x: 0, y: 0 },
    groundEffect: { x: 0, y: 25 },
  },
};

export const entitySpriteManifest = [
  macrophagePilotSprite,
  neutrophilSprite,
  dendriticCellSprite,
  plasmocyteSprite,
  nkCellSprite,
  antibodyProjectileSprite,
  antibodyImpactSprite,
  tissueCellSprite,
] as const;

export function getEntitySpriteDefinition(
  entityType: string,
  manifest: readonly EntitySpriteDefinition[] = entitySpriteManifest,
): EntitySpriteDefinition | undefined {
  return manifest.find((definition) => definition.entityType === entityType);
}

export function validateEntitySpriteManifest(
  manifest: readonly EntitySpriteDefinition[] = entitySpriteManifest,
): SpriteManifestIssue[] {
  const issues: SpriteManifestIssue[] = [];
  const entityTypes = new Set<string>();
  const textureKeys = new Set<string>();
  const animationKeys = new Set<string>();

  const addIssue = (definition: EntitySpriteDefinition, field: string, message: string) => {
    issues.push({ entityType: definition.entityType, field, message });
  };

  for (const definition of manifest) {
    if (!definition.entityType.trim()) {
      addIssue(definition, "entityType", "Entity type must not be empty.");
    } else if (entityTypes.has(definition.entityType)) {
      addIssue(definition, "entityType", `Duplicate entity type: ${definition.entityType}.`);
    }
    entityTypes.add(definition.entityType);

    if (!definition.textureKey.trim()) {
      addIssue(definition, "textureKey", "Texture key must not be empty.");
    } else if (textureKeys.has(definition.textureKey)) {
      addIssue(definition, "textureKey", `Duplicate texture key: ${definition.textureKey}.`);
    }
    textureKeys.add(definition.textureKey);

    if (!definition.path.trim()) {
      addIssue(definition, "path", "Asset path must not be empty.");
    }
    if (definition.assetType === "atlas" && !definition.atlasDataPath?.trim()) {
      addIssue(definition, "atlasDataPath", "Atlas assets require a data path.");
    }
    if (definition.frameWidth <= 0 || definition.frameHeight <= 0) {
      addIssue(definition, "frameSize", "Frame dimensions must be positive.");
    }
    if (definition.frameCount <= 0) {
      addIssue(definition, "frameCount", "Frame count must be positive.");
    }
    if (definition.columns <= 0 || definition.rows <= 0) {
      addIssue(definition, "grid", "Columns and rows must be positive.");
    } else if (definition.frameCount > definition.columns * definition.rows) {
      addIssue(definition, "frameCount", "Frame count exceeds the declared grid capacity.");
    }
    if (definition.assetType === "image" && definition.frameCount !== 1) {
      addIssue(definition, "frameCount", "Image assets must contain exactly one frame.");
    }
    if (
      definition.anchor.x < 0 ||
      definition.anchor.x > 1 ||
      definition.anchor.y < 0 ||
      definition.anchor.y > 1
    ) {
      addIssue(definition, "anchor", "Anchor coordinates must be between 0 and 1.");
    }
    if (definition.scale <= 0) {
      addIssue(definition, "scale", "Scale must be positive.");
    }

    for (const [state, animation] of Object.entries(definition.animations)) {
      if (!animation) {
        continue;
      }
      if (!animation.key.trim()) {
        addIssue(definition, `animations.${state}.key`, "Animation key must not be empty.");
      } else if (animationKeys.has(animation.key)) {
        addIssue(definition, `animations.${state}.key`, `Duplicate animation key: ${animation.key}.`);
      }
      animationKeys.add(animation.key);

      if (
        animation.startFrame < 0 ||
        animation.endFrame < animation.startFrame ||
        animation.endFrame >= definition.frameCount
      ) {
        addIssue(definition, `animations.${state}.frames`, "Animation frames are outside the declared frame range.");
      }
      if (animation.frameRate <= 0) {
        addIssue(definition, `animations.${state}.frameRate`, "Frame rate must be positive.");
      }
      if (animation.repeat < -1) {
        addIssue(definition, `animations.${state}.repeat`, "Repeat must be -1 or greater.");
      }
      if (
        animation.impactFrame !== undefined &&
        (animation.impactFrame < animation.startFrame ||
          animation.impactFrame > animation.endFrame)
      ) {
        addIssue(definition, `animations.${state}.impactFrame`, "Impact frame must belong to the animation range.");
      }
    }
  }

  return issues;
}
