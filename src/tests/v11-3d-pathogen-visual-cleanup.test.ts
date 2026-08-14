import { describe, expect, it } from "vitest";
import {
  pathogenDefinitions,
  type PathogenTypeId,
} from "../game/data/pathogens";
import {
  getPathogenVisualVariant,
  pathogenVisualVariantCounts,
  resolvePathogenVisualFamily,
  resolvePathogenVisualPose,
} from "../game/phaser/rendering/pathogenVisualModel";

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
});
