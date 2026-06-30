import { describe, expect, it } from "vitest";
import {
  advanceStrategicTurn,
  applyBodyBattleOutcome,
  assignReinforcement,
  createDefaultBodyMapState,
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
