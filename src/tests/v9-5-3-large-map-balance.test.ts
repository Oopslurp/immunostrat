import { describe, expect, it } from "vitest";
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
    const firstSiteSpawn = map.pathogenSpawnZones.find(
      (zone) => zone.combatSiteId === firstSite.id,
    );

    expect(spawnPosition).toBeTruthy();
    expect(firstSiteSpawn).toBeTruthy();
    expect(Math.abs((spawnPosition?.x ?? 0) - (firstSiteSpawn?.position.x ?? 0))).toBeLessThan(
      firstSiteSpawn?.radius ?? 300,
    );
  });

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
