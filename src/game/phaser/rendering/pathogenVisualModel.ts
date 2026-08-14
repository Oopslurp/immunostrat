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

export type PathogenVisualPose = Readonly<{
  bobY: number;
  scaleX: number;
  scaleY: number;
  phase: number;
  attackPulse: number;
}>;

export type PathogenVisualTimingInput = Readonly<{
  identity: string;
  elapsedMs: number;
  attackCooldownMs?: number;
  attackCooldownRemainingMs?: number;
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

export function resolvePathogenVisualPose(
  input: PathogenVisualTimingInput,
): PathogenVisualPose {
  const identityPhase = stableHash(input.identity) % 2200;
  const phase = ((input.elapsedMs + identityPhase) / 1650) * Math.PI * 2;
  const idleWave = Math.sin(phase);
  const attackPulse = resolveAttackPulse(input);

  return {
    bobY: Math.round(idleWave),
    scaleX: 1 + idleWave * 0.025 + attackPulse * 0.1,
    scaleY: 1 - idleWave * 0.02 - attackPulse * 0.055,
    phase,
    attackPulse,
  };
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
