import { describe, expect, it } from "vitest";
import { balanceValues } from "../game/data/balance";
import { createLymphRoutes } from "../game/data/lymphRoutes";
import { createInitialState } from "../game/simulation/core/createInitialState";
import { isDendriticCell } from "../game/simulation/entities";
import { applyDebrisSystem } from "../game/simulation/systems/debrisSystem";
import { applyMovementSystem } from "../game/simulation/systems/movementSystem";

describe("V11.2 dendritic lymph transit", () => {
  it("routes a loaded dendritic cell through the visible lymph path", () => {
    const state = createInitialState("antigenAnalysisV4");
    const dendritic = Object.values(state.entities).find(isDendriticCell);
    const route = createLymphRoutes(state.tacticalMap)[0];

    expect(dendritic).toBeDefined();
    expect(route).toBeDefined();
    if (!dendritic || !route) {
      return;
    }

    const finalPoint = route.offMapBridge[route.offMapBridge.length - 1];
    expect(
      finalPoint.x < 0 ||
        finalPoint.y < 0 ||
        finalPoint.x > state.tacticalMap.worldWidth ||
        finalPoint.y > state.tacticalMap.worldHeight,
    ).toBe(true);

    dendritic.position = { ...route.path[0] };
    dendritic.carriedDebrisCount = balanceValues.adaptive.dendriticCarryCapacity;
    dendritic.carriedAntigenValue = 18;

    applyDebrisSystem(state, 16);

    expect(dendritic.lymphTransit).toMatchObject({
      exitId: route.exitId,
      routePointIndex: 0,
      phase: "following",
      visualAlpha: 1,
    });
    expect(dendritic.targetPosition).toEqual(route.path[0]);

    applyMovementSystem(state, 16);
    applyDebrisSystem(state, 16);

    expect(dendritic.lymphTransit?.routePointIndex).toBe(1);
    expect(dendritic.targetPosition).toEqual(route.path[1]);
  });

  it("delivers off-map, stays hidden for two seconds, then returns at the exit", () => {
    const state = createInitialState("antigenAnalysisV4");
    const dendritic = Object.values(state.entities).find(isDendriticCell);
    const route = createLymphRoutes(state.tacticalMap)[0];

    expect(dendritic).toBeDefined();
    expect(route).toBeDefined();
    if (!dendritic || !route) {
      return;
    }

    const routePoints = [...route.path, ...route.offMapBridge.slice(1)];
    const antigenValue = 14;
    const initialAntigens = state.resources.antigens;

    dendritic.position = { ...routePoints[routePoints.length - 1] };
    dendritic.carriedDebrisCount = 2;
    dendritic.carriedAntigenValue = antigenValue;
    dendritic.lymphTransit = {
      exitId: route.exitId,
      routePointIndex: routePoints.length - 1,
      routePathLength: route.path.length,
      phase: "following",
      returnRemainingMs: 0,
      visualAlpha: 0.08,
    };
    dendritic.targetPosition = null;
    state.selectedEntityIds = [dendritic.id];

    applyDebrisSystem(state, 16);

    expect(state.resources.antigens).toBe(initialAntigens + antigenValue);
    expect(dendritic.carriedDebrisCount).toBe(0);
    expect(dendritic.carriedAntigenValue).toBe(0);
    expect(dendritic.lymphTransit).toMatchObject({
      phase: "away",
      returnRemainingMs: 2000,
      visualAlpha: 0,
    });
    expect(state.selectedEntityIds).not.toContain(dendritic.id);

    applyDebrisSystem(state, 1999);
    expect(dendritic.lymphTransit?.phase).toBe("away");

    applyDebrisSystem(state, 1);
    const exit = state.tacticalMap.lymphaticExits.find(
      (candidate) => candidate.id === route.exitId,
    );

    expect(dendritic.lymphTransit).toBeUndefined();
    expect(dendritic.position).toEqual(exit?.position);
    expect(dendritic.tacticalState).toBe("guardingArea");
  });
});
