import { describe, expect, it } from "vitest";
import { pathogenDefinitions } from "../game/data/pathogens";
import { unitDefinitions } from "../game/data/units";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";

describe("V4 bacterial variety", () => {
  it("defines distinct bacterial profiles with gameplay metadata", () => {
    expect(pathogenDefinitions.cocciRapid.archetype).toBe("swarm");
    expect(pathogenDefinitions.proliferatingBacillus.spawn?.childTypeId).toBe(
      "cocciRapid",
    );
    expect(pathogenDefinitions.resistantBacterium.armor).toBeGreaterThan(
      pathogenDefinitions.cocciRapid.armor,
    );
    expect(pathogenDefinitions.biofilmColony.biofilm?.radius).toBeGreaterThan(0);
    expect(pathogenDefinitions.toxicBacterium.tissueDamage).toBeGreaterThan(
      pathogenDefinitions.cocciRapid.tissueDamage,
    );
  });

  it("biofilm colonies reduce incoming direct damage", () => {
    const macrophage = unitDefinitions.macrophage;
    const colony = pathogenDefinitions.biofilmColony;
    const state: GameState = {
      ...createInitialState(),
      entities: {
        "macrophage-test": {
          id: "macrophage-test",
          kind: "macrophage",
          unitTypeId: "macrophage",
          position: { x: 440, y: 360 },
          targetPosition: null,
          idleTargetPosition: null,
          nextIdleRetargetMs: 999999,
          health: macrophage.maxHealth,
          maxHealth: macrophage.maxHealth,
          radius: macrophage.radius,
          movementSpeed: macrophage.movementSpeed,
          idleMovementSpeed: macrophage.idleMovementSpeed,
          attackRange: macrophage.attackRange,
          attackDamage: macrophage.attackDamage,
          attackCooldownMs: macrophage.attackCooldownMs,
          attackCooldownRemainingMs: 0,
          carriedAntigenValue: 0,
          carriedDebrisCount: 0,
        },
        "colony-test": {
          id: "colony-test",
          kind: "bacterium",
          pathogenTypeId: "biofilmColony",
          position: { x: 468, y: 360 },
          health: colony.maxHealth,
          maxHealth: colony.maxHealth,
          radius: colony.radius,
          movementSpeed: 0,
          tissueDamage: 0,
          tissueAttackRange: 0,
          attackCooldownMs: 1000,
          attackCooldownRemainingMs: 1000,
          armor: colony.armor,
          antigenValue: colony.antigenValue,
          debrisDropChance: colony.debrisDropChance,
          inflammationPressureMultiplier: colony.inflammationPressureMultiplier,
          targetPriority: colony.targetPriority,
          specialCooldownRemainingMs: 999999,
          spawnedChildrenCount: 0,
        },
      },
    };

    const next = stepSimulation(state, 16);
    const damaged = next.entities["colony-test"];

    expect(next.biofilmZones).toHaveLength(1);
    expect(damaged.kind).toBe("bacterium");
    expect(damaged.health).toBeGreaterThan(colony.maxHealth - 8);
    expect(damaged.health).toBeLessThan(colony.maxHealth);
  });

  it("biofilm colonies can spawn pressure units", () => {
    const state = createInitialState();
    const source = spawnBacterium(state, "biofilmColony", { x: 760, y: 360 });

    source.specialCooldownRemainingMs = 0;
    source.spawnedChildrenCount = 0;

    const next = stepSimulation(state, 16);
    const bacteria = Object.values(next.entities).filter(
      (entity) => entity.kind === "bacterium",
    );

    expect(bacteria).toHaveLength(2);
    expect(
      bacteria.some(
        (entity) =>
          entity.kind === "bacterium" &&
          entity.pathogenTypeId === "proliferatingBacillus",
      ),
    ).toBe(true);
  });

  it("debris keeps the antigen value of the killed bacterial profile", () => {
    const state = createInitialState();
    const resistant = spawnBacterium(state, "resistantBacterium", {
      x: 450,
      y: 360,
    });

    resistant.health = 0;

    const next = stepSimulation(state, 16);

    expect(next.debris).toHaveLength(1);
    expect(next.debris[0].pathogenTypeId).toBe("resistantBacterium");
    expect(next.debris[0].antigenValue).toBe(
      pathogenDefinitions.resistantBacterium.antigenValue,
    );
  });
});
