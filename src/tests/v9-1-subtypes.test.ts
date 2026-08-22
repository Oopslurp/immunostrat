import { describe, expect, it } from "vitest";
import { getInfinitePhase } from "../game/data/infiniteMode";
import { missionDefinitions } from "../game/data/missions";
import {
  pathogenDefinitions,
  type PathogenTypeId,
} from "../game/data/pathogens";
import { createGeneratedBodyMapState } from "../game/bodyMap/bodyMapGenerator";
import { balanceValues } from "../game/data/balance";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { spawnVirus } from "../game/simulation/pathogens/createVirus";
import { applyVirusSystem } from "../game/simulation/systems/virusSystem";
import { getRuntimeMapBalance } from "../game/simulation/systems/runtimeMapBalance";

const expectedSubtypes: PathogenTypeId[] = [
  "cocciRapid",
  "proliferatingBacillus",
  "resistantBacterium",
  "biofilmColony",
  "respiratoryVirus",
  "cytolyticVirus",
  "latentVirus",
  "immuneEvasiveVirus",
  "fungalColony",
  "yeastOpportunist",
  "sporeMold",
  "cutaneousFungus",
  "parasiteHelminth",
  "bloodProtozoan",
  "migratoryLarva",
  "discreetAbnormalCell",
  "proliferativeCancerCell",
  "inflammatoryCancerCell",
  "invasiveCancerCell",
  "secondaryBacterium",
  "opportunistYeastFlare",
  "reactivatedLatentVirus",
  "mixedOpportunistCluster",
];

describe("V9.1 pathogen subtypes and science metadata", () => {
  it("gives each V9.1 subtype science/gameplay metadata and visual identity hooks", () => {
    for (const pathogenTypeId of expectedSubtypes) {
      const definition = pathogenDefinitions[pathogenTypeId];

      expect(definition.subtype, pathogenTypeId).toBeTruthy();
      expect(definition.realLifeInspiration, pathogenTypeId).toContain("Inspire");
      expect(definition.scienceDescription, pathogenTypeId).toBeTruthy();
      expect(definition.gameplayDescription, pathogenTypeId).toBeTruthy();
      expect(definition.simplificationNote, pathogenTypeId).toBeTruthy();
      expect(definition.gameplayRole, pathogenTypeId).toBeTruthy();
      expect(definition.preferredRegions?.length, pathogenTypeId).toBeGreaterThan(0);
      expect(definition.strengths?.length, pathogenTypeId).toBeGreaterThan(0);
      expect(definition.weaknesses?.length, pathogenTypeId).toBeGreaterThan(0);
      expect(definition.visualIdentity?.vfxTags.length, pathogenTypeId).toBeGreaterThan(0);
      expect(definition.difficultyTier, pathogenTypeId).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps spawned virus subtypes instead of converting them to respiratory virus", () => {
    const state = createInitialState("lungViralSpread");
    const cell = state.tissueCells.find((candidate) => candidate.status === "healthy");

    state.entities = {};
    expect(cell).toBeDefined();

    if (!cell) {
      return;
    }

    spawnVirus(state, "cytolyticVirus", {
      x: cell.position.x,
      y: cell.position.y,
    });

    applyVirusSystem(state, 32);
    applyVirusSystem(
      state,
      balanceValues.virus.cellInfiltrationDurationMs /
        getRuntimeMapBalance(state).infectionRateMultiplier +
        1,
    );

    expect(
      state.tissueCells.find((candidate) => candidate.id === cell.id)
        ?.infectedByPathogenTypeId,
    ).toBe("cytolyticVirus");
  });

  it("uses the new subtypes in regional generation and infinite phases", () => {
    const hardMap = createGeneratedBodyMapState("hard", "v9-1-hard-seed");
    const generatedPathogens = Object.values(hardMap.regions).flatMap(
      (region) => region.pathogens,
    );

    expect(
      generatedPathogens.some((pathogenTypeId) =>
        expectedSubtypes.includes(pathogenTypeId),
      ),
    ).toBe(true);
    expect(getInfinitePhase(13).threatPool).toContain("opportunistYeastFlare");
    expect(getInfinitePhase(15).threatPool).toContain("invasiveCancerCell");
    expect(missionDefinitions.infiniteSurvivalV8.allowedPathogens).toContain(
      "immuneEvasiveVirus",
    );
  });
});
