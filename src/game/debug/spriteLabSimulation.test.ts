import { describe, expect, it } from "vitest";
import {
  assignSpriteLabTarget,
  beginSpriteLabDrag,
  createSpriteLabSimulation,
  dragSpriteLabUnit,
  findNearestSpriteLabPathogen,
  resetSpriteLabUnit,
  stepSpriteLabSimulation,
} from "./spriteLabSimulation";

describe("sprite lab simulation", () => {
  it("keeps every unit still until the player drags it or assigns a target", () => {
    const initial = createSpriteLabSimulation();
    const stepped = stepSpriteLabSimulation(initial, 5000).state;

    expect(stepped.units.plasmocyte.position).toEqual(
      initial.units.plasmocyte.position,
    );
    expect(stepped.units.plasmocyte.mode).toBe("idle");
  });

  it("lets a dragged unit acquire the nearest pathogen and approach with real movement", () => {
    const initial = createSpriteLabSimulation();
    const dragged = dragSpriteLabUnit(
      beginSpriteLabDrag(initial, "macrophage"),
      "macrophage",
      { x: 900, y: 180 },
    );
    const pathogenId = findNearestSpriteLabPathogen(
      dragged,
      dragged.units.macrophage.position,
    );
    const targeted = assignSpriteLabTarget(dragged, "macrophage", pathogenId);
    const stepped = stepSpriteLabSimulation(targeted, 500).state;

    expect(stepped.units.macrophage.position).not.toEqual(
      targeted.units.macrophage.position,
    );
    expect(stepped.units.macrophage.animationState).toBe("move");
  });

  it("emits repeatable attacks without finite health or entity removal", () => {
    const initial = createSpriteLabSimulation();
    const targetId = findNearestSpriteLabPathogen(
      initial,
      initial.units.plasmocyte.position,
    );
    let state = assignSpriteLabTarget(initial, "plasmocyte", targetId);
    let attackCount = 0;

    for (let index = 0; index < 40; index += 1) {
      const result = stepSpriteLabSimulation(state, 250);
      state = result.state;
      attackCount += result.events.filter((event) => event.kind === "attack").length;
    }

    expect(attackCount).toBeGreaterThan(1);
    expect(state.units.plasmocyte).toBeDefined();
    expect(state.pathogens[targetId]).toBeDefined();
    expect("health" in state.units.plasmocyte).toBe(false);
    expect("health" in state.pathogens[targetId]).toBe(false);
  });

  it("returns a moved unit to its original row", () => {
    const initial = createSpriteLabSimulation();
    const moved = dragSpriteLabUnit(initial, "nkCell", { x: 1200, y: 400 });
    const reset = resetSpriteLabUnit(moved, "nkCell");

    expect(reset.units.nkCell.position).toEqual(
      initial.units.nkCell.homePosition,
    );
    expect(reset.units.nkCell.targetPathogenId).toBeNull();
  });
});
