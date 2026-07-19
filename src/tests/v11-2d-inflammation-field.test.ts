import { describe, expect, it } from "vitest";
import { tacticalMapDefinitions } from "../game/data/tacticalMaps";
import {
  clipLineSegmentToCircle,
  InflammationFieldRenderer,
} from "../game/mapVisuals/InflammationFieldRenderer";
import {
  advanceInflammationFieldProgress,
  createCytokineSignals,
  createInflammationBoundary,
  createInflammationPatches,
  createInflammationPulsePixels,
  getCytokineSignalFrame,
  getInflammationBreathFrame,
  getInflammationFieldRadius,
  getInflammationVisualProfile,
} from "../game/mapVisuals/inflammationVisualState";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";

describe("V11.2D local inflammation field", () => {
  const smallMap = tacticalMapDefinitions.skin_small_wound_fixed;
  const site = smallMap.combatSites[0];

  it("maps existing inflammation values to bounded low, medium, and high profiles", () => {
    const low = getInflammationVisualProfile(10);
    const medium = getInflammationVisualProfile(52);
    const high = getInflammationVisualProfile(100);

    expect(low.level).toBe("low");
    expect(low.fieldAlpha).toBeGreaterThanOrEqual(0.2);
    expect(low.fieldAlpha).toBeLessThanOrEqual(0.24);
    expect(low.vesselAlpha).toBeGreaterThanOrEqual(0.22);
    expect(low.vesselWidthBoost).toBeGreaterThanOrEqual(2.2);
    expect(low.signalCount).toBeGreaterThanOrEqual(3);
    expect(low.signalCount).toBeLessThanOrEqual(4);

    expect(medium.level).toBe("medium");
    expect(medium.fieldAlpha).toBeGreaterThanOrEqual(0.25);
    expect(medium.fieldAlpha).toBeLessThanOrEqual(0.3);
    expect(medium.signalCount).toBeGreaterThanOrEqual(5);
    expect(medium.signalCount).toBeLessThanOrEqual(7);

    expect(high.level).toBe("high");
    expect(high.fieldAlpha).toBeLessThanOrEqual(0.37);
    expect(high.signalCount).toBe(10);
    expect(high.vesselWidthBoost).toBeLessThanOrEqual(6.2);
    expect(high.pulseDurationMs).toBeGreaterThanOrEqual(1_350);
    expect(high.pulseDurationMs).toBeLessThanOrEqual(1_650);
  });

  it("keeps a visible floor and deterministic breathing at very low inflammation", () => {
    const profile = getInflammationVisualProfile(1);
    const start = getInflammationBreathFrame(profile, 0);
    const expanded = getInflammationBreathFrame(
      profile,
      profile.pulseDurationMs / 2,
    );

    expect(profile.fieldAlpha).toBeGreaterThanOrEqual(0.2);
    expect(profile.pulseAlpha).toBeGreaterThanOrEqual(0.38);
    expect(start.scale).toBeLessThan(1);
    expect(expanded.scale).toBeGreaterThan(1);
  });

  it("creates a deterministic irregular boundary instead of a perfect circle", () => {
    const boundary = createInflammationBoundary(site);

    expect(boundary).toEqual(createInflammationBoundary(site));
    expect(boundary).toHaveLength(32);
    expect(new Set(boundary.map((point) => point.radiusRatio.toFixed(3))).size)
      .toBeGreaterThan(12);
  });

  it("reuses the former leash-sized footprint without exposing the RTS leash", () => {
    expect(getInflammationFieldRadius(site)).toBeCloseTo(site.radius * 1.86);
    expect(getInflammationFieldRadius(site)).toBeGreaterThan(site.radius);
  });

  it("reuses a local tissue-zone radius as the inflammation footprint", () => {
    const localZone = {
      ...smallMap.tissueZones[0],
      shape: {
        ...smallMap.tissueZones[0].shape,
        position: { ...site.position },
        radius: 310,
      },
    };

    expect(getInflammationFieldRadius(site, [localZone])).toBe(310);
  });

  it("creates a deterministic pixel-organic field around the tactical circle", () => {
    const snapshot = JSON.stringify(site);
    const first = createInflammationPatches(site);
    const fieldRadius = getInflammationFieldRadius(site);

    expect(first).toEqual(createInflammationPatches(site));
    expect(first).toHaveLength(88);
    expect(
      first.every(
        (patch) =>
          Math.hypot(patch.x, patch.y) +
            Math.hypot(patch.width / 2, patch.height / 2) <=
          fieldRadius * 1.08,
      ),
    ).toBe(true);
    expect(first.every((patch) => patch.alphaWeight <= 0.9)).toBe(true);
    expect(JSON.stringify(site)).toBe(snapshot);
  });

  it("creates deterministic broken pulse pixels instead of a uniform filled circle", () => {
    const pixels = createInflammationPulsePixels(site);

    expect(pixels).toEqual(createInflammationPulsePixels(site));
    expect(pixels).toHaveLength(28);
    expect(pixels.every((pixel) => pixel.thickness >= 5)).toBe(true);
    expect(pixels.every((pixel) => pixel.span > 0)).toBe(true);
    expect(pixels.every((pixel) => pixel.alphaWeight < 0.9)).toBe(true);
  });

  it("fades in over 750 ms, fades out over one second, and reactivates cleanly", () => {
    const halfOpen = advanceInflammationFieldProgress(0, true, 375);
    const fullyOpen = advanceInflammationFieldProgress(halfOpen, true, 375);
    const halfClosed = advanceInflammationFieldProgress(fullyOpen, false, 500);
    const closed = advanceInflammationFieldProgress(halfClosed, false, 500);
    const reactivated = advanceInflammationFieldProgress(closed, true, 750);

    expect(halfOpen).toBe(0.5);
    expect(fullyOpen).toBe(1);
    expect(halfClosed).toBe(0.5);
    expect(closed).toBe(0);
    expect(reactivated).toBe(1);
  });

  it("creates at most ten deterministic cytokine signals that converge on the core", () => {
    const snapshot = JSON.stringify(smallMap.vesselPaths);
    const signals = createCytokineSignals(site, smallMap.vesselPaths);

    expect(signals).toEqual(createCytokineSignals(site, smallMap.vesselPaths));
    expect(signals).toHaveLength(10);

    for (const signal of signals) {
      const startDistance = Math.hypot(
        signal.start.x - site.position.x,
        signal.start.y - site.position.y,
      );
      const endDistance = Math.hypot(
        signal.end.x - site.position.x,
        signal.end.y - site.position.y,
      );
      const early = getCytokineSignalFrame(signal, -signal.phaseOffsetMs + 1);
      const middle = getCytokineSignalFrame(
        signal,
        -signal.phaseOffsetMs + signal.durationMs * 0.5,
      );
      const late = getCytokineSignalFrame(
        signal,
        -signal.phaseOffsetMs + signal.durationMs * 0.9,
      );

      expect(endDistance).toBeLessThan(startDistance);
      expect(early.alpha).toBe(1);
      expect(middle.alpha).toBe(1);
      expect(late.alpha).toBeLessThan(0.35);
      expect(
        Math.hypot(
          late.position.x - site.position.x,
          late.position.y - site.position.y,
        ),
      ).toBeLessThan(
        Math.hypot(
          early.position.x - site.position.x,
          early.position.y - site.position.y,
        ),
      );
    }

    expect(JSON.stringify(smallMap.vesselPaths)).toBe(snapshot);
  });

  it("clips only the visual vessel response near an active site", () => {
    const clipped = clipLineSegmentToCircle(
      { x: -20, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 0 },
      8,
    );
    const untouched = clipLineSegmentToCircle(
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 0, y: 0 },
      8,
    );

    expect(clipped?.start.x).toBeCloseTo(-8);
    expect(clipped?.end.x).toBeCloseTo(8);
    expect(clipped?.start.y).toBe(0);
    expect(clipped?.end.y).toBe(0);
    expect(untouched).toBeNull();
  });

  it("keeps deterministic patterns distinct across simultaneous combat sites", () => {
    const sites = tacticalMapDefinitions.skin_multi_wound_template.combatSites;

    expect(sites.length).toBeGreaterThan(1);
    expect(createInflammationPatches(sites[0])).not.toEqual(
      createInflammationPatches(sites[1]),
    );
    expect(createCytokineSignals(sites[0], smallMap.vesselPaths)).not.toEqual(
      createCytokineSignals(sites[1], smallMap.vesselPaths),
    );
  });

  it("draws only while active, at the requested depths, then clears after securing", () => {
    const graphics = [new FakeGraphics(), new FakeGraphics(), new FakeGraphics()];
    let graphicsIndex = 0;
    const scene = {
      add: {
        graphics: () => graphics[graphicsIndex++],
      },
    };
    const state = createInitialState("woundBacteriaV1");
    const activeSite = state.tacticalMap.combatSites[0];
    const renderer = new InflammationFieldRenderer(
      scene as never,
      state.tacticalMap,
    );

    renderer.update(state, 16);
    expect(graphics.map((layer) => layer.depth)).toEqual([-71, -70, -68]);
    expect(graphics.every((layer) => layer.fillRectCount === 0)).toBe(true);

    const pathogenTypeId = activeSite.pathogenTypes[0];
    const bacterium = spawnBacterium(state, pathogenTypeId, activeSite.position);
    state.inflammation.value = 100;
    renderer.update(state, 750);

    expect(graphics[0].strokeCount).toBeGreaterThan(0);
    expect(graphics[1].fillRectCount).toBeGreaterThanOrEqual(88);
    expect(graphics[1].strokeCount).toBeGreaterThan(0);
    expect(graphics[2].fillRectCount).toBeGreaterThanOrEqual(10);

    delete state.entities[bacterium.id];
    renderer.update(state, 1_000);

    expect(graphics.every((layer) => layer.fillRectCount === 0)).toBe(true);
    expect(graphics.every((layer) => layer.strokeCount === 0)).toBe(true);

    renderer.destroy();
    expect(graphics.every((layer) => layer.destroyed)).toBe(true);
  });
});

class FakeGraphics {
  depth = 0;
  fillRectCount = 0;
  strokeCount = 0;
  fillPathCount = 0;
  destroyed = false;

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  clear(): this {
    this.fillRectCount = 0;
    this.strokeCount = 0;
    this.fillPathCount = 0;
    return this;
  }

  destroy(): void {
    this.destroyed = true;
  }

  fillStyle(): this {
    return this;
  }

  fillRect(): this {
    this.fillRectCount += 1;
    return this;
  }

  lineStyle(): this {
    return this;
  }

  beginPath(): this {
    return this;
  }

  moveTo(): this {
    return this;
  }

  lineTo(): this {
    return this;
  }

  closePath(): this {
    return this;
  }

  fillPath(): this {
    this.fillPathCount += 1;
    return this;
  }

  strokePath(): this {
    this.strokeCount += 1;
    return this;
  }

  lineBetween(): this {
    this.strokeCount += 1;
    return this;
  }

  fillCircle(): this {
    return this;
  }
}
