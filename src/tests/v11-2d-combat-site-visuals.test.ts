import { describe, expect, it } from "vitest";
import { tacticalMapDefinitions } from "../game/data/tacticalMaps";
import {
  COMBAT_CORE_ANIMATION_KEYS,
  COMBAT_CORE_FRAME_SIZE,
  getCombatCoreFrameCount,
  getCombatCoreFrameKey,
} from "../game/mapVisuals/combatSiteCoreAssets";
import {
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
    expect(first).toHaveLength(46);
    expect(
      first.every(
        (spot) => Math.hypot(spot.x, spot.y) <= site.radius * 1.16,
      ),
    ).toBe(true);
    expect(first.every((spot) => spot.alpha < 0.25)).toBe(true);
    expect(JSON.stringify(site)).toBe(snapshot);
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
