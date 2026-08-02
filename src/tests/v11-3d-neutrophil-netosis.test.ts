import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { neutrophilSprite } from "../game/phaser/assets/entitySpriteManifest";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";
import { cloneState } from "../game/simulation/core/cloneState";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import type { GameState } from "../game/simulation/core/GameState";
import { isNeutrophil, type NeutrophilEntity } from "../game/simulation/entities";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { applyImmuneLifecycleSystem } from "../game/simulation/systems/immuneLifecycleSystem";
import {
  applyNetTrapSystem,
  spawnNetTrap,
} from "../game/simulation/systems/netTrapSystem";

describe("V11.3D neutrophil NETosis", () => {
  it("maps all seven sheet rows, including distinct normal death and NET states", () => {
    expect(neutrophilSprite).toMatchObject({
      enabled: true,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 56,
      columns: 8,
      rows: 7,
      scale: 1,
    });
    expect(neutrophilSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7, repeat: -1 },
      move: { startFrame: 8, endFrame: 15, repeat: -1 },
      attack: { startFrame: 16, endFrame: 22, repeat: 0 },
      netBurst: { startFrame: 24, endFrame: 30, repeat: 0 },
      netTrap: { startFrame: 32, endFrame: 39, repeat: -1 },
      hurt: { startFrame: 40, endFrame: 47, repeat: 0 },
      dead: { startFrame: 48, endFrame: 55, repeat: 0 },
    });
  });

  it("uses normal death without a nearby pathogen and never creates a NET", () => {
    const state = createNetTestState();
    const neutrophil = getNeutrophil(state);
    neutrophil.health = 0;

    applyImmuneLifecycleSystem(state, 0);
    expect(neutrophil.deathState).toBe("death");
    expect(state.netTraps).toHaveLength(0);

    applyImmuneLifecycleSystem(
      state,
      balanceValues.netosis.normalDeathDurationMs,
    );
    expect(state.entities[neutrophil.id]).toBeUndefined();
    expect(state.netTraps).toHaveLength(0);
  });

  it("commits to one irreversible NET burst when health reaches zero near a pathogen", () => {
    const state = createNetTestState();
    const neutrophil = getNeutrophil(state);
    const bacterium = spawnBacterium(
      state,
      "cocciRapid",
      { x: neutrophil.position.x + 40, y: neutrophil.position.y },
    );
    neutrophil.health = 0;

    applyImmuneLifecycleSystem(state, 0);
    expect(neutrophil.deathState).toBe("netBurst");
    expect(state.netTraps).toHaveLength(0);

    bacterium.health = 0;
    applyImmuneLifecycleSystem(state, balanceValues.netosis.trapSpawnDelayMs);
    applyImmuneLifecycleSystem(state, 50);
    expect(state.netTraps).toHaveLength(1);
    expect(neutrophil.netTrapCreated).toBe(true);
  });

  it("applies the same NET decision to lifetime expiry", () => {
    const withEnemy = createNetTestState();
    const active = getNeutrophil(withEnemy);
    spawnBacterium(withEnemy, "cocciRapid", {
      x: active.position.x + balanceValues.netosis.triggerRadius,
      y: active.position.y,
    });
    active.lifeRemainingMs = 0;
    applyImmuneLifecycleSystem(withEnemy, 0);
    expect(active.deathState).toBe("netBurst");

    const withoutEnemy = createNetTestState();
    const expired = getNeutrophil(withoutEnemy);
    expired.lifeRemainingMs = 0;
    applyImmuneLifecycleSystem(withoutEnemy, 0);
    expect(expired.deathState).toBe("death");
  });

  it("attracts only local pathogens and roots targets in the capture radius", () => {
    const state = createNetTestState();
    const origin = { x: 500, y: 400 };
    const local = spawnBacterium(state, "cocciRapid", { x: 590, y: 400 });
    const distant = spawnBacterium(state, "cocciRapid", { x: 900, y: 400 });
    spawnNetTrap(state, "neutrophil-test", origin);

    applyNetTrapSystem(state, 250);
    expect(local.position.x).toBeLessThan(590);
    expect(local.netMovementMultiplier).toBe(
      balanceValues.netosis.pathogenSlowMultiplier,
    );
    expect(distant.position).toEqual({ x: 900, y: 400 });
    expect(distant.netMovementMultiplier).toBeUndefined();

    local.position = { x: 510, y: 400 };
    applyNetTrapSystem(state, 250);
    expect(local.netMovementMultiplier).toBe(0);
    expect(state.netTraps[0].capturedEntityIds).toContain(local.id);
  });

  it("ticks damage independently of frame subdivision and does not stack overlapping NETs", () => {
    const coarse = createDamageState();
    const fine = cloneState(coarse);

    applyNetTrapSystem(coarse, 1000);
    for (let index = 0; index < 4; index += 1) {
      applyNetTrapSystem(fine, 250);
    }

    expect(coarse.entities["net-target"].health).toBe(
      fine.entities["net-target"].health,
    );
    expect(coarse.entities["net-target"].health).toBe(20);

    const overlap = createDamageState();
    spawnNetTrap(overlap, "second-neutrophil", { x: 500, y: 400 });
    applyNetTrapSystem(overlap, 250);
    expect(overlap.entities["net-target"].health).toBe(27.5);
  });

  it("stops damage and clears capture references exactly after three seconds", () => {
    const state = createDamageState();
    const target = state.entities["net-target"];

    applyNetTrapSystem(state, balanceValues.netosis.durationMs);
    expect(state.netTraps).toHaveLength(0);
    expect(target.health).toBe(0);
    expect("netTrapId" in target ? target.netTrapId : undefined).toBeUndefined();
    expect(
      "netMovementMultiplier" in target
        ? target.netMovementMultiplier
        : undefined,
    ).toBeUndefined();

    applyNetTrapSystem(state, 1000);
    expect(target.health).toBe(0);
  });

  it("damages civilian cells without moving them and ignores destroyed cells", () => {
    const state = createNetTestState();
    const cell = state.tissueCells[0];
    cell.position = { x: 500, y: 400 };
    const originalPosition = { ...cell.position };
    const destroyedCell = state.tissueCells[1];
    destroyedCell.position = { x: 505, y: 400 };
    destroyedCell.status = "destroyed";
    destroyedCell.health = 0;
    const tissueBefore = state.tissue.health;
    spawnNetTrap(state, "neutrophil-test", { x: 500, y: 400 });

    applyNetTrapSystem(state, 1000);
    expect(cell.position).toEqual(originalPosition);
    expect(cell.health).toBe(
      cell.maxHealth - balanceValues.netosis.civilianDamagePerSecond,
    );
    expect(destroyedCell.health).toBe(0);
    expect(state.tissue.health).toBe(tissueBefore);
  });

  it("freezes NET timers while paused and resumes deterministically", () => {
    const state = createDamageState();
    state.status = "victory";
    const paused = stepSimulation(state, 1000);

    expect(paused).toBe(state);
    expect(paused.netTraps[0].remainingMs).toBe(
      balanceValues.netosis.durationMs,
    );

    state.status = "running";
    const resumed = stepSimulation(state, 250);
    expect(resumed.netTraps[0].remainingMs).toBe(
      balanceValues.netosis.durationMs - 250,
    );
  });

  it("keeps the procedural fallback when the NET burst animation is unavailable", () => {
    const resolved = resolveEntityVisual("neutrophil", "netBurst", {
      hasTexture: () => true,
      hasAnimation: () => false,
    });

    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "animation-missing",
    });
  });
});

function createNetTestState(): GameState {
  const state = createInitialState("inflammatoryReactionV2");
  state.entities = Object.fromEntries(
    Object.entries(state.entities).filter(([, entity]) => isNeutrophil(entity)),
  );
  state.netTraps = [];
  state.effects = [];
  state.status = "running";
  return state;
}

function getNeutrophil(state: GameState): NeutrophilEntity {
  const neutrophil = Object.values(state.entities).find(isNeutrophil);
  if (!neutrophil) {
    throw new Error("Expected a neutrophil in the test state");
  }
  return neutrophil;
}

function createDamageState(): GameState {
  const state = createNetTestState();
  const bacterium = spawnBacterium(state, "cocciRapid", { x: 500, y: 400 });
  delete state.entities[bacterium.id];
  state.entities["net-target"] = {
    ...bacterium,
    id: "net-target",
    health: 30,
    maxHealth: 30,
  };
  spawnNetTrap(state, "neutrophil-test", { x: 500, y: 400 });
  return state;
}
