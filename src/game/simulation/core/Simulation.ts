import { applyCommand, type GameCommand } from "./commands";
import { createInitialState } from "./createInitialState";
import type { GameState } from "./GameState";
import { stepSimulation } from "./stepSimulation";

export class Simulation {
  private state: GameState;

  constructor(initialState: GameState = createInitialState()) {
    this.state = initialState;
  }

  getState(): GameState {
    return this.state;
  }

  dispatch(command: GameCommand): GameState {
    this.state = applyCommand(this.state, command);

    return this.state;
  }

  step(deltaMs: number): GameState {
    this.state = stepSimulation(this.state, deltaMs);

    return this.state;
  }
}
