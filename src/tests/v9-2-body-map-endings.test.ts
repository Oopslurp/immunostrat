import { describe, expect, it } from "vitest";
import {
  advanceStrategicTurn,
  applyBodyBattleOutcome,
  assignReinforcement,
  bodyMapEndingRules,
  calculateBodyMapScore,
} from "../game/bodyMap/bodyMapSystem";
import {
  recordBodyMapRun,
  createDefaultBodyMapProgress,
} from "../game/bodyMap/bodyMapProgress";
import { createGeneratedBodyMapState } from "../game/bodyMap/bodyMapGenerator";
import type { BodyMapState } from "../game/bodyMap/bodyMapTypes";

describe("V9.2 body map endings", () => {
  it("wins the normal body-map mode after enough stable strategic turns", () => {
    let state = makeStableBodyMapState();

    state = advanceStrategicTurn(state);
    expect(state.runStatus).toBe("running");
    expect(state.stabilizationStreak).toBe(1);

    state = advanceStrategicTurn(state);

    expect(state.runStatus).toBe("victory");
    expect(state.finalSummary?.title).toBe("Organisme stabilise");
    expect(state.finalSummary?.score).toBeGreaterThan(0);
  });

  it("defeats the normal body-map mode when systemic collapse conditions are met", () => {
    let state = createGeneratedBodyMapState("normal", "v9-2-defeat");

    state.globalHealth = 0;
    state = advanceStrategicTurn(state);

    expect(state.runStatus).toBe("defeat");
    expect(state.finalSummary?.cause).toBe("Sante globale effondree");
  });

  it("stops strategic actions after global victory or defeat", () => {
    const victory = {
      ...makeStableBodyMapState(),
      runStatus: "victory" as const,
      finalSummary: makeStableBodyMapState().finalSummary,
    };
    const afterTurn = advanceStrategicTurn(victory);
    const afterReinforcement = assignReinforcement(victory, "skin", "macrophage");

    expect(afterTurn).toBe(victory);
    expect(afterReinforcement).toBe(victory);
  });

  it("records body-map results separately from active map state", () => {
    const state = makeStableBodyMapState();
    const summary = {
      status: "victory" as const,
      title: "Organisme stabilise",
      cause: "test",
      score: calculateBodyMapScore(state),
      rank: "A" as const,
      completedAt: "2026-06-30T00:00:00.000Z",
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
    const progress = recordBodyMapRun(createDefaultBodyMapProgress(), summary);

    expect(progress.victories).toBe(1);
    expect(progress.bestVictory?.score).toBe(summary.score);
  });

  it("keeps battle outcomes meaningful for the global map", () => {
    const state = createGeneratedBodyMapState("normal", "v9-2-battle");
    const regionBefore = state.regions.skin;
    const next = applyBodyBattleOutcome(state, {
      regionId: "skin",
      missionId: regionBefore.activeBattleMissionId ?? "skinBacterialSkirmish",
      status: "defeat",
      score: 0,
      civilianCellsLost: 4,
      enemiesRemaining: 3,
      inflammationPeak: 92,
    });

    expect(next.regions.skin.infection).toBeGreaterThanOrEqual(
      regionBefore.infection,
    );
    expect(next.battleStats.lost).toBe(1);
  });
});

function makeStableBodyMapState(): BodyMapState {
  const state = createGeneratedBodyMapState("normal", "v9-2-victory");

  state.globalHealth = 82;
  state.globalInfection = bodyMapEndingRules.victoryMaxGlobalInfection;
  state.systemicInflammation = 30;
  state.stabilizationStreak = 0;
  state.defeatPressureTurns = 0;
  state.runStatus = "running";
  state.finalSummary = undefined;

  for (const region of Object.values(state.regions)) {
    region.infection = 0;
    region.inflammation = 12;
    region.localHealth = 90;
    region.status = "controlled";
    region.threat = "none";
    region.pathogens = [];
  }

  return state;
}
