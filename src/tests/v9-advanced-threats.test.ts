import { describe, expect, it } from "vitest";
import {
  getActiveInfiniteMutators,
  getInfinitePhase,
} from "../game/data/infiniteMode";
import {
  bodyBattleMissionOrder,
  missionDefinitions,
} from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import { balanceValues } from "../game/data/balance";
import { createGeneratedBodyMapState } from "../game/bodyMap/bodyMapGenerator";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import { spawnAdvancedThreat } from "../game/simulation/pathogens/createAdvancedThreat";
import { applyAdvancedThreatSystem } from "../game/simulation/systems/advancedThreatSystem";
import { applyCombatSystem } from "../game/simulation/systems/combatSystem";
import { isNkCell } from "../game/simulation/entities";

describe("V9 advanced threats", () => {
  it("defines fungi, parasites, cancer cells and opportunists as data-driven pathogen classes", () => {
    expect(pathogenDefinitions.fungalColony.pathogenClass).toBe("fungus");
    expect(pathogenDefinitions.fungalSpore.pathogenClass).toBe("fungus");
    expect(pathogenDefinitions.parasiteHelminth.pathogenClass).toBe("parasite");
    expect(pathogenDefinitions.cancerCellCluster.pathogenClass).toBe("cancerCell");
    expect(pathogenDefinitions.opportunistBacterium.pathogenClass).toBe("opportunist");
  });

  it("spawns advanced threats from regular mission waves", () => {
    const state: GameState = {
      ...createInitialState("skinFungalOutbreak"),
      elapsedMs: 1800,
      waves: {
        currentWaveIndex: 0,
        spawnedInCurrentWave: 0,
      },
    };

    const next = stepSimulation(state, 16);

    expect(
      Object.values(next.entities).some((entity) => entity.kind === "advancedThreat"),
    ).toBe(true);
  });

  it("lets fungal colonies create spores without hard-coding them in Phaser", () => {
    const state = createInitialState("skinFungalOutbreak");

    state.entities = {};
    state.waves.currentWaveIndex = missionDefinitions.skinFungalOutbreak.waves.length;
    spawnAdvancedThreat(state, "fungalColony", { x: 700, y: 400 });
    applyAdvancedThreatSystem(state, 7000);

    expect(
      Object.values(state.entities).some(
        (entity) =>
          entity.kind === "advancedThreat" &&
          entity.pathogenTypeId === "fungalSpore",
      ),
    ).toBe(true);
  });

  it("requires NK analysis time before revealing and finishing a cancer-like cell", () => {
    const state = createInitialState("lungCancerSuspectCells");
    const nk = Object.values(state.entities).find(isNkCell);

    expect(nk).toBeDefined();

    if (!nk) {
      return;
    }

    nk.position = { x: 600, y: 400 };
    nk.orderAnchor = { ...nk.position };
    const cancer = spawnAdvancedThreat(state, "cancerCellCluster", {
      x: 620,
      y: 400,
    });

    expect(cancer.detected).toBe(false);

    applyAdvancedThreatSystem(state, 16);
    expect(cancer.detected).toBe(false);

    applyCombatSystem(state, 16);
    applyCombatSystem(state, balanceValues.combat.nkDetectionDurationMs);

    expect(cancer.detected).toBe(true);
    expect(cancer.health).toBe(0);
  });

  it("registers V9 body battle presets and advanced infinite pressure", () => {
    expect(bodyBattleMissionOrder).toContain("skinFungalOutbreak");
    expect(bodyBattleMissionOrder).toContain("intestineParasiteBoss");
    expect(bodyBattleMissionOrder).toContain("lungCancerSuspectCells");
    expect(bodyBattleMissionOrder).toContain("opportunisticMixedFlare");
    expect(bodyBattleMissionOrder).toContain("liverAbnormalGrowth");
    expect(getInfinitePhase(15).threatPool).toContain("parasiteHelminth");
    expect(getActiveInfiniteMutators(15, "nightmare").map((mutator) => mutator.id))
      .toContain("advancedThreatPressure");
  });

  it("can generate normal body-map starts with V9 advanced threat types", () => {
    const hardState = createGeneratedBodyMapState("hard", "v9-hard-seed");
    const possibleThreats = Object.values(hardState.regions).map(
      (region) => region.threat,
    );

    expect(possibleThreats.some((threat) => threat !== "none")).toBe(true);
    expect(
      Object.values(missionDefinitions).some((mission) =>
        mission.allowedPathogens.includes("cancerCellCluster"),
      ),
    ).toBe(true);
  });
});
