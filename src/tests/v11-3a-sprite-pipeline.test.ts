import { describe, expect, it, vi } from "vitest";
import {
  getEntitySpriteDefinition,
  macrophagePilotSprite,
  validateEntitySpriteManifest,
  type EntitySpriteDefinition,
} from "../game/phaser/assets/entitySpriteManifest";
import { registerEntityAnimations } from "../game/phaser/animations/registerEntityAnimations";
import {
  mapTacticalStateToVisualState,
  resolveImmuneUnitVisualState,
} from "../game/phaser/rendering/entityVisualState";
import { resolveEntityVisual } from "../game/phaser/rendering/spriteResolver";

function enabledMacrophage(
  overrides: Partial<EntitySpriteDefinition> = {},
): EntitySpriteDefinition {
  return {
    ...macrophagePilotSprite,
    enabled: true,
    ...overrides,
  };
}

describe("V11.3A sprite pipeline", () => {
  it("keeps the validated V11.3B macrophage sheet in the central manifest", () => {
    expect(validateEntitySpriteManifest()).toEqual([]);
    expect(getEntitySpriteDefinition("macrophage")).toMatchObject({
      textureKey: "unit_macrophage",
      enabled: true,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 48,
      allowProceduralFallback: true,
    });
  });

  it("reports duplicate texture and animation keys", () => {
    const duplicate = enabledMacrophage({ entityType: "macrophage-copy" });
    const issues = validateEntitySpriteManifest([
      enabledMacrophage(),
      duplicate,
    ]);

    expect(issues.some((issue) => issue.field === "textureKey")).toBe(true);
    expect(issues.some((issue) => issue.field.includes("animations"))).toBe(true);
  });

  it("maps existing tactical states without changing gameplay state", () => {
    expect(mapTacticalStateToVisualState("movingToPoint")).toBe("move");
    expect(mapTacticalStateToVisualState("engagingNearbyTarget")).toBe("attack");
    expect(mapTacticalStateToVisualState("collectingAntigen")).toBe("collect");
    expect(mapTacticalStateToVisualState("guardingArea")).toBe("idle");

    expect(
      resolveImmuneUnitVisualState({
        health: 30,
        tacticalState: "deliveringToLymph",
        carriedDebrisCount: 2,
      }),
    ).toBe("carry");
  });

  it("uses the procedural fallback when the texture is absent or an entry is disabled", () => {
    const availability = {
      hasTexture: () => false,
      hasAnimation: () => false,
    };

    expect(resolveEntityVisual("macrophage", "idle", availability)).toMatchObject({
      kind: "procedural",
      reason: "texture-missing",
    });
    expect(
      resolveEntityVisual("macrophage", "idle", availability, [{
        ...enabledMacrophage(),
        enabled: false,
      }]),
    ).toMatchObject({ kind: "procedural", reason: "disabled" });
  });

  it("falls back to idle when a requested animation is unavailable", () => {
    const definition = enabledMacrophage({
      animations: { idle: macrophagePilotSprite.animations.idle },
    });
    const resolved = resolveEntityVisual(
      "macrophage",
      "attack",
      {
        hasTexture: () => true,
        hasAnimation: (key) => key === "unit.macrophage.idle",
      },
      [definition],
    );

    expect(resolved).toMatchObject({
      kind: "sprite",
      resolvedState: "idle",
      animationKey: "unit.macrophage.idle",
    });
  });

  it("does not recreate an animation already present in the Phaser registry", () => {
    const createdKeys = new Set<string>();
    const create = vi.fn(({ key }: { key: string }) => {
      createdKeys.add(key);
    });
    const definition = enabledMacrophage({
      animations: { idle: macrophagePilotSprite.animations.idle },
    });
    const scene = {
      textures: {
        exists: () => true,
        get: () => ({ setFilter: vi.fn() }),
      },
      anims: {
        exists: (key: string) => createdKeys.has(key),
        create,
        generateFrameNumbers: () => [],
      },
    };

    registerEntityAnimations(scene as never, [definition]);
    registerEntityAnimations(scene as never, [definition]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ key: "unit.macrophage.idle" }),
    );
  });
});
