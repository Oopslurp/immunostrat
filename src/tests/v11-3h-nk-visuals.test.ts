import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { unitDefinitions } from "../game/data/units";
import { nkCellSprite } from "../game/phaser/assets/entitySpriteManifest";
import {
  canInterruptNkState,
  didNkCytotoxicStrike,
  didNkFinisherTrigger,
  selectNkVisualState,
  toNkEntityVisualState,
} from "../game/phaser/rendering/nkVisualState";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState, TissueCellState } from "../game/simulation/core/GameState";
import { isNkCell, type NkCellEntity } from "../game/simulation/entities";
import { spawnAdvancedThreat } from "../game/simulation/pathogens/createAdvancedThreat";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { applyCombatSystem } from "../game/simulation/systems/combatSystem";

function createNkState(): { state: GameState; nk: NkCellEntity } {
  const state = applyCommand(
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
  const nk = Object.values(state.entities).find(isNkCell);
  if (!nk) throw new Error("Expected produced NK cell");
  state.entities = { [nk.id]: nk };
  state.tissueCells = [];
  state.effects = [];
  return { state, nk };
}

function createTissueCell(
  nk: NkCellEntity,
  status: TissueCellState["status"],
): TissueCellState {
  return {
    id: `cell-${status}`,
    position: { ...nk.position },
    health: 80,
    maxHealth: 80,
    radius: 18,
    status,
    infectedByPathogenTypeId:
      status === "infected" ? "respiratoryVirus" : undefined,
    infectedElapsedMs: status === "infected" ? 500 : 0,
    nextVirusBurstMs: 1000,
    antiviralProtectedMs: 0,
  };
}

describe("V11.3H NK detection and finisher", () => {
  it("maps the two detection rows in the normalized 8x8 sheet", () => {
    expect(nkCellSprite).toMatchObject({
      enabled: true,
      frameWidth: 72,
      frameHeight: 64,
      frameCount: 64,
      columns: 8,
      rows: 8,
      anchor: { x: 0.5, y: 1 },
      scale: 1,
      orientation: "flipHorizontal",
      allowProceduralFallback: true,
    });
    expect(nkCellSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7 },
      move: { startFrame: 8, endFrame: 15 },
      attack: { startFrame: 16, endFrame: 23 },
      special: { startFrame: 24, endFrame: 31, impactFrame: 28 },
      hurt: { startFrame: 32, endFrame: 39 },
      dead: { startFrame: 40, endFrame: 47 },
      detectNormal: { startFrame: 48, endFrame: 55, repeat: -1 },
      detectAbnormal: { startFrame: 56, endFrame: 63, repeat: -1 },
    });
  });

  it("uses detection states before the cytotoxic finisher", () => {
    expect(
      selectNkVisualState({
        dead: false,
        hurt: false,
        finishing: false,
        detectionOutcome: "normal",
        moving: false,
      }),
    ).toBe("detectNormal");
    expect(
      selectNkVisualState({
        dead: false,
        hurt: false,
        finishing: false,
        detectionOutcome: "abnormal",
        moving: false,
      }),
    ).toBe("detectAbnormal");
    expect(
      selectNkVisualState({
        dead: false,
        hurt: false,
        finishing: true,
        detectionOutcome: "abnormal",
        moving: false,
      }),
    ).toBe("cytotoxicStrike");
    expect(canInterruptNkState("detectAbnormal", "cytotoxicStrike")).toBe(true);
    expect(toNkEntityVisualState("detectNormal")).toBe("detectNormal");
    expect(toNkEntityVisualState("detectAbnormal")).toBe("detectAbnormal");
  });

  it("attributes only the sourced cytotoxic effect to the NK finisher", () => {
    expect(didNkFinisherTrigger(0, 780)).toBe(true);
    expect(didNkFinisherTrigger(520, 504)).toBe(false);
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
  });

  it("takes time to recognize a normal cell and never damages it", () => {
    const { state, nk } = createNkState();
    const cell = createTissueCell(nk, "healthy");
    state.tissueCells = [cell];

    applyCombatSystem(state, 16);
    expect(nk.detectionState?.outcome).toBe("normal");
    applyCombatSystem(state, balanceValues.combat.nkDetectionDurationMs);

    expect(cell.status).toBe("healthy");
    expect(cell.health).toBe(80);
    expect(nk.scannedNormalCellIds).toContain(cell.id);
    expect(state.effects.some((effect) => effect.kind === "cytotoxic")).toBe(false);
  });

  it("waits for detection then destroys an infected cell with one finisher", () => {
    const { state, nk } = createNkState();
    const cell = createTissueCell(nk, "infected");
    state.tissueCells = [cell];

    applyCombatSystem(state, 16);
    applyCombatSystem(state, balanceValues.combat.nkDetectionDurationMs - 1);
    expect(cell.status).toBe("infected");
    expect(cell.health).toBe(80);

    applyCombatSystem(state, 1);
    expect(cell.status).toBe("destroyed");
    expect(cell.health).toBe(0);
    expect(
      state.effects.some(
        (effect) =>
          effect.kind === "cytotoxic" && effect.sourceEntityId === nk.id,
      ),
    ).toBe(true);
  });

  it("waits for detection then finishes a cancer cell in one strike", () => {
    const { state, nk } = createNkState();
    const cancer = spawnAdvancedThreat(state, "cancerCellCluster", {
      ...nk.position,
    });
    expect(cancer.detected).toBe(false);

    applyCombatSystem(state, 16);
    applyCombatSystem(state, balanceValues.combat.nkDetectionDurationMs - 1);
    expect(cancer.health).toBe(cancer.maxHealth);
    expect(cancer.detected).toBe(false);

    applyCombatSystem(state, 1);
    expect(cancer.health).toBe(0);
    expect(cancer.detected).toBe(true);
  });

  it("does not target or damage ordinary free pathogens", () => {
    const { state, nk } = createNkState();
    const bacterium = spawnBacterium(state, "toughBacterium", {
      x: nk.position.x + 10,
      y: nk.position.y,
    });

    applyCombatSystem(state, balanceValues.combat.nkDetectionDurationMs * 2);

    expect(bacterium.health).toBe(bacterium.maxHealth);
    expect(nk.detectionState).toBeUndefined();
    expect(nk.targetPosition).toBeNull();
  });

  it("preserves the procedural fallback when the texture is unavailable", () => {
    const resolved = resolveEntityVisual("nkCell", "detectAbnormal", {
      hasTexture: () => false,
      hasAnimation: () => true,
    });

    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });
});
