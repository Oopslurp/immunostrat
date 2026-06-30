import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { missionDefinitions } from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import { unitDefinitions } from "../game/data/units";
import { applyCommand } from "../game/simulation/core/commands";
import { createInitialState } from "../game/simulation/core/createInitialState";
import type { GameState } from "../game/simulation/core/GameState";
import { stepSimulation } from "../game/simulation/core/stepSimulation";
import { spawnBacterium } from "../game/simulation/pathogens/createBacterium";
import { spawnVirus } from "../game/simulation/pathogens/createVirus";

describe("V5 viral infection and tissue cells", () => {
  it("starts with tissue cells and an initial immune force", () => {
    const state = createInitialState("mixedInfectionV8");

    expect(state.tissueCells.length).toBeGreaterThan(6);
    expect(
      Object.values(state.entities).filter((entity) => entity.kind === "macrophage"),
    ).toHaveLength(3);
    expect(
      Object.values(state.entities).filter((entity) => entity.kind === "neutrophil"),
    ).toHaveLength(1);
    expect(
      Object.values(state.entities).filter(
        (entity) => entity.kind === "dendriticCell",
      ),
    ).toHaveLength(1);
  });

  it("spawns viruses from V5 mission waves", () => {
    const state: GameState = {
      ...createInitialState("viralInfectionV6"),
      elapsedMs: 1500,
      waves: {
        currentWaveIndex: 0,
        spawnedInCurrentWave: 0,
      },
    };
    const next = stepSimulation(state, 16);

    expect(
      Object.values(next.entities).some((entity) => entity.kind === "virus"),
    ).toBe(true);
  });

  it("free viruses infect healthy tissue cells and reduce tissue health", () => {
    const initial = createInitialState("viralInfectionV6");
    const targetCell = initial.tissueCells[0];
    const state: GameState = {
      ...initial,
      entities: {},
      waves: {
        currentWaveIndex: missionDefinitions.viralInfectionV6.waves.length,
        spawnedInCurrentWave: 0,
      },
    };

    spawnVirus(state, "respiratoryVirus", {
      x: targetCell.position.x + 2,
      y: targetCell.position.y,
    });

    const infected = stepSimulation(state, 100);

    expect(infected.tissueCells[0].status).toBe("infected");
    expect(infected.tissue.health).toBeLessThan(initial.tissue.health);
    expect(
      Object.values(infected.entities).some((entity) => entity.kind === "virus"),
    ).toBe(false);
  });

  it("infected tissue cells produce new viruses over time", () => {
    const state: GameState = {
      ...createInitialState("viralInfectionV6"),
      entities: {},
      waves: {
        currentWaveIndex: missionDefinitions.viralInfectionV6.waves.length,
        spawnedInCurrentWave: 0,
      },
      tissueCells: createInitialState("viralInfectionV6").tissueCells.map((cell, index) =>
        index === 0
          ? {
              ...cell,
              status: "infected",
              infectedElapsedMs: 4000,
              nextVirusBurstMs: 0,
            }
          : cell,
      ),
    };

    const next = stepSimulation(state, 16);

    expect(
      Object.values(next.entities).filter((entity) => entity.kind === "virus"),
    ).toHaveLength(balanceValues.tissueCells.infectedVirusBurstCount);
  });

  it("antiviral signal costs cytokines and activates temporary protection", () => {
    const state: GameState = {
      ...createInitialState("viralInfectionV6"),
      resources: {
        atp: 100,
        cytokines: balanceValues.antiviral.cytokineCost,
        antigens: 0,
      },
    };

    const next = applyCommand(state, { type: "useAntiviralSignal" });

    expect(next.resources.cytokines).toBe(0);
    expect(next.antiviral.activeMs).toBe(balanceValues.antiviral.durationMs);
    expect(
      next.tissueCells.filter((cell) => cell.antiviralProtectedMs > 0).length,
    ).toBeGreaterThan(0);
    expect(next.productionCooldowns.antiviralSignalMs).toBe(
      balanceValues.antiviral.cooldownMs,
    );
  });

  it("produces NK cells that damage infected tissue cells", () => {
    const produced = applyCommand(
      {
        ...createInitialState("viralCleanupV7"),
        resources: {
          atp: unitDefinitions.nkCell.atpCost,
          cytokines: unitDefinitions.nkCell.cytokineCost,
          antigens: 0,
        },
        waves: {
          currentWaveIndex: missionDefinitions.viralCleanupV7.waves.length,
          spawnedInCurrentWave: 0,
        },
      },
      { type: "produceNkCell" },
    );
    const nk = Object.values(produced.entities).find(
      (entity) => entity.kind === "nkCell",
    );

    expect(nk).toBeDefined();

    const infectedHealth = 30;
    const state: GameState = {
      ...produced,
      tissueCells: produced.tissueCells.map((cell, index) =>
        index === 0 && nk
          ? {
              ...cell,
              position: { ...nk.position },
              status: "infected",
              health: infectedHealth,
            }
          : cell,
      ),
    };
    const next = stepSimulation(state, unitDefinitions.nkCell.attackCooldownMs);

    expect(next.tissueCells[0].health).toBeLessThan(infectedHealth);
  });

  it("locks cytotoxic T cells behind viral analysis and antigen cost", () => {
    const locked = applyCommand(
      {
        ...createInitialState("viralCleanupV7"),
        resources: {
          atp: 200,
          cytokines: 120,
          antigens:
            balanceValues.adaptive.viralAnalysisAntigenCost +
            balanceValues.adaptive.cytotoxicTAntigenCost,
        },
      },
      { type: "produceCytotoxicT" },
    );

    expect(
      Object.values(locked.entities).some((entity) => entity.kind === "cytotoxicT"),
    ).toBe(false);

    const researched = applyCommand(locked, { type: "researchViralAnalysis" });
    const produced = applyCommand(researched, { type: "produceCytotoxicT" });

    expect(produced.adaptiveResearch.viralAnalysisComplete).toBe(true);
    expect(
      Object.values(produced.entities).some(
        (entity) => entity.kind === "cytotoxicT",
      ),
    ).toBe(true);
  });

  it("cytotoxic T cells can destroy infected tissue cells and expose viral antigen", () => {
    const researched = applyCommand(
      {
        ...createInitialState("viralCleanupV7"),
        resources: {
          atp: 200,
          cytokines: 120,
          antigens:
            balanceValues.adaptive.viralAnalysisAntigenCost +
            balanceValues.adaptive.cytotoxicTAntigenCost,
        },
        waves: {
          currentWaveIndex: missionDefinitions.viralCleanupV7.waves.length,
          spawnedInCurrentWave: 0,
        },
      },
      { type: "researchViralAnalysis" },
    );
    const produced = applyCommand(researched, { type: "produceCytotoxicT" });
    const cytotoxicT = Object.values(produced.entities).find(
      (entity) => entity.kind === "cytotoxicT",
    );

    expect(cytotoxicT).toBeDefined();

    const state: GameState = {
      ...produced,
      tissueCells: produced.tissueCells.map((cell, index) =>
        index === 0 && cytotoxicT
          ? {
              ...cell,
              position: { ...cytotoxicT.position },
              status: "infected",
              health: unitDefinitions.cytotoxicT.attackDamage,
            }
          : cell,
      ),
    };
    const next = stepSimulation(state, unitDefinitions.cytotoxicT.attackCooldownMs);

    expect(next.tissueCells[0].status).toBe("destroyed");
    expect(next.debris.some((debris) => debris.pathogenTypeId === "respiratoryVirus"))
      .toBe(true);
  });

  it("defines the respiratory virus as a viral pathogen", () => {
    expect(pathogenDefinitions.respiratoryVirus.pathogenClass).toBe("virus");
    expect(pathogenDefinitions.respiratoryVirus.family).toBe("virus");
  });

  it("expires free viruses that cannot find a healthy tissue cell", () => {
    const state: GameState = {
      ...createInitialState(),
      entities: {},
      waves: {
        currentWaveIndex: missionDefinitions.woundBacteriaV1.waves.length,
        spawnedInCurrentWave: 0,
      },
      tissueCells: createInitialState().tissueCells.map((cell) => ({
        ...cell,
        status: "destroyed",
      })),
    };

    spawnVirus(state, "respiratoryVirus", { x: 640, y: 400 });

    const next = stepSimulation(state, balanceValues.virus.freeLifetimeMs + 100);

    expect(Object.values(next.entities).some((entity) => entity.kind === "virus"))
      .toBe(false);
  });

  it("defeats the player when too many civilian tissue cells are compromised", () => {
    const compromisedCount = Math.ceil(
      createInitialState().tissueCells.length *
        balanceValues.missionFailure.maxCompromisedTissueCellRatio,
    );
    const state: GameState = {
      ...createInitialState(),
      waves: {
        currentWaveIndex: missionDefinitions.woundBacteriaV1.waves.length,
        spawnedInCurrentWave: 0,
      },
      tissueCells: createInitialState().tissueCells.map((cell, index) => ({
        ...cell,
        status: index < compromisedCount ? "destroyed" : "healthy",
      })),
    };

    const next = stepSimulation(state, 16);

    expect(next.status).toBe("defeat");
  });

  it("lets bacteria damage immune units at close range", () => {
    const state: GameState = {
      ...createInitialState(),
      entities: {},
      waves: {
        currentWaveIndex: missionDefinitions.woundBacteriaV1.waves.length,
        spawnedInCurrentWave: 0,
      },
    };
    const macrophage = unitDefinitions.macrophage;

    state.entities["macrophage-test"] = {
      id: "macrophage-test",
      kind: "macrophage",
      unitTypeId: "macrophage",
      position: { x: 500, y: 400 },
      targetPosition: null,
      idleTargetPosition: null,
      nextIdleRetargetMs: 999999,
      health: macrophage.maxHealth,
      maxHealth: macrophage.maxHealth,
      radius: macrophage.radius,
      movementSpeed: macrophage.movementSpeed,
      idleMovementSpeed: macrophage.idleMovementSpeed,
      attackRange: macrophage.attackRange,
      attackDamage: macrophage.attackDamage,
      attackCooldownMs: macrophage.attackCooldownMs,
      attackCooldownRemainingMs: 0,
      carriedAntigenValue: 0,
      carriedDebrisCount: 0,
    };
    spawnBacterium(state, "toxicBacterium", { x: 508, y: 400 });

    const next = stepSimulation(state, 16);
    const damaged = next.entities["macrophage-test"];

    expect(damaged?.kind).toBe("macrophage");
    expect(damaged?.health).toBeLessThan(macrophage.maxHealth);
  });
});
