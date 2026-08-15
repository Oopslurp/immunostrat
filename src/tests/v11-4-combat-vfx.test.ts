import { describe, expect, it } from "vitest";
import type Phaser from "phaser";
import type { CombatEffect, GameState } from "../game/simulation/core/GameState";
import { cloneState } from "../game/simulation/core/cloneState";
import { createInitialState } from "../game/simulation/core/createInitialState";
import {
  isBacterium,
  isMacrophage,
  type GameEntity,
  type NkCellEntity,
  type CytotoxicTEntity,
  type NeutrophilEntity,
} from "../game/simulation/entities";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { CombatVfxController } from "../game/phaser/vfx/CombatVfxController";
import {
  classifyCombatEffect,
  COMBAT_VFX_DEPTHS,
  COMBAT_VFX_LIMITS,
  COMBAT_VFX_PRESETS,
  getImmuneArrivalPreset,
  getPathogenDamagePreset,
  resolveCommandFeedback,
  VfxDensityGovernor,
} from "../game/phaser/vfx/combatVfxModel";

describe("V11.4 combat VFX and biological feedback", () => {
  it("maps real effects to distinct biological languages without duplicating signature states", () => {
    const state = createInitialState("woundBacteriaV1");
    const macrophage = Object.values(state.entities).find(isMacrophage);
    if (!macrophage) throw new Error("Expected an initial macrophage");

    const nk: NkCellEntity = {
      ...macrophage,
      id: "nk-vfx-test",
      kind: "nkCell",
      unitTypeId: "nkCell",
    };
    const cytotoxicT: CytotoxicTEntity = {
      ...macrophage,
      id: "t-vfx-test",
      kind: "cytotoxicT",
      unitTypeId: "cytotoxicT",
    };
    state.entities[nk.id] = nk;
    state.entities[cytotoxicT.id] = cytotoxicT;

    expect(classifyCombatEffect(state, effect("cytotoxic", nk.id))).toBe(
      "cytotoxicRough",
    );
    expect(classifyCombatEffect(state, effect("cytotoxic", cytotoxicT.id))).toBe(
      "cytotoxicPrecise",
    );
    expect(classifyCombatEffect(state, effect("cytotoxic"))).toBe(
      "cancerReveal",
    );
    expect(classifyCombatEffect(state, effect("attack", macrophage.id))).toBe(
      "physicalContact",
    );
    expect(classifyCombatEffect(state, effect("antiviral"))).toBe(
      "interferonResponse",
    );
    expect(classifyCombatEffect(state, effect("phagocytosis"))).toBeNull();
    expect(classifyCombatEffect(state, effect("netTrap"))).toBeNull();
  });

  it("keeps six pathogen damage reactions visually distinct from existing death animations", () => {
    expect(getPathogenDamagePreset("bacterium")).toBe(
      "pathogenDamageBacterium",
    );
    expect(getPathogenDamagePreset("virus")).toBe("pathogenDamageVirus");
    expect(getPathogenDamagePreset("fungus")).toBe("pathogenDamageFungus");
    expect(getPathogenDamagePreset("parasite")).toBe("pathogenDamageParasite");
    expect(getPathogenDamagePreset("cancerCell")).toBe(
      "pathogenDamageCancer",
    );
    expect(getPathogenDamagePreset("collective")).toBe(
      "pathogenDamageCollective",
    );

    for (const preset of Object.values(COMBAT_VFX_PRESETS)) {
      expect(preset.durationMs).toBeGreaterThanOrEqual(180);
      expect(preset.durationMs).toBeLessThanOrEqual(520);
      expect(preset.particleCount).toBeLessThanOrEqual(5);
    }
  });

  it("throttles repeated local events and opens a fresh density window", () => {
    const governor = new VfxDensityGovernor();
    const preset = COMBAT_VFX_PRESETS.physicalContact;
    const position = { x: 200, y: 200 };

    expect(governor.allows(preset, position, 0)).toBe(true);
    expect(governor.allows(preset, position, 0)).toBe(false);
    expect(
      governor.allows(
        preset,
        position,
        COMBAT_VFX_LIMITS.densityWindowMs + 1,
      ),
    ).toBe(true);
    governor.reset();
    expect(governor.allows(preset, position, 0)).toBe(true);
  });

  it("resolves only command acknowledgements with a real world position", () => {
    const state = createInitialState("woundBacteriaV1");
    const hostile = spawnBacterium(state, "cocciRapid", { x: 280, y: 260 });
    const macrophage = Object.values(state.entities).find(isMacrophage);
    if (!macrophage) throw new Error("Expected an initial macrophage");

    expect(
      resolveCommandFeedback(
        { type: "orderMove", position: { x: 320, y: 240 } },
        state,
      ),
    ).toBeNull();
    state.selectedEntityIds = [macrophage.id];

    expect(
      resolveCommandFeedback(
        { type: "orderMove", position: { x: 320, y: 240 } },
        state,
      ),
    ).toEqual({
      presetId: "commandMove",
      position: { x: 320, y: 240 },
    });
    expect(
      resolveCommandFeedback(
        { type: "orderAttack", targetEntityId: hostile.id },
        state,
      ),
    ).toEqual({
      presetId: "commandEngage",
      position: hostile.position,
    });
    expect(
      resolveCommandFeedback(
        { type: "orderAttack", targetEntityId: "missing" },
        state,
      ),
    ).toBeNull();
    expect(resolveCommandFeedback({ type: "produceMacrophage" }, state)).toBeNull();
  });

  it("keeps vascular, lymphatic, diapedesis and relay arrivals distinct", () => {
    const state = createInitialState("woundBacteriaV1");
    const macrophage = Object.values(state.entities).find(isMacrophage);
    if (!macrophage) throw new Error("Expected an initial macrophage");

    expect(getImmuneArrivalPreset(macrophage)).toBe("vascularEntry");
    expect(
      getImmuneArrivalPreset({
        ...macrophage,
        kind: "neutrophil",
        unitTypeId: "neutrophil",
      } as GameEntity),
    ).toBe("diapedesis");
    expect(
      getImmuneArrivalPreset({
        ...macrophage,
        kind: "dendriticCell",
        unitTypeId: "dendriticCell",
      } as GameEntity),
    ).toBe("lymphArrival");
    expect(
      getImmuneArrivalPreset({
        ...macrophage,
        kind: "plasmocyte",
        unitTypeId: "plasmocyte",
      } as GameEntity),
    ).toBe("immuneRelay");
  });

  it("creates fixed crisp layers, pools bounded feedback, and never mutates game state", () => {
    const scene = new FakeScene();
    const controller = new CombatVfxController(scene as never);
    const state = createInitialState("woundBacteriaV1");
    controller.update(state, 16);

    const next = cloneState(state);
    next.elapsedMs += 16;
    next.effects = Array.from({ length: 120 }, (_, index) => ({
      ...effect("attack"),
      id: `stress-effect-${index}`,
      position: {
        x: 120 + (index % 12) * 74,
        y: 120 + (Math.floor(index / 12) % 8) * 74,
      },
    }));
    const before = JSON.stringify(next);

    controller.update(next, 16);
    const stats = controller.getDebugStats();
    expect(JSON.stringify(next)).toBe(before);
    expect(stats.activeBursts).toBeGreaterThan(0);
    expect(stats.activeBursts).toBeLessThanOrEqual(COMBAT_VFX_LIMITS.maxBursts);
    expect(stats.activeParticles).toBeLessThanOrEqual(
      COMBAT_VFX_LIMITS.maxParticles,
    );
    expect(scene.graphics.map((graphics) => graphics.depth)).toEqual([
      COMBAT_VFX_DEPTHS.ground,
      COMBAT_VFX_DEPTHS.combat,
      COMBAT_VFX_DEPTHS.command,
    ]);

    controller.destroy();
    expect(scene.graphics.every((graphics) => graphics.destroyed)).toBe(true);
  });

  it("derives damage, phagocytosis and diapedesis from real state transitions", () => {
    const scene = new FakeScene();
    const controller = new CombatVfxController(scene as never);
    const state = createInitialState("woundBacteriaV1");
    const macrophage = Object.values(state.entities).find(isMacrophage);
    if (!macrophage) throw new Error("Expected an initial macrophage");
    const bacterium = spawnBacterium(state, "cocciRapid", {
      x: macrophage.position.x + 20,
      y: macrophage.position.y,
    });
    controller.update(state, 16);

    const attacked = cloneState(state);
    attacked.elapsedMs += 16;
    const attackedBacterium = attacked.entities[bacterium.id];
    if (!attackedBacterium || !isBacterium(attackedBacterium)) {
      throw new Error("Expected cloned bacterium");
    }
    attackedBacterium.health -= 4;
    attackedBacterium.phagocytosedByEntityId = macrophage.id;
    attackedBacterium.phagocytosisRemainingMs = 800;
    controller.update(attacked, 16);

    expect(controller.getDebugStats().activePresetIds).toEqual(
      expect.arrayContaining([
        "pathogenDamageBacterium",
        "phagocytosisContact",
      ]),
    );

    controller.reset(attacked);
    const recruited = cloneState(attacked);
    const sourceMacrophage = Object.values(recruited.entities).find(isMacrophage);
    if (!sourceMacrophage) throw new Error("Expected recruited-state macrophage");
    const neutrophil: NeutrophilEntity = {
      ...sourceMacrophage,
      id: "neutrophil-vfx-arrival",
      kind: "neutrophil",
      unitTypeId: "neutrophil",
      position: { ...recruited.tacticalMap.diapedesisPoints[0].position },
    };
    recruited.entities[neutrophil.id] = neutrophil;
    recruited.elapsedMs += 16;
    controller.update(recruited, 16);
    expect(controller.getDebugStats().activePresetIds).toContain("diapedesis");
  });

  it("clears all differential state when simulation time moves backwards", () => {
    const scene = new FakeScene();
    const controller = new CombatVfxController(scene as never);
    const initial = createInitialState("woundBacteriaV1");
    initial.elapsedMs = 1_000;
    controller.update(initial, 16);

    const active = cloneState(initial);
    active.elapsedMs = 1_016;
    active.effects.push({
      ...effect("attack"),
      id: "effect-before-restart",
    });
    controller.update(active, 16);
    expect(controller.getDebugStats().activeBursts).toBeGreaterThan(0);

    const restarted = createInitialState("woundBacteriaV1");
    controller.update(restarted, 16);
    expect(controller.getDebugStats()).toMatchObject({
      activeBursts: 0,
      activeParticles: 0,
    });
  });

  it("does not duplicate a covered antibody sprite impact or spawn off-camera VFX", () => {
    const scene = new FakeScene();
    const controller = new CombatVfxController(scene as never);
    const initial = createInitialState("woundBacteriaV1");
    controller.update(initial, 16);

    const next = cloneState(initial);
    next.elapsedMs += 16;
    next.effects.push({
      ...effect("antibodyImpact"),
      id: "covered-antibody-impact",
    });
    next.effects.push({
      ...effect("attack"),
      id: "off-camera-attack",
      position: { x: 8_000, y: 8_000 },
    });
    controller.update(next, 16, {
      isEffectCovered: (candidate) => candidate.id === "covered-antibody-impact",
    });

    expect(controller.getDebugStats()).toMatchObject({
      activeBursts: 0,
      activeParticles: 0,
    });
  });
});

function effect(
  kind: CombatEffect["kind"],
  sourceEntityId?: string,
): CombatEffect {
  return {
    id: `effect-${kind}-${sourceEntityId ?? "none"}`,
    sourceEntityId,
    kind,
    position: { x: 240, y: 240 },
    radius: 18,
    ttlMs: 220,
  };
}

class FakeGraphics {
  depth = 0;
  destroyed = false;
  drawCalls = 0;

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  clear(): this {
    this.drawCalls = 0;
    return this;
  }

  destroy(): void {
    this.destroyed = true;
  }

  lineStyle(): this {
    return this;
  }

  lineBetween(): this {
    this.drawCalls += 1;
    return this;
  }

  fillStyle(): this {
    return this;
  }

  fillRect(): this {
    this.drawCalls += 1;
    return this;
  }
}

class FakeScene {
  readonly graphics: FakeGraphics[] = [];
  readonly add = {
    graphics: (): Phaser.GameObjects.Graphics => {
      const graphics = new FakeGraphics();
      this.graphics.push(graphics);
      return graphics as never;
    },
  };
  readonly cameras = {
    main: {
      worldView: {
        x: 0,
        y: 0,
        right: 1_200,
        bottom: 900,
      },
    },
  };
}
