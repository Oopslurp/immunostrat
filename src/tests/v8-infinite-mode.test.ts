import { describe, expect, it } from "vitest";
import {
  calculateInfiniteScore,
  createInfiniteWave,
  getActiveInfiniteMutators,
  getInfiniteCycle,
  getInfinitePhase,
} from "../game/data/infiniteMode";
import { missionDefinitions } from "../game/data/missions";
import {
  recordInfiniteRun,
  type InfiniteProgress,
} from "../game/infinite/infiniteProgress";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { applyEndConditionSystem } from "../game/simulation/systems/endConditionSystem";
import { applyWaveSystem } from "../game/simulation/systems/waveSystem";

describe("V8 infinite mode", () => {
  it("registers infinite mode as a separate mission preset", () => {
    const mission = missionDefinitions.infiniteSurvivalV8;

    expect(mission.mode).toBe("infinite");
    expect(mission.victoryConditions).toHaveLength(0);
    expect(mission.unlockedUnits).toContain("cytotoxicT");
  });

  it("progresses cycles and phases up to nightmare", () => {
    expect(getInfiniteCycle(1)).toBe(1);
    expect(getInfiniteCycle(4)).toBe(2);
    expect(getInfinitePhase(1).id).toBe(1);
    expect(getInfinitePhase(15).id).toBe(8);
  });

  it("generates virtual waves beyond the preview list", () => {
    const wave = createInfiniteWave(240, "nightmare");

    expect(wave.count).toBeGreaterThan(0);
    expect(wave.startsAtMs).toBeGreaterThan(0);
    expect(missionDefinitions.infiniteSurvivalV8.allowedPathogens).toContain(
      wave.pathogenTypeId,
    );
  });

  it("does not auto-win when waves are cleared in infinite mode", () => {
    const state = createInitialState("infiniteSurvivalV8");

    state.waves.currentWaveIndex = 999;
    state.waves.spawnedInCurrentWave = 0;
    state.entities = {};
    applyEndConditionSystem(state);

    expect(state.status).toBe("running");
  });

  it("spawns infinite enemies with difficulty modifiers and mutators", () => {
    const state = createInitialState("infiniteSurvivalV8", {
      infiniteDifficulty: "nightmare",
    });

    state.elapsedMs = 2000;
    applyWaveSystem(state);

    expect(
      Object.values(state.entities).filter(
        (entity) => entity.kind === "bacterium" || entity.kind === "virus",
      ),
    ).toHaveLength(1);
    expect(getActiveInfiniteMutators(15, "nightmare").length).toBeGreaterThan(0);
  });

  it("calculates and stores best infinite scores per difficulty", () => {
    const score = calculateInfiniteScore(
      {
        wave: 12,
        cycle: 4,
        tissueHealth: 80,
        healthyCells: 9,
        destroyedCells: 1,
        infectedCells: 0,
        peakInflammation: 55,
        antigensCollected: 8,
      },
      "hard",
    );
    const progress: InfiniteProgress = { version: 1, bestRuns: {} };
    const next = recordInfiniteRun(progress, {
      difficulty: "hard",
      score,
      cycle: 4,
      wave: 12,
      phase: getInfinitePhase(4),
      nextPhaseAtCycle: 5,
      activeMutators: [],
      maxActivePathogens: 86,
    });

    expect(next.bestRuns.hard?.score).toBe(score);
  });
});
