import { describe, expect, it } from "vitest";
import {
  advanceStrategicTurn,
  applyBodyBattleOutcome,
  assignReinforcement,
  bodyMapEndingRules,
  canRegionLaunchBattle,
  createDefaultBodyMapState,
  getBodyMapVictoryProgress,
  GLOBAL_HEALTH_LOSS_ON_REGION_LOST,
  prepareBodyBattle,
  toMissionPreparation,
} from "../game/bodyMap/bodyMapSystem";
import { createGeneratedBodyMapState } from "../game/bodyMap/bodyMapGenerator";
import { bodyBattleMissionOrder, campaignMissionOrder } from "../game/data/missions";
import { completeMission, resetCampaignProgress } from "../game/campaign/progress";
import { createInitialState } from "../game/simulation/core/createInitialState";

describe("V7 body map strategy layer", () => {
  it("creates a body map with eight strategic regions", () => {
    const state = createDefaultBodyMapState();

    expect(Object.keys(state.regions)).toHaveLength(8);
    expect(state.regions.skin.status).toBe("infected");
    expect(state.regions.lungs.threat).toBe("viral");
    expect(state.regionalNodes.skinNode.antigenSignalsDelivered).toBe(0);
  });

  it("converts assigned reinforcements into local battle preparation", () => {
    const state = assignReinforcement(
      createDefaultBodyMapState(),
      "skin",
      "macrophage",
    );
    const preparation = prepareBodyBattle(state, "skin");

    expect(state.globalResources.atp).toBeLessThan(230);
    expect(preparation.reinforcements).toContainEqual({
      unitTypeId: "macrophage",
      count: 2,
    });
  });

  it("applies local victory to the selected region and regional node", () => {
    const state = createDefaultBodyMapState();
    const next = applyBodyBattleOutcome(state, {
      regionId: "skin",
      missionId: "woundBacteriaV1",
      status: "victory",
      score: 180,
    });

    expect(next.regions.skin.infection).toBeLessThan(state.regions.skin.infection);
    expect(next.regionalNodes.skinNode.antigenSignalsDelivered).toBe(1);
    expect(next.strategicTurn).toBe(state.strategicTurn + 1);
  });

  it("keeps a collapsed region recoverable for two local defeats, then loses it on the third", () => {
    const state = createDefaultBodyMapState();

    state.regions.skin.localHealth = 10;
    let next = applyBodyBattleOutcome(state, {
      regionId: "skin",
      missionId: "woundBacteriaV1",
      status: "defeat",
      score: 20,
      civilianCellsLost: 12,
      enemiesRemaining: 8,
    });

    expect(next.regions.skin.status).toBe("critical");
    expect(next.regions.skin.localHealth).toBeGreaterThan(0);
    expect(next.regions.skin.localDefeatStreak).toBe(1);

    next.regions.skin.localHealth = 4;
    next = applyBodyBattleOutcome(next, {
      regionId: "skin",
      missionId: "woundBacteriaV1",
      status: "defeat",
      score: 20,
      civilianCellsLost: 12,
      enemiesRemaining: 8,
    });

    expect(next.regions.skin.status).toBe("critical");
    expect(next.regions.skin.localDefeatStreak).toBe(2);

    next.regions.skin.localHealth = 4;
    next = applyBodyBattleOutcome(next, {
      regionId: "skin",
      missionId: "woundBacteriaV1",
      status: "defeat",
      score: 20,
      civilianCellsLost: 12,
      enemiesRemaining: 8,
    });

    expect(next.regions.skin.status).toBe("lost");
    expect(next.regions.skin.localDefeatStreak).toBe(3);
    expect(next.globalHealth).toBeLessThanOrEqual(
      state.globalHealth - GLOBAL_HEALTH_LOSS_ON_REGION_LOST,
    );
  });

  it("does not require a lost region to be recovered before global victory", () => {
    const state = createDefaultBodyMapState();

    for (const region of Object.values(state.regions)) {
      region.localHealth = 80;
      region.infection = 0;
      region.inflammation = 12;
      region.threat = "none";
      region.status = "controlled";
    }

    state.regions.skin.localHealth = 0;
    state.regions.skin.infection = 100;
    state.regions.skin.inflammation = 100;
    state.regions.skin.localDefeatStreak = 3;
    state.regions.skin.status = "lost";
    state.globalHealth = bodyMapEndingRules.victoryMinGlobalHealth + 10;
    state.globalInfection = bodyMapEndingRules.victoryMaxGlobalInfection;
    state.systemicInflammation =
      bodyMapEndingRules.victoryMaxSystemicInflammation;
    state.stabilizationStreak = bodyMapEndingRules.victoryRequiredStableTurns;

    const progress = getBodyMapVictoryProgress(state);

    expect(progress.lostRegions).toBe(1);
    expect(progress.canWinNow).toBe(true);
    expect(progress.blockers).not.toEqual(
      expect.arrayContaining([expect.stringContaining("Peau")]),
    );
  });

  it("resets local defeat attempts after a regional victory", () => {
    const state = createDefaultBodyMapState();

    state.regions.skin.localDefeatStreak = 2;
    const next = applyBodyBattleOutcome(state, {
      regionId: "skin",
      missionId: "woundBacteriaV1",
      status: "victory",
      score: 180,
    });

    expect(next.regions.skin.localDefeatStreak).toBe(0);
  });

  it("lets low infection victory blockers be targeted instead of soft-locking the body map", () => {
    const state = createDefaultBodyMapState();

    state.regions.skin.infection = bodyMapEndingRules.victoryMaxRegionInfection + 1;
    state.regions.skin.localHealth = 95;
    state.regions.skin.inflammation = 5;
    state.regions.skin.status = "healthy";

    const progress = getBodyMapVictoryProgress(state);

    expect(progress.blockers).toEqual(
      expect.arrayContaining([expect.stringContaining("Peau encore infecté")]),
    );
    expect(canRegionLaunchBattle(state.regions.skin)).toBe(true);
  });

  it("does not generate body-map regions that block victory without a battle path", () => {
    const seeds = ["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"];

    for (const seed of seeds) {
      const state = createGeneratedBodyMapState("normal", seed);
      const blockingRegions = Object.values(state.regions).filter(
        (region) =>
          region.status !== "lost" &&
          region.infection > bodyMapEndingRules.victoryMaxRegionInfection,
      );

      for (const region of blockingRegions) {
        expect(canRegionLaunchBattle(region)).toBe(true);
      }
    }
  });

  it("propagates severe infection through connected regions", () => {
    const state = createDefaultBodyMapState();

    state.regions.skin.infection = 78;
    state.regions.blood.infection = 0;

    const next = advanceStrategicTurn(state);

    expect(next.regions.blood.infection).toBeGreaterThan(0);
    expect(next.alerts[0]).toContain("Propagation");
  });

  it("generates normal body map games with regional battle presets", () => {
    const first = createGeneratedBodyMapState("normal", "seed-a");
    const second = createGeneratedBodyMapState("normal", "seed-b");
    const firstActiveMissions = Object.values(first.regions)
      .filter((region) => region.infection >= 35)
      .map((region) => region.activeBattleMissionId);

    expect(first.seed).toBe("seed-a");
    expect(second.seed).toBe("seed-b");
    expect(
      firstActiveMissions.some(
        (id) =>
          typeof id === "string" &&
          (bodyBattleMissionOrder as readonly string[]).includes(id),
      ),
    ).toBe(true);
    expect(
      firstActiveMissions.some(
        (id) =>
          typeof id === "string" &&
          (campaignMissionOrder as readonly string[]).includes(id),
      ),
    ).toBe(false);
    expect(JSON.stringify(first.regions)).not.toBe(JSON.stringify(second.regions));
  });

  it("uses detailed battle results to improve regional nodes", () => {
    const state = createGeneratedBodyMapState("normal", "signals");
    const next = applyBodyBattleOutcome(state, {
      regionId: "skin",
      missionId: "skinBacterialSkirmish",
      status: "victory",
      score: 230,
      tissueHealthRemaining: 82,
      tissueMaxHealth: 100,
      civilianCellsSaved: 10,
      civilianCellsLost: 0,
      enemiesRemaining: 0,
      inflammationPeak: 44,
      antigensCollected: 12,
      lymphSignalsDelivered: 3,
    });

    expect(next.regions.skin.lastBattleQuality).toBe("clean");
    expect(next.regionalNodes.skinNode.antigenSignalsDelivered).toBeGreaterThanOrEqual(3);
    expect(next.globalResources.antigens).toBeGreaterThan(state.globalResources.antigens);
  });

  it("passes memory and active regional node bonuses into local simulation", () => {
    const progress = completeMission(resetCampaignProgress(), {
      missionId: "viralCleanupV7",
      score: 200,
      rank: "A",
    });
    const state = createDefaultBodyMapState();
    const preparation = toMissionPreparation(
      {
        regionId: "lungs",
        missionId: "viralInfectionV6",
        reinforcements: [{ unitTypeId: "nkCell", count: 1 }],
        regionalNodeId: "thoracicNode",
        regionalNodeActive: true,
      },
      progress,
    );
    const localState = createInitialState("viralInfectionV6", preparation);

    expect(Object.values(localState.entities).some((entity) => entity.kind === "nkCell")).toBe(
      true,
    );
    expect(localState.resources.antigens).toBeGreaterThan(0);
    expect(localState.resources.cytokines).toBeGreaterThan(72);
  });
});
