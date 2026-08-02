import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { getMapScaleBalance } from "../game/data/mapScaleBalance";
import {
  campaignMissionOrder,
  missionDefinitions,
} from "../game/data/missions";
import {
  getTacticalMapForMissionMap,
  getTissueCellCountForZone,
  getTissueCellPositionsForMissionMap,
} from "../game/data/tacticalMaps";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { applyCommand } from "../game/simulation/core/commands";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import {
  isBacterium,
  isControllableImmuneUnit,
  isHostilePathogen,
  isVirus,
} from "../game/simulation/entities";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { applyTissueSystem } from "../game/simulation/systems/tissueSystem";
import { applyPathogenSystem } from "../game/simulation/systems/pathogenSystem";

describe("V11.4 forgiving RTS balance", () => {
  it("reduces normal hostile damage without removing difficulty scaling", () => {
    const normal = getMapScaleBalance({
      mode: "campaign",
      mapSizeCategory: "small",
      difficulty: "normal",
    });
    const hard = getMapScaleBalance({
      mode: "campaign",
      mapSizeCategory: "small",
      difficulty: "hard",
    });

    expect(normal.pathogenDamageMultiplier).toBeCloseTo(0.82 * 0.72);
    expect(hard.pathogenDamageMultiplier).toBeGreaterThan(
      normal.pathogenDamageMultiplier,
    );
  });

  it("adds a larger civilian buffer to every tissue zone", () => {
    const mission = missionDefinitions.woundBacteriaV1;
    const tacticalMap = getTacticalMapForMissionMap(mission.map);
    const positions = getTissueCellPositionsForMissionMap(mission.map);
    const expectedCount = tacticalMap.civilianCellZones.reduce(
      (total, zone) => total + getTissueCellCountForZone(zone.density),
      0,
    );

    expect(positions).toHaveLength(expectedCount);
    expect(
      tacticalMap.civilianCellZones.every(
        (zone) =>
          getTissueCellCountForZone(zone.density) >=
          balanceValues.tissueCells.minimumPerZone,
      ),
    ).toBe(true);
    expect(positions.length).toBeGreaterThanOrEqual(10);
  });

  it("allows only one sterile attack clone per proliferating bacterial lineage", () => {
    const state = createInitialState();
    state.waves.currentWaveIndex =
      missionDefinitions[state.missionId].waves.length;
    state.tissue.health = 1_000_000;
    state.tissue.maxHealth = 1_000_000;
    for (const cell of state.tissueCells) {
      cell.health = 1_000_000;
      cell.maxHealth = 1_000_000;
    }

    const source = spawnBacterium(
      state,
      "proliferatingBacillus",
      state.tissueCells[0].position,
    );

    for (let attempt = 0; attempt < 500; attempt += 1) {
      state.elapsedMs = attempt * 1000;
      source.attackCooldownRemainingMs = 0;
      source.duplicationCooldownMs = 0;
      applyTissueSystem(state, 0);
    }

    const lineage = Object.values(state.entities).filter(
      (entity) => entity.kind === "bacterium",
    );
    const clone = lineage.find(
      (entity) => entity.kind === "bacterium" && entity.id !== source.id,
    );

    expect(source.attackClonesCreated).toBe(
      balanceValues.bacterialDuplication.maxClonesPerBacterium,
    );
    expect(lineage).toHaveLength(2);
    expect(clone?.attackCloneGeneration).toBe(
      balanceValues.bacterialDuplication.maxCloneGenerations,
    );
    expect(clone?.health).toBeCloseTo(
      (clone?.maxHealth ?? 0) *
        balanceValues.bacterialDuplication.cloneHealthMultiplier,
    );
  });

  it("does not give swarm bacteria an implicit cloning power", () => {
    const state = createInitialState();
    state.entities = {};
    const source = spawnBacterium(
      state,
      "cocciRapid",
      state.tissueCells[0].position,
    );

    for (let attempt = 0; attempt < 500; attempt += 1) {
      state.elapsedMs = attempt * 1000;
      source.attackCooldownRemainingMs = 0;
      applyTissueSystem(state, 0);
    }

    expect(
      Object.values(state.entities).filter(
        (entity) => entity.kind === "bacterium",
      ),
    ).toHaveLength(1);
    expect(source.attackClonesCreated).toBe(0);
  });

  it("does not collapse the introductory tissue during a short decision window", () => {
    let state = createInitialState("woundBacteriaV1");

    for (let elapsedMs = 0; elapsedMs < 15_000; elapsedMs += 250) {
      state = stepSimulation(state, 250);
    }

    expect(state.status).toBe("running");
    expect(state.tissue.health).toBeGreaterThan(40);
  });

  it("gives campaign mission 3 more forces and separates its pressure spikes", () => {
    const mission = missionDefinitions.persistentInfectionV3;
    const initial = createInitialState("persistentInfectionV3");
    const macrophages = Object.values(initial.entities).filter(
      (entity) => entity.kind === "macrophage",
    );
    const scriptedPathogenCount = mission.waves.reduce(
      (total, wave) => total + wave.count,
      0,
    );

    expect(macrophages).toHaveLength(4);
    expect(initial.resources.atp).toBeCloseTo(155 * 1.18);
    expect(initial.resources.cytokines).toBeCloseTo(50 * 1.18);
    expect(scriptedPathogenCount).toBe(10);
    expect(mission.waves[1].startsAtMs - mission.waves[0].startsAtMs).toBeGreaterThanOrEqual(
      20_000,
    );
    expect(mission.waves[2].startsAtMs - mission.waves[1].startsAtMs).toBeGreaterThanOrEqual(
      20_000,
    );
    expect(mission.waves[3].startsAtMs - mission.waves[2].startsAtMs).toBeGreaterThanOrEqual(
      20_000,
    );
  });

  it("gives every campaign mission a safe initial decision window", () => {
    for (const missionId of campaignMissionOrder) {
      let state = createInitialState(missionId);

      expect(state.resources.atp, missionId).toBeLessThanOrEqual(
        balanceValues.maxAtp,
      );

      for (let elapsedMs = 0; elapsedMs < 15_000; elapsedMs += 250) {
        state = stepSimulation(state, 250);
      }

      expect(state.status, missionId).not.toBe("defeat");
      expect(state.tissue.health, missionId).toBeGreaterThan(35);
    }
  });

  it("keeps mission 3 alive through its initial decision window without orders", () => {
    let state = createInitialState("persistentInfectionV3");

    for (let elapsedMs = 0; elapsedMs < 15_000; elapsedMs += 250) {
      state = stepSimulation(state, 250);
    }

    expect(state.status).toBe("running");
    expect(state.tissue.health).toBeGreaterThan(40);
  });

  it("lets a simple regroup-and-focus plan survive every campaign mission", () => {
    for (const missionId of campaignMissionOrder) {
      const mission = missionDefinitions[missionId];
      const lastWaveAtMs = mission.waves.at(-1)?.startsAtMs ?? 0;
      const simulationDurationMs = Math.max(90_000, lastWaveAtMs + 60_000);
      let state = createInitialState(missionId);

      for (
        let elapsedMs = 0;
        elapsedMs < simulationDurationMs && state.status === "running";
        elapsedMs += 250
      ) {
        if (elapsedMs % 1000 === 0) {
          const immuneIds = Object.values(state.entities)
            .filter(isControllableImmuneUnit)
            .map((entity) => entity.id);
          const pathogens = Object.values(state.entities)
            .filter(isHostilePathogen)
            .sort(
              (a, b) =>
                getCampaignTargetPriority(b.pathogenTypeId) -
                getCampaignTargetPriority(a.pathogenTypeId),
            );
          const infectedCells = state.tissueCells.filter(
            (cell) => cell.status === "infected" && cell.health > 0,
          );
          const target =
            (infectedCells.length >= 3
              ? infectedCells[0]?.position
              : pathogens[0]?.position) ??
            infectedCells[0]?.position ??
            state.tacticalMap.combatSites[0]?.position;

          state = applyCommand(state, {
            type: "selectEntities",
            entityIds: immuneIds,
          });
          if (target) {
            state = applyCommand(state, { type: "orderMove", position: target });
          }

          const bacteria = pathogens.filter(isBacterium);
          const viruses = pathogens.filter(isVirus);
          if (
            mission.unlockedTreatments.includes("antibiotic") &&
            bacteria.length >= 3 &&
            (state.treatments.cooldowns.antibiotic ?? 0) <= 0
          ) {
            state = applyCommand(state, {
              type: "useTreatment",
              treatmentId: "antibiotic",
            });
          }
          if (
            mission.unlockedTreatments.includes("antiviralDrug") &&
            viruses.length >= 2 &&
            (state.treatments.cooldowns.antiviralDrug ?? 0) <= 0
          ) {
            state = applyCommand(state, {
              type: "useTreatment",
              treatmentId: "antiviralDrug",
            });
          }
          if (
            mission.unlockedTreatments.includes("antiInflammatory") &&
            state.inflammation.value >= 65 &&
            (state.treatments.cooldowns.antiInflammatory ?? 0) <= 0
          ) {
            state = applyCommand(state, {
              type: "useTreatment",
              treatmentId: "antiInflammatory",
            });
          }
        }

        state = stepSimulation(state, 250);
      }

      expect(state.status, missionId).not.toBe("defeat");
      expect(state.tissue.health, missionId).toBeGreaterThan(15);
    }
  });

  it("keeps attack clones sterile from profile-based proliferation", () => {
    const state = createInitialState("persistentInfectionV3");
    state.entities = {};
    const clone = spawnBacterium(
      state,
      "proliferatingBacillus",
      state.tissueCells[0].position,
    );
    clone.attackCloneGeneration =
      balanceValues.bacterialDuplication.maxCloneGenerations;
    clone.specialCooldownRemainingMs = 0;

    applyPathogenSystem(state, 1000);

    expect(
      Object.values(state.entities).filter(
        (entity) => entity.kind === "bacterium",
      ),
    ).toHaveLength(1);
  });

  it("centers mission 3 antibiotic treatment on the selected squad front", () => {
    let state = createInitialState("persistentInfectionV3");
    const macrophage = Object.values(state.entities).find(
      (entity) => entity.kind === "macrophage",
    );
    const remoteSite = state.tacticalMap.combatSites[1];

    expect(macrophage).toBeDefined();
    expect(remoteSite).toBeDefined();
    if (!macrophage || !remoteSite) {
      return;
    }

    const target = spawnBacterium(
      state,
      "resistantBacterium",
      remoteSite.position,
    );
    const initialHealth = target.health;
    state = applyCommand(state, {
      type: "selectEntity",
      entityId: macrophage.id,
    });
    state = applyCommand(state, {
      type: "orderMove",
      position: remoteSite.position,
    });
    state = applyCommand(state, {
      type: "useTreatment",
      treatmentId: "antibiotic",
    });

    const treatedTarget = state.entities[target.id];
    expect(treatedTarget.kind).toBe("bacterium");
    expect(treatedTarget.health).toBeLessThan(initialHealth);
  });

  it("lets a basic focus-fire strategy clear campaign mission 3", () => {
    let state = createInitialState("persistentInfectionV3");
    state = applyCommand(state, { type: "produceMacrophage" });
    state = applyCommand(state, { type: "produceNeutrophil" });

    for (let elapsedMs = 0; elapsedMs < 100_000 && state.status === "running"; elapsedMs += 250) {
      if (elapsedMs % 1000 === 0) {
        const immuneIds = Object.values(state.entities)
          .filter(isControllableImmuneUnit)
          .map((entity) => entity.id);
        const pathogens = Object.values(state.entities)
          .filter(isHostilePathogen)
          .sort(
            (a, b) =>
              getMissionThreeTargetPriority(b.pathogenTypeId) -
              getMissionThreeTargetPriority(a.pathogenTypeId),
          );
        const target =
          pathogens[0]?.position ??
          state.tacticalMap.combatSites[
            Math.min(
              state.waves.currentWaveIndex,
              state.tacticalMap.combatSites.length - 1,
            )
          ]?.position;

        state = applyCommand(state, {
          type: "selectEntities",
          entityIds: immuneIds,
        });
        if (target) {
          state = applyCommand(state, { type: "orderMove", position: target });
        }

        if (
          pathogens.length >= 4 &&
          (state.treatments.cooldowns.antibiotic ?? 0) <= 0
        ) {
          state = applyCommand(state, {
            type: "useTreatment",
            treatmentId: "antibiotic",
          });
        }
        if (
          state.inflammation.value >= 68 &&
          (state.treatments.cooldowns.antiInflammatory ?? 0) <= 0
        ) {
          state = applyCommand(state, {
            type: "useTreatment",
            treatmentId: "antiInflammatory",
          });
        }
      }

      state = stepSimulation(state, 250);
    }

    expect(state.status).toBe("victory");
    expect(state.tissue.health).toBeGreaterThanOrEqual(40);
  });
});

function getMissionThreeTargetPriority(pathogenTypeId: string): number {
  if (pathogenTypeId === "biofilmColony") {
    return 4;
  }
  if (pathogenTypeId === "resistantBacterium") {
    return 3;
  }
  if (pathogenTypeId === "proliferatingBacillus") {
    return 2;
  }

  return 1;
}

function getCampaignTargetPriority(pathogenTypeId: string): number {
  if (
    pathogenTypeId === "biofilmColony" ||
    pathogenTypeId === "toxicBacterium"
  ) {
    return 5;
  }
  if (pathogenTypeId === "resistantBacterium") {
    return 4;
  }
  if (pathogenTypeId === "proliferatingBacillus") {
    return 3;
  }
  if (pathogenTypeId === "respiratoryVirus") {
    return 2;
  }

  return 1;
}
