import type { GameCommand } from "../../simulation/core/commands";
import type { CombatEffect, GameState } from "../../simulation/core/GameState";
import {
  isCytotoxicT,
  isDendriticCell,
  isControllableImmuneUnit,
  isHostilePathogen,
  isImmuneUnit,
  isMacrophage,
  isNeutrophil,
  isNkCell,
  isPlasmocyte,
  type GameEntity,
} from "../../simulation/entities";
import type { Vector2 } from "../../types/shared";
import type { PathogenVisualFamily } from "../rendering/pathogenVisualModel";

export type VfxPriority = 1 | 2 | 3;

export type CombatVfxPresetId =
  | "physicalContact"
  | "chemicalSignal"
  | "cytotoxicRough"
  | "cytotoxicPrecise"
  | "cancerReveal"
  | "phagocytosisContact"
  | "phagocytosisDigest"
  | "netDeploy"
  | "netContact"
  | "interferonActivation"
  | "interferonResponse"
  | "infectionEntry"
  | "tissueReaction"
  | "adaptiveClearance"
  | "treatmentResponse"
  | "antibodyFallback"
  | "dendriticAbsorb"
  | "diapedesis"
  | "vascularEntry"
  | "lymphArrival"
  | "immuneRelay"
  | "lymphExit"
  | "lymphReturn"
  | "commandMove"
  | "commandEngage"
  | "commandSpecial"
  | "pathogenDamageBacterium"
  | "pathogenDamageVirus"
  | "pathogenDamageFungus"
  | "pathogenDamageParasite"
  | "pathogenDamageCancer"
  | "pathogenDamageCollective";

export type VfxMotion =
  | "burst"
  | "inward"
  | "filament"
  | "signal"
  | "wave"
  | "rise"
  | "command";

export type VfxLayer = "ground" | "combat" | "command";

export type CombatVfxPreset = Readonly<{
  id: CombatVfxPresetId;
  priority: VfxPriority;
  layer: VfxLayer;
  motion: VfxMotion;
  durationMs: number;
  particleCount: number;
  speed: number;
  particleSize: readonly [number, number];
  primaryColor: number;
  secondaryColor: number;
  localCooldownMs: number;
}>;

export const COMBAT_VFX_LIMITS = Object.freeze({
  maxBursts: 48,
  maxParticles: 168,
  densityCellSize: 96,
  densityWindowMs: 180,
  visibilityMargin: 96,
  localEventsByPriority: Object.freeze({
    1: 6,
    2: 4,
    3: 2,
  } satisfies Record<VfxPriority, number>),
});

export const COMBAT_VFX_DEPTHS = Object.freeze({
  ground: -0.5,
  combat: 1.5,
  command: 1.8,
});

export const COMBAT_VFX_READABILITY = Object.freeze({
  radiusScale: 1.12,
  radiusBonus: 2,
  particleSizeBonus: 1,
  maxParticleSize: 4,
  lineWidthBonus: 1,
  silhouetteColor: 0x0b1721,
  silhouetteAlpha: 0.42,
  burstHoldUntilProgress: 0.42,
  particleHoldUntilProgress: 0.36,
});

function preset(
  id: CombatVfxPresetId,
  values: Omit<CombatVfxPreset, "id">,
): CombatVfxPreset {
  return Object.freeze({ id, ...values });
}

export const COMBAT_VFX_PRESETS: Readonly<
  Record<CombatVfxPresetId, CombatVfxPreset>
> = Object.freeze({
  physicalContact: preset("physicalContact", {
    priority: 2,
    layer: "combat",
    motion: "burst",
    durationMs: 210,
    particleCount: 3,
    speed: 34,
    particleSize: [2, 3],
    primaryColor: 0xffc76b,
    secondaryColor: 0x8e4f3b,
    localCooldownMs: 46,
  }),
  chemicalSignal: preset("chemicalSignal", {
    priority: 2,
    layer: "combat",
    motion: "signal",
    durationMs: 260,
    particleCount: 3,
    speed: 22,
    particleSize: [1, 2],
    primaryColor: 0xbda7ff,
    secondaryColor: 0x795faa,
    localCooldownMs: 70,
  }),
  cytotoxicRough: preset("cytotoxicRough", {
    priority: 1,
    layer: "combat",
    motion: "burst",
    durationMs: 250,
    particleCount: 5,
    speed: 54,
    particleSize: [2, 3],
    primaryColor: 0x65d8ff,
    secondaryColor: 0x2578a1,
    localCooldownMs: 42,
  }),
  cytotoxicPrecise: preset("cytotoxicPrecise", {
    priority: 1,
    layer: "combat",
    motion: "signal",
    durationMs: 240,
    particleCount: 3,
    speed: 46,
    particleSize: [1, 2],
    primaryColor: 0xf58ade,
    secondaryColor: 0x8f3e8f,
    localCooldownMs: 42,
  }),
  cancerReveal: preset("cancerReveal", {
    priority: 2,
    layer: "combat",
    motion: "wave",
    durationMs: 320,
    particleCount: 2,
    speed: 16,
    particleSize: [1, 2],
    primaryColor: 0xd18cff,
    secondaryColor: 0x703b88,
    localCooldownMs: 90,
  }),
  phagocytosisContact: preset("phagocytosisContact", {
    priority: 1,
    layer: "combat",
    motion: "inward",
    durationMs: 360,
    particleCount: 5,
    speed: 38,
    particleSize: [2, 3],
    primaryColor: 0x62d3c8,
    secondaryColor: 0x2f7f78,
    localCooldownMs: 80,
  }),
  phagocytosisDigest: preset("phagocytosisDigest", {
    priority: 1,
    layer: "combat",
    motion: "inward",
    durationMs: 300,
    particleCount: 4,
    speed: 28,
    particleSize: [1, 2],
    primaryColor: 0x8ce6b2,
    secondaryColor: 0x3e8d69,
    localCooldownMs: 100,
  }),
  netDeploy: preset("netDeploy", {
    priority: 1,
    layer: "ground",
    motion: "filament",
    durationMs: 420,
    particleCount: 4,
    speed: 24,
    particleSize: [1, 2],
    primaryColor: 0xc9b7ff,
    secondaryColor: 0x7366aa,
    localCooldownMs: 120,
  }),
  netContact: preset("netContact", {
    priority: 2,
    layer: "combat",
    motion: "filament",
    durationMs: 230,
    particleCount: 2,
    speed: 18,
    particleSize: [1, 2],
    primaryColor: 0xe0d7ff,
    secondaryColor: 0x8174b9,
    localCooldownMs: 86,
  }),
  interferonActivation: preset("interferonActivation", {
    priority: 1,
    layer: "ground",
    motion: "wave",
    durationMs: 520,
    particleCount: 5,
    speed: 34,
    particleSize: [1, 2],
    primaryColor: 0x8bbcff,
    secondaryColor: 0x446fa9,
    localCooldownMs: 160,
  }),
  interferonResponse: preset("interferonResponse", {
    priority: 2,
    layer: "combat",
    motion: "signal",
    durationMs: 250,
    particleCount: 2,
    speed: 18,
    particleSize: [1, 2],
    primaryColor: 0xa9d0ff,
    secondaryColor: 0x527faf,
    localCooldownMs: 90,
  }),
  infectionEntry: preset("infectionEntry", {
    priority: 1,
    layer: "combat",
    motion: "inward",
    durationMs: 320,
    particleCount: 4,
    speed: 30,
    particleSize: [1, 2],
    primaryColor: 0x9b8cff,
    secondaryColor: 0x514887,
    localCooldownMs: 80,
  }),
  tissueReaction: preset("tissueReaction", {
    priority: 2,
    layer: "ground",
    motion: "wave",
    durationMs: 240,
    particleCount: 2,
    speed: 20,
    particleSize: [2, 3],
    primaryColor: 0xff8f91,
    secondaryColor: 0x8d444f,
    localCooldownMs: 65,
  }),
  adaptiveClearance: preset("adaptiveClearance", {
    priority: 1,
    layer: "combat",
    motion: "inward",
    durationMs: 330,
    particleCount: 4,
    speed: 38,
    particleSize: [1, 2],
    primaryColor: 0xbda7ff,
    secondaryColor: 0x765aa1,
    localCooldownMs: 70,
  }),
  treatmentResponse: preset("treatmentResponse", {
    priority: 2,
    layer: "ground",
    motion: "rise",
    durationMs: 360,
    particleCount: 3,
    speed: 24,
    particleSize: [1, 2],
    primaryColor: 0x7ee28a,
    secondaryColor: 0x3e884f,
    localCooldownMs: 90,
  }),
  antibodyFallback: preset("antibodyFallback", {
    priority: 2,
    layer: "combat",
    motion: "signal",
    durationMs: 250,
    particleCount: 3,
    speed: 30,
    particleSize: [1, 2],
    primaryColor: 0xf3e5ae,
    secondaryColor: 0x9a7f49,
    localCooldownMs: 55,
  }),
  dendriticAbsorb: preset("dendriticAbsorb", {
    priority: 2,
    layer: "combat",
    motion: "inward",
    durationMs: 340,
    particleCount: 4,
    speed: 28,
    particleSize: [2, 3],
    primaryColor: 0xffb13b,
    secondaryColor: 0x9c541f,
    localCooldownMs: 100,
  }),
  diapedesis: preset("diapedesis", {
    priority: 1,
    layer: "combat",
    motion: "rise",
    durationMs: 480,
    particleCount: 5,
    speed: 28,
    particleSize: [2, 3],
    primaryColor: 0x78d7ff,
    secondaryColor: 0x386f98,
    localCooldownMs: 90,
  }),
  vascularEntry: preset("vascularEntry", {
    priority: 1,
    layer: "ground",
    motion: "rise",
    durationMs: 460,
    particleCount: 4,
    speed: 24,
    particleSize: [2, 3],
    primaryColor: 0x6fc5ea,
    secondaryColor: 0x315f7d,
    localCooldownMs: 90,
  }),
  lymphArrival: preset("lymphArrival", {
    priority: 1,
    layer: "ground",
    motion: "inward",
    durationMs: 460,
    particleCount: 4,
    speed: 24,
    particleSize: [1, 2],
    primaryColor: 0xd2e77b,
    secondaryColor: 0x70833c,
    localCooldownMs: 90,
  }),
  immuneRelay: preset("immuneRelay", {
    priority: 1,
    layer: "combat",
    motion: "signal",
    durationMs: 440,
    particleCount: 4,
    speed: 24,
    particleSize: [1, 2],
    primaryColor: 0xf4edcf,
    secondaryColor: 0x9f8e5d,
    localCooldownMs: 90,
  }),
  lymphExit: preset("lymphExit", {
    priority: 2,
    layer: "ground",
    motion: "inward",
    durationMs: 420,
    particleCount: 4,
    speed: 24,
    particleSize: [1, 2],
    primaryColor: 0xc9df70,
    secondaryColor: 0x6f7e38,
    localCooldownMs: 120,
  }),
  lymphReturn: preset("lymphReturn", {
    priority: 2,
    layer: "ground",
    motion: "rise",
    durationMs: 420,
    particleCount: 4,
    speed: 24,
    particleSize: [1, 2],
    primaryColor: 0xd9ed85,
    secondaryColor: 0x74893d,
    localCooldownMs: 120,
  }),
  commandMove: preset("commandMove", {
    priority: 2,
    layer: "command",
    motion: "command",
    durationMs: 360,
    particleCount: 0,
    speed: 0,
    particleSize: [1, 1],
    primaryColor: 0xffc76b,
    secondaryColor: 0x8c6733,
    localCooldownMs: 60,
  }),
  commandEngage: preset("commandEngage", {
    priority: 1,
    layer: "command",
    motion: "command",
    durationMs: 380,
    particleCount: 0,
    speed: 0,
    particleSize: [1, 1],
    primaryColor: 0xff8b87,
    secondaryColor: 0x9e4548,
    localCooldownMs: 60,
  }),
  commandSpecial: preset("commandSpecial", {
    priority: 2,
    layer: "command",
    motion: "command",
    durationMs: 400,
    particleCount: 0,
    speed: 0,
    particleSize: [1, 1],
    primaryColor: 0xbda7ff,
    secondaryColor: 0x6f5c9c,
    localCooldownMs: 70,
  }),
  pathogenDamageBacterium: damagePreset(
    "pathogenDamageBacterium",
    0xe8c66c,
    0x745733,
  ),
  pathogenDamageVirus: damagePreset(
    "pathogenDamageVirus",
    0xa9a2ff,
    0x524e91,
  ),
  pathogenDamageFungus: damagePreset(
    "pathogenDamageFungus",
    0xc5e88c,
    0x5d793e,
  ),
  pathogenDamageParasite: damagePreset(
    "pathogenDamageParasite",
    0xf0a478,
    0x8e503a,
  ),
  pathogenDamageCancer: damagePreset(
    "pathogenDamageCancer",
    0xe995c8,
    0x843c70,
  ),
  pathogenDamageCollective: damagePreset(
    "pathogenDamageCollective",
    0x92d29a,
    0x456f4d,
  ),
});

function damagePreset(
  id: CombatVfxPresetId,
  primaryColor: number,
  secondaryColor: number,
): CombatVfxPreset {
  return preset(id, {
    priority: 2,
    layer: "combat",
    motion: "burst",
    durationMs: 190,
    particleCount: 2,
    speed: 24,
    particleSize: [1, 2],
    primaryColor,
    secondaryColor,
    localCooldownMs: 52,
  });
}

export function classifyCombatEffect(
  state: GameState,
  effect: CombatEffect,
): CombatVfxPresetId | null {
  const source = effect.sourceEntityId
    ? state.entities[effect.sourceEntityId]
    : undefined;

  if (effect.kind === "phagocytosis" || effect.kind === "netTrap") {
    // Dedicated state transitions provide phase-accurate feedback.
    return null;
  }
  if (effect.kind === "cytotoxic") {
    if (!source) return "cancerReveal";
    if (isNkCell(source)) return "cytotoxicRough";
    if (isCytotoxicT(source)) return "cytotoxicPrecise";
    return "chemicalSignal";
  }
  if (effect.kind === "attack") {
    if (!source) return "physicalContact";
    if (isNkCell(source)) return "cytotoxicRough";
    if (isCytotoxicT(source)) return "cytotoxicPrecise";
    if (isPlasmocyte(source)) return "chemicalSignal";
    if (isMacrophage(source) || isNeutrophil(source)) {
      return "physicalContact";
    }
    return isImmuneUnit(source) ? "physicalContact" : "tissueReaction";
  }
  if (effect.kind === "antiviral") return "interferonResponse";
  if (effect.kind === "infection") return "infectionEntry";
  if (effect.kind === "tissueDamage") return "tissueReaction";
  if (effect.kind === "adaptive") return "adaptiveClearance";
  if (effect.kind === "treatment") return "treatmentResponse";
  if (effect.kind === "antibody" || effect.kind === "antibodyImpact") {
    return "antibodyFallback";
  }
  return null;
}

export function getPathogenDamagePreset(
  family: PathogenVisualFamily,
): CombatVfxPresetId {
  if (family === "bacterium") return "pathogenDamageBacterium";
  if (family === "virus") return "pathogenDamageVirus";
  if (family === "fungus") return "pathogenDamageFungus";
  if (family === "parasite") return "pathogenDamageParasite";
  if (family === "cancerCell") return "pathogenDamageCancer";
  return "pathogenDamageCollective";
}

export type CommandFeedback = Readonly<{
  presetId: "commandMove" | "commandEngage" | "commandSpecial";
  position: Vector2;
}>;

export function resolveCommandFeedback(
  command: GameCommand,
  state: GameState,
): CommandFeedback | null {
  const selectedControllableUnits = state.selectedEntityIds
    .map((id) => state.entities[id])
    .filter((entity) => entity && isControllableImmuneUnit(entity));

  if (!canAcknowledgeTacticalOrder(command, state, selectedControllableUnits)) {
    return null;
  }

  if (command.type === "orderMove" || command.type === "orderGuardArea") {
    return { presetId: "commandMove", position: { ...command.position } };
  }
  if (command.type === "orderAttack") {
    const target = state.entities[command.targetEntityId];
    return target
      ? { presetId: "commandEngage", position: { ...target.position } }
      : null;
  }
  if (command.type === "orderAttackTissueCell") {
    const target = state.tissueCells.find(
      (cell) => cell.id === command.tissueCellId,
    );
    return target
      ? { presetId: "commandEngage", position: { ...target.position } }
      : null;
  }
  if (command.type === "orderCollectDebris") {
    const target = state.debris.find((debris) => debris.id === command.debrisId);
    return target
      ? { presetId: "commandSpecial", position: { ...target.position } }
      : null;
  }
  if (command.type === "orderReturnToLymphNode") {
    const selectedDendritic = state.selectedEntityIds
      .map((id) => state.entities[id])
      .find((entity) => entity && isDendriticCell(entity));
    const exit = selectedDendritic?.lymphTransit
      ? state.tacticalMap.lymphaticExits.find(
          (candidate) => candidate.id === selectedDendritic.lymphTransit?.exitId,
        )
      : state.tacticalMap.lymphaticExits[0];
    return exit
      ? { presetId: "commandSpecial", position: { ...exit.position } }
      : null;
  }
  if (command.type === "orderHoldPosition" || command.type === "orderRetreat") {
    return {
      presetId: command.type === "orderRetreat" ? "commandMove" : "commandSpecial",
      position: {
        x:
          selectedControllableUnits.reduce(
            (total, entity) => total + entity.position.x,
            0,
          ) / selectedControllableUnits.length,
        y:
          selectedControllableUnits.reduce(
            (total, entity) => total + entity.position.y,
            0,
          ) / selectedControllableUnits.length,
      },
    };
  }
  return null;
}

export function getImmuneArrivalPreset(
  entity: GameEntity,
): "diapedesis" | "vascularEntry" | "lymphArrival" | "immuneRelay" {
  if (isNeutrophil(entity) || isNkCell(entity) || isCytotoxicT(entity)) {
    return "diapedesis";
  }
  if (isDendriticCell(entity)) return "lymphArrival";
  if (isMacrophage(entity)) return "vascularEntry";
  return "immuneRelay";
}

function canAcknowledgeTacticalOrder(
  command: GameCommand,
  state: GameState,
  selected: readonly GameEntity[],
): boolean {
  if (!command.type.startsWith("order")) return true;
  if (selected.length === 0) return false;

  if (command.type === "orderAttack") {
    const target = state.entities[command.targetEntityId];
    return Boolean(
      target &&
      isHostilePathogen(target) &&
      selected.some((entity) => isImmuneUnit(entity) && entity.attackDamage > 0),
    );
  }
  if (command.type === "orderAttackTissueCell") {
    const target = state.tissueCells.find(
      (cell) => cell.id === command.tissueCellId,
    );
    return Boolean(
      target?.status === "infected" &&
      selected.some((entity) => isNkCell(entity) || isCytotoxicT(entity)),
    );
  }
  if (command.type === "orderCollectDebris") {
    return (
      state.debris.some((debris) => debris.id === command.debrisId) &&
      selected.some(isDendriticCell)
    );
  }
  if (command.type === "orderReturnToLymphNode") {
    return selected.some(
      (entity) => isDendriticCell(entity) && entity.carriedDebrisCount > 0,
    );
  }
  return true;
}

type DensityBucket = {
  windowStartedMs: number;
  counts: Record<VfxPriority, number>;
  presetLastSpawnMs: Partial<Record<CombatVfxPresetId, number>>;
};

export class VfxDensityGovernor {
  private readonly buckets = new Map<string, DensityBucket>();

  allows(preset: CombatVfxPreset, position: Vector2, nowMs: number): boolean {
    this.prune(nowMs);
    const cellX = Math.floor(position.x / COMBAT_VFX_LIMITS.densityCellSize);
    const cellY = Math.floor(position.y / COMBAT_VFX_LIMITS.densityCellSize);
    const key = `${cellX}:${cellY}`;
    let bucket = this.buckets.get(key);

    if (
      !bucket ||
      nowMs - bucket.windowStartedMs >= COMBAT_VFX_LIMITS.densityWindowMs
    ) {
      bucket = {
        windowStartedMs: nowMs,
        counts: { 1: 0, 2: 0, 3: 0 },
        presetLastSpawnMs: {},
      };
      this.buckets.set(key, bucket);
    }

    const lastPresetSpawn = bucket.presetLastSpawnMs[preset.id];
    if (
      lastPresetSpawn !== undefined &&
      nowMs - lastPresetSpawn < preset.localCooldownMs
    ) {
      return false;
    }
    if (
      bucket.counts[preset.priority] >=
      COMBAT_VFX_LIMITS.localEventsByPriority[preset.priority]
    ) {
      return false;
    }

    bucket.counts[preset.priority] += 1;
    bucket.presetLastSpawnMs[preset.id] = nowMs;
    return true;
  }

  reset(): void {
    this.buckets.clear();
  }

  private prune(nowMs: number): void {
    const staleAfterMs = COMBAT_VFX_LIMITS.densityWindowMs * 2;
    for (const [key, bucket] of this.buckets) {
      if (nowMs - bucket.windowStartedMs > staleAfterMs) {
        this.buckets.delete(key);
      }
    }
  }
}
