import { describe, expect, it } from "vitest";
import { cytotoxicTSprite } from "../game/phaser/assets/entitySpriteManifest";
import {
  canInterruptCytotoxicTState,
  didCytotoxicTAttackTrigger,
  didCytotoxicTStrikeEffect,
  nextCytotoxicTStateAfterComplete,
  selectCytotoxicTVisualState,
  toCytotoxicTEntityVisualState,
} from "../game/phaser/rendering/cytotoxicTVisualState";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";

describe("V11.3I cytotoxic T visuals", () => {
  it("maps all seven normalized rows without stretching", () => {
    expect(cytotoxicTSprite).toMatchObject({
      enabled: true,
      frameWidth: 72,
      frameHeight: 64,
      frameCount: 56,
      columns: 8,
      rows: 7,
      anchor: { x: 0.5, y: 1 },
      scale: 1,
      orientation: "flipHorizontal",
      allowProceduralFallback: true,
    });
    expect(cytotoxicTSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7, repeat: -1 },
      move: { startFrame: 8, endFrame: 15, repeat: -1 },
      attack: { startFrame: 16, endFrame: 23, impactFrame: 20 },
      special: { startFrame: 16, endFrame: 23, impactFrame: 20 },
      hurt: { startFrame: 24, endFrame: 31, repeat: 0 },
      dead: { startFrame: 32, endFrame: 39, repeat: 0 },
      detectNormal: { startFrame: 40, endFrame: 47, repeat: -1 },
      detectAbnormal: { startFrame: 48, endFrame: 55, repeat: -1 },
    });
  });

  it("uses the existing cooldown reset as the strike trigger", () => {
    expect(didCytotoxicTAttackTrigger(0, 760)).toBe(true);
    expect(didCytotoxicTAttackTrigger(520, 504)).toBe(false);
  });

  it("attributes generic and cytotoxic effects to the attacking T cell", () => {
    expect(
      didCytotoxicTStrikeEffect(
        [
          {
            id: "effect-1",
            sourceEntityId: "t-1",
            kind: "attack",
            position: { x: 20, y: 30 },
            radius: 10,
            ttlMs: 200,
          },
        ],
        "t-1",
      ),
    ).toBe(true);
    expect(
      didCytotoxicTStrikeEffect(
        [
          {
            id: "effect-2",
            sourceEntityId: "t-2",
            kind: "cytotoxic",
            position: { x: 20, y: 30 },
            radius: 10,
            ttlMs: 200,
          },
        ],
        "t-1",
      ),
    ).toBe(false);
  });

  it("keeps strike, hurt, and death as ordered one-shot states", () => {
    expect(
      selectCytotoxicTVisualState({
        dead: false,
        hurt: false,
        attacking: true,
        moving: false,
      }),
    ).toBe("cytotoxicStrike");
    expect(canInterruptCytotoxicTState("cytotoxicStrike", "hurt")).toBe(true);
    expect(canInterruptCytotoxicTState("hurt", "death")).toBe(true);
    expect(nextCytotoxicTStateAfterComplete("cytotoxicStrike", true)).toBe(
      "move",
    );
    expect(nextCytotoxicTStateAfterComplete("death", true)).toBe("death");
    expect(toCytotoxicTEntityVisualState("cytotoxicStrike")).toBe("special");
  });

  it("preserves the procedural fallback when the texture is unavailable", () => {
    const resolved = resolveEntityVisual("cytotoxicT", "special", {
      hasTexture: () => false,
      hasAnimation: () => true,
    });
    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });
});
