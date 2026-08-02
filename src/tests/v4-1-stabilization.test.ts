import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";

describe("V4.1 stabilization", () => {
  it("keeps the lymph node behind the front instead of inside the main infection lane", () => {
    const map = missionDefinitions.woundBacteriaV1.map;

    expect(map.width).toBeGreaterThan(1280);
    expect(map.lymphNode.y).toBeGreaterThan(map.tissueZone.y + map.tissueZone.height);
    expect(map.lymphNode.x).toBeLessThan(map.bacteriaEntryZone.x - 700);
  });

  it("macrophages attack first and execute small bacteria with a final phagocytosis", () => {
    const macrophage = unitDefinitions.macrophage;
    const coccus = pathogenDefinitions.cocciRapid;
    const state: GameState = {
      ...createInitialState(),
      entities: {
        "macrophage-test": {
          id: "macrophage-test",
          kind: "macrophage",
          unitTypeId: "macrophage",
          position: { x: 420, y: 360 },
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
        "coccus-test": {
          id: "coccus-test",
          kind: "bacterium",
          pathogenTypeId: "cocciRapid",
          position: { x: 448, y: 360 },
          health: coccus.maxHealth,
          maxHealth: coccus.maxHealth,
          radius: coccus.radius,
          movementSpeed: 0,
          tissueDamage: 0,
          tissueAttackRange: 0,
          attackCooldownMs: 1000,
          attackCooldownRemainingMs: 1000,
          armor: coccus.armor,
          antigenValue: coccus.antigenValue,
          debrisDropChance: 1,
          inflammationPressureMultiplier: coccus.inflammationPressureMultiplier,
          targetPriority: coccus.targetPriority,
        },
      },
    };

    const firstStrike = stepSimulation(state, 16);
    const firstTarget = firstStrike.entities["coccus-test"];

    expect(firstTarget.kind).toBe("bacterium");
    if (firstTarget.kind !== "bacterium") {
      throw new Error("Expected a struck bacterium");
    }
    expect(firstTarget.phagocytosedByEntityId).toBeUndefined();
    expect(firstTarget.health).toBeLessThan(coccus.maxHealth);

    const secondStrike = stepSimulation(
      firstStrike,
      macrophage.attackCooldownMs + 16,
    );
    const secondTarget = secondStrike.entities["coccus-test"];

    expect(secondTarget.kind).toBe("bacterium");
    if (secondTarget.kind !== "bacterium") {
      throw new Error("Expected a twice-struck bacterium");
    }
    expect(secondTarget.phagocytosedByEntityId).toBeUndefined();
    expect(secondTarget.health).toBeLessThan(firstTarget.health);

    const captured = stepSimulation(
      secondStrike,
      macrophage.attackCooldownMs + 16,
    );
    const target = captured.entities["coccus-test"];

    expect(target.kind).toBe("bacterium");
    if (target.kind !== "bacterium") {
      throw new Error("Expected an executed bacterium");
    }
    expect(target.phagocytosedByEntityId).toBe("macrophage-test");
    expect(target.health).toBe(secondTarget.health);

    const digested = stepSimulation(
      captured,
      balanceValues.combat.macrophagePhagocytosisDurationMs + 32,
    );

    expect(digested.entities["coccus-test"]).toBeUndefined();
    expect(digested.debris).toHaveLength(1);
  });

  it("neutrophils are aggressive but short-lived", () => {
    const produced = applyCommand(createInitialState("inflammatoryReactionV2"), {
      type: "produceNeutrophil",
    });
    const neutrophil = Object.values(produced.entities).find(
      (entity) => entity.kind === "neutrophil",
    );

    expect(neutrophil).toBeDefined();
    expect(neutrophil?.kind).toBe("neutrophil");
    if (!neutrophil || neutrophil.kind !== "neutrophil") {
      throw new Error("Expected a neutrophil");
    }
    expect(neutrophil.lifeRemainingMs).toBe(balanceValues.neutrophilLifetimeMs);

    const dying = stepSimulation(
      produced,
      balanceValues.neutrophilLifetimeMs + 1000,
    );
    const expired = stepSimulation(
      dying,
      balanceValues.netosis.normalDeathDurationMs,
    );

    expect(
      Object.values(expired.entities).some((entity) => entity.kind === "neutrophil"),
    ).toBe(false);
  });
});
