import { describe, expect, it } from "vitest";
import {
  findSelectableUnitAtPoint,
  findSelectableUnitsIntersectingRect,
} from "../game/phaser/input/unitSelection";

const units = [
  { id: "macrophage-a", position: { x: 100, y: 100 }, radius: 24 },
  { id: "macrophage-b", position: { x: 132, y: 100 }, radius: 24 },
] as const;

describe("V11.5 selection reliability patch", () => {
  it("adds a screen-space tolerance around visible unit bodies", () => {
    expect(
      findSelectableUnitAtPoint(units, { x: 131, y: 100 }, 1),
    ).toBe("macrophage-b");
    expect(
      findSelectableUnitAtPoint([units[0]], { x: 131, y: 100 }, 1),
    ).toBe("macrophage-a");
    expect(
      findSelectableUnitAtPoint([units[0]], { x: 131, y: 100 }, 2),
    ).toBeNull();
  });

  it("selects a unit when the rectangle intersects its visible body", () => {
    expect(
      findSelectableUnitsIntersectingRect(
        [units[0]],
        { x: 126, y: 92 },
        { x: 142, y: 108 },
        1,
      ),
    ).toEqual(["macrophage-a"]);
  });

  it("keeps units outside a genuinely separate rectangle unselected", () => {
    expect(
      findSelectableUnitsIntersectingRect(
        units,
        { x: 170, y: 80 },
        { x: 190, y: 120 },
        1,
      ),
    ).toEqual([]);
  });
});
