import { describe, expect, it } from "vitest";
import {
  pathogenDefinitions,
  type PathogenTypeId,
} from "../game/data/pathogens";
import {
  getPathogenFamilyAnimationProfile,
  getPathogenVisualVariant,
  pathogenFamilyAnimationProfiles,
  pathogenVisualVariantCounts,
  resolvePathogenVisualFamily,
  resolvePathogenVisualPose,
} from "../game/phaser/rendering/pathogenVisualModel";
import { advancePathogenMotionVisual } from "../game/phaser/rendering/PathogenMotionVisualTracker";

const pathogenTypeIds = Object.keys(pathogenDefinitions) as PathogenTypeId[];

describe("V11.3D pathogen visual cleanup", () => {
  it("covers every registered pathogen with a reusable visual family", () => {
    expect(pathogenTypeIds).toHaveLength(29);

    const resolvedFamilies = new Set(
      pathogenTypeIds.map((pathogenTypeId) =>
        resolvePathogenVisualFamily(pathogenTypeId),
      ),
    );

    expect(resolvedFamilies).toEqual(
      new Set([
        "bacterium",
        "virus",
        "fungus",
        "parasite",
        "cancerCell",
        "collective",
      ]),
    );
    expect(resolvePathogenVisualFamily("biofilmColony")).toBe("collective");
    expect(resolvePathogenVisualFamily("mixedOpportunistCluster")).toBe(
      "collective",
    );
    expect(resolvePathogenVisualFamily("opportunistBacterium")).toBe(
      "bacterium",
    );
    expect(resolvePathogenVisualFamily("secondaryBacterium")).toBe(
      "bacterium",
    );
    expect(resolvePathogenVisualFamily("toxicBacterium")).toBe("bacterium");
    expect(resolvePathogenVisualFamily("bloodProtozoan")).toBe("parasite");
  });

  it("keeps 2 to 4 deterministic variants per family without frame randomness", () => {
    for (const count of Object.values(pathogenVisualVariantCounts)) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }

    for (const pathogenTypeId of pathogenTypeIds) {
      const family = resolvePathogenVisualFamily(pathogenTypeId);
      const variants = Array.from({ length: 24 }, (_, index) =>
        getPathogenVisualVariant(`entity-${index}`, pathogenTypeId),
      );

      expect(getPathogenVisualVariant("stable-id", pathogenTypeId)).toBe(
        getPathogenVisualVariant("stable-id", pathogenTypeId),
      );
      expect(Math.min(...variants)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...variants)).toBeLessThan(
        pathogenVisualVariantCounts[family],
      );
      expect(new Set(variants).size).toBeGreaterThanOrEqual(2);
    }
  });

  it("derives bounded idle and attack poses without mutating visual input", () => {
    const input = {
      identity: "bacterium-42",
      pathogenTypeId: "cocciRapid" as const,
      elapsedMs: 8_250,
      attackCooldownMs: 1_000,
      attackCooldownRemainingMs: 910,
    };
    const before = { ...input };
    const pose = resolvePathogenVisualPose(input);

    expect(input).toEqual(before);
    expect(Math.abs(pose.bobY)).toBeLessThanOrEqual(1);
    expect(pose.scaleX).toBeGreaterThanOrEqual(0.97);
    expect(pose.scaleX).toBeLessThanOrEqual(1.13);
    expect(pose.scaleY).toBeGreaterThanOrEqual(0.92);
    expect(pose.scaleY).toBeLessThanOrEqual(1.03);
    expect(pose.attackPulse).toBeGreaterThan(0.9);
  });

  it("assigns a distinct movement, attack, and death language to every family", () => {
    const profiles = Object.values(pathogenFamilyAnimationProfiles);

    expect(new Set(profiles.map((profile) => profile.movement)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.attack)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.death)).size).toBe(6);
    expect(getPathogenFamilyAnimationProfile("respiratoryVirus")).toEqual({
      movement: "driftSpin",
      attack: "viralEntry",
      death: "capsidFracture",
    });
    expect(getPathogenFamilyAnimationProfile("parasiteHelminth")).toEqual({
      movement: "slither",
      attack: "tendrilStrike",
      death: "segmentBreak",
    });
  });

  it("derives visually different locomotion poses for the six pathogen families", () => {
    const examples: PathogenTypeId[] = [
      "cocciRapid",
      "respiratoryVirus",
      "fungalSpore",
      "parasiteHelminth",
      "invasiveCancerCell",
      "biofilmColony",
    ];
    const poses = examples.map((pathogenTypeId) =>
      resolvePathogenVisualPose({
        identity: "shared-motion",
        pathogenTypeId,
        elapsedMs: 1_000,
        movementPhase: Math.PI / 3,
        movementIntensity: 1,
        facingAngle: 0.7,
      }),
    );

    expect(new Set(poses.map((pose) => `${pose.offsetX}:${pose.bobY}`)).size).toBeGreaterThan(2);
    expect(poses[1].scaleX).toBeGreaterThan(poses[5].scaleX);
    expect(poses.every((pose) => pose.facingAngle === 0.7)).toBe(true);
  });

  it("tracks locomotion as renderer-only state without mutating simulation input", () => {
    const firstInput = {
      identity: "pathogen-motion-1",
      x: 10,
      y: 20,
      movementSpeed: 50,
      deltaMs: 100,
    };
    const before = { ...firstInput };
    const first = advancePathogenMotionVisual(undefined, firstInput);
    const moved = advancePathogenMotionVisual(first, {
      ...firstInput,
      x: 15,
    });
    const stopped = advancePathogenMotionVisual(moved, {
      ...firstInput,
      x: 15,
    });

    expect(firstInput).toEqual(before);
    expect(moved.movementIntensity).toBe(1);
    expect(moved.facingAngle).toBeCloseTo(0);
    expect(moved.movementPhase).toBeGreaterThan(first.movementPhase);
    expect(stopped.movementIntensity).toBeLessThan(moved.movementIntensity);
  });
});
