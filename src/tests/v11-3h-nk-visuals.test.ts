import { describe, expect, it } from "vitest";
import { missionDefinitions } from "../game/data/missions";
import { unitDefinitions } from "../game/data/units";
import { nkCellSprite } from "../game/phaser/assets/entitySpriteManifest";
import {
  canInterruptNkState,
  didNkAttackTrigger,
  didNkCytotoxicStrike,
  nextNkStateAfterComplete,
  selectNkVisualState,
  toNkEntityVisualState,
} from "../game/phaser/rendering/nkVisualState";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import type { GameState } from "../game/simulation/core/GameState";

describe("V11.3H NK-cell visuals", () => {
  it("maps all six normalized sheet rows without stretching", () => {
    expect(nkCellSprite).toMatchObject({
      enabled: true,
      frameWidth: 72,
      frameHeight: 64,
      frameCount: 48,
      columns: 8,
      rows: 6,
      anchor: { x: 0.5, y: 1 },
      scale: 1,
      orientation: "flipHorizontal",
      allowProceduralFallback: true,
    });
    expect(nkCellSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7, repeat: -1 },
      move: { startFrame: 8, endFrame: 15, repeat: -1 },
      attack: {
        startFrame: 16,
        endFrame: 23,
        impactFrame: 20,
        repeat: 0,
      },
      special: {
        startFrame: 24,
        endFrame: 31,
        impactFrame: 28,
        repeat: 0,
      },
      hurt: { startFrame: 32, endFrame: 39, repeat: 0 },
      dead: { startFrame: 40, endFrame: 47, repeat: 0 },
    });
  });

  it("observes the existing combat cooldown reset as one attack event", () => {
    expect(didNkAttackTrigger(0, 780)).toBe(true);
    expect(didNkAttackTrigger(520, 504)).toBe(false);
  });

  it("distinguishes the coded infected-cell strike by its source effect", () => {
    expect(
      didNkCytotoxicStrike(
        [
          {
            id: "effect-1",
            sourceEntityId: "nk-1",
            kind: "cytotoxic",
            position: { x: 20, y: 30 },
            radius: 10,
            ttlMs: 200,
          },
        ],
        "nk-1",
      ),
    ).toBe(true);
    expect(
      didNkCytotoxicStrike(
        [
          {
            id: "effect-2",
            sourceEntityId: "cytotoxic-t-1",
            kind: "cytotoxic",
            position: { x: 20, y: 30 },
            radius: 10,
            ttlMs: 200,
          },
        ],
        "nk-1",
      ),
    ).toBe(false);
  });

  it("emits the sourced cytotoxic signal from the real infected-cell attack", () => {
    const produced = applyCommand(
      {
        ...createInitialState("viralCleanupV7"),
        resources: {
          atp: unitDefinitions.nkCell.atpCost,
          cytokines: unitDefinitions.nkCell.cytokineCost,
          antigens: 0,
        },
        waves: {
          currentWaveIndex: missionDefinitions.viralCleanupV7.waves.length,
          spawnedInCurrentWave: 0,
        },
      },
      { type: "produceNkCell" },
    );
    const nk = Object.values(produced.entities).find(
      (entity) => entity.kind === "nkCell",
    );
    expect(nk).toBeDefined();

    const state: GameState = {
      ...produced,
      tissueCells: produced.tissueCells.map((cell, index) =>
        index === 0 && nk
          ? {
              ...cell,
              position: { ...nk.position },
              status: "infected",
              health: 30,
            }
          : cell,
      ),
    };
    const next = stepSimulation(state, unitDefinitions.nkCell.attackCooldownMs);

    expect(
      next.effects.some(
        (effect) =>
          effect.kind === "cytotoxic" && effect.sourceEntityId === nk?.id,
      ),
    ).toBe(true);
  });

  it("prioritizes death, hurt, attack, movement, then idle", () => {
    expect(
      selectNkVisualState({
        dead: true,
        hurt: true,
        attacking: true,
        cytotoxicStrike: true,
        moving: true,
      }),
    ).toBe("death");
    expect(
      selectNkVisualState({
        dead: false,
        hurt: true,
        attacking: true,
        cytotoxicStrike: true,
        moving: true,
      }),
    ).toBe("hurt");
    expect(
      selectNkVisualState({
        dead: false,
        hurt: false,
        attacking: true,
        cytotoxicStrike: false,
        moving: true,
      }),
    ).toBe("attack");
    expect(
      selectNkVisualState({
        dead: false,
        hurt: false,
        attacking: true,
        cytotoxicStrike: true,
        moving: false,
      }),
    ).toBe("cytotoxicStrike");
  });

  it("keeps one-shots locked and death terminal", () => {
    expect(canInterruptNkState("attack", "move")).toBe(false);
    expect(canInterruptNkState("attack", "hurt")).toBe(true);
    expect(canInterruptNkState("cytotoxicStrike", "attack")).toBe(false);
    expect(canInterruptNkState("hurt", "death")).toBe(true);
    expect(nextNkStateAfterComplete("attack", true)).toBe("move");
    expect(nextNkStateAfterComplete("death", true)).toBe("death");
    expect(toNkEntityVisualState("cytotoxicStrike")).toBe("special");
    expect(toNkEntityVisualState("death")).toBe("dead");
  });

  it("preserves the procedural fallback when the texture is unavailable", () => {
    const resolved = resolveEntityVisual("nkCell", "attack", {
      hasTexture: () => false,
      hasAnimation: () => true,
    });

    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });
});
