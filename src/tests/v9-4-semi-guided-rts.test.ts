import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import { getCombatSiteAtOrderPosition } from "../game/data/tacticalMaps";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { isImmuneUnit } from "../game/simulation/entities";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { spawnVirus } from "../game/simulation/pathogens/createVirus";
import { applyCombatSystem } from "../game/simulation/systems/combatSystem";
import { applyMovementSystem } from "../game/simulation/systems/movementSystem";

describe("V9.4 semi-guided RTS gameplay", () => {
  it("recruits immune units from mission entry points with tactical defaults", () => {
    const mission = missionDefinitions.woundBacteriaV1;
    const produced = applyCommand(createInitialState(), { type: "produceMacrophage" });
    const macrophage = Object.values(produced.entities).find(
      (entity) => entity.kind === "macrophage" && entity.id.startsWith("macrophage-"),
    );
    const vessel = mission.map.immuneEntryPoints.find((entry) => entry.kind === "vessel");

    if (!macrophage || !isImmuneUnit(macrophage)) {
      throw new Error("Expected recruited macrophage");
    }

    expect(vessel).toBeDefined();
    expect(macrophage.position).toEqual(vessel?.position);
    expect(macrophage.orderAnchor).toEqual(vessel?.position);
    expect(macrophage.tacticalState).toBe("guardingArea");
    expect(macrophage.engagementRadius).toBe(unitDefinitions.macrophage.engagementRadius);
  });

  it("stores an anchor when the player gives a movement order", () => {
    const produced = applyCommand(createInitialState(), { type: "produceMacrophage" });
    const macrophageId = Object.values(produced.entities).find(
      (entity) => entity.kind === "macrophage",
    )?.id;

    if (!macrophageId) {
      throw new Error("Expected macrophage");
    }

    const selected = applyCommand(produced, {
      type: "selectEntity",
      entityId: macrophageId,
    });
    const ordered = applyCommand(selected, {
      type: "orderMove",
      position: { x: 540, y: 420 },
    });
    const macrophage = ordered.entities[macrophageId];

    expect(isImmuneUnit(macrophage)).toBe(true);
    if (!isImmuneUnit(macrophage)) {
      throw new Error("Expected immune unit");
    }

    expect(macrophage.targetPosition).toEqual({ x: 540, y: 420 });
    expect(macrophage.orderAnchor).toEqual({ x: 540, y: 420 });
    expect(macrophage.tacticalState).toBe("movingToPoint");
  });

  it("recognizes only the central core of a combat site as a patrol order", () => {
    const state = createInitialState("persistentInfectionV3");
    const site = state.tacticalMap.combatSites[0];
    const clickRadius = Math.max(
      balanceValues.combatSiteOrders.minimumClickRadius,
      site.radius * balanceValues.combatSiteOrders.clickRadiusRatio,
    );

    expect(
      getCombatSiteAtOrderPosition(state.tacticalMap, {
        x: site.position.x + clickRadius * 0.9,
        y: site.position.y,
      })?.id,
    ).toBe(site.id);
    expect(
      getCombatSiteAtOrderPosition(state.tacticalMap, {
        x: site.position.x + site.radius * 0.8,
        y: site.position.y,
      }),
    ).toBeNull();
  });

  it("keeps units patrolling inside the ordered combat site", () => {
    const state = createInitialState("persistentInfectionV3");
    const site = state.tacticalMap.combatSites[0];
    const macrophageIds = Object.values(state.entities)
      .filter((entity) => entity.kind === "macrophage")
      .slice(0, 3)
      .map((entity) => entity.id);
    let ordered = applyCommand(state, {
      type: "selectEntities",
      entityIds: macrophageIds,
    });

    ordered = applyCommand(ordered, {
      type: "orderGuardArea",
      position: site.position,
      radius: site.radius,
    });

    for (const id of macrophageIds) {
      const unit = ordered.entities[id];

      expect(isImmuneUnit(unit)).toBe(true);
      if (!isImmuneUnit(unit)) {
        continue;
      }

      expect(unit.orderAnchor).toEqual(site.position);
      expect(unit.tacticalState).toBe("movingToSite");
      expect(
        Math.hypot(
          (unit.targetPosition?.x ?? 0) - site.position.x,
          (unit.targetPosition?.y ?? 0) - site.position.y,
        ),
      ).toBeLessThan(site.radius);
    }

    for (let elapsedMs = 0; elapsedMs < 60_000; elapsedMs += 100) {
      ordered.elapsedMs = elapsedMs;
      applyMovementSystem(ordered, 100);
    }

    for (const id of macrophageIds) {
      const unit = ordered.entities[id];

      expect(isImmuneUnit(unit)).toBe(true);
      if (!isImmuneUnit(unit)) {
        continue;
      }

      expect(unit.tacticalState).toBe("guardingArea");
      expect(
        Math.hypot(
          unit.position.x - site.position.x,
          unit.position.y - site.position.y,
        ),
      ).toBeLessThan(site.radius);
    }
  });

  it("does not auto-chase pathogens outside local engagement radius", () => {
    const state = createInitialState();
    const macrophage = Object.values(state.entities).find(
      (entity) => entity.kind === "macrophage",
    );

    if (!macrophage || macrophage.kind !== "macrophage") {
      throw new Error("Expected macrophage");
    }

    macrophage.position = { x: 250, y: 360 };
    macrophage.orderAnchor = { x: 250, y: 360 };
    macrophage.tacticalState = "guardingArea";
    macrophage.targetPosition = null;
    spawnBacterium(state, "cocciRapid", { x: 900, y: 360 });

    const next = stepSimulation(state, 16);
    const after = next.entities[macrophage.id];

    expect(isImmuneUnit(after)).toBe(true);
    if (!isImmuneUnit(after)) {
      throw new Error("Expected immune unit");
    }

    expect(after.targetPosition).toBeNull();
    expect(after.tacticalState).toBe("guardingArea");
  });

  it("engages nearby pathogens but respects leash radius", () => {
    const state = createInitialState();
    const macrophage = Object.values(state.entities).find(
      (entity) => entity.kind === "macrophage",
    );

    if (!macrophage || macrophage.kind !== "macrophage") {
      throw new Error("Expected macrophage");
    }

    macrophage.position = { x: 420, y: 360 };
    macrophage.orderAnchor = { x: 420, y: 360 };
    macrophage.tacticalState = "guardingArea";
    macrophage.targetPosition = null;
    const bacterium = spawnBacterium(state, "cocciRapid", { x: 520, y: 360 });

    const engaging = stepSimulation(state, 16);
    const afterEngage = engaging.entities[macrophage.id];
    const movedBacterium = engaging.entities[bacterium.id];

    expect(isImmuneUnit(afterEngage)).toBe(true);
    if (!isImmuneUnit(afterEngage)) {
      throw new Error("Expected immune unit");
    }

    expect(movedBacterium.kind).toBe("bacterium");
    expect(afterEngage.tacticalState).toBe("engagingNearbyTarget");
    expect(afterEngage.targetPosition).toEqual(movedBacterium.position);

    afterEngage.position = { x: 700, y: 360 };
    afterEngage.orderAnchor = { x: 420, y: 360 };
    afterEngage.tacticalState = "engagingNearbyTarget";
    afterEngage.targetPosition = { x: 740, y: 360 };

    const leashed = stepSimulation(engaging, 16);
    const afterLeash = leashed.entities[macrophage.id];

    expect(isImmuneUnit(afterLeash)).toBe(true);
    if (!isImmuneUnit(afterLeash)) {
      throw new Error("Expected immune unit");
    }

    expect(afterLeash.targetPosition).toEqual({ x: 420, y: 360 });
    expect(afterLeash.lastOrderFeedback).toBe("Retour a la zone d'ordre");
  });

  it("uses role priority so macrophages prefer nearby bacteria over viruses", () => {
    const state = createInitialState();
    const macrophage = Object.values(state.entities).find(
      (entity) => entity.kind === "macrophage",
    );
    const bacteriumDefinition = pathogenDefinitions.cocciRapid;

    if (!macrophage || macrophage.kind !== "macrophage") {
      throw new Error("Expected macrophage");
    }

    macrophage.position = { x: 360, y: 360 };
    macrophage.orderAnchor = { x: 360, y: 360 };
    macrophage.engagementRadius = 140;
    macrophage.attackRange = 120;
    macrophage.attackCooldownRemainingMs = 0;
    const bacterium = spawnBacterium(state, "cocciRapid", { x: 410, y: 360 });
    const virus = spawnVirus(state, "respiratoryVirus", { x: 390, y: 360 });

    applyCombatSystem(state, unitDefinitions.macrophage.attackCooldownMs);

    expect(bacterium.phagocytosedByEntityId).toBeUndefined();
    expect(bacterium.health).toBeLessThan(bacteriumDefinition.maxHealth);
    expect(virus.health).toBe(pathogenDefinitions.respiratoryVirus.maxHealth);
  });

  it("keeps an explicit attack target ahead of automatic role priority", () => {
    const state = createInitialState();
    const macrophage = Object.values(state.entities).find(
      (entity) => entity.kind === "macrophage",
    );

    if (!macrophage || macrophage.kind !== "macrophage") {
      throw new Error("Expected macrophage");
    }

    macrophage.position = { x: 360, y: 360 };
    macrophage.orderAnchor = { x: 360, y: 360 };
    macrophage.engagementRadius = 160;
    macrophage.attackRange = 140;
    macrophage.attackCooldownRemainingMs = 0;
    const bacterium = spawnBacterium(state, "cocciRapid", { x: 390, y: 360 });
    const virus = spawnVirus(state, "respiratoryVirus", { x: 430, y: 360 });

    macrophage.explicitTargetEntityId = virus.id;
    applyCombatSystem(state, unitDefinitions.macrophage.attackCooldownMs);

    expect(virus.health).toBeLessThan(pathogenDefinitions.respiratoryVirus.maxHealth);
    expect(bacterium.health).toBe(pathogenDefinitions.cocciRapid.maxHealth);
  });
});
