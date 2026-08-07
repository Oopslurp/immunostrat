import { balanceValues } from "../../data/balance";
import { pathogenDefinitions } from "../../data/pathogens";
import { distance, distanceSquared } from "../../types/shared";
import type { GameState, TissueCellState } from "../core/GameState";
import {
  isBacterium,
  isAdvancedThreat,
  isCytotoxicT,
  isHostilePathogen,
  isImmuneUnit,
  isMacrophage,
  isNeutrophil,
  isNkCell,
  isPlasmocyte,
  isVirus,
  type BacteriumEntity,
  type AdvancedThreatEntity,
  type GameEntity,
  type ImmuneUnitEntity,
  type NkCellEntity,
  type VirusEntity,
} from "../entities";
import { applyPathogenDamage } from "./damageSystem";
import { isTreatmentActive } from "./treatmentSystem";
import { launchAntibodySalvo } from "./antibodyProjectileSystem";

export function applyCombatSystem(state: GameState, deltaMs: number): void {
  processPhagocytosis(state, deltaMs);
  const pathogens = Object.values(state.entities).filter(isHostilePathogen);

  for (const entity of Object.values(state.entities)) {
    if (!isImmuneUnit(entity) || entity.health <= 0) {
      continue;
    }

    if (isNeutrophil(entity) && entity.deathState) {
      continue;
    }

    if (entity.attackDamage <= 0 || entity.attackRange <= 0) {
      continue;
    }

    if (isNkCell(entity)) {
      processNkCell(state, entity, deltaMs);
      continue;
    }

    entity.attackCooldownRemainingMs = Math.max(
      0,
      entity.attackCooldownRemainingMs - deltaMs,
    );

    if (entity.attackCooldownRemainingMs > 0) {
      continue;
    }

    const infectedCellTarget = findInfectedCellTarget(state, entity);

    if (infectedCellTarget) {
      if (
        distance(entity.position, infectedCellTarget.position) <=
        entity.attackRange + infectedCellTarget.radius
      ) {
        attackInfectedCell(state, entity, infectedCellTarget);
      } else {
        entity.targetPosition = { ...infectedCellTarget.position };
        entity.idleTargetPosition = null;
        entity.tacticalState = "engagingNearbyTarget";
        entity.lastOrderFeedback = "Engagement local";
      }

      continue;
    }

    const target = findNearestPathogenInRange(entity, pathogens);

    if (!target) {
      if (entity.tacticalState === "engagingNearbyTarget") {
        entity.explicitTargetEntityId = null;
        entity.targetPosition = entity.orderAnchor ? { ...entity.orderAnchor } : null;
        entity.tacticalState = entity.targetPosition ? "movingToPoint" : "guardingArea";
        entity.lastOrderFeedback = "Cible trop eloignee";
      }
      continue;
    }

    if (
      distance(entity.position, target.position) >
      entity.attackRange + target.radius
    ) {
      entity.targetPosition = { ...target.position };
      entity.idleTargetPosition = null;
      entity.tacticalState = "engagingNearbyTarget";
      entity.lastOrderFeedback = "Engagement local";
      continue;
    }

    const damage = calculateDamage(state, entity, target);

    if (isPlasmocyte(entity)) {
      launchAntibodySalvo(state, entity, target, damage);
      entity.attackCooldownRemainingMs = entity.attackCooldownMs;
      continue;
    }

    if (
      isBacterium(target) &&
      isMacrophage(entity) &&
      canFinishWithPhagocytosis(target, damage)
    ) {
      startPhagocytosis(state, entity, target);
      entity.attackCooldownRemainingMs =
        entity.attackCooldownMs + balanceValues.combat.macrophagePhagocytosisDurationMs;
      continue;
    }

    target.health -= damage;
    entity.attackCooldownRemainingMs = entity.attackCooldownMs;

    state.inflammation.value = Math.min(
      balanceValues.inflammation.maxValue,
      state.inflammation.value +
        balanceValues.inflammation.combatIncrease +
        (isNeutrophil(entity)
          ? balanceValues.inflammation.neutrophilAttackIncrease
          : 0),
    );
    addInflammatoryZone(state, entity, target);
    state.effects.push({
      id: `effect-${state.nextEffectNumber}`,
      sourceEntityId: entity.id,
      kind: "attack",
      position: { ...target.position },
      radius: target.radius + balanceValues.attackEffectRadiusBonus,
      ttlMs: balanceValues.attackEffectTtlMs,
    });
    state.nextEffectNumber += 1;
  }

}

type NkDetectionTarget = Readonly<{
  id: string;
  kind: "tissueCell" | "cancerCell";
  outcome: "normal" | "abnormal";
  position: { x: number; y: number };
  radius: number;
}>;

function processNkCell(
  state: GameState,
  nkCell: NkCellEntity,
  deltaMs: number,
): void {
  nkCell.attackCooldownRemainingMs = Math.max(
    0,
    nkCell.attackCooldownRemainingMs - deltaMs,
  );

  if (nkCell.detectionState) {
    const target = resolveNkDetectionTarget(state, nkCell.detectionState);

    if (
      !target ||
      distance(nkCell.position, target.position) > nkCell.attackRange + target.radius
    ) {
      nkCell.detectionState = undefined;
      nkCell.tacticalState = "guardingArea";
      nkCell.lastOrderFeedback = "Analyse interrompue";
      return;
    }

    nkCell.detectionState.outcome = target.outcome;
    nkCell.detectionState.remainingMs = Math.max(
      0,
      nkCell.detectionState.remainingMs - deltaMs,
    );
    nkCell.targetPosition = null;
    nkCell.idleTargetPosition = null;
    nkCell.tacticalState = "holdingPosition";

    if (nkCell.detectionState.remainingMs > 0) {
      return;
    }

    nkCell.detectionState = undefined;
    nkCell.tacticalState = "guardingArea";

    if (target.outcome === "normal") {
      const scanned = new Set(nkCell.scannedNormalCellIds ?? []);
      scanned.add(target.id);
      nkCell.scannedNormalCellIds = [...scanned];
      nkCell.attackCooldownRemainingMs = nkCell.attackCooldownMs;
      nkCell.lastOrderFeedback = "Cellule normale reconnue";
      return;
    }

    executeNkFinisher(state, nkCell, target);
    return;
  }

  if (nkCell.attackCooldownRemainingMs > 0) {
    return;
  }

  const target = findNkDetectionTarget(state, nkCell);

  if (!target) {
    if (nkCell.tacticalState === "engagingNearbyTarget") {
      nkCell.targetPosition = nkCell.orderAnchor ? { ...nkCell.orderAnchor } : null;
      nkCell.tacticalState = nkCell.targetPosition
        ? "movingToPoint"
        : "guardingArea";
      nkCell.lastOrderFeedback = "Aucune cellule suspecte locale";
    }
    return;
  }

  if (
    distance(nkCell.position, target.position) >
    nkCell.attackRange + target.radius
  ) {
    nkCell.targetPosition = { ...target.position };
    nkCell.idleTargetPosition = null;
    nkCell.tacticalState = "engagingNearbyTarget";
    nkCell.lastOrderFeedback = "Approche pour analyse cellulaire";
    return;
  }

  nkCell.detectionState = {
    targetId: target.id,
    targetKind: target.kind,
    outcome: target.outcome,
    remainingMs: balanceValues.combat.nkDetectionDurationMs,
  };
  nkCell.targetPosition = null;
  nkCell.idleTargetPosition = null;
  nkCell.tacticalState = "holdingPosition";
  nkCell.lastOrderFeedback = "Analyse cellulaire en cours";
}

function findNkDetectionTarget(
  state: GameState,
  nkCell: NkCellEntity,
): NkDetectionTarget | null {
  const maxDistance = nkCell.engagementRadius ?? nkCell.attackRange;
  const scannedNormalCells = new Set(nkCell.scannedNormalCellIds ?? []);
  const candidates: NkDetectionTarget[] = [];

  for (const cell of state.tissueCells) {
    if (cell.status === "destroyed") continue;
    const outcome = cell.status === "infected" ? "abnormal" : "normal";
    if (outcome === "normal" && scannedNormalCells.has(cell.id)) continue;
    if (
      distance(nkCell.position, cell.position) <= maxDistance &&
      isWithinLeash(nkCell, cell.position)
    ) {
      candidates.push({
        id: cell.id,
        kind: "tissueCell",
        outcome,
        position: cell.position,
        radius: cell.radius,
      });
    }
  }

  for (const entity of Object.values(state.entities)) {
    if (
      !isAdvancedThreat(entity) ||
      entity.category !== "cancerCell" ||
      entity.health <= 0
    ) {
      continue;
    }
    if (
      distance(nkCell.position, entity.position) <= maxDistance &&
      isWithinLeash(nkCell, entity.position)
    ) {
      candidates.push({
        id: entity.id,
        kind: "cancerCell",
        outcome: "abnormal",
        position: entity.position,
        radius: entity.radius,
      });
    }
  }

  return (
    candidates.sort((a, b) => {
      if (a.outcome !== b.outcome) return a.outcome === "abnormal" ? -1 : 1;
      return (
        distance(nkCell.position, a.position) -
        distance(nkCell.position, b.position)
      );
    })[0] ?? null
  );
}

function resolveNkDetectionTarget(
  state: GameState,
  detection: NonNullable<NkCellEntity["detectionState"]>,
): NkDetectionTarget | null {
  if (detection.targetKind === "tissueCell") {
    const cell = state.tissueCells.find((candidate) => candidate.id === detection.targetId);
    if (!cell || cell.status === "destroyed") return null;
    return {
      id: cell.id,
      kind: "tissueCell",
      outcome: cell.status === "infected" ? "abnormal" : "normal",
      position: cell.position,
      radius: cell.radius,
    };
  }

  const entity = state.entities[detection.targetId];
  if (
    !entity ||
    !isAdvancedThreat(entity) ||
    entity.category !== "cancerCell" ||
    entity.health <= 0
  ) {
    return null;
  }
  return {
    id: entity.id,
    kind: "cancerCell",
    outcome: "abnormal",
    position: entity.position,
    radius: entity.radius,
  };
}

function executeNkFinisher(
  state: GameState,
  nkCell: NkCellEntity,
  target: NkDetectionTarget,
): void {
  if (target.kind === "tissueCell") {
    const cell = state.tissueCells.find((candidate) => candidate.id === target.id);
    if (cell?.status === "infected") {
      attackInfectedCell(state, nkCell, cell, cell.health);
      nkCell.lastOrderFeedback = "Cellule anormale eliminee";
    }
    return;
  }

  const cancerCell = state.entities[target.id];
  if (
    !cancerCell ||
    !isAdvancedThreat(cancerCell) ||
    cancerCell.category !== "cancerCell"
  ) {
    return;
  }

  cancerCell.detected = true;
  applyPathogenDamage(cancerCell, cancerCell.health);
  nkCell.attackCooldownRemainingMs = nkCell.attackCooldownMs;
  nkCell.lastOrderFeedback = "Cellule cancereuse eliminee";
  state.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    state.inflammation.value + balanceValues.combat.nkInflammationPerAttack,
  );
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    sourceEntityId: nkCell.id,
    kind: "cytotoxic",
    position: { ...cancerCell.position },
    radius: cancerCell.radius + balanceValues.attackEffectRadiusBonus,
    ttlMs: balanceValues.attackEffectTtlMs,
  });
  state.nextEffectNumber += 1;
}

function findInfectedCellTarget(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
): TissueCellState | null {
  if (!isCytotoxicT(immuneUnit)) {
    return null;
  }

  let nearest: TissueCellState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const maxDistance =
    immuneUnit.engagementRadius ?? immuneUnit.attackRange + 40;

  for (const cell of state.tissueCells) {
    if (cell.status !== "infected") {
      continue;
    }

    const currentDistance = distance(immuneUnit.position, cell.position);

    if (
      currentDistance <= maxDistance &&
      isWithinLeash(immuneUnit, cell.position) &&
      currentDistance < nearestDistance
    ) {
      nearest = cell;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function attackInfectedCell(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
  cell: TissueCellState,
  damage = immuneUnit.attackDamage,
): void {
  cell.health = Math.max(0, cell.health - damage);
  immuneUnit.attackCooldownRemainingMs = immuneUnit.attackCooldownMs;
  state.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    state.inflammation.value +
      (isCytotoxicT(immuneUnit)
        ? balanceValues.combat.cytotoxicTInflammationPerAttack
        : balanceValues.combat.nkInflammationPerAttack),
  );
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    sourceEntityId: immuneUnit.id,
    kind: "cytotoxic",
    position: { ...cell.position },
    radius: cell.radius + balanceValues.attackEffectRadiusBonus,
    ttlMs: balanceValues.attackEffectTtlMs,
  });
  state.nextEffectNumber += 1;

  if (cell.health > 0) {
    return;
  }

  cell.health = 0;
  cell.status = "destroyed";
  state.missionStats.infectedCellsEliminated += 1;
  const exposedPathogenTypeId = cell.infectedByPathogenTypeId ?? "respiratoryVirus";
  cell.infectedByPathogenTypeId = undefined;
  cell.infectedElapsedMs = 0;
  cell.nextVirusBurstMs = balanceValues.tissueCells.infectedVirusProductionIntervalMs;
  state.tissue.health = Math.max(
    0,
    state.tissue.health - balanceValues.tissueCells.destroyedTissueDamage,
  );
  state.debris.push({
    id: `debris-${state.nextDebrisNumber}`,
    position: { ...cell.position },
    pathogenTypeId: exposedPathogenTypeId,
    antigenProfileId: pathogenDefinitions[exposedPathogenTypeId].antigenProfileId,
    antigenValue: balanceValues.tissueCells.infectedCellAntigenValue,
    ttlMs: balanceValues.debris.ttlMs,
  });
  state.nextDebrisNumber += 1;
}

function processPhagocytosis(state: GameState, deltaMs: number): void {
  for (const bacterium of Object.values(state.entities).filter(isBacterium)) {
    if (!bacterium.phagocytosedByEntityId || !bacterium.phagocytosisRemainingMs) {
      continue;
    }

    const macrophage = state.entities[bacterium.phagocytosedByEntityId];

    if (!macrophage || !isMacrophage(macrophage)) {
      bacterium.phagocytosedByEntityId = undefined;
      bacterium.phagocytosisRemainingMs = 0;
      continue;
    }

    bacterium.immobilizedRemainingMs = Math.max(
      bacterium.immobilizedRemainingMs ?? 0,
      deltaMs + 80,
    );
    bacterium.phagocytosisRemainingMs = Math.max(
      0,
      bacterium.phagocytosisRemainingMs - deltaMs,
    );

    if (bacterium.phagocytosisRemainingMs <= 0) {
      bacterium.health = 0;
      state.effects.push({
        id: `effect-${state.nextEffectNumber}`,
        kind: "phagocytosis",
        position: { ...bacterium.position },
        radius: bacterium.radius + balanceValues.attackEffectRadiusBonus + 6,
        ttlMs: balanceValues.attackEffectTtlMs * 2,
      });
      state.nextEffectNumber += 1;
    }
  }
}

function canFinishWithPhagocytosis(
  target: BacteriumEntity,
  incomingDamage: number,
): boolean {
  return (
    !target.phagocytosedByEntityId &&
    target.maxHealth <= balanceValues.combat.macrophagePhagocytosisMaxHealth &&
    target.health > 0 &&
    incomingDamage >= target.health
  );
}

function startPhagocytosis(
  state: GameState,
  macrophage: ImmuneUnitEntity,
  target: BacteriumEntity,
): void {
  target.phagocytosedByEntityId = macrophage.id;
  target.phagocytosisRemainingMs = balanceValues.combat.macrophagePhagocytosisDurationMs;
  target.immobilizedRemainingMs = balanceValues.combat.macrophagePhagocytosisDurationMs;
  state.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    state.inflammation.value + balanceValues.inflammation.combatIncrease,
  );
  addInflammatoryZone(state, macrophage, target);
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "phagocytosis",
    position: { ...target.position },
    radius: target.radius + balanceValues.attackEffectRadiusBonus,
    ttlMs: balanceValues.attackEffectTtlMs * 2,
  });
  state.nextEffectNumber += 1;
}

function findNearestPathogenInRange(
  immuneUnit: ImmuneUnitEntity,
  pathogens: Array<BacteriumEntity | VirusEntity | AdvancedThreatEntity>,
): BacteriumEntity | VirusEntity | AdvancedThreatEntity | null {
  let nearest: BacteriumEntity | VirusEntity | AdvancedThreatEntity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPriority = Number.NEGATIVE_INFINITY;
  const engagementRadius = immuneUnit.engagementRadius ?? immuneUnit.attackRange;
  const maxDistanceSquared = engagementRadius * engagementRadius;

  for (const pathogen of pathogens) {
    if (isBacterium(pathogen) && pathogen.phagocytosedByEntityId) {
      continue;
    }

    const currentDistance = distanceSquared(immuneUnit.position, pathogen.position);
    if (currentDistance > maxDistanceSquared || !isWithinLeash(immuneUnit, pathogen.position)) {
      continue;
    }

    if (pathogen.id === immuneUnit.explicitTargetEntityId) {
      return pathogen;
    }

    const definition = pathogenDefinitions[pathogen.pathogenTypeId];
    const currentPriority =
      getRoleTargetPriority(immuneUnit, pathogen) +
      (pathogen.targetPriority ?? definition.targetPriority);

    if (
      (currentPriority > nearestPriority ||
        (currentPriority === nearestPriority && currentDistance < nearestDistance))
    ) {
      nearest = pathogen;
      nearestDistance = currentDistance;
      nearestPriority = currentPriority;
    }
  }

  return nearest;
}

function isWithinLeash(
  immuneUnit: ImmuneUnitEntity,
  position: { x: number; y: number },
): boolean {
  const anchor = immuneUnit.orderAnchor ?? immuneUnit.position;
  const leashRadius = immuneUnit.leashRadius ?? immuneUnit.attackRange + 120;

  return distance(anchor, position) <= leashRadius;
}

function getRoleTargetPriority(
  immuneUnit: ImmuneUnitEntity,
  target: BacteriumEntity | VirusEntity | AdvancedThreatEntity,
): number {
  if (isMacrophage(immuneUnit)) {
    if (isBacterium(target)) {
      return 80;
    }

    if (isAdvancedThreat(target) && target.pathogenTypeId === "fungalSpore") {
      return 65;
    }

    return 18;
  }

  if (isNeutrophil(immuneUnit)) {
    if (isBacterium(target)) {
      return 85;
    }

    if (isAdvancedThreat(target) && target.pathogenTypeId === "fungalSpore") {
      return 70;
    }

    return 12;
  }

  if (isNkCell(immuneUnit) || isCytotoxicT(immuneUnit)) {
    if (isAdvancedThreat(target) && target.category === "cancerCell" && target.detected) {
      return 95;
    }

    if (isVirus(target)) {
      return 45;
    }

    return 16;
  }

  if (isPlasmocyte(immuneUnit)) {
    if (isBacterium(target) || isVirus(target)) {
      return 72;
    }

    return 24;
  }

  return 0;
}

function calculateDamage(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
  target: BacteriumEntity | VirusEntity | AdvancedThreatEntity,
): number {
  const definition = pathogenDefinitions[target.pathogenTypeId];
  const unitMultiplier = definition.damageMultipliers[immuneUnit.kind] ?? 1;
  const analysisMultiplier = getAnalysisMultiplier(state, target)
    ? balanceValues.adaptive.bacterialAnalysisDamageMultiplier
    : 1;
  const cancerResponderMultiplier =
    isAdvancedThreat(target) &&
    target.category === "cancerCell" &&
    (isNkCell(immuneUnit) || isCytotoxicT(immuneUnit))
      ? 1.2
      : 1;
  const inflammationMultiplier = getInflammationDamageMultiplier(state, immuneUnit);
  const rawDamage =
    immuneUnit.attackDamage *
    unitMultiplier *
    (isMacrophage(immuneUnit)
      ? balanceValues.combat.macrophageCleanupDamageMultiplier
      : 1) *
    analysisMultiplier *
    cancerResponderMultiplier *
    inflammationMultiplier;
  const armoredDamage = Math.max(
    balanceValues.combat.minimumDamageAfterArmor,
    rawDamage -
      (isBacterium(target) || isAdvancedThreat(target)
        ? target.armor ?? definition.armor
        : 0),
  );

  return (
    armoredDamage *
    (isBacterium(target) ? getBiofilmDamageMultiplier(state, target) : 1)
  );
}

function getAnalysisMultiplier(
  state: GameState,
  target: BacteriumEntity | VirusEntity | AdvancedThreatEntity,
): boolean {
  if (isVirus(target)) {
    return state.adaptiveResearch.viralAnalysisComplete;
  }

  if (isAdvancedThreat(target) && target.category === "cancerCell") {
    return state.adaptiveResearch.viralAnalysisComplete;
  }

  return state.adaptiveResearch.bacterialAnalysisComplete;
}

function getBiofilmDamageMultiplier(
  state: GameState,
  target: BacteriumEntity,
): number {
  return state.biofilmZones.reduce((multiplier, zone) => {
    if (distance(zone.position, target.position) > zone.radius) {
      return multiplier;
    }

    const sourceMultiplier =
      zone.sourceEntityId === target.id
        ? balanceValues.combat.biofilmSameSourceProtectionMultiplier
        : 1;

    return Math.min(multiplier, zone.damageTakenMultiplier * sourceMultiplier);
  }, 1);
}

function getInflammationDamageMultiplier(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
): number {
  const usefulBonus =
    state.inflammation.value >= balanceValues.inflammation.usefulThreshold &&
    state.inflammation.value < balanceValues.inflammation.dangerThreshold
      ? balanceValues.inflammation.usefulCombatBonus
      : 1;
  const zoneBonus = state.inflammatoryZones.some(
    (zone) => distance(zone.position, immuneUnit.position) <= zone.radius,
  )
    ? 1.08
    : 1;

  const antiInflammatoryPenalty = isTreatmentActive(state, "antiInflammatory")
    ? 0.9
    : 1;

  return usefulBonus * zoneBonus * antiInflammatoryPenalty;
}

function addInflammatoryZone(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
  target: GameEntity,
): void {
  const config = balanceValues.inflammatoryZone;

  state.inflammatoryZones.push({
    id: `zone-${state.nextEffectNumber}`,
    position: { ...target.position },
    radius: config.radius,
    intensity: isNeutrophil(immuneUnit)
      ? config.intensityOnNeutrophilAttack
      : config.intensityOnMacrophageAttack,
    ttlMs: config.ttlMs,
  });
}
