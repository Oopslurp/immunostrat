import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";

describe("V1 simulation", () => {
  it("produces a macrophage only when ATP is available", () => {
    const initial = createInitialState();
    const produced = applyCommand(initial, { type: "produceMacrophage" });

    expect(Object.values(produced.entities)).toHaveLength(1);
    expect(produced.resources.atp).toBe(
      balanceValues.startingAtp - unitDefinitions.macrophage.atpCost,
    );

    const poorState: GameState = {
      ...initial,
      resources: { atp: unitDefinitions.macrophage.atpCost - 1 },
    };
    const refused = applyCommand(poorState, { type: "produceMacrophage" });

    expect(Object.values(refused.entities)).toHaveLength(0);
    expect(refused.resources.atp).toBe(unitDefinitions.macrophage.atpCost - 1);
  });

  it("regenerates ATP slowly and never spends below zero", () => {
    const initial = createInitialState();
    const poorState: GameState = {
      ...initial,
      resources: { atp: 0 },
    };
    const refused = applyCommand(poorState, { type: "produceMacrophage" });
    const regenerated = stepSimulation(refused, 1000);

    expect(refused.resources.atp).toBe(0);
    expect(regenerated.resources.atp).toBe(1);
  });

  it("selects multiple macrophages and sends them to the same target", () => {
    const first = applyCommand(createInitialState(), {
      type: "produceMacrophage",
    });
    const second = applyCommand(
      {
        ...first,
        resources: { atp: first.resources.atp + unitDefinitions.macrophage.atpCost },
      },
      { type: "produceMacrophage" },
    );
    const macrophageIds = Object.values(second.entities)
      .filter((entity) => entity.kind === "macrophage")
      .map((entity) => entity.id);
    const selected = applyCommand(second, {
      type: "selectEntities",
      entityIds: macrophageIds,
    });
    const ordered = applyCommand(selected, {
      type: "orderMove",
      position: { x: 520, y: 420 },
    });

    expect(ordered.selectedEntityIds).toEqual(macrophageIds);
    for (const entityId of macrophageIds) {
      const entity = ordered.entities[entityId];

      expect(entity.kind).toBe("macrophage");
      if (entity.kind !== "macrophage") {
        throw new Error("Expected a macrophage");
      }

      expect(entity.targetPosition).toEqual({ x: 520, y: 420 });
    }
  });

  it("moves idle macrophages slowly when they have no command", () => {
    const produced = applyCommand(createInitialState(), {
      type: "produceMacrophage",
    });
    const macrophage = Object.values(produced.entities).find(
      (entity) => entity.kind === "macrophage",
    );

    expect(macrophage).toBeDefined();

    const before = { ...macrophage!.position };
    const afterIdleStep = stepSimulation(produced, 1500);
    const after = afterIdleStep.entities[macrophage!.id];

    expect(after.kind).toBe("macrophage");
    expect(after.position).not.toEqual(before);
  });

  it("spawns bacteria from mission waves", () => {
    const state = createInitialState();
    const afterFirstWaveStart = stepSimulation(state, 1300);

    expect(
      Object.values(afterFirstWaveStart.entities).filter(
        (entity) => entity.kind === "bacterium",
      ),
    ).toHaveLength(1);
  });

  it("damages tissue when bacteria reach the tissue core", () => {
    const mission = missionDefinitions.woundBacteriaV1;
    const state = createInitialState();
    const withBacterium: GameState = {
      ...state,
      entities: {
        "bacterium-test": {
          id: "bacterium-test",
          kind: "bacterium",
          pathogenTypeId: "basicBacterium",
          position: { ...mission.map.tissueCore },
          health: 10,
          maxHealth: 10,
          radius: 10,
          movementSpeed: 0,
          tissueDamage: 8,
          tissueAttackRange: 40,
          attackCooldownMs: 1000,
          attackCooldownRemainingMs: 0,
        },
      },
    };

    const damaged = stepSimulation(withBacterium, 100);

    expect(damaged.tissue.health).toBeLessThan(state.tissue.health);
  });

  it("detects defeat and victory", () => {
    const defeated = stepSimulation(
      {
        ...createInitialState(),
        tissue: { health: 0, maxHealth: 100 },
      },
      16,
    );

    expect(defeated.status).toBe("defeat");

    const victoryState: GameState = {
      ...createInitialState(),
      waves: {
        currentWaveIndex: missionDefinitions.woundBacteriaV1.waves.length,
        spawnedInCurrentWave: 0,
      },
    };

    const victorious = stepSimulation(victoryState, 16);

    expect(victorious.status).toBe("victory");
  });

  it("keeps combat effects briefly, then expires them", () => {
    const state = createInitialState();
    const macrophageDefinition = unitDefinitions.macrophage;
    const withCombatants: GameState = {
      ...state,
      entities: {
        "macrophage-test": {
          id: "macrophage-test",
          kind: "macrophage",
          unitTypeId: "macrophage",
          position: { x: 400, y: 360 },
          targetPosition: null,
          idleTargetPosition: null,
          nextIdleRetargetMs: 999999,
          health: macrophageDefinition.maxHealth,
          maxHealth: macrophageDefinition.maxHealth,
          radius: macrophageDefinition.radius,
          movementSpeed: macrophageDefinition.movementSpeed,
          idleMovementSpeed: macrophageDefinition.idleMovementSpeed,
          attackRange: macrophageDefinition.attackRange,
          attackDamage: macrophageDefinition.attackDamage,
          attackCooldownMs: macrophageDefinition.attackCooldownMs,
          attackCooldownRemainingMs: 0,
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

    const afterHit = stepSimulation(withCombatants, 16);
    const afterShortDelay = stepSimulation(afterHit, 80);
    const afterExpiry = stepSimulation(afterShortDelay, balanceValues.attackEffectTtlMs);

    expect(afterHit.effects).toHaveLength(1);
    expect(afterShortDelay.effects).toHaveLength(1);
    expect(afterExpiry.effects).toHaveLength(0);
  });
});
