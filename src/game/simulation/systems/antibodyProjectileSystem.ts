import { balanceValues } from "../../data/balance";
import { distance } from "../../types/shared";
import type { Vector2 } from "../../types/shared";
import type {
  AntibodyProjectile,
  GameState,
} from "../core/GameState";
import {
  isHostilePathogen,
  type GameEntity,
  type PlasmocyteEntity,
} from "../entities";
import { applyPathogenDamage } from "./damageSystem";

type HostilePathogen = Extract<
  GameEntity,
  { kind: "bacterium" | "virus" | "advancedThreat" }
>;

export function launchAntibodySalvo(
  state: GameState,
  source: PlasmocyteEntity,
  target: HostilePathogen,
  totalDamage: number,
): void {
  const config = balanceValues.adaptive;
  const projectileCount = config.antibodyProjectileCount;
  const damagePerProjectile = totalDamage / projectileCount;

  for (let index = 0; index < projectileCount; index += 1) {
    const arcDirection: -1 | 1 = index % 2 === 0 ? -1 : 1;
    const arcScale = 0.72 + index * 0.22;
    const startPosition = {
      x: source.position.x,
      y: source.position.y + (index - (projectileCount - 1) / 2) * 3,
    };

    state.antibodyProjectiles.push({
      id: `antibody-projectile-${state.nextEffectNumber}`,
      sourceEntityId: source.id,
      targetEntityId: target.id,
      position: { ...startPosition },
      startPosition,
      damage: damagePerProjectile,
      elapsedMs: 0,
      durationMs: calculateTravelDuration(startPosition, target.position),
      launchDelayMs:
        config.antibodyLaunchDelayMs + index * config.antibodySalvoIntervalMs,
      ttlMs: config.antibodyMaxLifetimeMs,
      arcDirection,
      arcHeight: config.antibodyCurveHeight * arcScale,
    });
    state.nextEffectNumber += 1;
  }
}

export function applyAntibodyProjectileSystem(
  state: GameState,
  deltaMs: number,
): void {
  const survivors: AntibodyProjectile[] = [];

  for (const projectile of state.antibodyProjectiles) {
    projectile.ttlMs -= deltaMs;

    if (projectile.ttlMs <= 0) {
      continue;
    }

    if (projectile.launchDelayMs > 0) {
      projectile.launchDelayMs = Math.max(
        0,
        projectile.launchDelayMs - deltaMs,
      );
      survivors.push(projectile);
      continue;
    }

    let target = getLiveTarget(state, projectile.targetEntityId);

    if (!target) {
      target = findRetarget(state, projectile.position);

      if (!target) {
        continue;
      }

      resetCurve(projectile, target);
    }

    projectile.elapsedMs = Math.min(
      projectile.durationMs,
      projectile.elapsedMs + deltaMs,
    );
    const progress = projectile.elapsedMs / projectile.durationMs;
    projectile.position = getBezierPosition(
      projectile.startPosition,
      target.position,
      projectile.arcHeight * projectile.arcDirection,
      progress,
    );

    const reachedTarget =
      progress >= 1 ||
      distance(projectile.position, target.position) <=
        target.radius + balanceValues.adaptive.antibodyHitRadius;

    if (!reachedTarget) {
      survivors.push(projectile);
      continue;
    }

    applyAntibodyImpact(state, target, projectile.damage);
  }

  state.antibodyProjectiles = survivors;
}

function getLiveTarget(
  state: GameState,
  targetEntityId: string,
): HostilePathogen | null {
  const target = state.entities[targetEntityId];
  return target && isHostilePathogen(target) && target.health > 0
    ? target
    : null;
}

function findRetarget(
  state: GameState,
  position: Vector2,
): HostilePathogen | null {
  let nearest: HostilePathogen | null = null;
  let nearestDistance: number =
    balanceValues.adaptive.antibodyRetargetRange;

  for (const entity of Object.values(state.entities)) {
    if (!isHostilePathogen(entity) || entity.health <= 0) {
      continue;
    }

    const currentDistance = distance(position, entity.position);
    if (currentDistance < nearestDistance) {
      nearest = entity;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function resetCurve(
  projectile: AntibodyProjectile,
  target: HostilePathogen,
): void {
  projectile.targetEntityId = target.id;
  projectile.startPosition = { ...projectile.position };
  projectile.elapsedMs = 0;
  projectile.durationMs = calculateTravelDuration(
    projectile.position,
    target.position,
  );
  projectile.arcDirection = projectile.arcDirection === 1 ? -1 : 1;
  projectile.arcHeight = Math.max(
    16,
    Math.min(
      balanceValues.adaptive.antibodyCurveHeight,
      distance(projectile.position, target.position) * 0.4,
    ),
  );
}

function calculateTravelDuration(from: Vector2, to: Vector2): number {
  const config = balanceValues.adaptive;
  const rawDuration = (distance(from, to) / config.antibodyProjectileSpeed) * 1000;

  return Math.max(
    config.antibodyMinimumTravelMs,
    Math.min(config.antibodyMaximumTravelMs, rawDuration),
  );
}

function getBezierPosition(
  start: Vector2,
  target: Vector2,
  signedArcHeight: number,
  progress: number,
): Vector2 {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const control = {
    x: start.x + dx * 0.5 + (-dy / length) * signedArcHeight,
    y: start.y + dy * 0.5 + (dx / length) * signedArcHeight,
  };
  const inverse = 1 - progress;

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * progress * control.x +
      progress * progress * target.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * progress * control.y +
      progress * progress * target.y,
  };
}

function applyAntibodyImpact(
  state: GameState,
  target: HostilePathogen,
  damage: number,
): void {
  const appliedDamage = applyPathogenDamage(target, damage);
  if (appliedDamage <= 0) {
    return;
  }

  state.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    state.inflammation.value + balanceValues.inflammation.combatIncrease,
  );
  state.inflammatoryZones.push({
    id: `zone-${state.nextEffectNumber}`,
    position: { ...target.position },
    radius: balanceValues.inflammatoryZone.radius,
    intensity: balanceValues.inflammatoryZone.intensityOnMacrophageAttack,
    ttlMs: balanceValues.inflammatoryZone.ttlMs,
  });
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "antibodyImpact",
    position: { ...target.position },
    radius: target.radius + balanceValues.attackEffectRadiusBonus,
    ttlMs: balanceValues.adaptive.antibodyImpactTtlMs,
  });
  state.nextEffectNumber += 1;
}
