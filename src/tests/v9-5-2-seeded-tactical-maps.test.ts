import { describe, expect, it } from "vitest";
import { prepareBodyBattle, toMissionPreparation } from "../game/bodyMap/bodyMapSystem";
import { createGeneratedBodyMapState } from "../game/bodyMap/bodyMapGenerator";
import { loadCampaignProgress } from "../game/campaign/progress";
import { createRuntimeTacticalMap } from "../game/data/runtimeTacticalMap";
import { generateTacticalMapFromTemplate } from "../game/data/tacticalMapGenerator";
import { createInitialState } from "../game/simulation/core/createInitialState";

describe("V9.5.2 seeded tactical map generation", () => {
  it("generates the same tactical layout for the same seed", () => {
    const first = generateTacticalMapFromTemplate({
      templateId: "skin_multi_wound_template",
      seed: "test-seed-alpha",
      mode: "bodyBattle",
      difficulty: "normal",
      regionType: "skin",
      threatType: "bacterial",
    });
    const second = generateTacticalMapFromTemplate({
      templateId: "skin_multi_wound_template",
      seed: "test-seed-alpha",
      mode: "bodyBattle",
      difficulty: "normal",
      regionType: "skin",
      threatType: "bacterial",
    });

    expect(first.combatSites.map((site) => site.position)).toEqual(
      second.combatSites.map((site) => site.position),
    );
    expect(first.pathogenSpawnZones.map((zone) => zone.position)).toEqual(
      second.pathogenSpawnZones.map((zone) => zone.position),
    );
    expect(first.generationSummary.validationStatus).toBe("valid");
  });

  it("varies tactical layouts when the seed changes", () => {
    const first = generateTacticalMapFromTemplate({
      templateId: "skin_multi_wound_template",
      seed: "test-seed-one",
      mode: "bodyBattle",
      difficulty: "hard",
      regionType: "skin",
      threatType: "mixed",
    });
    const second = generateTacticalMapFromTemplate({
      templateId: "skin_multi_wound_template",
      seed: "test-seed-two",
      mode: "bodyBattle",
      difficulty: "hard",
      regionType: "skin",
      threatType: "mixed",
    });

    expect(first.combatSites.map((site) => `${site.position.x},${site.position.y}`)).not.toEqual(
      second.combatSites.map((site) => `${site.position.x},${site.position.y}`),
    );
  });

  it("keeps campaign maps fixed through the runtime map layer", () => {
    const first = createRuntimeTacticalMap("woundBacteriaV1", {});
    const second = createRuntimeTacticalMap("woundBacteriaV1", {});

    expect(first.generationSummary.mode).toBe("campaign");
    expect(first.generationSummary.seed).toBe(second.generationSummary.seed);
    expect(first.combatSites.map((site) => site.position)).toEqual(
      second.combatSites.map((site) => site.position),
    );
  });

  it("derives stable body-battle map seeds from the body-map run seed", () => {
    const progress = loadCampaignProgress();
    const bodyState = createGeneratedBodyMapState("normal", "body-run-seed-1");
    const preparation = prepareBodyBattle(bodyState, "skin");
    const missionPreparation = toMissionPreparation(preparation, progress);
    const first = createInitialState(preparation.missionId, missionPreparation);
    const second = createInitialState(preparation.missionId, missionPreparation);

    expect(missionPreparation.tacticalMapSeed).toContain("body-run-seed-1");
    expect(first.tacticalMap.combatSites.map((site) => site.position)).toEqual(
      second.tacticalMap.combatSites.map((site) => site.position),
    );
  });

  it("uses a huge generated tactical world for infinite mode", () => {
    const state = createInitialState("infiniteSurvivalV8", {
      infiniteDifficulty: "hard",
      tacticalMapSeed: "infinite-test-seed",
      tacticalMapTemplateId: "infinite_large_tissue_template",
      tacticalMapMode: "infinite",
      tacticalRegionType: "mixed",
      tacticalThreatType: "mixed",
      tacticalDifficulty: "hard",
    });

    expect(state.tacticalMap.generationSummary.mode).toBe("infinite");
    expect(state.tacticalMap.worldWidth).toBeGreaterThanOrEqual(4800);
    expect(state.tacticalMap.worldHeight).toBeGreaterThanOrEqual(2800);
    expect(state.tacticalMap.combatSites.length).toBeGreaterThanOrEqual(4);
  });
});
