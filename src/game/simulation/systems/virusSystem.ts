import { balanceValues } from "../../data/balance";
import { distance, moveToward, stableHash, type Vector2 } from "../../types/shared";
import type { GameState, TissueCellState } from "../core/GameState";
import { isVirus, type VirusEntity } from "../entities";
import { spawnVirus } from "../pathogens/createVirus";
import { canSpawnPathogen } from "./entityLimitSystem";
import { getRuntimeMapBalance } from "./runtimeMapBalance";
import { isTreatmentActive } from "./treatmentSystem";

export function applyVirusSystem(state: GameState, deltaMs: number): void {
  const seconds = deltaMs / 1000;
  const mapBalance = getRuntimeMapBalance(state);

  state.antiviral.activeMs = Math.max(0, state.antiviral.activeMs - deltaMs);
  if (state.antiviral.activeMs <= 0) {
    state.antiviral.position = null;
  }

  for (const virus of Object.values(state.entities).filter(isVirus)) {
    virus.lifeRemainingMs = Math.max(0, virus.lifeRemainingMs - deltaMs);
    if (virus.lifeRemainingMs <= 0) {
      virus.health = 0;
      continue;
    }

    moveVirusTowardHealthyCell(state, virus, deltaMs);
  }

  for (const cell of state.tissueCells) {
    cell.antiviralProtectedMs = Math.max(0, cell.antiviralProtectedMs - deltaMs);

    if (cell.status !== "infected") {
      continue;
    }

    cell.infectedElapsedMs += deltaMs;
    const antiviralMultiplier =
      cell.antiviralProtectedMs > 0 || isTreatmentActive(state, "antiviralDrug")
        ? balanceValues.antiviral.viralProductionMultiplier
        : 1;
    cell.nextVirusBurstMs -=
      deltaMs * antiviralMultiplier * mapBalance.spreadRateMultiplier;

    state.tissue.health = Math.max(
      0,
      state.tissue.health -
        balanceValues.tissueCells.infectedTissueDamagePerSecond *
          mapBalance.pathogenDamageMultiplier *
          seconds,
    );

    if (cell.nextVirusBurstMs <= 0) {
      releaseVirusBurst(state, cell);
      cell.nextVirusBurstMs = balanceValues.tissueCells.infectedVirusProductionIntervalMs;
    }
  }
}

function moveVirusTowardHealthyCell(
  state: GameState,
  virus: VirusEntity,
  deltaMs: number,
): void {
  const target = findNearestHealthyCell(state, virus.position);

  if (!target) {
    virus.health = Math.max(
      0,
      virus.health -
        balanceValues.virus.noHealthyCellDecayPerSecond * (deltaMs / 1000),
    );
    return;
  }

  const infectionRangeMultiplier =
    target.antiviralProtectedMs > 0 || isTreatmentActive(state, "antiviralDrug")
      ? balanceValues.antiviral.infectionRangeMultiplier
      : 1;
  const speedMultiplier =
    target.antiviralProtectedMs > 0 || isTreatmentActive(state, "antiviralDrug")
      ? balanceValues.antiviral.virusSpeedMultiplier
      : 1;
  const infectionRange =
    virus.infectionRange *
    infectionRangeMultiplier *
    getRuntimeMapBalance(state).infectionRateMultiplier;

  if (distance(virus.position, target.position) <= infectionRange + target.radius) {
    if ((virus.netMovementMultiplier ?? 1) <= 0) {
      return;
    }

    infectCell(state, target, virus);
    delete state.entities[virus.id];
    return;
  }

  virus.position = moveToward(
    virus.position,
    target.position,
    virus.movementSpeed *
      speedMultiplier *
      (virus.netMovementMultiplier ?? 1) *
      (deltaMs / 1000),
  );
}

function findNearestHealthyCell(
  state: GameState,
  position: Vector2,
): TissueCellState | null {
  let nearest: TissueCellState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const cell of state.tissueCells) {
    if (cell.status !== "healthy") {
      continue;
    }

    const currentDistance = distance(position, cell.position);

    if (currentDistance < nearestDistance) {
      nearest = cell;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function infectCell(
  state: GameState,
  cell: TissueCellState,
  virus: VirusEntity,
): void {
  cell.status = "infected";
  cell.infectedByPathogenTypeId = virus.pathogenTypeId;
  cell.infectedElapsedMs = 0;
  cell.nextVirusBurstMs = balanceValues.tissueCells.infectedInitialDelayMs;
  state.tissue.health = Math.max(
    0,
    state.tissue.health -
      balanceValues.tissueCells.infectionTissueDamage *
        getRuntimeMapBalance(state).pathogenDamageMultiplier,
  );
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "infection",
    position: { ...cell.position },
    radius: cell.radius + virus.radius + 12,
    ttlMs: balanceValues.attackEffectTtlMs * 3,
  });
  state.nextEffectNumber += 1;
}

function releaseVirusBurst(state: GameState, cell: TissueCellState): void {
  for (
    let index = 0;
    index < balanceValues.tissueCells.infectedVirusBurstCount;
    index += 1
  ) {
    const pathogenTypeId = cell.infectedByPathogenTypeId ?? "respiratoryVirus";

    if (!canSpawnPathogen(state, pathogenTypeId)) {
      return;
    }

    spawnVirus(
      state,
      pathogenTypeId,
      jitterPosition(cell.position, `${cell.id}-${cell.infectedElapsedMs}-${index}`),
    );
  }
}

function jitterPosition(position: Vector2, seedInput: string): Vector2 {
  const seed = stableHash(seedInput);
  const angle = (seed % 360) * (Math.PI / 180);
  const radius =
    balanceValues.virus.spawnJitterRadius * (0.35 + (seed % 65) / 100);

  return {
    x: position.x + Math.cos(angle) * radius,
    y: position.y + Math.sin(angle) * radius,
  };
}
