import type {
  TacticalMapMode,
  TacticalMapSizeCategory,
} from "./tacticalMaps";

export type MapScaleDifficulty = "easy" | "normal" | "hard";

export type RuntimeMapBalance = {
  pathogenDamageMultiplier: number;
  pathogenSpeedMultiplier: number;
  infectionRateMultiplier: number;
  spreadRateMultiplier: number;
  waveIntervalMultiplier: number;
  tissueRegenRate: number;
  tissueRegenDelayMs: number;
  inflammationRegenPenalty: number;
  maxActiveCombatSites: number;
  diapedesisPointCountModifier: number;
  resourceIncomeModifier: number;
  unitTravelCompensation: number;
  difficultyMultiplier: number;
  inflammationGainMultiplier: number;
  inflammationDecayMultiplier: number;
  inflammationDamageMultiplier: number;
  advancedPassiveDamageMultiplier: number;
};

type PartialRuntimeMapBalance = Partial<RuntimeMapBalance>;

const baseMapScaleBalance: RuntimeMapBalance = {
  pathogenDamageMultiplier: 1,
  pathogenSpeedMultiplier: 1,
  infectionRateMultiplier: 1,
  spreadRateMultiplier: 1,
  waveIntervalMultiplier: 1,
  tissueRegenRate: 0.38,
  tissueRegenDelayMs: 6200,
  inflammationRegenPenalty: 0.018,
  maxActiveCombatSites: 2,
  diapedesisPointCountModifier: 0,
  resourceIncomeModifier: 1,
  unitTravelCompensation: 1,
  difficultyMultiplier: 1,
  inflammationGainMultiplier: 1,
  inflammationDecayMultiplier: 1,
  inflammationDamageMultiplier: 1,
  advancedPassiveDamageMultiplier: 1,
};

const modeBalance: Record<TacticalMapMode, PartialRuntimeMapBalance> = {
  campaign: {
    pathogenDamageMultiplier: 0.84,
    pathogenSpeedMultiplier: 0.88,
    infectionRateMultiplier: 0.82,
    spreadRateMultiplier: 1,
    waveIntervalMultiplier: 1,
    tissueRegenRate: 0.46,
    maxActiveCombatSites: 2,
    resourceIncomeModifier: 1,
    inflammationDecayMultiplier: 1.08,
    advancedPassiveDamageMultiplier: 0.9,
  },
  bodyBattle: {
    pathogenDamageMultiplier: 0.78,
    pathogenSpeedMultiplier: 0.92,
    infectionRateMultiplier: 0.82,
    spreadRateMultiplier: 0.84,
    waveIntervalMultiplier: 1.2,
    tissueRegenRate: 0.44,
    maxActiveCombatSites: 2,
    diapedesisPointCountModifier: 1,
    resourceIncomeModifier: 1.12,
    unitTravelCompensation: 1.04,
    inflammationGainMultiplier: 0.9,
    inflammationDecayMultiplier: 1.12,
    inflammationDamageMultiplier: 0.8,
    advancedPassiveDamageMultiplier: 0.76,
  },
  infinite: {
    pathogenDamageMultiplier: 0.74,
    pathogenSpeedMultiplier: 0.92,
    infectionRateMultiplier: 0.78,
    spreadRateMultiplier: 0.78,
    waveIntervalMultiplier: 1.28,
    tissueRegenRate: 0.2,
    tissueRegenDelayMs: 7600,
    maxActiveCombatSites: 1,
    diapedesisPointCountModifier: 2,
    resourceIncomeModifier: 1.1,
    unitTravelCompensation: 1.05,
    inflammationGainMultiplier: 0.86,
    inflammationDecayMultiplier: 1.1,
    inflammationDamageMultiplier: 0.72,
    advancedPassiveDamageMultiplier: 0.68,
  },
};

const difficultyBalance: Record<MapScaleDifficulty, PartialRuntimeMapBalance> = {
  easy: {
    pathogenDamageMultiplier: 0.72,
    pathogenSpeedMultiplier: 0.94,
    infectionRateMultiplier: 0.76,
    spreadRateMultiplier: 0.78,
    waveIntervalMultiplier: 1.26,
    tissueRegenRate: 0.82,
    tissueRegenDelayMs: 4200,
    maxActiveCombatSites: 1,
    diapedesisPointCountModifier: 1,
    resourceIncomeModifier: 1.18,
    difficultyMultiplier: 0.84,
    inflammationGainMultiplier: 0.8,
    inflammationDecayMultiplier: 1.22,
    inflammationDamageMultiplier: 0.72,
  },
  normal: {
    pathogenDamageMultiplier: 1,
    infectionRateMultiplier: 1,
    spreadRateMultiplier: 1,
    waveIntervalMultiplier: 1,
    tissueRegenRate: 0.42,
    maxActiveCombatSites: 2,
    resourceIncomeModifier: 1,
    difficultyMultiplier: 1,
  },
  hard: {
    pathogenDamageMultiplier: 1.02,
    pathogenSpeedMultiplier: 1.02,
    infectionRateMultiplier: 1.05,
    spreadRateMultiplier: 1.04,
    waveIntervalMultiplier: 0.94,
    tissueRegenRate: 0.22,
    tissueRegenDelayMs: 7600,
    maxActiveCombatSites: 3,
    resourceIncomeModifier: 0.96,
    difficultyMultiplier: 1.12,
    inflammationGainMultiplier: 1.04,
    inflammationDamageMultiplier: 1.04,
  },
};

const mapSizeBalance: Record<TacticalMapSizeCategory, PartialRuntimeMapBalance> = {
  small: {
    maxActiveCombatSites: 2,
  },
  medium: {
    pathogenDamageMultiplier: 0.9,
    pathogenSpeedMultiplier: 0.94,
    infectionRateMultiplier: 0.92,
    spreadRateMultiplier: 0.92,
    waveIntervalMultiplier: 1.08,
    tissueRegenRate: 0.48,
    diapedesisPointCountModifier: 1,
    resourceIncomeModifier: 1.06,
    maxActiveCombatSites: 2,
  },
  large: {
    pathogenDamageMultiplier: 0.76,
    pathogenSpeedMultiplier: 0.9,
    infectionRateMultiplier: 0.8,
    spreadRateMultiplier: 0.82,
    waveIntervalMultiplier: 1.22,
    tissueRegenRate: 0.5,
    tissueRegenDelayMs: 5600,
    diapedesisPointCountModifier: 1,
    resourceIncomeModifier: 1.13,
    unitTravelCompensation: 1.05,
    maxActiveCombatSites: 2,
    inflammationGainMultiplier: 0.9,
    inflammationDamageMultiplier: 0.76,
  },
  huge: {
    pathogenDamageMultiplier: 0.66,
    pathogenSpeedMultiplier: 0.88,
    infectionRateMultiplier: 0.72,
    spreadRateMultiplier: 0.72,
    waveIntervalMultiplier: 1.38,
    tissueRegenRate: 0.32,
    tissueRegenDelayMs: 7000,
    diapedesisPointCountModifier: 2,
    resourceIncomeModifier: 1.18,
    unitTravelCompensation: 1.08,
    maxActiveCombatSites: 1,
    inflammationGainMultiplier: 0.82,
    inflammationDecayMultiplier: 1.12,
    inflammationDamageMultiplier: 0.66,
    advancedPassiveDamageMultiplier: 0.62,
  },
};

export function getMapScaleBalance(params: {
  mode: TacticalMapMode;
  mapSizeCategory: TacticalMapSizeCategory;
  difficulty: MapScaleDifficulty;
  waveIndex?: number;
}): RuntimeMapBalance {
  const merged = mergeBalance(
    baseMapScaleBalance,
    modeBalance[params.mode],
    params.mode === "campaign" ? {} : mapSizeBalance[params.mapSizeCategory],
    difficultyBalance[params.difficulty],
  );
  const waveIndex = params.waveIndex ?? 0;
  const escalation = getFrontEscalation(params.mode, params.difficulty, waveIndex);

  return {
    ...merged,
    maxActiveCombatSites: Math.max(1, Math.round(Math.min(6, getInitialActiveSites(params) + escalation))),
    tissueRegenRate: Math.max(0.08, merged.tissueRegenRate),
    waveIntervalMultiplier: Math.max(0.82, merged.waveIntervalMultiplier),
  };
}

function getInitialActiveSites(params: {
  mode: TacticalMapMode;
  mapSizeCategory: TacticalMapSizeCategory;
  difficulty: MapScaleDifficulty;
}): number {
  if (params.mode === "infinite") {
    return 2;
  }

  if (params.difficulty === "easy") {
    return 1;
  }

  if (params.mode === "bodyBattle") {
    if (params.difficulty === "hard") {
      return 2;
    }

    return params.mapSizeCategory === "small" ? 2 : 1;
  }

  return params.mapSizeCategory === "small" ? 2 : 1;
}

function getFrontEscalation(
  mode: TacticalMapMode,
  difficulty: MapScaleDifficulty,
  waveIndex: number,
): number {
  if (mode === "campaign") {
    return waveIndex >= 3 ? 2 : waveIndex >= 1 ? 1 : 0;
  }

  if (mode === "infinite") {
    if (waveIndex >= 18) {
      return 4;
    }

    if (waveIndex >= 9) {
      return 3;
    }

    if (waveIndex >= 4) {
      return 2;
    }

    if (waveIndex >= 2) {
      return 1;
    }

    return 0;
  }

  if (difficulty === "hard") {
    return waveIndex >= 5 ? 2 : waveIndex >= 2 ? 1 : 0;
  }

  return waveIndex >= 4 ? 2 : waveIndex >= 1 ? 1 : 0;
}

function mergeBalance(
  base: RuntimeMapBalance,
  ...partials: PartialRuntimeMapBalance[]
): RuntimeMapBalance {
  const next = { ...base };

  for (const partial of partials) {
    for (const [key, value] of Object.entries(partial) as Array<
      [keyof RuntimeMapBalance, number]
    >) {
      if (value === undefined) {
        continue;
      }

      if (
        key === "maxActiveCombatSites" ||
        key === "diapedesisPointCountModifier"
      ) {
        next[key] = Math.max(next[key], value);
        continue;
      }

      if (key === "tissueRegenRate" || key === "tissueRegenDelayMs") {
        next[key] = value;
        continue;
      }

      next[key] *= value;
    }
  }

  return next;
}
