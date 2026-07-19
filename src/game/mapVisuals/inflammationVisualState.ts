import type {
  CombatSiteDefinition,
  MapPoint,
  TacticalMapDefinition,
  VesselPathDefinition,
} from "../data/tacticalMaps";
import { stableHash } from "../types/shared";

export type InflammationVisualLevel = "low" | "medium" | "high";

export type InflammationVisualProfile = {
  level: InflammationVisualLevel;
  fieldAlpha: number;
  pulseAlpha: number;
  pulseDurationMs: number;
  breathAmplitude: number;
  signalCount: number;
  vesselAlpha: number;
  vesselWidthBoost: number;
};

export type InflammationBoundaryPoint = {
  angle: number;
  radiusRatio: number;
  phase: number;
};

export type InflammationPatch = {
  x: number;
  y: number;
  width: number;
  height: number;
  alphaWeight: number;
  phase: number;
  color: number;
};

export type InflammationPulsePixel = {
  angle: number;
  span: number;
  thickness: number;
  radialOffset: number;
  alphaWeight: number;
};

export type CytokineSignal = {
  start: MapPoint;
  control: MapPoint;
  end: MapPoint;
  durationMs: number;
  phaseOffsetMs: number;
  size: number;
  color: number;
};

const FIELD_PATCH_COUNT = 88;
const FIELD_BOUNDARY_POINT_COUNT = 32;
const PULSE_PIXEL_COUNT = 28;
const MAX_CYTOKINE_SIGNALS = 10;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Matches the former macrophage leash footprint without exposing the RTS leash.
const INFLAMMATION_FIELD_RADIUS_RATIO = 1.86;

export function getInflammationFieldRadius(
  site: CombatSiteDefinition,
  tissueZones: TacticalMapDefinition["tissueZones"] = [],
): number {
  const localTissueZone = tissueZones
    .flatMap((zone) => {
      if (zone.shape.kind !== "circle") {
        return [];
      }

      return [{
        radius: zone.shape.radius,
        distance: Math.hypot(
          zone.shape.position.x - site.position.x,
          zone.shape.position.y - site.position.y,
        ),
      }];
    })
    .filter(
      ({ radius, distance }) =>
        distance <= Math.max(site.radius * 0.5, radius * 0.4),
    )
    .sort((left, right) => left.distance - right.distance)[0];

  if (localTissueZone) {
    return localTissueZone.radius;
  }

  return site.radius * INFLAMMATION_FIELD_RADIUS_RATIO;
}

export function getInflammationVisualProfile(
  inflammationValue: number,
): InflammationVisualProfile {
  const value = clamp(inflammationValue, 0, 100);

  if (value < 35) {
    const ratio = value / 35;

    return {
      level: "low",
      fieldAlpha: lerp(0.2, 0.24, ratio),
      pulseAlpha: lerp(0.38, 0.46, ratio),
      pulseDurationMs: lerp(2_350, 2_100, ratio),
      breathAmplitude: lerp(0.035, 0.055, ratio),
      signalCount: 3 + Math.floor(ratio * 2),
      vesselAlpha: lerp(0.22, 0.29, ratio),
      vesselWidthBoost: lerp(2.2, 3.2, ratio),
    };
  }

  if (value < 70) {
    const ratio = (value - 35) / 35;

    return {
      level: "medium",
      fieldAlpha: lerp(0.25, 0.3, ratio),
      pulseAlpha: lerp(0.47, 0.56, ratio),
      pulseDurationMs: lerp(2_000, 1_700, ratio),
      breathAmplitude: lerp(0.06, 0.08, ratio),
      signalCount: 5 + Math.floor(ratio * 3),
      vesselAlpha: lerp(0.3, 0.39, ratio),
      vesselWidthBoost: lerp(3.3, 4.6, ratio),
    };
  }

  const ratio = (value - 70) / 30;

  return {
    level: "high",
    fieldAlpha: lerp(0.31, 0.37, ratio),
    pulseAlpha: lerp(0.57, 0.68, ratio),
    pulseDurationMs: lerp(1_650, 1_350, ratio),
    breathAmplitude: lerp(0.085, 0.11, ratio),
    signalCount: Math.min(10, 8 + Math.floor(ratio * 3)),
    vesselAlpha: lerp(0.4, 0.5, ratio),
    vesselWidthBoost: lerp(4.8, 6.2, ratio),
  };
}

export function createInflammationBoundary(
  site: CombatSiteDefinition,
): InflammationBoundaryPoint[] {
  return Array.from({ length: FIELD_BOUNDARY_POINT_COUNT }, (_, index) => ({
    angle:
      (index / FIELD_BOUNDARY_POINT_COUNT) * Math.PI * 2 +
      (deterministicValue(site.id, index, 101) - 0.5) * 0.08,
    radiusRatio: lerp(0.82, 1, deterministicValue(site.id, index, 103)),
    phase: deterministicValue(site.id, index, 107) * Math.PI * 2,
  }));
}

export function getInflammationBreathFrame(
  profile: InflammationVisualProfile,
  elapsedMs: number,
): { amount: number; scale: number } {
  const cycle = positiveModulo(elapsedMs, profile.pulseDurationMs) /
    profile.pulseDurationMs;
  const amount = 0.5 - Math.cos(cycle * Math.PI * 2) * 0.5;

  return {
    amount,
    scale: 1 + (amount * 2 - 1) * profile.breathAmplitude,
  };
}

export function advanceInflammationFieldProgress(
  currentProgress: number,
  active: boolean,
  deltaMs: number,
): number {
  const durationMs = active ? 750 : 1_000;
  const direction = active ? 1 : -1;

  return clamp(
    currentProgress + direction * (Math.max(0, deltaMs) / durationMs),
    0,
    1,
  );
}

export function createInflammationPatches(
  site: CombatSiteDefinition,
  fieldRadius = getInflammationFieldRadius(site),
): InflammationPatch[] {
  return Array.from({ length: FIELD_PATCH_COUNT }, (_, index) => {
    const angularNoise = deterministicValue(site.id, index, 11) - 0.5;
    const angle = index * GOLDEN_ANGLE + angularNoise * 0.42;
    const radialNoise = deterministicValue(site.id, index, 13);
    const radiusRatio = 0.08 + Math.sqrt(radialNoise) * 0.84;
    const width = fieldRadius * lerp(0.07, 0.16, deterministicValue(site.id, index, 17));
    const height = fieldRadius * lerp(0.05, 0.13, deterministicValue(site.id, index, 19));

    return {
      x: Math.cos(angle) * fieldRadius * radiusRatio,
      y: Math.sin(angle) * fieldRadius * radiusRatio,
      width,
      height,
      alphaWeight: lerp(0.46, 0.9, deterministicValue(site.id, index, 23)),
      phase: deterministicValue(site.id, index, 29) * Math.PI * 2,
      color:
        deterministicValue(site.id, index, 31) > 0.58 ? 0xffad43 : 0xed7b32,
    };
  });
}

export function createInflammationPulsePixels(
  site: CombatSiteDefinition,
): InflammationPulsePixel[] {
  return Array.from({ length: PULSE_PIXEL_COUNT }, (_, index) => ({
    angle:
      (index / PULSE_PIXEL_COUNT) * Math.PI * 2 +
      (deterministicValue(site.id, index, 41) - 0.5) * 0.16,
    span: lerp(0.14, 0.28, deterministicValue(site.id, index, 43)),
    thickness: lerp(5, 8, deterministicValue(site.id, index, 45)),
    radialOffset: lerp(-0.025, 0.025, deterministicValue(site.id, index, 46)),
    alphaWeight: lerp(0.46, 0.88, deterministicValue(site.id, index, 47)),
  }));
}

export function createCytokineSignals(
  site: CombatSiteDefinition,
  vessels: VesselPathDefinition[],
): CytokineSignal[] {
  const nearbyPoints = collectNearbyVesselPoints(site, vessels);

  return Array.from({ length: MAX_CYTOKINE_SIGNALS }, (_, index) => {
    const fallbackAngle =
      (index / MAX_CYTOKINE_SIGNALS) * Math.PI * 2 +
      (deterministicValue(site.id, index, 53) - 0.5) * 0.55;
    const fallbackRadius = site.radius * lerp(0.78, 1.08, deterministicValue(site.id, index, 59));
    const point =
      nearbyPoints.length > 0
        ? nearbyPoints[
            Math.floor(deterministicValue(site.id, index, 61) * nearbyPoints.length) %
              nearbyPoints.length
          ]
        : {
            x: site.position.x + Math.cos(fallbackAngle) * fallbackRadius,
            y: site.position.y + Math.sin(fallbackAngle) * fallbackRadius,
          };
    const endAngle = deterministicValue(site.id, index, 67) * Math.PI * 2;
    const endRadius = site.radius * lerp(0.04, 0.18, deterministicValue(site.id, index, 71));
    const end = {
      x: site.position.x + Math.cos(endAngle) * endRadius,
      y: site.position.y + Math.sin(endAngle) * endRadius,
    };
    const travelX = end.x - point.x;
    const travelY = end.y - point.y;
    const travelLength = Math.max(1, Math.hypot(travelX, travelY));
    const bendDirection = deterministicValue(site.id, index, 69) > 0.5 ? 1 : -1;
    const bendDistance =
      site.radius * lerp(0.12, 0.36, deterministicValue(site.id, index, 70));

    return {
      start: { ...point },
      control: {
        x: (point.x + end.x) / 2 - (travelY / travelLength) * bendDistance * bendDirection,
        y: (point.y + end.y) / 2 + (travelX / travelLength) * bendDistance * bendDirection,
      },
      end,
      durationMs: Math.round(lerp(1_450, 2_250, deterministicValue(site.id, index, 73))),
      phaseOffsetMs: Math.round(deterministicValue(site.id, index, 79) * 2_000),
      size: 2 + Math.floor(deterministicValue(site.id, index, 83) * 3),
      color: deterministicValue(site.id, index, 89) > 0.45 ? 0xffdb70 : 0xffad47,
    };
  });
}

export function getCytokineSignalFrame(
  signal: CytokineSignal,
  elapsedMs: number,
): { position: MapPoint; progress: number; alpha: number } {
  const cycleMs = positiveModulo(elapsedMs + signal.phaseOffsetMs, signal.durationMs);
  const progress = cycleMs / signal.durationMs;
  const easedProgress = progress * progress * (3 - 2 * progress);
  const inverseProgress = 1 - easedProgress;
  const fadeStart = 0.68;

  return {
    position: {
      x:
        inverseProgress * inverseProgress * signal.start.x +
        2 * inverseProgress * easedProgress * signal.control.x +
        easedProgress * easedProgress * signal.end.x,
      y:
        inverseProgress * inverseProgress * signal.start.y +
        2 * inverseProgress * easedProgress * signal.control.y +
        easedProgress * easedProgress * signal.end.y,
    },
    progress,
    alpha:
      progress <= fadeStart
        ? 1
        : Math.max(0, (1 - progress) / (1 - fadeStart)),
  };
}

function collectNearbyVesselPoints(
  site: CombatSiteDefinition,
  vessels: VesselPathDefinition[],
): MapPoint[] {
  const minimumDistance = site.radius * 0.34;
  const maximumDistance = site.radius * 1.35;
  const candidates: Array<{ point: MapPoint; distance: number }> = [];

  for (const vessel of vessels) {
    for (let index = 0; index < vessel.points.length - 1; index += 1) {
      const start = vessel.points[index];
      const end = vessel.points[index + 1];
      const points = [
        start,
        { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      ];

      for (const point of points) {
        const distance = Math.hypot(
          point.x - site.position.x,
          point.y - site.position.y,
        );

        if (distance >= minimumDistance && distance <= maximumDistance) {
          candidates.push({ point: { ...point }, distance });
        }
      }
    }
  }

  return candidates
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 32)
    .map(({ point }) => point);
}

function deterministicValue(siteId: string, index: number, salt: number): number {
  let value = stableHash(`${siteId}:${index}:${salt}`);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value = (value ^ (value >>> 16)) >>> 0;

  return value / 0xffffffff;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
