import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";

describe("V4.2 RTS commands", () => {
  it("filters group selection to immune units only", () => {
    const macrophage = unitDefinitions.macrophage;
    const bacterium = pathogenDefinitions.cocciRapid;
    const state: GameState = {
      ...createInitialState(),
      entities: {
        "macrophage-test": {
          id: "macrophage-test",
          kind: "macrophage",
          unitTypeId: "macrophage",
          position: { x: 300, y: 360 },
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
          pathogenTypeId: "cocciRapid",
          position: { x: 420, y: 360 },
          health: bacterium.maxHealth,
          maxHealth: bacterium.maxHealth,
          radius: bacterium.radius,
          movementSpeed: bacterium.movementSpeed,
          tissueDamage: bacterium.tissueDamage,
          tissueAttackRange: bacterium.tissueAttackRange,
          attackCooldownMs: bacterium.attackCooldownMs,
          attackCooldownRemainingMs: 0,
        },
      },
    };

    const selected = applyCommand(state, {
      type: "selectEntities",
      entityIds: ["macrophage-test", "bacterium-test"],
    });

    expect(selected.selectedEntityIds).toEqual(["macrophage-test"]);
  });

  it("orders combat units toward an enemy while dendritic cells ignore attack orders", () => {
    const macrophage = unitDefinitions.macrophage;
    const dendritic = unitDefinitions.dendriticCell;
    const bacterium = pathogenDefinitions.resistantBacterium;
    const state: GameState = {
      ...createInitialState(),
      selectedEntityIds: ["macrophage-test", "dendritic-test"],
      entities: {
        "macrophage-test": {
          id: "macrophage-test",
          kind: "macrophage",
          unitTypeId: "macrophage",
          position: { x: 300, y: 360 },
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
        "dendritic-test": {
          id: "dendritic-test",
          kind: "dendriticCell",
          unitTypeId: "dendriticCell",
          position: { x: 310, y: 390 },
          targetPosition: null,
          idleTargetPosition: null,
          nextIdleRetargetMs: 999999,
          health: dendritic.maxHealth,
          maxHealth: dendritic.maxHealth,
          radius: dendritic.radius,
          movementSpeed: dendritic.movementSpeed,
          idleMovementSpeed: dendritic.idleMovementSpeed,
          attackRange: dendritic.attackRange,
          attackDamage: dendritic.attackDamage,
          attackCooldownMs: dendritic.attackCooldownMs,
          attackCooldownRemainingMs: 0,
          carriedAntigenValue: 0,
          carriedDebrisCount: 0,
        },
        "bacterium-test": {
          id: "bacterium-test",
          kind: "bacterium",
          pathogenTypeId: "resistantBacterium",
          position: { x: 650, y: 360 },
          health: bacterium.maxHealth,
          maxHealth: bacterium.maxHealth,
          radius: bacterium.radius,
          movementSpeed: bacterium.movementSpeed,
          tissueDamage: bacterium.tissueDamage,
          tissueAttackRange: bacterium.tissueAttackRange,
          attackCooldownMs: bacterium.attackCooldownMs,
          attackCooldownRemainingMs: 0,
        },
      },
    };

    const ordered = applyCommand(state, {
      type: "orderAttack",
      targetEntityId: "bacterium-test",
    });
    const macrophageEntity = ordered.entities["macrophage-test"];
    const dendriticEntity = ordered.entities["dendritic-test"];

    expect(macrophageEntity.kind).toBe("macrophage");
    expect(dendriticEntity.kind).toBe("dendriticCell");
    if (
      macrophageEntity.kind !== "macrophage" ||
      dendriticEntity.kind !== "dendriticCell"
    ) {
      throw new Error("Expected immune units");
    }
    expect(macrophageEntity.targetPosition).toEqual({ x: 650, y: 360 });
    expect(dendriticEntity.targetPosition).toBeNull();
  });

  it("orders selected dendritic cells to collect debris and return to the lymph node", () => {
    const dendritic = unitDefinitions.dendriticCell;
    const mission = missionDefinitions.woundBacteriaV1;
    const state: GameState = {
      ...createInitialState(),
      selectedEntityIds: ["dendritic-test"],
      debris: [
        {
          id: "debris-test",
          position: { x: 540, y: 390 },
          pathogenTypeId: "cocciRapid",
          antigenProfileId: "gramPositiveCocci",
          antigenValue: 4,
          ttlMs: 10000,
        },
      ],
      entities: {
        "dendritic-test": {
          id: "dendritic-test",
          kind: "dendriticCell",
          unitTypeId: "dendriticCell",
          position: { x: 310, y: 390 },
          targetPosition: null,
          idleTargetPosition: null,
          nextIdleRetargetMs: 999999,
          health: dendritic.maxHealth,
          maxHealth: dendritic.maxHealth,
          radius: dendritic.radius,
          movementSpeed: dendritic.movementSpeed,
          idleMovementSpeed: dendritic.idleMovementSpeed,
          attackRange: dendritic.attackRange,
          attackDamage: dendritic.attackDamage,
          attackCooldownMs: dendritic.attackCooldownMs,
          attackCooldownRemainingMs: 0,
          carriedAntigenValue: 4,
          carriedDebrisCount: 1,
        },
      },
    };

    const collectOrdered = applyCommand(state, {
      type: "orderCollectDebris",
      debrisId: "debris-test",
    });
    const collecting = collectOrdered.entities["dendritic-test"];

    expect(collecting.kind).toBe("dendriticCell");
    if (collecting.kind !== "dendriticCell") {
      throw new Error("Expected a dendritic cell");
    }
    expect(collecting.targetPosition).toEqual({ x: 540, y: 390 });

    const returnOrdered = applyCommand(collectOrdered, {
      type: "orderReturnToLymphNode",
    });
    const returning = returnOrdered.entities["dendritic-test"];

    expect(returning.kind).toBe("dendriticCell");
    if (returning.kind !== "dendriticCell") {
      throw new Error("Expected a dendritic cell");
    }
    expect(returning.targetPosition).toEqual({
      x: mission.map.lymphNode.x,
      y: mission.map.lymphNode.y,
    });
  });

  it("uses a configurable formation spacing for group movement", () => {
    expect(balanceValues.groupFormationSpacing).toBeGreaterThan(0);
    expect(balanceValues.rightClickDragThresholdPx).toBeGreaterThan(0);
    expect(balanceValues.camera.keyboardSpeedPerSecond).toBeGreaterThan(0);
  });
});
