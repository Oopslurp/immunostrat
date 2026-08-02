import { describe, expect, it } from "vitest";
import { macrophagePilotSprite } from "../game/phaser/assets/entitySpriteManifest";
import { calculatePhagocytosisVisualTransform } from "../game/phaser/rendering/macrophagePhagocytosisVisual";
import {
  canInterruptMacrophageState,
  didMacrophageAttackTrigger,
  resolveStableHorizontalFacing,
  selectMacrophageVisualState,
  shouldPlayMacrophageAnimation,
  stateAfterMacrophageAnimationComplete,
} from "../game/phaser/rendering/macrophageVisualState";

describe("V11.3B macrophage visuals", () => {
  it("ships an 8 by 6 sheet and maps every animation row", () => {
    expect(macrophagePilotSprite).toMatchObject({
      enabled: true,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 48,
      columns: 8,
      rows: 6,
      anchor: { x: 0.5, y: 1 },
      scale: 1,
    });
    expect(macrophagePilotSprite.animations).toMatchObject({
      idle: { startFrame: 0, endFrame: 7, repeat: -1 },
      move: { startFrame: 8, endFrame: 15, repeat: -1 },
      attack: { startFrame: 16, endFrame: 23, impactFrame: 20, repeat: 0 },
      phagocytosis: { startFrame: 24, endFrame: 31, impactFrame: 29, repeat: 0 },
      hurt: { startFrame: 32, endFrame: 39, repeat: 0 },
      dead: { startFrame: 40, endFrame: 47, repeat: 0 },
    });
  });

  it("uses the required state priority", () => {
    const base = {
      dead: false,
      hurt: false,
      phagocytosing: false,
      attacking: false,
      moving: false,
    };
    expect(selectMacrophageVisualState({ ...base, moving: true })).toBe("move");
    expect(selectMacrophageVisualState({ ...base, moving: true, attacking: true })).toBe("attack");
    expect(selectMacrophageVisualState({ ...base, attacking: true, phagocytosing: true })).toBe("phagocytosis");
    expect(selectMacrophageVisualState({ ...base, phagocytosing: true, hurt: true })).toBe("phagocytosis");
    expect(selectMacrophageVisualState({ ...base, hurt: true, dead: true })).toBe("death");
  });

  it("does not restart the same active animation", () => {
    expect(
      shouldPlayMacrophageAnimation(
        "unit.macrophage.attack",
        "unit.macrophage.attack",
        true,
      ),
    ).toBe(false);
    expect(
      shouldPlayMacrophageAnimation(
        "unit.macrophage.attack",
        "unit.macrophage.attack",
        false,
      ),
    ).toBe(true);
  });

  it("returns to locomotion after one-shots and keeps death terminal", () => {
    expect(stateAfterMacrophageAnimationComplete("attack", false)).toBe("idle");
    expect(stateAfterMacrophageAnimationComplete("hurt", true)).toBe("move");
    expect(stateAfterMacrophageAnimationComplete("death", true)).toBe("death");
    expect(canInterruptMacrophageState("attack", "move")).toBe(false);
    expect(canInterruptMacrophageState("attack", "hurt")).toBe(true);
    expect(canInterruptMacrophageState("phagocytosis", "hurt")).toBe(false);
    expect(canInterruptMacrophageState("phagocytosis", "death")).toBe(true);
    expect(canInterruptMacrophageState("death", "hurt")).toBe(false);
  });

  it("detects attack transitions and stabilizes horizontal flip", () => {
    expect(didMacrophageAttackTrigger(0, 1050)).toBe(true);
    expect(didMacrophageAttackTrigger(850, 834)).toBe(false);
    expect(resolveStableHorizontalFacing(1, -0.4, 20)).toBe(-1);
    expect(resolveStableHorizontalFacing(-1, 0.01, 0.4)).toBe(-1);
    expect(resolveStableHorizontalFacing(-1, 0, 20)).toBe(1);
  });

  it("moves and shrinks a captured target without mutating gameplay input", () => {
    const input = {
      bacteriumPosition: { x: 100, y: 100 },
      macrophagePosition: { x: 200, y: 100 },
      attachmentPoint: { x: 17, y: -2 },
      facing: 1 as const,
      remainingMs: 410,
      durationMs: 820,
    };
    const snapshot = JSON.stringify(input);
    const visual = calculatePhagocytosisVisualTransform(input);

    expect(visual.progress).toBe(0.5);
    expect(visual.x).toBeCloseTo(187.75);
    expect(visual.y).toBeCloseTo(98.5);
    expect(visual.scale).toBeCloseTo(0.415);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
