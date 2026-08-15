import Phaser from "phaser";
import { stableHash, type Vector2 } from "../../types/shared";
import type { GameCommand } from "../../simulation/core/commands";
import type {
  CombatEffect,
  GameState,
  PathogenDebris,
} from "../../simulation/core/GameState";
import {
  isBacterium,
  isDendriticCell,
  isHostilePathogen,
  isImmuneUnit,
  type GameEntity,
} from "../../simulation/entities";
import { resolvePathogenVisualFamily } from "../rendering/pathogenVisualModel";
import {
  classifyCombatEffect,
  COMBAT_VFX_DEPTHS,
  COMBAT_VFX_LIMITS,
  COMBAT_VFX_PRESETS,
  getPathogenDamagePreset,
  getImmuneArrivalPreset,
  resolveCommandFeedback,
  VfxDensityGovernor,
  type CombatVfxPreset,
  type CombatVfxPresetId,
  type VfxLayer,
  type VfxPriority,
} from "./combatVfxModel";

type EntitySnapshot = Readonly<{
  id: string;
  kind: GameEntity["kind"];
  position: Vector2;
  health: number;
  radius: number;
  pathogenTypeId?: string;
  phagocytosedByEntityId?: string;
  carriedDebrisCount?: number;
  lymphPhase?: "following" | "away";
  lymphExitId?: string;
}>;

type BurstRecord = {
  active: boolean;
  presetId: CombatVfxPresetId;
  x: number;
  y: number;
  radius: number;
  ageMs: number;
  durationMs: number;
  seed: number;
  directionX: number;
  directionY: number;
};

type PixelParticle = {
  active: boolean;
  layer: VfxLayer;
  priority: VfxPriority;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  ageMs: number;
  durationMs: number;
  size: number;
  color: number;
  drag: number;
};

export type CombatVfxUpdateOptions = Readonly<{
  isEffectCovered?: (effect: CombatEffect) => boolean;
}>;

export type CombatVfxDebugStats = Readonly<{
  activeBursts: number;
  activeParticles: number;
  burstCapacity: number;
  particleCapacity: number;
  activePresetIds: readonly CombatVfxPresetId[];
}>;

/** Renderer-only VFX orchestrator. It observes simulation facts but never mutates them. */
export class CombatVfxController {
  private readonly groundLayer: Phaser.GameObjects.Graphics;
  private readonly combatLayer: Phaser.GameObjects.Graphics;
  private readonly commandLayer: Phaser.GameObjects.Graphics;
  private readonly densityGovernor = new VfxDensityGovernor();
  private readonly bursts: BurstRecord[] = Array.from(
    { length: COMBAT_VFX_LIMITS.maxBursts },
    createInactiveBurst,
  );
  private readonly particles: PixelParticle[] = Array.from(
    { length: COMBAT_VFX_LIMITS.maxParticles },
    createInactiveParticle,
  );
  private readonly previousEntities = new Map<string, EntitySnapshot>();
  private readonly previousDebris = new Map<string, PathogenDebris>();
  private readonly previousTrapCaptures = new Map<string, Set<string>>();
  private seenEffectIds = new Set<string>();
  private initialized = false;
  private visualClockMs = 0;
  private lastSimulationElapsedMs = 0;
  private previousAntiviralActiveMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.groundLayer = scene.add.graphics().setDepth(COMBAT_VFX_DEPTHS.ground);
    this.combatLayer = scene.add.graphics().setDepth(COMBAT_VFX_DEPTHS.combat);
    this.commandLayer = scene.add.graphics().setDepth(COMBAT_VFX_DEPTHS.command);
  }

  update(
    state: GameState,
    deltaMs: number,
    options: CombatVfxUpdateOptions = {},
  ): void {
    if (this.initialized && state.elapsedMs < this.lastSimulationElapsedMs) {
      this.reset(state);
      return;
    }
    if (!this.initialized) {
      this.captureBaseline(state);
      this.clearLayers();
      return;
    }

    const frameMs = clamp(deltaMs, 0, 100);
    this.visualClockMs += frameMs;
    this.advanceTimelines(frameMs);
    this.consumeCombatEffects(state, options);
    this.consumePathogenDamage(state);
    this.consumePhagocytosisTransitions(state);
    this.consumeNetTransitions(state);
    this.consumeDendriticTransitions(state);
    this.consumeImmuneArrivals(state);
    this.consumeInterferonActivation(state);
    this.renderTimelines();
    this.captureSnapshots(state);
  }

  acknowledgeCommand(command: GameCommand, state: GameState): void {
    if (!this.initialized) return;

    const feedback = resolveCommandFeedback(command, state);
    if (!feedback) return;

    this.spawnPreset(
      feedback.presetId,
      feedback.position,
      18,
      `command:${command.type}:${state.elapsedMs}`,
    );
  }

  reset(state?: GameState): void {
    for (const burst of this.bursts) burst.active = false;
    for (const particle of this.particles) particle.active = false;
    this.densityGovernor.reset();
    this.previousEntities.clear();
    this.previousDebris.clear();
    this.previousTrapCaptures.clear();
    this.seenEffectIds.clear();
    this.visualClockMs = 0;
    this.lastSimulationElapsedMs = 0;
    this.previousAntiviralActiveMs = 0;
    this.initialized = false;
    this.clearLayers();

    if (state) this.captureBaseline(state);
  }

  destroy(): void {
    this.reset();
    this.groundLayer.destroy();
    this.combatLayer.destroy();
    this.commandLayer.destroy();
  }

  getDebugStats(): CombatVfxDebugStats {
    return {
      activeBursts: this.bursts.filter((burst) => burst.active).length,
      activeParticles: this.particles.filter((particle) => particle.active).length,
      burstCapacity: this.bursts.length,
      particleCapacity: this.particles.length,
      activePresetIds: this.bursts
        .filter((burst) => burst.active)
        .map((burst) => burst.presetId),
    };
  }

  private consumeCombatEffects(
    state: GameState,
    options: CombatVfxUpdateOptions,
  ): void {
    for (const effect of state.effects) {
      if (
        this.seenEffectIds.has(effect.id) ||
        options.isEffectCovered?.(effect)
      ) {
        continue;
      }

      const presetId = classifyCombatEffect(state, effect);
      if (!presetId) continue;

      const source = effect.sourceEntityId
        ? state.entities[effect.sourceEntityId]
        : undefined;
      const direction = source
        ? {
            x: effect.position.x - source.position.x,
            y: effect.position.y - source.position.y,
          }
        : undefined;
      this.spawnPreset(
        presetId,
        effect.position,
        effect.radius,
        `effect:${effect.id}:${presetId}`,
        direction,
      );
    }
  }

  private consumePathogenDamage(state: GameState): void {
    for (const entity of Object.values(state.entities)) {
      if (!isHostilePathogen(entity)) continue;

      const previous = this.previousEntities.get(entity.id);
      if (!previous || entity.health >= previous.health - 0.01) continue;

      const family = resolvePathogenVisualFamily(entity.pathogenTypeId);
      const presetId = getPathogenDamagePreset(family);
      this.spawnPreset(
        presetId,
        entity.position,
        entity.radius + 3,
        `damage:${entity.id}:${state.elapsedMs}:${Math.round(entity.health)}`,
      );
    }
  }

  private consumePhagocytosisTransitions(state: GameState): void {
    for (const entity of Object.values(state.entities)) {
      if (!isBacterium(entity)) continue;

      const previous = this.previousEntities.get(entity.id);
      if (
        entity.phagocytosedByEntityId &&
        previous &&
        !previous.phagocytosedByEntityId
      ) {
        const macrophage = state.entities[entity.phagocytosedByEntityId];
        const direction = macrophage
          ? {
              x: macrophage.position.x - entity.position.x,
              y: macrophage.position.y - entity.position.y,
            }
          : undefined;
        this.spawnPreset(
          "phagocytosisContact",
          entity.position,
          entity.radius + 10,
          `phagocytosis:start:${entity.id}:${state.elapsedMs}`,
          direction,
        );
      }
    }

    for (const previous of this.previousEntities.values()) {
      if (
        previous.kind !== "bacterium" ||
        !previous.phagocytosedByEntityId ||
        state.entities[previous.id]
      ) {
        continue;
      }

      const macrophage = state.entities[previous.phagocytosedByEntityId];
      if (!macrophage) continue;

      this.spawnPreset(
        "phagocytosisDigest",
        macrophage.position,
        macrophage.radius + 7,
        `phagocytosis:digest:${previous.id}:${state.elapsedMs}`,
      );
    }
  }

  private consumeNetTransitions(state: GameState): void {
    for (const trap of state.netTraps) {
      const previousCaptures = this.previousTrapCaptures.get(trap.id);
      if (!previousCaptures) {
        this.spawnPreset(
          "netDeploy",
          trap.position,
          28,
          `net:deploy:${trap.id}`,
        );
      }

      for (const entityId of trap.capturedEntityIds) {
        if (previousCaptures?.has(entityId)) continue;

        const target = state.entities[entityId];
        if (!target) continue;
        this.spawnPreset(
          "netContact",
          target.position,
          target.radius + 5,
          `net:contact:${trap.id}:${entityId}`,
          {
            x: trap.position.x - target.position.x,
            y: trap.position.y - target.position.y,
          },
        );
      }
    }
  }

  private consumeDendriticTransitions(state: GameState): void {
    const removedDebris = [...this.previousDebris.values()].filter(
      (debris) => !state.debris.some((current) => current.id === debris.id),
    );

    for (const entity of Object.values(state.entities)) {
      if (!isDendriticCell(entity)) continue;

      const previous = this.previousEntities.get(entity.id);
      if (!previous) continue;

      const previousCount = previous.carriedDebrisCount ?? 0;
      if (entity.carriedDebrisCount > previousCount) {
        const sourceDebris = nearestDebris(removedDebris, previous.position);
        const sourcePosition = sourceDebris?.position ?? previous.position;
        this.spawnPreset(
          "dendriticAbsorb",
          entity.position,
          entity.radius + 8,
          `dendritic:collect:${entity.id}:${entity.carriedDebrisCount}`,
          {
            x: entity.position.x - sourcePosition.x,
            y: entity.position.y - sourcePosition.y,
          },
        );
      }

      if (previous.lymphPhase === "following" && entity.lymphTransit?.phase === "away") {
        const exit = state.tacticalMap.lymphaticExits.find(
          (candidate) => candidate.id === entity.lymphTransit?.exitId,
        );
        this.spawnPreset(
          "lymphExit",
          exit?.position ?? previous.position,
          (exit?.radius ?? entity.radius) + 12,
          `lymph:exit:${entity.id}:${state.elapsedMs}`,
        );
      }

      if (previous.lymphPhase === "away" && !entity.lymphTransit) {
        this.spawnPreset(
          "lymphReturn",
          entity.position,
          entity.radius + 14,
          `lymph:return:${entity.id}:${state.elapsedMs}`,
        );
      }
    }
  }

  private consumeImmuneArrivals(state: GameState): void {
    for (const entity of Object.values(state.entities)) {
      if (!isImmuneUnit(entity) || this.previousEntities.has(entity.id)) continue;

      this.spawnPreset(
        getImmuneArrivalPreset(entity),
        entity.position,
        entity.radius + 15,
        `arrival:${entity.id}:${state.elapsedMs}`,
      );
    }
  }

  private consumeInterferonActivation(state: GameState): void {
    if (
      state.antiviral.activeMs > 0 &&
      this.previousAntiviralActiveMs <= 0 &&
      state.antiviral.position
    ) {
      this.spawnPreset(
        "interferonActivation",
        state.antiviral.position,
        Math.min(72, Math.max(30, state.antiviral.radius * 0.24)),
        `interferon:${state.elapsedMs}`,
      );
    }
  }

  private spawnPreset(
    presetId: CombatVfxPresetId,
    position: Vector2,
    radius: number,
    seedKey: string,
    direction?: Vector2,
  ): boolean {
    const preset = COMBAT_VFX_PRESETS[presetId];
    if (
      !this.isVisible(position) ||
      !this.densityGovernor.allows(preset, position, this.visualClockMs)
    ) {
      return false;
    }

    const burst = this.acquireBurst(preset.priority);
    if (!burst) return false;

    const normalizedDirection = normalizeDirection(direction, stableHash(seedKey));
    burst.active = true;
    burst.presetId = presetId;
    burst.x = position.x;
    burst.y = position.y;
    burst.radius = Math.max(4, radius);
    burst.ageMs = 0;
    burst.durationMs = preset.durationMs;
    burst.seed = stableHash(seedKey);
    burst.directionX = normalizedDirection.x;
    burst.directionY = normalizedDirection.y;
    this.spawnParticles(burst, preset);
    return true;
  }

  private acquireBurst(priority: VfxPriority): BurstRecord | null {
    const available = this.bursts.find((burst) => !burst.active);
    if (available) return available;

    const candidates = this.bursts.filter(
      (burst) => COMBAT_VFX_PRESETS[burst.presetId].priority >= priority,
    );
    const victim = candidates.sort((left, right) => {
      const priorityDifference =
        COMBAT_VFX_PRESETS[right.presetId].priority -
        COMBAT_VFX_PRESETS[left.presetId].priority;
      if (priorityDifference !== 0) return priorityDifference;
      return right.ageMs / right.durationMs - left.ageMs / left.durationMs;
    })[0];
    if (!victim) return null;

    victim.active = false;
    return victim;
  }

  private spawnParticles(burst: BurstRecord, preset: CombatVfxPreset): void {
    for (let index = 0; index < preset.particleCount; index += 1) {
      const particle = this.acquireParticle(preset.priority);
      if (!particle) return;

      const angleNoise = deterministicUnit(burst.seed, index, 11);
      const angle = angleNoise * Math.PI * 2;
      const distanceNoise = deterministicUnit(burst.seed, index, 17);
      const speedNoise = 0.72 + deterministicUnit(burst.seed, index, 23) * 0.48;
      const spread = (deterministicUnit(burst.seed, index, 29) - 0.5) * 0.9;
      const directionAngle = Math.atan2(burst.directionY, burst.directionX) + spread;
      let spawnDistance = 1 + distanceNoise * 4;
      let velocityAngle = angle;
      let velocityScale = 1;

      if (preset.motion === "inward") {
        spawnDistance = burst.radius * (0.55 + distanceNoise * 0.45);
        velocityAngle = angle + Math.PI;
      } else if (preset.motion === "signal") {
        velocityAngle = directionAngle;
        velocityScale = 0.86 + index * 0.08;
      } else if (preset.motion === "filament") {
        spawnDistance = burst.radius * (0.25 + distanceNoise * 0.38);
        velocityAngle = angle + (index % 2 === 0 ? 0.35 : -0.35);
        velocityScale = 0.55;
      } else if (preset.motion === "rise") {
        velocityAngle = -Math.PI / 2 + spread * 0.7;
        spawnDistance = burst.radius * 0.25 * distanceNoise;
        velocityScale = 0.72;
      } else if (preset.motion === "wave") {
        velocityScale = 0.62;
      }

      particle.active = true;
      particle.layer = preset.layer;
      particle.priority = preset.priority;
      particle.x = burst.x + Math.cos(angle) * spawnDistance;
      particle.y = burst.y + Math.sin(angle) * spawnDistance;
      particle.velocityX =
        Math.cos(velocityAngle) * preset.speed * speedNoise * velocityScale;
      particle.velocityY =
        Math.sin(velocityAngle) * preset.speed * speedNoise * velocityScale;
      particle.ageMs = 0;
      particle.durationMs = preset.durationMs * (0.68 + distanceNoise * 0.24);
      particle.size = Math.round(
        preset.particleSize[0] +
          deterministicUnit(burst.seed, index, 31) *
            (preset.particleSize[1] - preset.particleSize[0]),
      );
      particle.color = index % 2 === 0
        ? preset.primaryColor
        : preset.secondaryColor;
      particle.drag = preset.motion === "inward" ? 0.9 : 0.86;
    }
  }

  private acquireParticle(priority: VfxPriority): PixelParticle | null {
    const available = this.particles.find((particle) => !particle.active);
    if (available) return available;

    const victim = this.particles
      .filter((particle) => particle.priority >= priority)
      .sort((left, right) => {
        const priorityDifference = right.priority - left.priority;
        if (priorityDifference !== 0) return priorityDifference;
        return (
          right.ageMs / right.durationMs - left.ageMs / left.durationMs
        );
      })[0];
    if (!victim) return null;

    victim.active = false;
    return victim;
  }

  private advanceTimelines(deltaMs: number): void {
    for (const burst of this.bursts) {
      if (!burst.active) continue;
      burst.ageMs += deltaMs;
      if (burst.ageMs >= burst.durationMs) burst.active = false;
    }

    const seconds = deltaMs / 1000;
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.ageMs += deltaMs;
      if (particle.ageMs >= particle.durationMs) {
        particle.active = false;
        continue;
      }
      particle.x += particle.velocityX * seconds;
      particle.y += particle.velocityY * seconds;
      const drag = Math.pow(particle.drag, deltaMs / 16.6667);
      particle.velocityX *= drag;
      particle.velocityY *= drag;
    }
  }

  private renderTimelines(): void {
    this.clearLayers();

    for (const burst of this.bursts) {
      if (!burst.active) continue;
      this.drawBurst(burst, COMBAT_VFX_PRESETS[burst.presetId]);
    }
    for (const particle of this.particles) {
      if (!particle.active) continue;
      this.drawParticle(particle);
    }
  }

  private drawBurst(burst: BurstRecord, preset: CombatVfxPreset): void {
    const graphics = this.getLayer(preset.layer);
    const progress = clamp(burst.ageMs / burst.durationMs, 0, 1);
    const alpha = progress < 0.18
      ? 0.68 + (progress / 0.18) * 0.32
      : Math.pow((1 - progress) / 0.82, 1.25);

    if (preset.motion === "command") {
      drawCommandBrackets(graphics, burst, preset, progress, alpha);
      return;
    }
    if (preset.motion === "filament") {
      drawFilaments(graphics, burst, preset, progress, alpha);
      return;
    }
    if (preset.motion === "signal") {
      drawDirectionalContact(graphics, burst, preset, progress, alpha);
      return;
    }
    if (preset.motion === "rise") {
      drawRisingMembrane(graphics, burst, preset, progress, alpha);
      return;
    }

    const inverse = 1 - progress;
    const ringRadius = preset.motion === "inward"
      ? burst.radius * (0.35 + inverse * 0.65)
      : burst.radius * (0.3 + progress * 0.75);
    drawBrokenPixelRing(
      graphics,
      pixel(burst.x),
      pixel(burst.y),
      ringRadius,
      preset.primaryColor,
      preset.secondaryColor,
      alpha,
      burst.seed,
      preset.priority === 1 ? 3 : 2,
    );

    if (progress < 0.42) {
      const size = preset.priority === 1 ? 4 : 3;
      graphics.fillStyle(preset.primaryColor, alpha * (1 - progress / 0.42));
      graphics.fillRect(pixel(burst.x - size / 2), pixel(burst.y - size / 2), size, size);
    }
  }

  private drawParticle(particle: PixelParticle): void {
    const graphics = this.getLayer(particle.layer);
    const progress = clamp(particle.ageMs / particle.durationMs, 0, 1);
    const alpha = Math.pow(1 - progress, 1.4);
    const size = Math.max(1, particle.size - (progress > 0.72 ? 1 : 0));
    const x = pixel(particle.x);
    const y = pixel(particle.y);

    if (particle.priority === 1 && size >= 2 && progress < 0.62) {
      graphics.fillStyle(particle.color, alpha * 0.25);
      graphics.fillRect(
        pixel(x - particle.velocityX * 0.025),
        pixel(y - particle.velocityY * 0.025),
        1,
        1,
      );
    }
    graphics.fillStyle(particle.color, alpha);
    graphics.fillRect(x, y, size, size);
  }

  private getLayer(layer: VfxLayer): Phaser.GameObjects.Graphics {
    if (layer === "ground") return this.groundLayer;
    if (layer === "command") return this.commandLayer;
    return this.combatLayer;
  }

  private isVisible(position: Vector2): boolean {
    const worldView = this.scene.cameras?.main?.worldView;
    if (!worldView) return true;

    const margin = COMBAT_VFX_LIMITS.visibilityMargin;
    return (
      position.x >= worldView.x - margin &&
      position.x <= worldView.right + margin &&
      position.y >= worldView.y - margin &&
      position.y <= worldView.bottom + margin
    );
  }

  private captureBaseline(state: GameState): void {
    this.initialized = true;
    this.captureSnapshots(state);
  }

  private captureSnapshots(state: GameState): void {
    this.previousEntities.clear();
    for (const entity of Object.values(state.entities)) {
      this.previousEntities.set(entity.id, snapshotEntity(entity));
    }

    this.previousDebris.clear();
    for (const debris of state.debris) {
      this.previousDebris.set(debris.id, {
        ...debris,
        position: { ...debris.position },
      });
    }

    this.previousTrapCaptures.clear();
    for (const trap of state.netTraps) {
      this.previousTrapCaptures.set(trap.id, new Set(trap.capturedEntityIds));
    }

    this.seenEffectIds = new Set(state.effects.map((effect) => effect.id));
    this.previousAntiviralActiveMs = state.antiviral.activeMs;
    this.lastSimulationElapsedMs = state.elapsedMs;
  }

  private clearLayers(): void {
    this.groundLayer.clear();
    this.combatLayer.clear();
    this.commandLayer.clear();
  }
}

function snapshotEntity(entity: GameEntity): EntitySnapshot {
  const base = {
    id: entity.id,
    kind: entity.kind,
    position: { ...entity.position },
    health: entity.health,
    radius: entity.radius,
  };

  if (isHostilePathogen(entity)) {
    return {
      ...base,
      pathogenTypeId: entity.pathogenTypeId,
      phagocytosedByEntityId: isBacterium(entity)
        ? entity.phagocytosedByEntityId
        : undefined,
    };
  }
  if (isDendriticCell(entity)) {
    return {
      ...base,
      carriedDebrisCount: entity.carriedDebrisCount,
      lymphPhase: entity.lymphTransit?.phase,
      lymphExitId: entity.lymphTransit?.exitId,
    };
  }
  return base;
}

function createInactiveBurst(): BurstRecord {
  return {
    active: false,
    presetId: "physicalContact",
    x: 0,
    y: 0,
    radius: 0,
    ageMs: 0,
    durationMs: 1,
    seed: 0,
    directionX: 1,
    directionY: 0,
  };
}

function createInactiveParticle(): PixelParticle {
  return {
    active: false,
    layer: "combat",
    priority: 3,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    ageMs: 0,
    durationMs: 1,
    size: 1,
    color: 0xffffff,
    drag: 0.86,
  };
}

function normalizeDirection(direction: Vector2 | undefined, seed: number): Vector2 {
  const fallbackAngle = ((seed % 360) * Math.PI) / 180;
  if (!direction) {
    return { x: Math.cos(fallbackAngle), y: Math.sin(fallbackAngle) };
  }

  const length = Math.hypot(direction.x, direction.y);
  if (length <= 0.001) {
    return { x: Math.cos(fallbackAngle), y: Math.sin(fallbackAngle) };
  }
  return { x: direction.x / length, y: direction.y / length };
}

function deterministicUnit(seed: number, index: number, salt: number): number {
  let value = (seed + Math.imul(index + 1, 0x9e3779b1) + salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 0xffffffff;
}

function nearestDebris(
  debris: readonly PathogenDebris[],
  position: Vector2,
): PathogenDebris | undefined {
  return [...debris].sort(
    (left, right) =>
      squaredDistance(left.position, position) -
      squaredDistance(right.position, position),
  )[0];
}

function squaredDistance(left: Vector2, right: Vector2): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function drawBrokenPixelRing(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  primaryColor: number,
  secondaryColor: number,
  alpha: number,
  seed: number,
  width: number,
): void {
  const segmentCount = 10;
  for (let index = 0; index < segmentCount; index += 1) {
    if ((index + seed) % 4 === 0) continue;

    const startAngle = (index / segmentCount) * Math.PI * 2 + 0.08;
    const endAngle = ((index + 0.66) / segmentCount) * Math.PI * 2;
    const wobble = (deterministicUnit(seed, index, 43) - 0.5) * 3;
    const localRadius = radius + wobble;
    graphics.lineStyle(
      width,
      index % 3 === 0 ? secondaryColor : primaryColor,
      alpha * (index % 3 === 0 ? 0.72 : 1),
    );
    graphics.lineBetween(
      pixel(x + Math.cos(startAngle) * localRadius),
      pixel(y + Math.sin(startAngle) * localRadius),
      pixel(x + Math.cos(endAngle) * localRadius),
      pixel(y + Math.sin(endAngle) * localRadius),
    );
  }
}

function drawFilaments(
  graphics: Phaser.GameObjects.Graphics,
  burst: BurstRecord,
  preset: CombatVfxPreset,
  progress: number,
  alpha: number,
): void {
  const reach = burst.radius * (0.35 + progress * 0.72);
  const branchCount = preset.priority === 1 ? 6 : 4;
  for (let index = 0; index < branchCount; index += 1) {
    const angle =
      (index / branchCount) * Math.PI * 2 +
      (deterministicUnit(burst.seed, index, 53) - 0.5) * 0.55;
    const bend = angle +
      (deterministicUnit(burst.seed, index, 59) - 0.5) * 0.85;
    const middleX = pixel(burst.x + Math.cos(angle) * reach * 0.48);
    const middleY = pixel(burst.y + Math.sin(angle) * reach * 0.48);
    const endX = pixel(middleX + Math.cos(bend) * reach * 0.5);
    const endY = pixel(middleY + Math.sin(bend) * reach * 0.5);
    graphics.lineStyle(
      index % 2 === 0 ? 2 : 1,
      index % 2 === 0 ? preset.primaryColor : preset.secondaryColor,
      alpha * (0.72 + (index % 2) * 0.18),
    );
    graphics.lineBetween(pixel(burst.x), pixel(burst.y), middleX, middleY);
    graphics.lineBetween(middleX, middleY, endX, endY);
  }
}

function drawDirectionalContact(
  graphics: Phaser.GameObjects.Graphics,
  burst: BurstRecord,
  preset: CombatVfxPreset,
  progress: number,
  alpha: number,
): void {
  const perpendicularX = -burst.directionY;
  const perpendicularY = burst.directionX;
  const reach = burst.radius * (0.5 + progress * 0.45);
  const startX = burst.x - burst.directionX * reach * 0.62;
  const startY = burst.y - burst.directionY * reach * 0.62;
  const endX = burst.x + burst.directionX * reach * 0.38;
  const endY = burst.y + burst.directionY * reach * 0.38;

  graphics.lineStyle(preset.priority === 1 ? 3 : 2, preset.primaryColor, alpha);
  graphics.lineBetween(pixel(startX), pixel(startY), pixel(endX), pixel(endY));
  graphics.lineStyle(1, preset.secondaryColor, alpha * 0.78);
  for (const offset of [-4, 4]) {
    graphics.lineBetween(
      pixel(startX + perpendicularX * offset),
      pixel(startY + perpendicularY * offset),
      pixel(burst.x + perpendicularX * offset * 0.35),
      pixel(burst.y + perpendicularY * offset * 0.35),
    );
  }
  graphics.fillStyle(preset.primaryColor, alpha);
  graphics.fillRect(pixel(burst.x - 2), pixel(burst.y - 2), 4, 4);
}

function drawRisingMembrane(
  graphics: Phaser.GameObjects.Graphics,
  burst: BurstRecord,
  preset: CombatVfxPreset,
  progress: number,
  alpha: number,
): void {
  const halfWidth = burst.radius * (0.35 + progress * 0.35);
  const yOffset = (progress - 0.5) * 8;
  graphics.lineStyle(3, preset.secondaryColor, alpha * 0.56);
  graphics.lineBetween(
    pixel(burst.x - halfWidth),
    pixel(burst.y + yOffset + 3),
    pixel(burst.x + halfWidth),
    pixel(burst.y + yOffset + 3),
  );
  graphics.lineStyle(2, preset.primaryColor, alpha);
  const gaps = 4;
  for (let index = 0; index < gaps; index += 1) {
    const left = burst.x - halfWidth + (index / gaps) * halfWidth * 2;
    const right = burst.x - halfWidth + ((index + 0.66) / gaps) * halfWidth * 2;
    graphics.lineBetween(
      pixel(left),
      pixel(burst.y + yOffset),
      pixel(right),
      pixel(burst.y + yOffset),
    );
  }
}

function drawCommandBrackets(
  graphics: Phaser.GameObjects.Graphics,
  burst: BurstRecord,
  preset: CombatVfxPreset,
  progress: number,
  alpha: number,
): void {
  const radius = burst.radius * (1.2 - progress * 0.42);
  const corner = Math.max(4, Math.round(radius * 0.32));
  const x = pixel(burst.x);
  const y = pixel(burst.y);
  graphics.lineStyle(2, preset.primaryColor, alpha);

  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      const cornerX = pixel(x + xSign * radius);
      const cornerY = pixel(y + ySign * radius);
      graphics.lineBetween(cornerX, cornerY, pixel(cornerX - xSign * corner), cornerY);
      graphics.lineBetween(cornerX, cornerY, cornerX, pixel(cornerY - ySign * corner));
    }
  }
  graphics.fillStyle(preset.secondaryColor, alpha * 0.65);
  graphics.fillRect(x - 1, y - 1, 3, 3);
}

function pixel(value: number): number {
  return Math.round(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
