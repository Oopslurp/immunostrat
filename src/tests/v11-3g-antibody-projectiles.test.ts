import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { unitDefinitions } from "../game/data/units";
import {
  antibodyImpactSprite,
  antibodyProjectileSprite,
  validateEntitySpriteManifest,
} from "../game/phaser/assets/entitySpriteManifest";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import type {
  BacteriumEntity,
  PlasmocyteEntity,
} from "../game/simulation/entities";
import { isPlasmocyte } from "../game/simulation/entities";
import {
  applyAntibodyProjectileSystem,
  launchAntibodySalvo,
} from "../game/simulation/systems/antibodyProjectileSystem";
import { applyCombatSystem } from "../game/simulation/systems/combatSystem";

function createPlasmocyte(id = "plasmocyte-test"): PlasmocyteEntity {
  const definition = unitDefinitions.plasmocyte;
  return {
    id,
    kind: "plasmocyte",
    unitTypeId: "plasmocyte",
    position: { x: 200, y: 200 },
    targetPosition: null,
    idleTargetPosition: null,
    nextIdleRetargetMs: 1000,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed,
    idleMovementSpeed: definition.idleMovementSpeed,
    attackRange: definition.attackRange,
    attackDamage: definition.attackDamage,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
    tacticalState: "guardingArea",
    orderAnchor: { x: 200, y: 200 },
    engagementRadius: definition.engagementRadius,
    leashRadius: definition.leashRadius,
    guardRadius: definition.guardRadius,
    explicitTargetEntityId: null,
    carriedAntigenValue: 0,
    carriedDebrisCount: 0,
  };
}

function createBacterium(
  id: string,
  x: number,
  y: number,
  health = 70,
): BacteriumEntity {
  return {
    id,
    kind: "bacterium",
    pathogenTypeId: "toughBacterium",
    position: { x, y },
    health,
    maxHealth: health,
    radius: 15,
    movementSpeed: 0,
    tissueDamage: 0,
    tissueAttackRange: 0,
    attackCooldownMs: 1000,
    attackCooldownRemainingMs: 1000,
  };
}

function createProjectileState(): GameState {
  const state = createInitialState("adaptiveResponseV5");
  const plasmocyte = createPlasmocyte();
  const bacterium = createBacterium("bacterium-test", 330, 200);
  state.entities = {
    [plasmocyte.id]: plasmocyte,
    [bacterium.id]: bacterium,
  };
  state.antibodyProjectiles = [];
  state.effects = [];
  state.inflammatoryZones = [];
  return state;
}

describe("V11.3G guided antibody projectiles", () => {
  it("registers all directional flight and impact frames", () => {
    expect(validateEntitySpriteManifest()).toEqual([]);
    expect(antibodyProjectileSprite.frameCount).toBe(16);
    expect(antibodyProjectileSprite.animations.right).toMatchObject({
      startFrame: 0,
      endFrame: 3,
      repeat: -1,
    });
    expect(antibodyProjectileSprite.animations.upRight).toMatchObject({
      startFrame: 4,
      endFrame: 7,
    });
    expect(antibodyProjectileSprite.animations.downRight).toMatchObject({
      startFrame: 8,
      endFrame: 11,
    });
    expect(antibodyProjectileSprite.animations.left).toMatchObject({
      startFrame: 12,
      endFrame: 15,
    });
    expect(antibodyImpactSprite.animations.impact).toMatchObject({
      startFrame: 0,
      endFrame: 7,
      repeat: 0,
    });
    expect(antibodyImpactSprite.animations.fixed).toMatchObject({
      startFrame: 8,
      endFrame: 15,
      repeat: -1,
    });
  });

  it("keeps the procedural fallback when an effect texture is missing", () => {
    const resolved = resolveEntityVisual("antibodyProjectile", "right", {
      hasTexture: () => false,
      hasAnimation: () => false,
    });

    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });

  it("launches three delayed missiles instead of dealing instant damage", () => {
    const state = createProjectileState();
    const target = state.entities["bacterium-test"];
    if (target.kind !== "bacterium") throw new Error("Expected bacterium");

    applyCombatSystem(state, 16);

    expect(target.health).toBe(70);
    expect(state.antibodyProjectiles).toHaveLength(
      balanceValues.adaptive.antibodyProjectileCount,
    );
    expect(
      state.antibodyProjectiles.map((projectile) => projectile.launchDelayMs),
    ).toEqual([
      balanceValues.adaptive.antibodyLaunchDelayMs,
      balanceValues.adaptive.antibodyLaunchDelayMs +
        balanceValues.adaptive.antibodySalvoIntervalMs,
      balanceValues.adaptive.antibodyLaunchDelayMs +
        balanceValues.adaptive.antibodySalvoIntervalMs * 2,
    ]);
  });

  it("fires as nearby support from outside the former battle range", () => {
    const state = createProjectileState();
    const source = state.entities["plasmocyte-test"];
    const target = state.entities["bacterium-test"];
    if (!isPlasmocyte(source) || target.kind !== "bacterium") {
      throw new Error("Expected plasmocyte and bacterium");
    }
    target.position = {
      x: source.position.x + unitDefinitions.plasmocyte.attackRange - 12,
      y: source.position.y,
    };

    applyCombatSystem(state, 16);

    expect(state.antibodyProjectiles).toHaveLength(
      balanceValues.adaptive.antibodyProjectileCount,
    );
    expect(source.targetPosition).toBeNull();
  });

  it("approaches a support target inside detection range but ignores distant fronts", () => {
    const state = createProjectileState();
    const source = state.entities["plasmocyte-test"];
    const target = state.entities["bacterium-test"];
    if (!isPlasmocyte(source) || target.kind !== "bacterium") {
      throw new Error("Expected plasmocyte and bacterium");
    }

    target.position = {
      x: source.position.x + unitDefinitions.plasmocyte.attackRange + 55,
      y: source.position.y,
    };
    applyCombatSystem(state, 16);

    expect(state.antibodyProjectiles).toHaveLength(0);
    expect(source.tacticalState).toBe("engagingNearbyTarget");
    expect(source.targetPosition).toEqual(target.position);

    source.attackCooldownRemainingMs = 0;
    source.targetPosition = null;
    source.tacticalState = "guardingArea";
    target.position = {
      x: source.position.x + unitDefinitions.plasmocyte.engagementRadius + 20,
      y: source.position.y,
    };
    applyCombatSystem(state, 16);

    expect(state.antibodyProjectiles).toHaveLength(0);
    expect(source.tacticalState).toBe("guardingArea");
    expect(source.targetPosition).toBeNull();
  });

  it("applies the salvo damage only on impact and emits the binding effect", () => {
    const state = createProjectileState();
    const source = state.entities["plasmocyte-test"];
    const target = state.entities["bacterium-test"];
    if (!isPlasmocyte(source) || target.kind !== "bacterium") {
      throw new Error("Expected plasmocyte and bacterium");
    }

    launchAntibodySalvo(state, source, target, 12);
    applyAntibodyProjectileSystem(
      state,
      balanceValues.adaptive.antibodyLaunchDelayMs +
        balanceValues.adaptive.antibodySalvoIntervalMs * 2,
    );

    expect(target.health).toBe(70);
    applyAntibodyProjectileSystem(
      state,
      balanceValues.adaptive.antibodyMaximumTravelMs,
    );

    expect(target.health).toBeCloseTo(58, 5);
    expect(state.antibodyProjectiles).toHaveLength(0);
    expect(
      state.effects.filter((effect) => effect.kind === "antibodyImpact"),
    ).toHaveLength(3);
  });

  it("retargets a nearby living pathogen when the original target dies", () => {
    const state = createProjectileState();
    const source = state.entities["plasmocyte-test"];
    const firstTarget = state.entities["bacterium-test"];
    const secondTarget = createBacterium("bacterium-retarget", 350, 220);
    state.entities[secondTarget.id] = secondTarget;
    if (!isPlasmocyte(source) || firstTarget.kind !== "bacterium") {
      throw new Error("Expected plasmocyte and bacterium");
    }

    launchAntibodySalvo(state, source, firstTarget, 12);
    firstTarget.health = 0;
    applyAntibodyProjectileSystem(
      state,
      balanceValues.adaptive.antibodyLaunchDelayMs +
        balanceValues.adaptive.antibodySalvoIntervalMs * 2,
    );
    applyAntibodyProjectileSystem(state, 16);

    expect(state.antibodyProjectiles).toHaveLength(3);
    expect(
      state.antibodyProjectiles.every(
        (projectile) => projectile.targetEntityId === secondTarget.id,
      ),
    ).toBe(true);
  });
});
