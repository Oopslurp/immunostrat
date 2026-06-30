import { describe, expect, it } from "vitest";
import { completeMission, loadCampaignProgress } from "../game/campaign/progress";
import { treatmentDefinitions } from "../game/data/treatments";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { spawnVirus } from "../game/simulation/pathogens/createVirus";

describe("V6.5 consolidation systems", () => {
  it("antibiotic damages bacteria without being available in early tutorial mission", () => {
    const locked = applyCommand(createInitialState("woundBacteriaV1"), {
      type: "useTreatment",
      treatmentId: "antibiotic",
    });

    expect(locked.treatments.cooldowns.antibiotic ?? 0).toBe(0);

    const state = createInitialState("persistentInfectionV3");
    state.resources.atp = 200;
    state.resources.cytokines = 80;
    const bacterium = spawnBacterium(state, "proliferatingBacillus", {
      x: state.tissueCells[0].position.x,
      y: state.tissueCells[0].position.y,
    });
    const treated = applyCommand(state, {
      type: "useTreatment",
      treatmentId: "antibiotic",
    });
    const after = treated.entities[bacterium.id];

    expect(treated.treatments.cooldowns.antibiotic).toBe(
      treatmentDefinitions.antibiotic.cooldownMs,
    );
    expect(after?.kind).toBe("bacterium");
    expect(after?.health).toBeLessThan(bacterium.maxHealth);
  });

  it("antiviral drug slows viral spread without clearing infected cells", () => {
    const state = createInitialState("viralInfectionV6");
    state.resources.atp = 200;
    state.resources.cytokines = 100;
    state.tissueCells[0].status = "infected";
    state.tissueCells[0].nextVirusBurstMs = 2000;
    spawnVirus(state, "respiratoryVirus", {
      x: state.tissueCells[1].position.x + 80,
      y: state.tissueCells[1].position.y,
    });

    const treated = applyCommand(state, {
      type: "useTreatment",
      treatmentId: "antiviralDrug",
    });
    const stepped = stepSimulation(treated, 1000);

    expect(stepped.treatments.activeMs.antiviralDrug).toBeGreaterThan(0);
    expect(stepped.tissueCells[0].status).toBe("infected");
    expect(stepped.tissueCells[0].nextVirusBurstMs).toBeGreaterThan(900);
  });

  it("anti-inflammatory lowers inflammation with an active tradeoff window", () => {
    const state = createInitialState("mixedInfectionV8");
    state.resources.atp = 200;
    state.inflammation.value = 90;
    state.inflammatoryZones = [
      {
        id: "zone-test",
        position: { x: 300, y: 360 },
        radius: 80,
        intensity: 0.8,
        ttlMs: 4000,
      },
    ];

    const treated = applyCommand(state, {
      type: "useTreatment",
      treatmentId: "antiInflammatory",
    });

    expect(treated.inflammation.value).toBeLessThan(90);
    expect(treated.inflammatoryZones[0].intensity).toBeLessThan(0.8);
    expect(treated.treatments.activeMs.antiInflammatory).toBeGreaterThan(0);
  });

  it("stores immune memory after mission completion and applies vaccination preparation", () => {
    const progress = completeMission(loadCampaignProgress(), {
      missionId: "viralInfectionV6",
      score: 500,
      rank: "A",
    });
    const prepared = createInitialState("viralCleanupV7", {
      vaccinationId: "viral-memory-prime",
      memoryProfiles: progress.immuneMemory.knownProfiles,
    });

    expect(progress.immuneMemory.knownProfiles).toContain("viral");
    expect(prepared.resources.antigens).toBeGreaterThan(
      createInitialState("viralCleanupV7").resources.antigens,
    );
  });
});
