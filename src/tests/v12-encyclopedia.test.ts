import { describe, expect, it } from "vitest";
import {
  appRouteFromHash,
  appRouteToHash,
  encyclopediaEntryRoute,
  getEncyclopediaEntryId,
  routes,
} from "../app/routes";
import {
  encyclopediaEntries,
  encyclopediaEntryById,
  getEntryProfiles,
} from "../content/encyclopediaEntries";

describe("V12 immersive encyclopedia", () => {
  it("covers the requested scientific concepts and every infectious family", () => {
    const requiredEntries = [
      "macrophage",
      "neutrophil",
      "cytokines",
      "inflammation",
      "antigen",
      "lymph-node",
      "bacteria",
      "virus",
      "fungus",
      "parasite",
      "infected-cell",
      "abnormal-cells",
      "opportunistic-infections",
    ];

    for (const entryId of requiredEntries) {
      expect(encyclopediaEntryById.has(entryId), entryId).toBe(true);
    }

    const infectiousFamilies = encyclopediaEntries
      .filter((entry) => entry.category === "infectiousAgents")
      .map((entry) => entry.pathogenClass)
      .sort();

    expect(infectiousFamilies).toEqual([
      "bacterium",
      "fungus",
      "parasite",
      "virus",
    ]);
  });

  it("keeps all mandatory sections populated and makes the design reasoning explicit", () => {
    for (const entry of encyclopediaEntries) {
      expect(entry.biologyRole.length, `${entry.id}: biology`).toBeGreaterThan(0);
      expect(entry.modelChoice.length, `${entry.id}: model`).toBeGreaterThan(0);
      expect(entry.gameRole.length, `${entry.id}: game role`).toBeGreaterThan(20);
      expect(entry.playerDecision.length, `${entry.id}: decision`).toBeGreaterThan(20);
      expect(entry.faithfulAspects.length, `${entry.id}: faithful`).toBeGreaterThan(0);
      expect(
        entry.gameplaySimplifications.length,
        `${entry.id}: simplifications`,
      ).toBeGreaterThan(0);
    }
  });

  it("uses unique ids and resolves every related dossier", () => {
    expect(encyclopediaEntryById.size).toBe(encyclopediaEntries.length);

    for (const entry of encyclopediaEntries) {
      for (const relatedId of entry.relatedIds) {
        expect(encyclopediaEntryById.has(relatedId), `${entry.id} -> ${relatedId}`).toBe(
          true,
        );
      }
    }
  });

  it("maps documented threat profiles to real definitions", () => {
    for (const entry of encyclopediaEntries.filter((item) => item.profileIds)) {
      expect(getEntryProfiles(entry)).toHaveLength(entry.profileIds?.length ?? 0);
    }
  });

  it("keeps sprite specimens on their declared frame grid", () => {
    const spriteEntries = encyclopediaEntries.filter(
      (entry) => entry.gameVisual.kind === "sprite",
    );

    expect(spriteEntries.length).toBeGreaterThanOrEqual(7);
    for (const entry of spriteEntries) {
      const visual = entry.gameVisual;
      if (visual.kind !== "sprite") {
        continue;
      }

      expect(visual.frameWidth).toBeGreaterThan(0);
      expect(visual.frameHeight).toBeGreaterThan(0);
      expect(visual.frames).toBeLessThanOrEqual(visual.columns);
      expect(visual.row).toBeLessThan(visual.rows);
    }
  });

  it("credits every real-life reference image", () => {
    const realVisuals = encyclopediaEntries.flatMap((entry) =>
      entry.realVisual ? [entry.realVisual] : [],
    );

    expect(realVisuals.length).toBeGreaterThanOrEqual(7);
    for (const visual of realVisuals) {
      expect(visual.credit.length).toBeGreaterThan(4);
      expect(visual.license.length).toBeGreaterThan(4);
      expect(visual.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});
describe("V12 hash routes", () => {
  it("round-trips public routes and direct encyclopedia entries", () => {
    for (const route of [
      routes.home,
      routes.encyclopedia,
      routes.scienceVsGameplay,
      encyclopediaEntryRoute("macrophage"),
    ]) {
      expect(appRouteFromHash(appRouteToHash(route))).toBe(route);
    }

    expect(getEncyclopediaEntryId(encyclopediaEntryRoute("fungus"))).toBe("fungus");
    expect(getEncyclopediaEntryId(routes.encyclopedia)).toBeNull();
  });
});
