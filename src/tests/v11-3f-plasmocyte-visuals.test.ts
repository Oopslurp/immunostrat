import { describe, expect, it } from "vitest";
import { plasmocyteSprite } from "../game/phaser/assets/entitySpriteManifest";
import {
  canInterruptPlasmocyteState,
  didPlasmocyteAttackTrigger,
  nextPlasmocyteStateAfterComplete,
  selectPlasmocyteVisualState,
  toPlasmocyteEntityVisualState,
} from "../game/phaser/rendering/plasmocyteVisualState";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";

describe("V11.3F plasmocyte visuals", () => {
  it("maps all six sheet rows without stretching the production asset", () => {
    expect(plasmocyteSprite).toMatchObject({
      enabled: true,
      frameWidth: 80,
      frameHeight: 64,
      frameCount: 48,
      columns: 8,
      rows: 6,
      anchor: { x: 0.5, y: 1 },
      scale: 1,
      allowProceduralFallback: true,
    });
    expect(plasmocyteSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7, repeat: -1 },
      move: { startFrame: 8, endFrame: 15, repeat: -1 },
      special: { startFrame: 16, endFrame: 23, repeat: 0 },
      attack: {
        startFrame: 24,
        endFrame: 31,
        impactFrame: 27,
        repeat: 0,
      },
      hurt: { startFrame: 32, endFrame: 39, repeat: 0 },
      dead: { startFrame: 40, endFrame: 47, repeat: 0 },
    });
  });

  it("detects the existing automatic attack from the cooldown reset", () => {
    expect(didPlasmocyteAttackTrigger(0, 950)).toBe(true);
    expect(didPlasmocyteAttackTrigger(620, 604)).toBe(false);
  });

  it("plays produce then secrete for one existing attack event", () => {
    expect(
      selectPlasmocyteVisualState({
        dead: false,
        hurt: false,
        attacking: true,
        moving: false,
      }),
    ).toBe("produce");
    expect(nextPlasmocyteStateAfterComplete("produce", false)).toBe(
      "secrete",
    );
    expect(nextPlasmocyteStateAfterComplete("secrete", true)).toBe("move");
    expect(toPlasmocyteEntityVisualState("produce")).toBe("special");
    expect(toPlasmocyteEntityVisualState("secrete")).toBe("attack");
  });

  it("keeps death terminal and allows damage feedback to interrupt secretion", () => {
    expect(canInterruptPlasmocyteState("produce", "hurt")).toBe(true);
    expect(canInterruptPlasmocyteState("secrete", "move")).toBe(false);
    expect(canInterruptPlasmocyteState("hurt", "death")).toBe(true);
    expect(nextPlasmocyteStateAfterComplete("death", true)).toBe("death");
  });

  it("preserves the procedural fallback when the texture is unavailable", () => {
    const resolved = resolveEntityVisual("plasmocyte", "attack", {
      hasTexture: () => false,
      hasAnimation: () => true,
    });

    expect(resolved).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });
});
