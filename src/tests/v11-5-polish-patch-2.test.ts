import { describe, expect, it } from "vitest";
import { GameBridge } from "../game/phaser/GameBridge";
import {
  FOCUS_CAMERA_TWEEN_DURATION_MS,
  FOCUS_CAMERA_ZOOM_MULTIPLIER,
  getFocusCameraTarget,
} from "../game/phaser/rendering/focusCameraPresentation";
import {
  FOCUS_SPOTLIGHT_BANDS,
  FOCUS_SPOTLIGHT_MAX_DARKNESS,
} from "../game/phaser/rendering/selectionInspectionPresentation";
import {
  getSelectedImmuneUnits,
  getUnitHealthRatio,
} from "../game/phaser/rendering/selectionHudModel";
import { resolvePresentedRangeEntityId } from "../game/phaser/rendering/selectionPresentation";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { isImmuneUnit } from "../game/simulation/entities";

describe("Polish Patch 2 selection presentation", () => {
  it("keeps multi-selection range quiet until hover or explicit focus", () => {
    const selectedEntityIds = ["macrophage-1", "neutrophil-2", "nk-3"];

    expect(
      resolvePresentedRangeEntityId({
        selectedEntityIds,
        hoveredSelectedUnitId: null,
        focusedSelectedUnitId: null,
      }),
    ).toBeNull();
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
        hoveredSelectedUnitId: "neutrophil-2",
        focusedSelectedUnitId: "nk-3",
      }),
    ).toBe("neutrophil-2");
  });

  it("exchanges hover and focus without touching authoritative selection", () => {
    const bridge = new GameBridge();
    const commands: string[] = [];
    const states: Array<readonly [string | null, string | null]> = [];
    const unsubscribeCommands = bridge.subscribeSelectionPresentationCommand(
      (command) => commands.push(command.type),
    );
    const unsubscribeStates = bridge.subscribeSelectionPresentation((state) =>
      states.push([
        state.hoveredSelectedUnitId,
        state.focusedSelectedUnitId,
      ]),
    );

    bridge.dispatchSelectionPresentation({
      type: "hoverSelectedUnit",
      entityId: "macrophage-1",
    });
    bridge.dispatchSelectionPresentation({
      type: "toggleFocusedSelectedUnit",
      entityId: "macrophage-1",
    });
    bridge.publishSelectionPresentation({
      hoveredSelectedUnitId: "macrophage-1",
      focusedSelectedUnitId: "macrophage-1",
    });
    unsubscribeCommands();
    unsubscribeStates();

    expect(commands).toEqual([
      "hoverSelectedUnit",
      "toggleFocusedSelectedUnit",
    ]);
    expect(states).toEqual([
      [null, null],
      ["macrophage-1", "macrophage-1"],
    ]);
  });

  it("maps cards to exact selected IDs in authoritative order and real HP", () => {
    const state = createInitialState("woundBacteriaV1");
    const immuneUnits = Object.values(state.entities).filter(isImmuneUnit);
    const selectedIds = [immuneUnits[1].id, immuneUnits[0].id];
    const selectedUnits = getSelectedImmuneUnits(
      Object.values(state.entities),
      selectedIds,
    );

    expect(selectedUnits.map((unit) => unit.id)).toEqual(selectedIds);
    expect(
      getUnitHealthRatio({
        ...selectedUnits[0],
        health: selectedUnits[0].maxHealth / 4,
      }),
    ).toBe(0.25);
  });
});

describe("Polish Patch 2 focus camera", () => {
  it("uses one non-compounding six-percent tactical zoom", () => {
    const first = getFocusCameraTarget({
      unitPosition: { x: 1_420, y: 780 },
      cameraScroll: { x: 0, y: 0 },
      cameraZoom: 1,
      tacticalZoom: 1,
      viewportWidth: 1_280,
      viewportHeight: 720,
      worldWidth: 2_000,
      worldHeight: 1_200,
    });
    const transferred = getFocusCameraTarget({
      unitPosition: { x: 1_100, y: 620 },
      cameraScroll: { x: first.scrollX, y: first.scrollY },
      cameraZoom: first.zoom,
      tacticalZoom: 1,
      viewportWidth: 1_280,
      viewportHeight: 720,
      worldWidth: 2_000,
      worldHeight: 1_200,
    });

    expect(FOCUS_CAMERA_ZOOM_MULTIPLIER).toBe(1.06);
    expect(FOCUS_CAMERA_TWEEN_DURATION_MS).toBe(210);
    expect(first.zoom).toBe(1.06);
    expect(transferred.zoom).toBe(1.06);
    expect(first.repositionsCamera).toBe(true);
    expect(first.scrollX).toBeGreaterThan(0);
  });

  it("keeps the quantized spotlight generous and below ten percent darkness", () => {
    expect(FOCUS_SPOTLIGHT_BANDS.map((band) => band.radius)).toEqual([
      210, 295, 390,
    ]);
    expect(FOCUS_SPOTLIGHT_MAX_DARKNESS).toBeGreaterThan(0.08);
    expect(FOCUS_SPOTLIGHT_MAX_DARKNESS).toBeLessThanOrEqual(0.1);
  });
});
