import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { createInitialState } from "../game/simulation/core/createInitialState";
import {
  applyResourceSystem,
  getResourceIncomeRates,
} from "../game/simulation/systems/resourceSystem";

describe("V11.5 passive resource income", () => {
  it("regenerates ATP, cytokines and unlocked antigens over time", () => {
    const state = createInitialState("antigenAnalysisV4");
    state.resources = { atp: 0, cytokines: 0, antigens: 0 };
    const rates = getResourceIncomeRates(state);

    applyResourceSystem(state, 10_000);

    expect(rates.atp).toBeGreaterThan(balanceValues.passiveAtpPerSecond);
    expect(rates.cytokines).toBeGreaterThan(
      balanceValues.passiveCytokinesPerSecond,
    );
    expect(rates.antigens).toBeGreaterThan(
      balanceValues.passiveAntigensPerSecond,
    );
    expect(rates.antigens).toBeLessThan(rates.atp);
    expect(state.resources.atp).toBeCloseTo(rates.atp * 10);
    expect(state.resources.cytokines).toBeCloseTo(rates.cytokines * 10);
    expect(state.resources.antigens).toBeCloseTo(rates.antigens * 10);
  });

  it("keeps antigens inactive before dendritic gameplay is introduced", () => {
    const state = createInitialState("persistentInfectionV3");
    state.resources.antigens = 0;

    applyResourceSystem(state, 120_000);

    expect(getResourceIncomeRates(state).antigens).toBe(0);
    expect(state.resources.antigens).toBe(0);
  });

  it("caps the passive dendritic antigen bonus", () => {
    const state = createInitialState("antigenAnalysisV4");
    const dendritic = Object.values(state.entities).find(
      (entity) => entity.kind === "dendriticCell",
    );

    expect(dendritic).toBeDefined();
    if (!dendritic) {
      throw new Error("Expected the antigen mission to start with a dendritic cell");
    }

    for (let index = 0; index < 5; index += 1) {
      const id = `passive-dendritic-${index}`;
      state.entities[id] = { ...dendritic, id };
    }

    const rates = getResourceIncomeRates(state);
    const incomeMultiplier = rates.atp / balanceValues.passiveAtpPerSecond;
    const expectedAntigensPerSecond =
      (balanceValues.passiveAntigensPerSecond +
        balanceValues.passiveAntigensPerDendriticPerSecond *
          balanceValues.passiveAntigenDendriticCap) *
      incomeMultiplier;

    expect(rates.antigens).toBeCloseTo(expectedAntigensPerSecond);
  });

  it("keeps passive income lower on harder infinite difficulties", () => {
    const normal = getResourceIncomeRates(
      createInitialState("infiniteSurvivalV8", {
        infiniteDifficulty: "normal",
      }),
    );
    const nightmare = getResourceIncomeRates(
      createInitialState("infiniteSurvivalV8", {
        infiniteDifficulty: "nightmare",
      }),
    );

    expect(nightmare.atp).toBeLessThan(normal.atp);
    expect(nightmare.cytokines).toBeLessThan(normal.cytokines);
    expect(nightmare.antigens).toBeLessThan(normal.antigens);
  });

  it("caps starting resources before the first simulation tick", () => {
    const state = createInitialState("infiniteSurvivalV8", {
      infiniteDifficulty: "normal",
    });

    expect(state.resources.atp).toBeLessThanOrEqual(balanceValues.maxAtp);
    expect(state.resources.cytokines).toBeLessThanOrEqual(
      balanceValues.maxCytokines,
    );
    expect(state.resources.antigens).toBeLessThanOrEqual(
      balanceValues.maxAntigens,
    );
  });

  it("never regenerates resources above their caps", () => {
    const state = createInitialState("antigenAnalysisV4");
    state.resources = {
      atp: balanceValues.maxAtp - 0.1,
      cytokines: balanceValues.maxCytokines - 0.1,
      antigens: balanceValues.maxAntigens - 0.1,
    };

    applyResourceSystem(state, 60_000);

    expect(state.resources).toEqual({
      atp: balanceValues.maxAtp,
      cytokines: balanceValues.maxCytokines,
      antigens: balanceValues.maxAntigens,
    });
  });
});
