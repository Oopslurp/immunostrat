import Phaser from "phaser";
import type {
  CombatSiteDefinition,
  MapPoint,
  TacticalMapDefinition,
  VesselPathDefinition,
} from "../data/tacticalMaps";
import type { GameState } from "../simulation/core/GameState";
import { getHostileCountsByCombatSite } from "./combatSiteVisualState";
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
  type CytokineSignal,
  type InflammationBoundaryPoint,
  type InflammationPatch,
  type InflammationPulsePixel,
  type InflammationVisualProfile,
} from "./inflammationVisualState";
import {
  createPixelVesselPath,
  getProceduralVesselStyle,
  VESSEL_PIXEL_SCALE,
} from "./proceduralVesselStyle";

export const INFLAMMATION_VESSEL_RESPONSE_DEPTH = -71;
export const INFLAMMATION_FIELD_DEPTH = -70;
export const INFLAMMATION_SIGNAL_DEPTH = -68;

type InflammationSiteRuntime = {
  site: CombatSiteDefinition;
  fieldRadius: number;
  progress: number;
  active: boolean;
  boundary: InflammationBoundaryPoint[];
  patches: InflammationPatch[];
  pulsePixels: InflammationPulsePixel[];
  signals: CytokineSignal[];
};

type StyledVesselPath = {
  vessel: VesselPathDefinition;
  points: MapPoint[];
  responseWidth: number;
};

export class InflammationFieldRenderer {
  private readonly vesselResponseLayer: Phaser.GameObjects.Graphics;
  private readonly fieldLayer: Phaser.GameObjects.Graphics;
  private readonly signalLayer: Phaser.GameObjects.Graphics;
  private readonly sites: InflammationSiteRuntime[];
  private readonly vesselPaths: StyledVesselPath[];

  constructor(
    scene: Phaser.Scene,
    tacticalMap: TacticalMapDefinition,
  ) {
    this.vesselResponseLayer = scene.add
      .graphics()
      .setDepth(INFLAMMATION_VESSEL_RESPONSE_DEPTH);
    this.fieldLayer = scene.add.graphics().setDepth(INFLAMMATION_FIELD_DEPTH);
    this.signalLayer = scene.add.graphics().setDepth(INFLAMMATION_SIGNAL_DEPTH);
    this.vesselPaths = tacticalMap.vesselPaths
      .filter((vessel) => vessel.points.length >= 2)
      .map((vessel, index) => {
        const style = getProceduralVesselStyle(vessel.width, index);
        const pixelPath = createPixelVesselPath(
          vessel.points,
          vessel.id,
          VESSEL_PIXEL_SCALE,
          style.jitterAmount,
        );

        return {
          vessel,
          points: pixelPath.map((point) => ({
            x: point.x * VESSEL_PIXEL_SCALE,
            y: point.y * VESSEL_PIXEL_SCALE,
          })),
          responseWidth: style.inner.width,
        };
      });
    this.sites = tacticalMap.combatSites.map((site) => {
      const fieldRadius = getInflammationFieldRadius(
        site,
        tacticalMap.tissueZones,
      );

      return {
        site,
        fieldRadius,
        progress: 0,
        active: false,
        boundary: createInflammationBoundary(site),
        patches: createInflammationPatches(site, fieldRadius),
        pulsePixels: createInflammationPulsePixels(site),
        signals: createCytokineSignals(site, tacticalMap.vesselPaths),
      };
    });
  }

  update(state: GameState, deltaMs: number): void {
    const hostileCounts = getHostileCountsByCombatSite(state);
    const profile = getInflammationVisualProfile(state.inflammation.value);

    this.vesselResponseLayer.clear();
    this.fieldLayer.clear();
    this.signalLayer.clear();

    for (const runtime of this.sites) {
      runtime.active = (hostileCounts.get(runtime.site.id) ?? 0) > 0;
      runtime.progress = advanceInflammationFieldProgress(
        runtime.progress,
        runtime.active,
        deltaMs,
      );

      if (runtime.progress <= 0) {
        continue;
      }

      this.drawLocalVesselResponse(runtime, profile, state.elapsedMs);
      this.drawInflammationField(runtime, profile, state.elapsedMs);
      this.drawInflammationPulse(runtime, profile, state.elapsedMs);
      this.drawCytokineSignals(runtime, profile, state.elapsedMs);
    }
  }

  destroy(): void {
    this.vesselResponseLayer.destroy();
    this.fieldLayer.destroy();
    this.signalLayer.destroy();
    this.sites.length = 0;
    this.vesselPaths.length = 0;
  }

  private drawInflammationField(
    runtime: InflammationSiteRuntime,
    profile: InflammationVisualProfile,
    elapsedMs: number,
  ): void {
    const { site } = runtime;
    const breath = getInflammationBreathFrame(profile, elapsedMs);
    const expansion = (0.88 + runtime.progress * 0.12) * breath.scale;

    this.drawIrregularField(runtime, profile, breath.amount, expansion);

    for (const patch of runtime.patches) {
      const shimmer = 0.88 + Math.sin(elapsedMs * 0.0018 + patch.phase) * 0.12;
      const alpha =
        profile.fieldAlpha * runtime.progress * patch.alphaWeight * shimmer;
      const x = site.position.x + patch.x * expansion;
      const y = site.position.y + patch.y * expansion;
      const width = Math.max(2, Math.round(patch.width * expansion));
      const height = Math.max(2, Math.round(patch.height * expansion));

      this.fieldLayer.fillStyle(patch.color, alpha);
      this.fieldLayer.fillRect(
        Math.round(x - width / 2),
        Math.round(y - height / 2),
        width,
        height,
      );

      if ((width + height) % 3 === 0) {
        this.fieldLayer.fillStyle(0xffc052, alpha * 0.42);
        this.fieldLayer.fillRect(
          Math.round(x + width * 0.18),
          Math.round(y - height * 0.18),
          Math.max(1, Math.round(width * 0.32)),
          Math.max(1, Math.round(height * 0.28)),
        );
      }
    }
  }

  private drawIrregularField(
    runtime: InflammationSiteRuntime,
    profile: InflammationVisualProfile,
    breathAmount: number,
    expansion: number,
  ): void {
    const points = runtime.boundary.map((point) => {
      const localRipple = 1 + Math.sin(point.phase + breathAmount * Math.PI) * 0.018;
      const radius = runtime.fieldRadius * point.radiusRatio * expansion * localRipple;

      return {
        x: runtime.site.position.x + Math.cos(point.angle) * radius,
        y: runtime.site.position.y + Math.sin(point.angle) * radius,
      };
    });

    this.fillPolygon(points, 0xc95052, profile.fieldAlpha * runtime.progress * 0.42);

    const innerPoints = points.map((point) => ({
      x: runtime.site.position.x + (point.x - runtime.site.position.x) * 0.72,
      y: runtime.site.position.y + (point.y - runtime.site.position.y) * 0.72,
    }));
    this.fillPolygon(innerPoints, 0xe06a4f, profile.fieldAlpha * runtime.progress * 0.28);
  }

  private fillPolygon(points: MapPoint[], color: number, alpha: number): void {
    const first = points[0];

    if (!first) {
      return;
    }

    this.fieldLayer.fillStyle(color, alpha);
    this.fieldLayer.beginPath();
    this.fieldLayer.moveTo(first.x, first.y);
    for (let index = 1; index < points.length; index += 1) {
      this.fieldLayer.lineTo(points[index].x, points[index].y);
    }
    this.fieldLayer.closePath();
    this.fieldLayer.fillPath();
  }

  private drawInflammationPulse(
    runtime: InflammationSiteRuntime,
    profile: InflammationVisualProfile,
    elapsedMs: number,
  ): void {
    const pulseProgress =
      ((elapsedMs % profile.pulseDurationMs) + profile.pulseDurationMs) %
      profile.pulseDurationMs / profile.pulseDurationMs;
    const radius = runtime.fieldRadius * (0.1 + pulseProgress * 0.88);
    const fade = Math.pow(1 - pulseProgress, 1.25);

    for (let index = 0; index < runtime.pulsePixels.length; index += 1) {
      if ((index + Math.floor(pulseProgress * 7)) % 6 === 0) {
        continue;
      }

      const pixel = runtime.pulsePixels[index];
      const localRadius = radius * (1 + pixel.radialOffset);
      const startAngle = pixel.angle - pixel.span / 2;
      const endAngle = pixel.angle + pixel.span / 2;
      const alpha =
        profile.pulseAlpha *
        runtime.progress *
        fade *
        pixel.alphaWeight *
        1;

      this.drawPulseArc(
        runtime.site.position,
        localRadius,
        startAngle,
        endAngle,
        pixel.thickness,
        alpha,
      );
    }
  }

  private drawPulseArc(
    center: MapPoint,
    radius: number,
    startAngle: number,
    endAngle: number,
    thickness: number,
    alpha: number,
  ): void {
    const pointCount = 4;
    const points = Array.from({ length: pointCount }, (_, index) => {
      const ratio = index / (pointCount - 1);
      const angle = startAngle + (endAngle - startAngle) * ratio;
      const organicOffset = Math.sin(angle * 5 + radius * 0.017) * 1.5;

      return {
        x: center.x + Math.cos(angle) * (radius + organicOffset),
        y: center.y + Math.sin(angle) * (radius + organicOffset),
      };
    });

    this.strokePolyline(points, thickness * 1.85, 0x9f3548, alpha * 0.68);
    this.strokePolyline(points, thickness, 0xffb04d, alpha);
    this.strokePolyline(points, Math.max(1.5, thickness * 0.3), 0xffe09a, alpha * 0.72);
  }

  private strokePolyline(
    points: MapPoint[],
    width: number,
    color: number,
    alpha: number,
  ): void {
    this.fieldLayer.lineStyle(width, color, alpha);

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      this.fieldLayer.lineBetween(start.x, start.y, end.x, end.y);
      this.fieldLayer.fillStyle(color, alpha);
      this.fieldLayer.fillCircle(end.x, end.y, width / 2);
    }
  }

  private drawCytokineSignals(
    runtime: InflammationSiteRuntime,
    profile: InflammationVisualProfile,
    elapsedMs: number,
  ): void {
    const signalCount = Math.min(profile.signalCount, runtime.signals.length);

    for (let index = 0; index < signalCount; index += 1) {
      const signal = runtime.signals[index];
      const frame = getCytokineSignalFrame(signal, elapsedMs);
      const alpha = frame.alpha * runtime.progress * 0.98;
      const size = Math.max(1, signal.size - (frame.progress > 0.72 ? 1 : 0));

      this.signalLayer.fillStyle(signal.color, alpha);
      this.signalLayer.fillRect(
        Math.round(frame.position.x - size / 2),
        Math.round(frame.position.y - size / 2),
        size,
        size,
      );

      if (size >= 3) {
        this.signalLayer.fillStyle(0xfff0b0, alpha * 0.58);
        this.signalLayer.fillRect(
          Math.round(frame.position.x),
          Math.round(frame.position.y),
          1,
          1,
        );
      }
    }
  }

  private drawLocalVesselResponse(
    runtime: InflammationSiteRuntime,
    profile: InflammationVisualProfile,
    elapsedMs: number,
  ): void {
    const responseRadius = runtime.fieldRadius * 0.82;
    const breath = getInflammationBreathFrame(profile, elapsedMs);
    const alpha =
      profile.vesselAlpha * runtime.progress * (0.84 + breath.amount * 0.16);

    for (const path of this.vesselPaths) {
      for (let index = 0; index < path.points.length - 1; index += 1) {
        const clipped = clipLineSegmentToCircle(
          path.points[index],
          path.points[index + 1],
          runtime.site.position,
          responseRadius,
        );

        if (!clipped) {
          continue;
        }

        const width =
          path.responseWidth +
          profile.vesselWidthBoost * (0.84 + breath.amount * 0.16);
        this.drawWarmVesselSegment(clipped.start, clipped.end, width, alpha);
      }
    }
  }

  private drawWarmVesselSegment(
    start: MapPoint,
    end: MapPoint,
    width: number,
    alpha: number,
  ): void {
    this.vesselResponseLayer.lineStyle(width + 2, 0x713448, alpha * 0.28);
    this.vesselResponseLayer.beginPath();
    this.vesselResponseLayer.moveTo(start.x, start.y);
    this.vesselResponseLayer.lineTo(end.x, end.y);
    this.vesselResponseLayer.strokePath();

    this.vesselResponseLayer.lineStyle(width, 0xc9565b, alpha);
    this.vesselResponseLayer.beginPath();
    this.vesselResponseLayer.moveTo(start.x, start.y);
    this.vesselResponseLayer.lineTo(end.x, end.y);
    this.vesselResponseLayer.strokePath();
    this.vesselResponseLayer.fillStyle(0xc9565b, alpha);
    this.vesselResponseLayer.fillCircle(start.x, start.y, width / 2);
    this.vesselResponseLayer.fillCircle(end.x, end.y, width / 2);

    this.vesselResponseLayer.lineStyle(1, 0xf29a78, alpha * 0.58);
    this.vesselResponseLayer.beginPath();
    this.vesselResponseLayer.moveTo(start.x, start.y - 1);
    this.vesselResponseLayer.lineTo(end.x, end.y - 1);
    this.vesselResponseLayer.strokePath();
  }
}

export function clipLineSegmentToCircle(
  start: MapPoint,
  end: MapPoint,
  center: MapPoint,
  radius: number,
): { start: MapPoint; end: MapPoint } | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const a = dx * dx + dy * dy;

  if (a <= 0.000001 || radius <= 0) {
    return Math.hypot(fx, fy) <= radius
      ? { start: { ...start }, end: { ...end } }
      : null;
  }

  const startInside = fx * fx + fy * fy <= radius * radius;
  const endX = end.x - center.x;
  const endY = end.y - center.y;
  const endInside = endX * endX + endY * endY <= radius * radius;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return startInside && endInside
      ? { start: { ...start }, end: { ...end } }
      : null;
  }

  const root = Math.sqrt(discriminant);
  const intersections = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((value) => value >= 0 && value <= 1)
    .sort((left, right) => left - right);
  const startT = startInside ? 0 : intersections[0];
  const endT = endInside ? 1 : intersections[intersections.length - 1];

  if (startT === undefined || endT === undefined || startT > endT) {
    return null;
  }

  return {
    start: { x: start.x + dx * startT, y: start.y + dy * startT },
    end: { x: start.x + dx * endT, y: start.y + dy * endT },
  };
}
