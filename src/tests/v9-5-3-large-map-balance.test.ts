import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { getMapScaleBalance } from "../game/data/mapScaleBalance";
import { generateTacticalMapFromTemplate } from "../game/data/tacticalMapGenerator";
import { getPathogenSpawnPositionForWave } from "../game/data/tacticalMaps";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";

describe("V9.5.3 large map balance", () => {
  it("compensates huge infinite maps with slower early pressure", () => {
    const balance = getMapScaleBalance({
      mode: "infinite",
      mapSizeCategory: "huge",
      difficulty: "normal",
      waveIndex: 0,
    });

    expect(balance.pathogenDamageMultiplier).toBeLessThan(1);
    expect(balance.infectionRateMultiplier).toBeLessThan(1);
    expect(balance.waveIntervalMultiplier).toBeGreaterThan(1);
    expect(balance.maxActiveCombatSites).toBe(2);
    expect(balance.resourceIncomeModifier).toBeGreaterThan(1);
  });

  it("escalates active combat sites progressively in infinite mode", () => {
    const early = getMapScaleBalance({
      mode: "infinite",
      mapSizeCategory: "huge",
      difficulty: "normal",
      waveIndex: 0,
    });
    const mid = getMapScaleBalance({
      mode: "infinite",
      mapSizeCategory: "huge",
      difficulty: "normal",
      waveIndex: 9,
    });

    expect(mid.maxActiveCombatSites).toBeGreaterThan(early.maxActiveCombatSites);
  });

  it("adds enough diapedesis points for huge generated maps", () => {
    const map = generateTacticalMapFromTemplate({
      templateId: "infinite_large_tissue_template",
      seed: "v953-huge-map",
      mode: "infinite",
      difficulty: "normal",
      regionType: "mixed",
      threatType: "mixed",
    });

    expect(map.diapedesisPoints.length).toBeGreaterThanOrEqual(4);
  });

  it("limits early wave spawns to the first active combat site", () => {
    const map = generateTacticalMapFromTemplate({
      templateId: "infinite_large_tissue_template",
      seed: "v953-active-sites",
      mode: "infinite",
      difficulty: "normal",
      regionType: "mixed",
      threatType: "mixed",
    });
    const firstSite = map.combatSites[0];
    const spawnPosition = getPathogenSpawnPositionForWave(
      map,
      "cocciRapid",
      0,
      0,
      1,
    );
    const nearestSite = [...map.combatSites].sort(
      (a, b) =>
        Math.hypot(
          (spawnPosition?.x ?? 0) - a.position.x,
          (spawnPosition?.y ?? 0) - a.position.y,
        ) -
        Math.hypot(
          (spawnPosition?.x ?? 0) - b.position.x,
          (spawnPosition?.y ?? 0) - b.position.y,
        ),
    )[0];
    const distanceFromFirstSite = Math.hypot(
      (spawnPosition?.x ?? 0) - firstSite.position.x,
      (spawnPosition?.y ?? 0) - firstSite.position.y,
    );

    expect(spawnPosition).toBeTruthy();
    expect(nearestSite.id).toBe(firstSite.id);
    expect(distanceFromFirstSite - firstSite.radius).toBeGreaterThanOrEqual(
      balanceValues.pathogenSpawnSafety.infiniteClearance,
    );
  });

  it.each([
    ["campaign", "skin_multi_wound_template", "campaign-spawn-safety"],
    ["bodyBattle", "blood_vessel_crossroads_template", "body-spawn-safety"],
    ["infinite", "infinite_large_tissue_template", "infinite-spawn-safety"],
  ] as const)(
    "keeps %s pathogens outside combat sites",
    (mode, templateId, seed) => {
      const map = generateTacticalMapFromTemplate({
        templateId,
        seed,
        mode,
        difficulty: "normal",
        regionType: mode === "infinite" ? "mixed" : "skin",
        threatType: "bacterial",
      });
      const spawnPosition = getPathogenSpawnPositionForWave(
        map,
        "cocciRapid",
        0,
        0,
        1,
      );
      const requiredClearance =
        mode === "infinite"
          ? balanceValues.pathogenSpawnSafety.infiniteClearance
          : mode === "bodyBattle"
            ? balanceValues.pathogenSpawnSafety.bodyBattleClearance
            : balanceValues.pathogenSpawnSafety.campaignClearance;

      expect(spawnPosition).toBeTruthy();
      expect(
        Math.min(
          ...map.combatSites.map(
            (site) =>
              Math.hypot(
                (spawnPosition?.x ?? 0) - site.position.x,
                (spawnPosition?.y ?? 0) - site.position.y,
              ) - site.radius,
          ),
        ),
      ).toBeGreaterThanOrEqual(requiredClearance);
    },
  );

  it("regenerates tissue only after a stable delay", () => {
    let state = createInitialState("woundBacteriaV1", {});

    state.tissue.health = 70;
    state.waves.currentWaveIndex = 99;
    state = stepSimulation(state, 8000);

    expect(state.tissue.health).toBeGreaterThan(70);
    expect(state.tissueRepair.status).toBe("recovering");
  });

  it("blocks tissue regeneration when inflammation is dangerous", () => {
    let state = createInitialState("woundBacteriaV1", {});

    state.tissue.health = 70;
    state.waves.currentWaveIndex = 99;
    state.inflammation.value = 95;
    state = stepSimulation(state, 8000);

    expect(state.tissue.health).toBeLessThanOrEqual(70);
    expect(state.tissueRepair.status).toBe("blocked");
    expect(state.tissueRepair.blockedReason).toBe("inflammation");
  });

  it("blocks tissue regeneration when combat pressure remains high", () => {
    let state = createInitialState("woundBacteriaV1", {});

    state.tissue.health = 70;
    state.waves.currentWaveIndex = 99;
    spawnBacterium(state, "cocciRapid", state.tacticalMap.combatSites[0].position);
    spawnBacterium(state, "basicBacterium", state.tacticalMap.combatSites[0].position);
    spawnBacterium(state, "proliferatingBacillus", state.tacticalMap.combatSites[0].position);
    state = stepSimulation(state, 8000);

    expect(state.tissueRepair.status).toBe("blocked");
    expect(state.tissueRepair.blockedReason).toBe("combat");
  });
});
