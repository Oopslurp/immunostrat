import { describe, expect, it } from "vitest";
import { tacticalMapDefinitions } from "../game/data/tacticalMaps";
import {
  createPixelVesselPath,
  createVesselHighlightPath,
  deterministicVesselValue,
  getProceduralVesselStyle,
  VESSEL_PIXEL_SCALE,
} from "../game/mapVisuals/proceduralVesselStyle";

describe("V11.2 procedural Layer B vessels", () => {
  it("uses ordered, compact translucent layers with pixel details", () => {
    const style = getProceduralVesselStyle(24);

    expect(style.shadow.width).toBeGreaterThan(style.body.width);
    expect(style.body.width).toBeGreaterThan(style.inner.width);
    expect(style.inner.width).toBeGreaterThan(style.highlight.width);
    expect(style.body.width).toBeLessThan(24);
    expect(style.shadow.width).toBeLessThan(24);
    expect(style.shadow.alpha).toBeLessThan(1);
    expect(style.body.alpha).toBeLessThan(0.9);
    expect(style.inner.alpha).toBeLessThan(0.75);
    expect(style.highlight.alpha).toBeLessThan(0.65);
    expect(style.detailDark.width).toBeLessThan(style.inner.width);
    expect(VESSEL_PIXEL_SCALE).toBeGreaterThanOrEqual(2);
  });

  it("creates a deterministic snapped organic path without changing logic points", () => {
    const points = [
      { x: 20, y: 30 },
      { x: 180, y: 76 },
      { x: 320, y: 38 },
    ];
    const snapshot = JSON.stringify(points);
    const first = createPixelVesselPath(points, "blood-main", 3, 2.5);
    const second = createPixelVesselPath(points, "blood-main", 3, 2.5);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(points.length);
    expect(first.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y))).toBe(true);
    expect(first[0]).toEqual({ x: 7, y: 10 });
    expect(first[first.length - 1]).toEqual({ x: 107, y: 13 });
    expect(JSON.stringify(points)).toBe(snapshot);
    expect(deterministicVesselValue("blood-main", 2, 4)).toBe(
      deterministicVesselValue("blood-main", 2, 4),
    );
  });

  it("creates a deterministic highlight without mutating vessel paths", () => {
    const points = [
      { x: 20, y: 30 },
      { x: 80, y: 50 },
      { x: 140, y: 35 },
    ];
    const snapshot = JSON.stringify(points);
    const first = createVesselHighlightPath(points, 3);
    const second = createVesselHighlightPath(points, 3);

    expect(first).toEqual(second);
    expect(first).not.toEqual(points);
    expect(JSON.stringify(points)).toBe(snapshot);
  });

  it("keeps every tactical vessel path and its points unchanged", () => {
    for (const tacticalMap of Object.values(tacticalMapDefinitions)) {
      const before = JSON.stringify(tacticalMap.vesselPaths);

      for (const [index, vessel] of tacticalMap.vesselPaths.entries()) {
        const style = getProceduralVesselStyle(vessel.width, index);
        const highlight = createVesselHighlightPath(
          vessel.points,
          style.highlightOffset,
        );

        expect(highlight).toHaveLength(vessel.points.length);
      }

      expect(JSON.stringify(tacticalMap.vesselPaths)).toBe(before);
    }
  });
});
