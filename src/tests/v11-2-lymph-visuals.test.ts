import { describe, expect, it } from "vitest";
import { tacticalMapDefinitions } from "../game/data/tacticalMaps";
import {
  createLymphVisualRoutes,
  createPixelLymphPath,
  deterministicLymphValue,
  getProceduralLymphStyle,
} from "../game/mapVisuals/proceduralLymphStyle";
import { getProceduralVesselStyle } from "../game/mapVisuals/proceduralVesselStyle";

describe("V11.2 procedural lymph visuals", () => {
  it("creates one deterministic visual route per lymph exit", () => {
    for (const tacticalMap of Object.values(tacticalMapDefinitions)) {
      const snapshot = JSON.stringify(tacticalMap);
      const first = createLymphVisualRoutes(tacticalMap);
      const second = createLymphVisualRoutes(tacticalMap);

      expect(first).toEqual(second);
      expect(first).toHaveLength(tacticalMap.lymphaticExits.length);

      for (const route of first) {
        const exit = tacticalMap.lymphaticExits.find(
          (candidate) => candidate.id === route.exitId,
        );
        const routeEnd = route.path[route.path.length - 1];

        expect(exit).toBeDefined();
        expect(routeEnd).toEqual(exit?.position);
        expect(route.offMapBridge[0]).toEqual(exit?.position);
      }

      expect(JSON.stringify(tacticalMap)).toBe(snapshot);
    }
  });

  it("ends every off-map bridge on a map boundary", () => {
    for (const tacticalMap of Object.values(tacticalMapDefinitions)) {
      for (const route of createLymphVisualRoutes(tacticalMap)) {
        const end = route.offMapBridge[route.offMapBridge.length - 1];
        const onBoundary =
          end.x === 0 ||
          end.y === 0 ||
          end.x === tacticalMap.worldWidth ||
          end.y === tacticalMap.worldHeight;

        expect(onBoundary).toBe(true);
      }
    }
  });

  it("keeps lymph thinner and more translucent than blood vessels", () => {
    const lymph = getProceduralLymphStyle();
    const blood = getProceduralVesselStyle(24);

    expect(lymph.body.width).toBeLessThan(blood.body.width);
    expect(lymph.body.alpha).toBeLessThan(blood.body.alpha);
    expect(lymph.shadow.alpha).toBeLessThan(blood.shadow.alpha);
  });

  it("creates a stable pixel path without Math.random", () => {
    const points = [
      { x: 100, y: 180 },
      { x: 260, y: 245 },
      { x: 420, y: 380 },
    ];
    const snapshot = JSON.stringify(points);
    const first = createPixelLymphPath(points, "lymph-test");
    const second = createPixelLymphPath(points, "lymph-test");

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(points.length);
    expect(deterministicLymphValue("lymph-test", 2, 7)).toBe(
      deterministicLymphValue("lymph-test", 2, 7),
    );
    expect(JSON.stringify(points)).toBe(snapshot);
  });
});
