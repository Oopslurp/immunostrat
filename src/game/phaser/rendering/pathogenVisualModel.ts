import {
  pathogenDefinitions,
  type PathogenDefinition,
  type PathogenTypeId,
} from "../../data/pathogens";
import { stableHash } from "../../types/shared";

export type PathogenVisualFamily =
  | "bacterium"
  | "virus"
  | "fungus"
  | "parasite"
  | "cancerCell"
  | "collective";

export type PathogenMovementAnimation =
  | "wriggle"
  | "driftSpin"
  | "hopBloom"
  | "slither"
  | "amoeboidCreep"
  | "heave";

export type PathogenAttackAnimation =
  | "contactBurst"
  | "viralEntry"
  | "sporeVolley"
  | "tendrilStrike"
  | "mutantPulse"
  | "colonyWave";

export type PathogenDeathAnimation =
  | "membraneRupture"
  | "capsidFracture"
  | "sporeDissolve"
  | "segmentBreak"
  | "nuclearCollapse"
  | "colonyDisperse";

export type PathogenFamilyAnimationProfile = Readonly<{
  movement: PathogenMovementAnimation;
  attack: PathogenAttackAnimation;
  death: PathogenDeathAnimation;
}>;

export type PathogenVisualPose = Readonly<{
  offsetX: number;
  bobY: number;
  scaleX: number;
  scaleY: number;
  phase: number;
  attackPulse: number;
  movementPhase: number;
  movementIntensity: number;
  facingAngle: number;
}>;

export type PathogenVisualTimingInput = Readonly<{
  identity: string;
  pathogenTypeId: PathogenTypeId;
  elapsedMs: number;
  attackCooldownMs?: number;
  attackCooldownRemainingMs?: number;
  movementPhase?: number;
  movementIntensity?: number;
  facingAngle?: number;
}>;

export const pathogenVisualVariantCounts: Readonly<
  Record<PathogenVisualFamily, number>
> = {
  bacterium: 4,
  virus: 4,
  fungus: 4,
  parasite: 3,
  cancerCell: 4,
  collective: 3,
};

export const pathogenFamilyAnimationProfiles: Readonly<
  Record<PathogenVisualFamily, PathogenFamilyAnimationProfile>
> = {
  bacterium: {
    movement: "wriggle",
    attack: "contactBurst",
    death: "membraneRupture",
  },
  virus: {
    movement: "driftSpin",
    attack: "viralEntry",
    death: "capsidFracture",
  },
  fungus: {
    movement: "hopBloom",
    attack: "sporeVolley",
    death: "sporeDissolve",
  },
  parasite: {
    movement: "slither",
    attack: "tendrilStrike",
    death: "segmentBreak",
  },
  cancerCell: {
    movement: "amoeboidCreep",
    attack: "mutantPulse",
    death: "nuclearCollapse",
  },
  collective: {
    movement: "heave",
    attack: "colonyWave",
    death: "colonyDisperse",
  },
};

const COLLECTIVE_TYPES = new Set<PathogenTypeId>([
  "biofilmColony",
  "mixedOpportunistCluster",
]);

const BACTERIAL_OPPORTUNISTS = new Set<PathogenTypeId>([
  "opportunistBacterium",
  "secondaryBacterium",
]);

export function resolvePathogenVisualFamily(
  pathogenTypeId: PathogenTypeId,
  definition: PathogenDefinition = pathogenDefinitions[pathogenTypeId],
): PathogenVisualFamily {
  if (COLLECTIVE_TYPES.has(pathogenTypeId)) {
    return "collective";
  }
  if (
    definition.pathogenClass === "bacterium" ||
    BACTERIAL_OPPORTUNISTS.has(pathogenTypeId)
  ) {
    return "bacterium";
  }
  if (definition.pathogenClass === "virus") {
    return "virus";
  }
  if (definition.pathogenClass === "fungus") {
    return "fungus";
  }
  if (definition.pathogenClass === "parasite") {
    return "parasite";
  }
  if (definition.pathogenClass === "cancerCell") {
    return "cancerCell";
  }

  return "collective";
}

export function getPathogenVisualVariant(
  identity: string,
  pathogenTypeId: PathogenTypeId,
): number {
  const family = resolvePathogenVisualFamily(pathogenTypeId);

  return stableHash(`${pathogenTypeId}:${identity}`) % pathogenVisualVariantCounts[family];
}

export function getPathogenFamilyAnimationProfile(
  pathogenTypeId: PathogenTypeId,
): PathogenFamilyAnimationProfile {
  return pathogenFamilyAnimationProfiles[
    resolvePathogenVisualFamily(pathogenTypeId)
  ];
}

export function resolvePathogenVisualPose(
  input: PathogenVisualTimingInput,
): PathogenVisualPose {
  const family = resolvePathogenVisualFamily(input.pathogenTypeId);
  const identityPhase = stableHash(input.identity) % 2200;
  const phase = ((input.elapsedMs + identityPhase) / 1650) * Math.PI * 2;
  const idleWave = Math.sin(phase);
  const attackPulse = resolveAttackPulse(input);
  const movementIntensity = clamp01(input.movementIntensity ?? 0);
  const movementPhase = input.movementPhase ?? phase * 0.7;
  const movementWave = Math.sin(movementPhase);
  const movementPose = resolveFamilyMovementPose(
    family,
    movementWave,
    movementPhase,
    movementIntensity,
  );

  return {
    offsetX: movementPose.offsetX,
    bobY: Math.round(idleWave + movementPose.offsetY),
    scaleX:
      1 +
      idleWave * 0.025 +
      movementPose.stretchX +
      attackPulse * 0.1,
    scaleY:
      1 -
      idleWave * 0.02 +
      movementPose.stretchY -
      attackPulse * 0.055,
    phase,
    attackPulse,
    movementPhase,
    movementIntensity,
    facingAngle: input.facingAngle ?? 0,
  };
}

function resolveFamilyMovementPose(
  family: PathogenVisualFamily,
  wave: number,
  phase: number,
  intensity: number,
): Readonly<{
  offsetX: number;
  offsetY: number;
  stretchX: number;
  stretchY: number;
}> {
  switch (family) {
    case "bacterium":
      return {
        offsetX: Math.round(wave * intensity),
        offsetY: Math.round(Math.cos(phase * 1.4) * intensity),
        stretchX: Math.abs(wave) * intensity * 0.055,
        stretchY: -Math.abs(wave) * intensity * 0.035,
      };
    case "virus":
      return {
        offsetX: 0,
        offsetY: Math.round(Math.cos(phase * 1.6) * intensity),
        stretchX: intensity * 0.07,
        stretchY: -intensity * 0.045,
      };
    case "fungus":
      return {
        offsetX: Math.round(wave * intensity * 0.5),
        offsetY: -Math.round(Math.abs(wave) * intensity * 2),
        stretchX: Math.abs(wave) * intensity * 0.035,
        stretchY: -Math.abs(wave) * intensity * 0.05,
      };
    case "parasite":
      return {
        offsetX: Math.round(wave * intensity),
        offsetY: Math.round(Math.cos(phase * 0.8) * intensity),
        stretchX: intensity * 0.08,
        stretchY: -intensity * 0.025,
      };
    case "cancerCell":
      return {
        offsetX: Math.round(wave * intensity * 0.5),
        offsetY: Math.round(Math.cos(phase) * intensity * 0.5),
        stretchX: wave * intensity * 0.045,
        stretchY: -wave * intensity * 0.035,
      };
    case "collective":
      return {
        offsetX: 0,
        offsetY: Math.round(Math.cos(phase * 0.5) * intensity * 0.5),
        stretchX: Math.abs(wave) * intensity * 0.025,
        stretchY: -Math.abs(wave) * intensity * 0.018,
      };
  }
}

function resolveAttackPulse(input: PathogenVisualTimingInput): number {
  const cooldownMs = input.attackCooldownMs ?? 0;
  const remainingMs = input.attackCooldownRemainingMs ?? 0;

  if (cooldownMs <= 0 || remainingMs <= 0) {
    return 0;
  }

  const attackAgeMs = Math.max(0, cooldownMs - remainingMs);
  const visualDurationMs = Math.min(180, cooldownMs * 0.28);

  if (attackAgeMs >= visualDurationMs || visualDurationMs <= 0) {
    return 0;
  }

  return Math.sin((attackAgeMs / visualDurationMs) * Math.PI);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
