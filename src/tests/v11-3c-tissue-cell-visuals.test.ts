import { describe, expect, it } from "vitest";
import {
  tissueCellSprite,
  validateEntitySpriteManifest,
} from "../game/phaser/assets/entitySpriteManifest";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";
import {
  selectTissueCellVisualState,
} from "../game/phaser/rendering/tissueCellVisualState";

describe("V11.3C tissue-cell visuals", () => {
  it("maps every existing biological state without mutating gameplay", () => {
    const healthy = { status: "healthy" as const, antiviralProtectedMs: 0 };
    const protectedCell = {
      status: "healthy" as const,
      antiviralProtectedMs: 1200,
    };
    const infectedProtected = {
      status: "infected" as const,
      antiviralProtectedMs: 1200,
    };

    expect(selectTissueCellVisualState(healthy)).toBe("healthy");
    expect(selectTissueCellVisualState(protectedCell)).toBe("protected");
    expect(selectTissueCellVisualState(infectedProtected)).toBe(
      "infectedProtected",
    );
    expect(
      selectTissueCellVisualState({
        status: "destroyed",
        antiviralProtectedMs: 1200,
      }),
    ).toBe("destroyed");
    expect(infectedProtected).toEqual({
      status: "infected",
      antiviralProtectedMs: 1200,
    });
  });

  it("declares the validated 5 by 8 sheet and exact frame ranges", () => {
    expect(validateEntitySpriteManifest()).toEqual([]);
    expect(tissueCellSprite).toMatchObject({
      entityType: "tissueCell",
      textureKey: "cell_civilian",
      frameCount: 40,
      columns: 8,
      rows: 5,
      allowProceduralFallback: true,
    });
    expect(tissueCellSprite.animations.healthy).toMatchObject({
      startFrame: 0,
      endFrame: 7,
    });
    expect(tissueCellSprite.animations.infected).toMatchObject({
      startFrame: 8,
      endFrame: 15,
    });
    expect(tissueCellSprite.animations.destroyed).toMatchObject({
      startFrame: 16,
      endFrame: 23,
      repeat: 0,
    });
    expect(tissueCellSprite.animations.protected).toMatchObject({
      startFrame: 24,
      endFrame: 31,
    });
    expect(tissueCellSprite.animations.infectedProtected).toMatchObject({
      startFrame: 32,
      endFrame: 39,
    });
  });

  it("preserves the procedural renderer when the texture is unavailable", () => {
    expect(
      resolveEntityVisual("tissueCell", "healthy", {
        hasTexture: () => false,
        hasAnimation: () => false,
      }),
    ).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
  });
});
