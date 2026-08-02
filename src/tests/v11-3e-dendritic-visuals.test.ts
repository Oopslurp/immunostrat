import { describe, expect, it } from "vitest";
import { dendriticCellSprite } from "../game/phaser/assets/entitySpriteManifest";
import {
  canInterruptDendriticState,
  didDendriticCollect,
  didDendriticSignal,
  selectDendriticVisualState,
} from "../game/phaser/rendering/dendriticVisualState";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";

describe("V11.3E dendritic visuals", () => {
  it("maps the seven core rows and the three carried-antigen movement rows", () => {
    expect(dendriticCellSprite).toMatchObject({
      enabled: true,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 80,
      columns: 8,
      rows: 10,
      anchor: { x: 0.5, y: 1 },
      scale: 1,
      allowProceduralFallback: true,
    });
    expect(dendriticCellSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7, repeat: -1 },
      move: { startFrame: 8, endFrame: 15, repeat: -1 },
      collect: { startFrame: 16, endFrame: 23, repeat: 0 },
      carry: { startFrame: 24, endFrame: 31, repeat: -1 },
      signal: { startFrame: 32, endFrame: 39, repeat: 0 },
      hurt: { startFrame: 40, endFrame: 47, repeat: 0 },
      dead: { startFrame: 48, endFrame: 55, repeat: 0 },
      moveCarry1: { startFrame: 56, endFrame: 63, repeat: -1 },
      moveCarry2: { startFrame: 64, endFrame: 71, repeat: -1 },
      moveCarry3: { startFrame: 72, endFrame: 79, repeat: -1 },
    });
  });

  it("selects the carry animation from the exact debris count", () => {
    const base = {
      dead: false,
      hurt: false,
      collected: false,
      signalled: false,
      moving: true,
      carriedDebrisCount: 0,
    };

    expect(selectDendriticVisualState(base)).toBe("move");
    expect(
      selectDendriticVisualState({ ...base, carriedDebrisCount: 1 }),
    ).toBe("moveCarry1");
    expect(
      selectDendriticVisualState({ ...base, carriedDebrisCount: 2 }),
    ).toBe("moveCarry2");
    expect(
      selectDendriticVisualState({ ...base, carriedDebrisCount: 3 }),
    ).toBe("moveCarry3");
    expect(
      selectDendriticVisualState({
        ...base,
        moving: false,
        carriedDebrisCount: 2,
      }),
    ).toBe("carry");
  });

  it("plays collect on acquisition and signal only on lymph delivery", () => {
    expect(didDendriticCollect(0, 1)).toBe(true);
    expect(didDendriticCollect(2, 2)).toBe(false);
    expect(didDendriticSignal(2, 0, "away")).toBe(true);
    expect(didDendriticSignal(2, 0, "following")).toBe(false);
    expect(didDendriticSignal(0, 0, "away")).toBe(false);

    const base = {
      dead: false,
      hurt: false,
      collected: false,
      signalled: false,
      moving: true,
      carriedDebrisCount: 2,
    };
    expect(selectDendriticVisualState({ ...base, collected: true })).toBe(
      "collect",
    );
    expect(selectDendriticVisualState({ ...base, signalled: true })).toBe(
      "signal",
    );
  });

  it("keeps death terminal and lets signal outrank hurt or collection", () => {
    expect(canInterruptDendriticState("collect", "signal")).toBe(true);
    expect(canInterruptDendriticState("signal", "hurt")).toBe(false);
    expect(canInterruptDendriticState("signal", "death")).toBe(true);
    expect(canInterruptDendriticState("death", "signal")).toBe(false);
  });

  it("preserves the procedural fallback when the texture is unavailable", () => {
    const resolved = resolveEntityVisual("dendriticCell", "moveCarry3", {
      hasTexture: () => false,
      hasAnimation: () => true,
    });

    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });
});
