import { describe, expect, it } from "vitest";
import { unitDefinitions, type UnitTypeId } from "../game/data/units";
import { GameBridge } from "../game/phaser/GameBridge";
import { getEntitySpriteDefinition } from "../game/phaser/assets/entitySpriteManifest";
import { createBiofilmVisualPattern } from "../game/phaser/rendering/biofilmVisualModel";
import {
  getPresentedAttackRangeRadius,
  getSelectionRingAlpha,
  SELECTION_RING_WIDTH,
  resolvePresentedRangeEntityId,
} from "../game/phaser/rendering/selectionPresentation";

describe("pre-next-version selection polish", () => {
  it("shows one exact range for a single selection", () => {
    expect(
      resolvePresentedRangeEntityId({
        selectedEntityIds: ["macrophage-1"],
        hoveredSelectedUnitId: null,
        focusedSelectedUnitId: null,
      }),
    ).toBe("macrophage-1");
    expect(getPresentedAttackRangeRadius(56)).toBe(56);
    expect(getPresentedAttackRangeRadius(0)).toBeNull();
  });

  it("keeps multi-selection to one focused or hovered exact range", () => {
    const selectedEntityIds = ["macrophage-1", "neutrophil-2", "nk-3"];

    expect(
      resolvePresentedRangeEntityId({
        selectedEntityIds,
        hoveredSelectedUnitId: null,
        focusedSelectedUnitId: "nk-3",
      }),
    ).toBe("nk-3");
    expect(
      resolvePresentedRangeEntityId({
        selectedEntityIds,
        hoveredSelectedUnitId: "macrophage-1",
        focusedSelectedUnitId: "nk-3",
      }),
    ).toBe("macrophage-1");
    expect(
      resolvePresentedRangeEntityId({
        selectedEntityIds,
        hoveredSelectedUnitId: "neutrophil-2",
        focusedSelectedUnitId: "nk-3",
      }),
    ).toBe("neutrophil-2");
  });

  it("uses thin, quieter selection annotations for dense groups", () => {
    expect(SELECTION_RING_WIDTH).toBe(1);
    expect(getSelectionRingAlpha(8)).toBeLessThan(getSelectionRingAlpha(1));
  });

  it("carries squad-card hover through a presentation-only bridge channel", () => {
    const bridge = new GameBridge();
    const received: Array<string | null> = [];
    const unsubscribe = bridge.subscribeSelectionPresentationCommand((command) => {
      if (command.type === "hoverSelectedUnit") {
        received.push(command.entityId);
      }
    });

    bridge.dispatchSelectionPresentation({
      type: "hoverSelectedUnit",
      entityId: "neutrophil-2",
    });
    bridge.dispatchSelectionPresentation({
      type: "hoverSelectedUnit",
      entityId: null,
    });
    unsubscribe();
    bridge.dispatchSelectionPresentation({
      type: "hoverSelectedUnit",
      entityId: "ignored",
    });

    expect(received).toEqual(["neutrophil-2", null]);
  });
});

describe("canonical squad portraits", () => {
  it("reuses every enabled unit spritesheet without changing its frame aspect", () => {
    const unitTypeIds = Object.keys(unitDefinitions) as UnitTypeId[];

    for (const unitTypeId of unitTypeIds) {
      const definition = getEntitySpriteDefinition(unitTypeId);

      expect(definition, unitTypeId).toBeDefined();
      expect(definition?.enabled, unitTypeId).toBe(true);
      expect(definition?.assetType, unitTypeId).toBe("spritesheet");
      expect(definition?.frameWidth, unitTypeId).toBeGreaterThan(0);
      expect(definition?.frameHeight, unitTypeId).toBeGreaterThan(0);
      expect(definition?.animations.idle?.startFrame, unitTypeId).toBe(0);
      expect(definition?.allowProceduralFallback, unitTypeId).toBe(true);
    }
  });
});

describe("biofilm visual representation", () => {
  it("builds a deterministic irregular matrix patch with nodules and pockets", () => {
    const first = createBiofilmVisualPattern("biofilm-colony-1", 118);
    const repeated = createBiofilmVisualPattern("biofilm-colony-1", 118);
    const different = createBiofilmVisualPattern("biofilm-colony-2", 118);
    const boundaryRadii = first.boundary.map((point) =>
      Math.round(Math.hypot(point.x, point.y)),
    );

    expect(repeated).toEqual(first);
    expect(different).not.toEqual(first);
    expect(new Set(boundaryRadii).size).toBeGreaterThan(5);
    expect(first.nodules).toHaveLength(16);
    expect(first.pockets).toHaveLength(4);
  });
});
