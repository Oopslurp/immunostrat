import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";

describe("V2 cytokines, inflammation and neutrophils", () => {
  it("produces a neutrophil with ATP, cytokines, cooldown and inflammation cost", () => {
    const initial = createInitialState();
    const produced = applyCommand(initial, { type: "produceNeutrophil" });
    const neutrophils = Object.values(produced.entities).filter(
      (entity) => entity.kind === "neutrophil",
    );

    expect(neutrophils).toHaveLength(1);
    expect(produced.resources.atp).toBe(
      balanceValues.startingAtp - unitDefinitions.neutrophil.atpCost,
    );
    expect(produced.resources.cytokines).toBe(
      balanceValues.startingCytokines - unitDefinitions.neutrophil.cytokineCost,
    );
    expect(produced.productionCooldowns.neutrophilMs).toBe(
      balanceValues.neutrophilProductionCooldownMs,
    );
    expect(produced.inflammation.value).toBeGreaterThan(
      balanceValues.inflammation.startingValue,
    );
  });

  it("does not produce a neutrophil without enough cytokines", () => {
    const initial: GameState = {
      ...createInitialState(),
      resources: {
        atp: unitDefinitions.neutrophil.atpCost,
        cytokines: unitDefinitions.neutrophil.cytokineCost - 1,
        antigens: 0,
      },
    };
    const refused = applyCommand(initial, { type: "produceNeutrophil" });

    expect(Object.values(refused.entities)).toHaveLength(0);
    expect(refused.resources.cytokines).toBe(
      unitDefinitions.neutrophil.cytokineCost - 1,
    );
  });

  it("regenerates cytokines faster while bacteria are present", () => {
    const initial: GameState = {
      ...createInitialState(),
      resources: { atp: 100, cytokines: 0, antigens: 0 },
      entities: {
        "bacterium-test": {
          id: "bacterium-test",
          kind: "bacterium",
          pathogenTypeId: "basicBacterium",
          position: { x: 800, y: 360 },
          health: 30,
          maxHealth: 30,
          radius: 12,
          movementSpeed: 0,
          tissueDamage: 0,
          tissueAttackRange: 0,
          attackCooldownMs: 1000,
          attackCooldownRemainingMs: 1000,
        },
      },
    };
    const regenerated = stepSimulation(initial, 1000);

    expect(regenerated.resources.cytokines).toBeGreaterThan(
      balanceValues.passiveCytokinesPerSecond,
    );
  });

  it("damages tissue when inflammation is dangerous", () => {
    const initial: GameState = {
      ...createInitialState(),
      inflammation: { value: balanceValues.inflammation.criticalThreshold },
    };
    const damaged = stepSimulation(initial, 1000);

    expect(damaged.tissue.health).toBeLessThan(initial.tissue.health);
  });

  it("creates inflammatory zones during immune attacks", () => {
    const macrophage = unitDefinitions.macrophage;
    const initial: GameState = {
      ...createInitialState(),
      entities: {
        "macrophage-test": {
          id: "macrophage-test",
          kind: "macrophage",
          unitTypeId: "macrophage",
          position: { x: 400, y: 360 },
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
        "bacterium-test": {
          id: "bacterium-test",
          kind: "bacterium",
          pathogenTypeId: "basicBacterium",
          position: { x: 420, y: 360 },
          health: 100,
          maxHealth: 100,
          radius: 10,
          movementSpeed: 0,
          tissueDamage: 0,
          tissueAttackRange: 0,
          attackCooldownMs: 1000,
          attackCooldownRemainingMs: 999999,
        },
      },
    };
    const afterAttack = stepSimulation(initial, 16);

    expect(afterAttack.inflammatoryZones).toHaveLength(1);
    expect(afterAttack.inflammation.value).toBeGreaterThan(0);
  });
});
