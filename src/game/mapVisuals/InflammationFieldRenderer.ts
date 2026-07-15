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
  createInflammationPatches,
  createInflammationPulsePixels,
  getCytokineSignalFrame,
  getInflammationVisualProfile,
  type CytokineSignal,
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
  progress: number;
  active: boolean;
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
    this.sites = tacticalMap.combatSites.map((site) => ({
      site,
      progress: 0,
      active: false,
      patches: createInflammationPatches(site),
      pulsePixels: createInflammationPulsePixels(site),
      signals: createCytokineSignals(site, tacticalMap.vesselPaths),
    }));
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

      this.drawLocalVesselResponse(runtime, profile);
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
    const expansion = 0.88 + runtime.progress * 0.12;

    for (const patch of runtime.patches) {
      const shimmer = 0.9 + Math.sin(elapsedMs * 0.0018 + patch.phase) * 0.1;
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

  private drawInflammationPulse(
    runtime: InflammationSiteRuntime,
    profile: InflammationVisualProfile,
    elapsedMs: number,
  ): void {
    const pulseProgress =
      ((elapsedMs % profile.pulseDurationMs) + profile.pulseDurationMs) %
      profile.pulseDurationMs / profile.pulseDurationMs;
    const radius = runtime.site.radius * (0.16 + pulseProgress * 0.82);
    const fade = Math.pow(1 - pulseProgress, 1.45);

    for (let index = 0; index < runtime.pulsePixels.length; index += 1) {
      if ((index + Math.floor(pulseProgress * 8)) % 5 === 0) {
        continue;
      }

      const pixel = runtime.pulsePixels[index];
      const wobble = 1 + Math.sin(elapsedMs * 0.002 + pixel.angle * 3) * 0.025;
      const x = runtime.site.position.x + Math.cos(pixel.angle) * radius * wobble;
      const y = runtime.site.position.y + Math.sin(pixel.angle) * radius * wobble;
      const alpha =
        profile.fieldAlpha *
        runtime.progress *
        fade *
        pixel.alphaWeight *
        0.82;

      this.fieldLayer.fillStyle(0xffb43f, alpha);
      this.fieldLayer.fillRect(
        Math.round(x - pixel.size / 2),
        Math.round(y - pixel.size / 2),
        pixel.size,
        pixel.size,
      );
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
      const alpha = frame.alpha * runtime.progress * 0.94;
      const size = Math.max(1, signal.size - (frame.progress > 0.72 ? 1 : 0));

      this.signalLayer.fillStyle(signal.color, alpha);
      this.signalLayer.fillRect(
        Math.round(frame.position.x - size / 2),
        Math.round(frame.position.y - size / 2),
        size,
        size,
      );

      if (size >= 3) {
        this.signalLayer.fillStyle(0xffe08a, alpha * 0.48);
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
  ): void {
    const responseRadius = runtime.site.radius * 1.28;
    const alpha = profile.vesselAlpha * runtime.progress;

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

        const width = path.responseWidth + profile.vesselWidthBoost;
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
    this.vesselResponseLayer.lineStyle(width, 0xd95a49, alpha);
    this.vesselResponseLayer.beginPath();
    this.vesselResponseLayer.moveTo(start.x, start.y);
    this.vesselResponseLayer.lineTo(end.x, end.y);
    this.vesselResponseLayer.strokePath();
    this.vesselResponseLayer.fillStyle(0xd95a49, alpha);
    this.vesselResponseLayer.fillCircle(start.x, start.y, width / 2);
    this.vesselResponseLayer.fillCircle(end.x, end.y, width / 2);

    this.vesselResponseLayer.lineStyle(1, 0xffa464, alpha * 0.72);
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
