import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";

describe("V3 adaptive response", () => {
  it("creates pathogen debris when bacteria die", () => {
    const state: GameState = {
      ...createInitialState(),
      entities: {
        "bacterium-test": {
          id: "bacterium-test",
          kind: "bacterium",
          pathogenTypeId: "basicBacterium",
          position: { x: 450, y: 360 },
          health: 0,
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
    const next = stepSimulation(state, 16);

    expect(next.debris).toHaveLength(1);
    expect(next.entities["bacterium-test"]).toBeUndefined();
  });

  it("dendritic cells collect up to three debris before delivering antigens", () => {
    const mission = missionDefinitions.woundBacteriaV1;
    const dendritic = unitDefinitions.dendriticCell;
    const state: GameState = {
      ...createInitialState(),
      debris: [
        {
          id: "debris-test-1",
          position: { x: 420, y: 360 },
          pathogenTypeId: "proliferatingBacillus",
          antigenProfileId: "entericBacilli",
          antigenValue: balanceValues.debris.antigenValue,
          ttlMs: balanceValues.debris.ttlMs,
        },
        {
          id: "debris-test-2",
          position: { x: 421, y: 360 },
          pathogenTypeId: "proliferatingBacillus",
          antigenProfileId: "entericBacilli",
          antigenValue: balanceValues.debris.antigenValue,
          ttlMs: balanceValues.debris.ttlMs,
        },
        {
          id: "debris-test-3",
          position: { x: 422, y: 360 },
          pathogenTypeId: "proliferatingBacillus",
          antigenProfileId: "entericBacilli",
          antigenValue: balanceValues.debris.antigenValue,
          ttlMs: balanceValues.debris.ttlMs,
        },
      ],
      entities: {
        "dendritic-test": {
          id: "dendritic-test",
          kind: "dendriticCell",
          unitTypeId: "dendriticCell",
          position: { x: 420, y: 360 },
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
      },
    };
    const afterFirstCollect = stepSimulation(state, 16);
    const afterSecondCollect = stepSimulation(afterFirstCollect, 16);
    const afterCollect = stepSimulation(afterSecondCollect, 16);
    const carrying = afterCollect.entities["dendritic-test"];

    expect(afterCollect.debris).toHaveLength(0);
    expect(carrying.kind).toBe("dendriticCell");
    if (carrying.kind !== "dendriticCell") {
      throw new Error("Expected a dendritic cell");
    }
    expect(carrying.carriedDebrisCount).toBe(balanceValues.adaptive.dendriticCarryCapacity);
    expect(carrying.carriedAntigenValue).toBe(
      balanceValues.debris.antigenValue * balanceValues.adaptive.dendriticCarryCapacity,
    );

    const nearLymphNode: GameState = {
      ...afterCollect,
      entities: {
        ...afterCollect.entities,
        "dendritic-test": {
          ...carrying,
          position: { x: mission.map.lymphNode.x, y: mission.map.lymphNode.y },
        },
      },
    };
    const delivered = stepSimulation(nearLymphNode, 16);

    expect(delivered.resources.antigens).toBe(
      balanceValues.debris.antigenValue * balanceValues.adaptive.dendriticCarryCapacity,
    );
  });

  it("research unlocks plasmocytes and massive neutralization", () => {
    const researched = applyCommand(
      {
        ...createInitialState(),
        resources: {
          atp: 160,
          cytokines: 100,
          antigens: 80,
        },
      },
      { type: "researchBacterialAnalysis" },
    );

    expect(researched.adaptiveResearch.bacterialAnalysisComplete).toBe(true);

    const withPlasmocyte = applyCommand(researched, { type: "producePlasmocyte" });

    expect(
      Object.values(withPlasmocyte.entities).some(
        (entity) => entity.kind === "plasmocyte",
      ),
    ).toBe(true);

    const withBacteria: GameState = {
      ...withPlasmocyte,
      resources: {
        atp: 160,
        cytokines: 100,
        antigens: 80,
      },
      entities: {
        ...withPlasmocyte.entities,
        "bacterium-test": {
          id: "bacterium-test",
          kind: "bacterium",
          pathogenTypeId: "toughBacterium",
          position: { x: 800, y: 360 },
          health: 70,
          maxHealth: 70,
          radius: 15,
          movementSpeed: 0,
          tissueDamage: 0,
          tissueAttackRange: 0,
          attackCooldownMs: 1000,
          attackCooldownRemainingMs: 1000,
        },
      },
    };
    const afterNeutralization = applyCommand(withBacteria, {
      type: "useMassiveNeutralization",
    });
    const bacterium = afterNeutralization.entities["bacterium-test"];

    expect(bacterium.kind).toBe("bacterium");
    expect(bacterium.health).toBe(
      70 - balanceValues.adaptive.massiveNeutralizationDamage,
    );
    expect(afterNeutralization.productionCooldowns.massiveNeutralizationMs).toBe(
      balanceValues.adaptive.massiveNeutralizationCooldownMs,
    );
  });
});
