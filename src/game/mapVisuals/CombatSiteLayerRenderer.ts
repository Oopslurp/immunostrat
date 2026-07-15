import Phaser from "phaser";
import type {
  CombatSiteDefinition,
  TacticalMapDefinition,
} from "../data/tacticalMaps";
import type { GameState } from "../simulation/core/GameState";
import {
  COMBAT_CORE_ANIMATION_KEYS,
  getCombatCoreFirstFrameKey,
  type CombatCoreAnimationState,
} from "./combatSiteCoreAssets";
import {
  createCorruptionPattern,
  createLostTissuePattern,
  getHostileCountsByCombatSite,
  getUpcomingCombatSiteActivation,
  isCombatSiteLocallyLost,
  type CombatSiteVisualPhase,
  type CorruptionSpot,
  type LostTissuePixel,
} from "./combatSiteVisualState";

export const COMBAT_CORRUPTION_DEPTH = -66;
export const COMBAT_ZONE_DEPTH = -62;
export const COMBAT_CORE_DEPTH = -58;

const CORRUPTION_DELAY_MS = 1_000;
const CORRUPTION_TRANSITION_MS = 1_000;
const DESTROYED_HOLD_MS = 1_250;
const HOSTILE_CLEAR_GRACE_MS = 220;

type CombatSiteRuntime = {
  site: CombatSiteDefinition;
  sprite?: Phaser.GameObjects.Sprite;
  phase: CombatSiteVisualPhase;
  phaseElapsedMs: number;
  hostileCount: number;
  peakHostileCount: number;
  activeElapsedMs: number;
  clearElapsedMs: number;
  corruptionProgress: number;
  corruptionPattern: CorruptionSpot[];
  lostPattern: LostTissuePixel[];
};

export class CombatSiteLayerRenderer {
  private readonly corruptionLayer: Phaser.GameObjects.Graphics;
  private readonly zoneLayer: Phaser.GameObjects.Graphics;
  private readonly sites = new Map<string, CombatSiteRuntime>();

  constructor(
    private readonly scene: Phaser.Scene,
    tacticalMap: TacticalMapDefinition,
  ) {
    this.corruptionLayer = scene.add.graphics().setDepth(COMBAT_CORRUPTION_DEPTH);
    this.zoneLayer = scene.add.graphics().setDepth(COMBAT_ZONE_DEPTH);
    const hasCoreTextures = scene.textures.exists(
      getCombatCoreFirstFrameKey("dormant"),
    );

    for (const site of tacticalMap.combatSites) {
      const sprite = hasCoreTextures
        ? scene.add
            .sprite(
              site.position.x,
              site.position.y,
              getCombatCoreFirstFrameKey("dormant"),
            )
            .setOrigin(0.5)
            .setDepth(COMBAT_CORE_DEPTH)
            .setAlpha(0.58)
        : undefined;

      if (sprite) {
        sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        sprite.play(COMBAT_CORE_ANIMATION_KEYS.dormant);
      }

      this.sites.set(site.id, {
        site,
        sprite,
        phase: "dormant",
        phaseElapsedMs: 0,
        hostileCount: 0,
        peakHostileCount: 0,
        activeElapsedMs: 0,
        clearElapsedMs: 0,
        corruptionProgress: 0,
        corruptionPattern: createCorruptionPattern(site),
        lostPattern: createLostTissuePattern(site),
      });
    }
  }

  update(state: GameState, deltaMs: number): void {
    const hostileCounts = getHostileCountsByCombatSite(state);
    const upcoming = getUpcomingCombatSiteActivation(state);

    for (const runtime of this.sites.values()) {
      this.updateSiteRuntime(
        runtime,
        hostileCounts.get(runtime.site.id) ?? 0,
        upcoming?.siteId === runtime.site.id,
        isCombatSiteLocallyLost(state, runtime.site),
        deltaMs,
      );
    }

    this.drawCorruption(state.elapsedMs);
    this.drawBattleZones(state.elapsedMs);
  }

  destroy(): void {
    this.corruptionLayer.destroy();
    this.zoneLayer.destroy();

    for (const runtime of this.sites.values()) {
      runtime.sprite?.destroy();
    }

    this.sites.clear();
  }

  private updateSiteRuntime(
    runtime: CombatSiteRuntime,
    hostileCount: number,
    activationIncoming: boolean,
    locallyLost: boolean,
    deltaMs: number,
  ): void {
    runtime.phaseElapsedMs += deltaMs;
    const hadHostiles = runtime.hostileCount > 0;
    runtime.hostileCount = hostileCount;

    if (hostileCount > 0) {
      runtime.clearElapsedMs = 0;
      runtime.activeElapsedMs = hadHostiles
        ? runtime.activeElapsedMs + deltaMs
        : 0;
      runtime.peakHostileCount = Math.max(
        runtime.peakHostileCount,
        hostileCount,
      );
    } else {
      runtime.clearElapsedMs += deltaMs;
      runtime.activeElapsedMs = 0;
    }

    const corruptionTarget =
      !locallyLost &&
      hostileCount > 0 &&
      runtime.activeElapsedMs >= CORRUPTION_DELAY_MS
        ? 1
        : 0;
    const corruptionStep = deltaMs / CORRUPTION_TRANSITION_MS;
    const corruptionDifference = corruptionTarget - runtime.corruptionProgress;
    runtime.corruptionProgress = Phaser.Math.Clamp(
      runtime.corruptionProgress +
        Math.sign(corruptionDifference) *
          Math.min(corruptionStep, Math.abs(corruptionDifference)),
      0,
      1,
    );

    const nextPhase = this.getNextPhase(
      runtime,
      hostileCount,
      activationIncoming,
      locallyLost,
    );

    if (nextPhase !== runtime.phase) {
      this.setPhase(runtime, nextPhase);
    }
  }

  private getNextPhase(
    runtime: CombatSiteRuntime,
    hostileCount: number,
    activationIncoming: boolean,
    locallyLost: boolean,
  ): CombatSiteVisualPhase {
    if (locallyLost) {
      return "lost";
    }

    if (hostileCount > 0) {
      if (
        runtime.phase === "dormant" ||
        runtime.phase === "destroyed" ||
        runtime.phase === "lost"
      ) {
        return "activation";
      }

      if (runtime.phase === "activation" && runtime.phaseElapsedMs < 780) {
        return "activation";
      }

      return hostileCount <= 1 && runtime.peakHostileCount >= 3
        ? "destabilizing"
        : "active";
    }

    if (
      runtime.clearElapsedMs >= HOSTILE_CLEAR_GRACE_MS &&
      (runtime.phase === "active" || runtime.phase === "destabilizing")
    ) {
      return "destroyed";
    }

    if (runtime.phase === "destroyed") {
      return runtime.phaseElapsedMs >= DESTROYED_HOLD_MS
        ? activationIncoming
          ? "activation"
          : "dormant"
        : "destroyed";
    }

    if (activationIncoming) {
      return "activation";
    }

    if (runtime.phase === "activation" && runtime.phaseElapsedMs < 780) {
      return "activation";
    }

    return "dormant";
  }

  private setPhase(
    runtime: CombatSiteRuntime,
    phase: CombatSiteVisualPhase,
  ): void {
    runtime.phase = phase;
    runtime.phaseElapsedMs = 0;

    if (phase === "dormant") {
      runtime.peakHostileCount = 0;
    }

    const sprite = runtime.sprite;

    if (!sprite) {
      return;
    }

    sprite.clearTint();
    sprite.setAlpha(phase === "dormant" ? 0.58 : 0.94);

    if (phase === "lost") {
      sprite.stop();
      sprite.setTexture(getCombatCoreFirstFrameKey("destroyed"));
      sprite.setTint(0x747d86).setAlpha(0.46);
      return;
    }

    const animationState = phase as CombatCoreAnimationState;
    sprite.play(COMBAT_CORE_ANIMATION_KEYS[animationState]);
  }

  private drawCorruption(elapsedMs: number): void {
    this.corruptionLayer.clear();

    for (const runtime of this.sites.values()) {
      if (runtime.phase === "lost") {
        this.drawLostTissue(runtime);
        continue;
      }

      const progress = Phaser.Math.Easing.Cubic.Out(runtime.corruptionProgress);

      if (progress <= 0.001) {
        continue;
      }

      const { site } = runtime;
      this.corruptionLayer.fillStyle(0x9c3040, 0.028 * progress);
      this.corruptionLayer.fillCircle(
        site.position.x,
        site.position.y,
        site.radius * (0.24 + progress * 0.78),
      );

      for (const spot of runtime.corruptionPattern) {
        const reveal = Phaser.Math.Clamp(
          (progress - spot.radialProgress + 0.16) / 0.16,
          0,
          1,
        );

        if (reveal <= 0) {
          continue;
        }

        const pulse = 0.92 + Math.sin(elapsedMs * 0.0022 + spot.pulseOffset) * 0.08;
        const size = Math.max(2, Math.round(spot.size * (0.72 + progress * 0.28)));
        this.corruptionLayer.fillStyle(
          spot.color,
          spot.alpha * reveal * progress * pulse,
        );
        this.corruptionLayer.fillRect(
          site.position.x + spot.x - Math.floor(size / 2),
          site.position.y + spot.y - Math.floor(size / 2),
          size,
          size,
        );
      }

      this.corruptionLayer.fillStyle(0xff6a3d, 0.065 * progress);
      this.corruptionLayer.fillCircle(
        site.position.x,
        site.position.y,
        22 + progress * 16,
      );
    }
  }

  private drawLostTissue(runtime: CombatSiteRuntime): void {
    const { site } = runtime;
    this.corruptionLayer.fillStyle(0x48505a, 0.105);
    this.corruptionLayer.fillCircle(site.position.x, site.position.y, site.radius);

    for (const pixel of runtime.lostPattern) {
      this.corruptionLayer.fillStyle(0x9aa0a6, pixel.alpha);
      this.corruptionLayer.fillRect(
        site.position.x + pixel.x,
        site.position.y + pixel.y,
        pixel.size,
        pixel.size,
      );
    }
  }

  private drawBattleZones(elapsedMs: number): void {
    this.zoneLayer.clear();

    for (const runtime of this.sites.values()) {
      const { site } = runtime;
      const active =
        runtime.phase === "active" ||
        runtime.phase === "activation" ||
        runtime.phase === "destabilizing";
      const pulse = active ? 0.04 + Math.sin(elapsedMs * 0.003) * 0.025 : 0;
      const ringColor =
        site.initialStatus === "critical" ? 0xff5966 : 0xffa43b;

      this.zoneLayer.fillStyle(0xff7f33, 0.055 + pulse * 0.35);
      this.zoneLayer.fillCircle(site.position.x, site.position.y, site.radius);
      this.zoneLayer.lineStyle(3, ringColor, 0.68 + pulse);
      this.zoneLayer.strokeCircle(site.position.x, site.position.y, site.radius);

      if (!runtime.sprite) {
        this.zoneLayer.fillStyle(
          runtime.phase === "lost" ? 0x6d7379 : 0x9b243d,
          runtime.phase === "dormant" ? 0.48 : 0.76,
        );
        this.zoneLayer.fillCircle(site.position.x, site.position.y, 17);
        this.zoneLayer.lineStyle(2, 0xffd277, 0.72);
        this.zoneLayer.strokeCircle(site.position.x, site.position.y, 23);
      }
    }
  }
}
