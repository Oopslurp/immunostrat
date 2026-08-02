import { describe, expect, it } from "vitest";
import { bodyRegionDefinitions } from "../game/bodyMap/bodyRegions";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import {
  getEntryPointForUnitFromTacticalMap,
  getPathogenSpawnPositionForWave,
  getTacticalMapDefinition,
  tacticalMapDefinitions,
  type TacticalMapId,
} from "../game/data/tacticalMaps";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";

const requiredTemplates: TacticalMapId[] = [
  "skin_small_wound_fixed",
  "skin_multi_wound_template",
  "lung_branching_vessels_template",
  "intestine_clustered_sites_template",
  "blood_vessel_crossroads_template",
  "lymph_node_signal_template",
  "infinite_large_tissue_template",
];

describe("V9.5.1 tactical map templates", () => {
  it("defines the required biological map templates with core tactical elements", () => {
    for (const templateId of requiredTemplates) {
      const template = tacticalMapDefinitions[templateId];

      expect(template).toBeDefined();
      expect(template.width).toBeGreaterThan(0);
      expect(template.height).toBeGreaterThan(0);
      expect(template.tissueZones.length).toBeGreaterThanOrEqual(1);
      expect(template.vesselPaths.length).toBeGreaterThanOrEqual(1);
      expect(template.diapedesisPoints.length).toBeGreaterThanOrEqual(1);
      expect(template.combatSites.length).toBeGreaterThanOrEqual(1);
      expect(template.pathogenSpawnZones.length).toBeGreaterThanOrEqual(1);
      expect(template.visual.v11PolishNotes.length).toBeGreaterThanOrEqual(1);
      expect(template.generation.randomizableSlots.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("links campaign, body map and infinite missions to tactical templates", () => {
    expect(missionDefinitions.woundBacteriaV1.map.tacticalMapId).toBe(
      "skin_small_wound_fixed",
    );
    expect(missionDefinitions.antigenAnalysisV4.map.tacticalMapId).toBe(
      "lymph_node_signal_template",
    );
    expect(missionDefinitions.viralInfectionV6.map.tacticalMapId).toBe(
      "lung_branching_vessels_template",
    );
    expect(missionDefinitions.mixedInfectionV8.map.tacticalMapId).toBe(
      "infinite_large_tissue_template",
    );
    expect(missionDefinitions.infiniteSurvivalV8.map.tacticalMapId).toBe(
      "infinite_large_tissue_template",
    );
  });

  it("lets body regions declare the local tactical template they prefer", () => {
    expect(bodyRegionDefinitions.skin.tacticalMapId).toBe("skin_multi_wound_template");
    expect(bodyRegionDefinitions.lungs.tacticalMapId).toBe(
      "lung_branching_vessels_template",
    );
    expect(bodyRegionDefinitions.intestine.tacticalMapId).toBe(
      "intestine_clustered_sites_template",
    );
    expect(bodyRegionDefinitions.blood.tacticalMapId).toBe(
      "blood_vessel_crossroads_template",
    );
    expect(bodyRegionDefinitions.lymphNodes.tacticalMapId).toBe(
      "lymph_node_signal_template",
    );
  });

  it("uses diapedesis points for recruited immune units when a template exists", () => {
    const state = createInitialState("viralInfectionV6");
    const produced = applyCommand(state, { type: "produceMacrophage" });
    const macrophage = Object.values(produced.entities).find(
      (entity) => entity.kind === "macrophage" && entity.id.startsWith("macrophage-"),
    );
    const expected = getEntryPointForUnitFromTacticalMap(
      missionDefinitions.viralInfectionV6.map,
      "macrophage",
    );

    expect(expected).toBeDefined();
    expect(macrophage?.position).toEqual(expected);
  });

  it("uses combat-site approach lanes while keeping a safe fallback", () => {
    const map = missionDefinitions.skinBacterialSkirmish.map;
    const spawn = getPathogenSpawnPositionForWave(map, "cocciRapid", 1, 2);
    const template = getTacticalMapDefinition(map.tacticalMapId);
    const fallback = getTacticalMapDefinition(undefined);

    expect(spawn).toBeDefined();
    expect(
      Math.min(
        ...template.combatSites.map(
          (site) =>
            Math.hypot(
              (spawn?.x ?? 0) - site.position.x,
              (spawn?.y ?? 0) - site.position.y,
            ) - site.radius,
        ),
      ),
    ).toBeGreaterThanOrEqual(
      balanceValues.pathogenSpawnSafety.campaignClearance,
    );
    expect(fallback.id).toBe("skin_small_wound_fixed");
  });
});
