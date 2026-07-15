import { describe, expect, it } from "vitest";
import { tacticalMapDefinitions } from "../game/data/tacticalMaps";
import {
  COMBAT_CORE_ANIMATION_KEYS,
  COMBAT_CORE_FRAME_SIZE,
  getCombatCoreFrameCount,
  getCombatCoreFrameKey,
} from "../game/mapVisuals/combatSiteCoreAssets";
import {
  advanceCorruptionProgress,
  createCorruptionBranches,
  createCorruptionPattern,
  createLostTissuePattern,
  getHostileCountsByCombatSite,
  getUpcomingCombatSiteActivation,
  isCombatSiteLocallyLost,
} from "../game/mapVisuals/combatSiteVisualState";
import { createInitialState } from "../game/simulation/core/createInitialState";

describe("V11.2D combat-site visuals", () => {
  it("defines compact core frames and stable animation keys", () => {
    expect(COMBAT_CORE_FRAME_SIZE).toBe(96);
    expect(getCombatCoreFrameCount("dormant")).toBe(14);
    expect(getCombatCoreFrameCount("activation")).toBe(14);
    expect(getCombatCoreFrameCount("active")).toBe(15);
    expect(getCombatCoreFrameCount("destabilizing")).toBe(15);
    expect(getCombatCoreFrameCount("destroyed")).toBe(15);
    expect(getCombatCoreFrameKey("active", 3)).toBe("combat-core.active.3");
    expect(COMBAT_CORE_ANIMATION_KEYS).toEqual({
      dormant: "combat-core.dormant",
      activation: "combat-core.activation",
      active: "combat-core.active",
      destabilizing: "combat-core.destabilizing",
      destroyed: "combat-core.destroyed",
    });
  });

  it("creates deterministic local corruption contained near the battle circle", () => {
    const site = tacticalMapDefinitions.skin_small_wound_fixed.combatSites[0];
    const snapshot = JSON.stringify(site);
    const first = createCorruptionPattern(site);
    const second = createCorruptionPattern(site);

    expect(first).toEqual(second);
    expect(first).toHaveLength(118);
    expect(
      first.every(
        (spot) =>
          Math.hypot(spot.x, spot.y) + spot.size / 2 <= site.radius * 0.96,
      ),
    ).toBe(true);
    expect(new Set(first.map((spot) => spot.color))).toEqual(new Set([0x713b8f]));
    expect(first.every((spot) => spot.alpha < 0.26)).toBe(true);
    expect(JSON.stringify(site)).toBe(snapshot);
  });

  it("builds deterministic primary and secondary spore branches inside the local site", () => {
    const site = tacticalMapDefinitions.skin_small_wound_fixed.combatSites[0];
    const branches = createCorruptionBranches(site);

    expect(branches).toEqual(createCorruptionBranches(site));
    expect(branches).toHaveLength(36);
    expect(branches.filter((branch) => branch.generation === "primary")).toHaveLength(12);
    expect(branches.filter((branch) => branch.generation === "secondary")).toHaveLength(24);
    expect(new Set(branches.map((branch) => branch.color))).toEqual(new Set([0x713b8f]));
    expect(
      branches.every(
        (branch) =>
          branch.points.every(
            (point) => Math.hypot(point.x, point.y) <= site.radius * 0.98,
          ),
      ),
    ).toBe(true);
  });

  it("opens and closes local corruption over one second", () => {
    const halfwayOpen = advanceCorruptionProgress(0, true, 500);
    const fullyOpen = advanceCorruptionProgress(halfwayOpen, true, 500);
    const halfwayClosed = advanceCorruptionProgress(fullyOpen, false, 500);
    const fullyClosed = advanceCorruptionProgress(halfwayClosed, false, 500);

    expect(halfwayOpen).toBe(0.5);
    expect(fullyOpen).toBe(1);
    expect(halfwayClosed).toBe(0.5);
    expect(fullyClosed).toBe(0);
  });

  it("creates deterministic lost-tissue pixels inside the local site", () => {
    const site = tacticalMapDefinitions.skin_small_wound_fixed.combatSites[0];
    const first = createLostTissuePattern(site);

    expect(first).toEqual(createLostTissuePattern(site));
    expect(first).toHaveLength(34);
    expect(
      first.every((pixel) => Math.hypot(pixel.x, pixel.y) <= site.radius),
    ).toBe(true);
  });

  it("detects the upcoming wave site without mutating simulation state", () => {
    const state = createInitialState("woundBacteriaV1");
    const snapshot = JSON.stringify(state.waves);
    const activation = getUpcomingCombatSiteActivation(state);

    expect(activation?.siteId).toBe(state.tacticalMap.combatSites[0]?.id);
    expect(activation?.remainingMs).toBeGreaterThan(0);
    expect(getHostileCountsByCombatSite(state).get(activation?.siteId ?? "")).toBe(0);
    expect(JSON.stringify(state.waves)).toBe(snapshot);
  });

  it("uses destroyed civilian cells as a visual-only local lost-site signal", () => {
    const state = createInitialState("woundBacteriaV1");
    const site = state.tacticalMap.combatSites[0];
    const localCells = state.tissueCells;

    expect(localCells.length).toBeGreaterThanOrEqual(2);
    expect(isCombatSiteLocallyLost(state, site)).toBe(false);

    for (const cell of localCells) {
      cell.status = "destroyed";
      cell.health = 0;
    }

    expect(isCombatSiteLocallyLost(state, site)).toBe(true);
  });
});
