import { afterEach, describe, expect, it, vi } from "vitest";
import { balanceValues } from "../game/data/balance";
import { v11VisualMetadata } from "../game/data/v11VisualMetadata";
import { bodyRegionDefinitions } from "../game/bodyMap/bodyRegions";
import { createGeneratedBodyMapState } from "../game/bodyMap/bodyMapGenerator";
import {
  bodyMapEndingRules,
  getBodyMapVictoryProgress,
} from "../game/bodyMap/bodyMapSystem";
import {
  clearBodyMapState,
  hasRunningBodyMapState,
  hasSavedBodyMapState,
  loadBodyMapState,
  saveBodyMapState,
} from "../game/bodyMap/bodyMapSave";
import { treatmentDefinitions } from "../game/data/treatments";
import { unitDefinitions } from "../game/data/units";
import type { BodyMapFinalSummary } from "../game/bodyMap/bodyMapTypes";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { applyAdvancedThreatSystem } from "../game/simulation/systems/advancedThreatSystem";
import { applyDebrisSystem } from "../game/simulation/systems/debrisSystem";
import {
  canCreateDebris,
  canSpawnPathogen,
} from "../game/simulation/systems/entityLimitSystem";
import { applyVirusSystem } from "../game/simulation/systems/virusSystem";
import { spawnAdvancedThreat } from "../game/simulation/pathogens/createAdvancedThreat";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { spawnVirus } from "../game/simulation/pathogens/createVirus";

describe("V9.3 consolidation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps viral bursts before they can grow without limit", () => {
    const state = createInitialState("viralInfectionV6");
    const cell = state.tissueCells[0];

    for (let index = 0; index < balanceValues.entityLimits.maxActiveViruses; index += 1) {
      spawnVirus(state, "respiratoryVirus", { x: 520 + index, y: 360 });
    }

    cell.status = "infected";
    cell.infectedByPathogenTypeId = "respiratoryVirus";
    cell.nextVirusBurstMs = 0;

    expect(canSpawnPathogen(state, "respiratoryVirus")).toBe(false);

    applyVirusSystem(state, 16);

    expect(
      Object.values(state.entities).filter((entity) => entity.kind === "virus"),
    ).toHaveLength(balanceValues.entityLimits.maxActiveViruses);
  });

  it("caps advanced secondary spawns such as spores and cancer-like cells", () => {
    const state = createInitialState("skinFungalOutbreak");
    const colony = spawnAdvancedThreat(state, "fungalColony", { x: 600, y: 360 });

    colony.specialCooldownRemainingMs = 0;

    for (let index = 0; index < balanceValues.entityLimits.maxActiveSpores; index += 1) {
      spawnAdvancedThreat(state, "fungalSpore", { x: 620 + index, y: 390 });
    }

    expect(canSpawnPathogen(state, "fungalSpore")).toBe(false);

    applyAdvancedThreatSystem(state, 2000);

    expect(
      Object.values(state.entities).filter(
        (entity) =>
          entity.kind === "advancedThreat" &&
          entity.pathogenTypeId === "fungalSpore",
      ),
    ).toHaveLength(balanceValues.entityLimits.maxActiveSpores);
  });

  it("caps debris creation when the battlefield is already saturated", () => {
    const state = createInitialState("woundBacteriaV1");

    for (let index = 0; index < balanceValues.entityLimits.maxActiveDebris; index += 1) {
      state.debris.push({
        id: `existing-debris-${index}`,
        position: { x: 420 + index, y: 330 },
        pathogenTypeId: "cocciRapid",
        antigenProfileId: "gramPositiveCocci",
        antigenValue: 2,
        ttlMs: 9000,
      });
    }

    const bacterium = spawnBacterium(state, "cocciRapid", { x: 500, y: 360 });

    bacterium.health = 0;

    expect(canCreateDebris(state)).toBe(false);

    applyDebrisSystem(state, 16);

    expect(state.debris).toHaveLength(balanceValues.entityLimits.maxActiveDebris);
  });

  it("explains body-map victory blockers with region names and thresholds", () => {
    const state = createGeneratedBodyMapState("normal", "v9-3-blockers");

    state.regions.lungs.infection = 28;
    state.regions.lungs.threat = "viral";
    state.globalInfection = 22;
    state.systemicInflammation = 72;
    state.globalHealth = 35;

    const progress = getBodyMapVictoryProgress(state);

    expect(progress.canWinNow).toBe(false);
    expect(progress.blockerDetails.some((blocker) => blocker.regionName === "Poumons"))
      .toBe(true);
    expect(progress.blockers).toContain(
      `Poumons encore infecté : 28% > seuil ${bodyMapEndingRules.victoryMaxRegionInfection}%`,
    );
    expect(progress.blockers).toContain(
      `Infection globale trop élevée : 22% > ${bodyMapEndingRules.victoryMaxGlobalInfection}%`,
    );
    expect(progress.blockers).toContain(
      `Santé globale trop basse : 35% < ${bodyMapEndingRules.victoryMinGlobalHealth}%`,
    );
  });

  it("separates normal-run save, continue and abandon semantics", () => {
    const storage = createStorageMock();

    vi.stubGlobal("window", { localStorage: storage });

    expect(hasSavedBodyMapState()).toBe(false);
    expect(hasRunningBodyMapState()).toBe(false);

    const running = createGeneratedBodyMapState("hard", "v9-3-save");

    saveBodyMapState(running);

    expect(hasSavedBodyMapState()).toBe(true);
    expect(hasRunningBodyMapState()).toBe(true);
    expect(loadBodyMapState().seed).toBe("v9-3-save");

    const finished = {
      ...running,
      runStatus: "victory" as const,
      finalSummary: createSummary(running),
    };

    saveBodyMapState(finished);

    expect(hasSavedBodyMapState()).toBe(true);
    expect(hasRunningBodyMapState()).toBe(false);

    const cleared = clearBodyMapState();

    expect(hasSavedBodyMapState()).toBe(false);
    expect(cleared.seed).toBe("v7-default");
  });

  it("keeps V11 visual metadata available beyond pathogens", () => {
    expect(unitDefinitions.macrophage.visualIdentity.vfxTags).toContain("phagocytosis");
    expect(treatmentDefinitions.antiviralDrug.visualIdentity.vfxTags).toContain("virus");
    expect(bodyRegionDefinitions.lungs.visualIdentity.futureSpriteKey).toBe("region_lungs");
    expect(v11VisualMetadata.inflammation.vfxTags).toContain("inflammation");
    expect(v11VisualMetadata.immuneMemory.futureSpriteKey).toBe("ui_immune_memory");
  });
});

function createSummary(state: ReturnType<typeof createGeneratedBodyMapState>): BodyMapFinalSummary {
  return {
    status: "victory",
    title: "Organisme stabilise",
    cause: "test",
    score: 1000,
    rank: "A",
    completedAt: "2026-07-01T00:00:00.000Z",
    difficulty: state.difficulty,
    strategicTurn: state.strategicTurn,
    globalHealth: state.globalHealth,
    globalInfection: state.globalInfection,
    systemicInflammation: state.systemicInflammation,
    stabilizedRegions: 8,
    criticalRegions: 0,
    lostRegions: 0,
    battleStats: state.battleStats,
  };
}

function createStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}
