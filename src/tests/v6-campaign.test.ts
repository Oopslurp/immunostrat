import { describe, expect, it } from "vitest";
import {
  areAllWavesSpawned,
  areRequiredObjectivesComplete,
  evaluateMissionObjectives,
} from "../game/campaign/objectives";
import {
  completeMission,
  loadCampaignProgress,
} from "../game/campaign/progress";
import {
  campaignMissionOrder,
  missionDefinitions,
} from "../game/data/missions";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";

describe("V6 campaign", () => {
  it("defines eight progressive campaign missions", () => {
    expect(campaignMissionOrder).toHaveLength(8);
    expect(missionDefinitions.woundBacteriaV1.unlockedUnits).toEqual([
      "macrophage",
    ]);
    expect(missionDefinitions.inflammatoryReactionV2.unlockedUnits).toContain(
      "neutrophil",
    );
    expect(missionDefinitions.antigenAnalysisV4.unlockedUnits).toContain(
      "dendriticCell",
    );
    expect(missionDefinitions.adaptiveResponseV5.unlockedUnits).toContain(
      "plasmocyte",
    );
    expect(missionDefinitions.viralInfectionV6.unlockedAbilities).toContain(
      "interferons",
    );
    expect(missionDefinitions.viralCleanupV7.unlockedUnits).toContain("nkCell");
    expect(missionDefinitions.viralCleanupV7.unlockedUnits).toContain(
      "cytotoxicT",
    );
    expect(missionDefinitions.mixedInfectionV8.unlockedUnits).toContain(
      "plasmocyte",
    );
  });

  it("loads default campaign progress and unlocks the next mission on victory", () => {
    const initial = loadCampaignProgress();

    expect(initial.unlockedMissionIds).toEqual(["woundBacteriaV1"]);

    const next = completeMission(initial, {
      missionId: "woundBacteriaV1",
      score: 500,
      rank: "A",
    });

    expect(next.completedMissions.woundBacteriaV1?.bestScore).toBe(500);
    expect(next.unlockedMissionIds).toContain("inflammatoryReactionV2");
  });

  it("evaluates required mission objectives from simulation state", () => {
    const state: GameState = {
      ...createInitialState("antigenAnalysisV4"),
      resources: {
        atp: 100,
        cytokines: 20,
        antigens: 12,
      },
      waves: {
        currentWaveIndex: missionDefinitions.antigenAnalysisV4.waves.length,
        spawnedInCurrentWave: 0,
      },
      entities: {},
    };
    const objectives = evaluateMissionObjectives(state);

    expect(objectives.some((objective) => objective.complete)).toBe(true);
    expect(areRequiredObjectivesComplete(state)).toBe(true);
  });

  it("uses a softer viral control objective before NK and cytotoxic T cells unlock", () => {
    const state: GameState = {
      ...createInitialState("viralInfectionV6"),
      missionStats: {
        ...createInitialState("viralInfectionV6").missionStats,
        pathogenKills: {
          respiratoryVirus: 3,
        },
      },
      waves: {
        currentWaveIndex: 2,
        spawnedInCurrentWave: 0,
      },
    };
    const objectives = evaluateMissionObjectives(state);

    expect(areAllWavesSpawned(state)).toBe(false);
    expect(objectives.find((objective) => objective.id === "waves")?.complete).toBe(
      true,
    );
    expect(objectives.find((objective) => objective.id === "virusKills3")?.complete).toBe(
      true,
    );
    expect(objectives.some((objective) => objective.id === "infected4")).toBe(false);
    expect(areRequiredObjectivesComplete(state)).toBe(true);
  });
});
