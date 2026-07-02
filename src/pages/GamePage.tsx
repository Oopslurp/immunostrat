import { useEffect, useMemo, useRef, useState } from "react";
import { balanceValues } from "../game/data/balance";
import {
  isMissionId,
  missionDefinitions,
  type MissionAbilityId,
  type MissionId,
  type MissionPreparation,
  type MissionResearchId,
} from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import {
  treatmentDefinitions,
  type TreatmentId,
} from "../game/data/treatments";
import { unitDefinitions, type UnitTypeId } from "../game/data/units";
import type {
  CampaignProgress,
  MissionResultSummary,
  MissionRunResultSummary,
} from "../game/campaign/progress";
import { GameBridge, type GameSnapshot } from "../game/phaser/GameBridge";
import { PhaserGame } from "../game/phaser/PhaserGame";
import { isImmuneUnit, type ImmuneUnitEntity } from "../game/simulation/entities";
import { Button } from "../ui/Button";

type GamePageProps = {
  battleSource?: "campaign" | "bodyMap" | "infinite";
  missionId: MissionId;
  progress: CampaignProgress;
  onBackToCampaign: () => void;
  onMissionComplete: (result: MissionResultSummary) => void;
  onBodyBattleComplete?: (result: MissionRunResultSummary) => void;
  onInfiniteComplete?: (result: MissionRunResultSummary) => void;
  onPlayMission: (missionId: MissionId, vaccinationId?: string | null) => void;
  preparation?: MissionPreparation;
  canRestartBattle?: boolean;
};

export function GamePage({
  battleSource = "campaign",
  missionId,
  progress,
  onBackToCampaign,
  onBodyBattleComplete,
  onInfiniteComplete,
  onMissionComplete,
  onPlayMission,
  preparation,
  canRestartBattle = true,
}: GamePageProps) {
  const bridge = useMemo(() => new GameBridge(), []);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const completedMissionRef = useRef<string | null>(null);
  const mission = missionDefinitions[missionId];
  const nextMissionId = mission.nextMissionId;
  const playableNextMissionId =
    nextMissionId && isMissionId(nextMissionId) ? nextMissionId : null;
  const selectedUnits =
    snapshot?.entities.filter(
      (entity): entity is ImmuneUnitEntity =>
        snapshot.selectedEntityIds.includes(entity.id) &&
        isImmuneUnit(entity),
    ) ?? [];

  useEffect(() => bridge.subscribeSnapshot(setSnapshot), [bridge]);
  useEffect(() => {
    completedMissionRef.current = null;
  }, [missionId]);
  useEffect(() => {
    if (!snapshot) {
      return;
    }

    if (snapshot.status === "running") {
      completedMissionRef.current = null;
      return;
    }

    const resultKey = `${snapshot.missionId}-${snapshot.status}`;

    if (completedMissionRef.current === resultKey) {
      return;
    }

    completedMissionRef.current = resultKey;

    const result = {
      missionId: snapshot.missionId,
      score: snapshot.score,
      rank: snapshot.rank,
      status: snapshot.status,
      tissueHealthRemaining: snapshot.tissueHealth,
      tissueMaxHealth: snapshot.tissueMaxHealth,
      civilianCellsSaved: snapshot.healthyTissueCells,
      civilianCellsLost: snapshot.destroyedTissueCells,
      infectedCellsRemaining: snapshot.infectedTissueCells,
      enemiesRemaining: snapshot.entities.filter(
        (entity) =>
          entity.kind === "bacterium" ||
          entity.kind === "virus" ||
          entity.kind === "advancedThreat",
      ).length,
      inflammationPeak: snapshot.peakInflammation,
      antigensCollected: snapshot.antigensCollected,
      lymphSignalsDelivered: snapshot.lymphSignalsDelivered,
      adaptiveResearchCompleted:
        snapshot.bacterialAnalysisComplete || snapshot.viralAnalysisComplete,
      treatmentsUsed: snapshot.treatmentsUsed,
      timeElapsedMs: snapshot.elapsedMs,
      pathogenTypesEncountered: snapshot.threatSummary.map(
        (item) => item.pathogenTypeId,
      ),
      infinite: snapshot.infinite,
    } satisfies MissionRunResultSummary;

    if (battleSource === "campaign" && snapshot.status === "victory") {
      onMissionComplete(result);
    }

    if (battleSource === "bodyMap") {
      onBodyBattleComplete?.(result);
    }

    if (battleSource === "infinite" && snapshot.status === "defeat") {
      onInfiniteComplete?.(result);
    }
  }, [battleSource, onBodyBattleComplete, onInfiniteComplete, onMissionComplete, snapshot]);

  const canProduceMacrophage =
    snapshot?.status === "running" &&
    isUnitUnlocked(missionId, "macrophage") &&
    snapshot.atp >= unitDefinitions.macrophage.atpCost;
  const canProduceNeutrophil =
    snapshot?.status === "running" &&
    isUnitUnlocked(missionId, "neutrophil") &&
    snapshot.atp >= unitDefinitions.neutrophil.atpCost &&
    snapshot.cytokines >= unitDefinitions.neutrophil.cytokineCost &&
    snapshot.neutrophilCooldownMs <= 0;
  const canProduceDendritic =
    snapshot?.status === "running" &&
    isUnitUnlocked(missionId, "dendriticCell") &&
    snapshot.atp >= unitDefinitions.dendriticCell.atpCost &&
    snapshot.cytokines >= unitDefinitions.dendriticCell.cytokineCost;
  const canResearch =
    snapshot?.status === "running" &&
    isResearchUnlocked(missionId, "bacterialAnalysis") &&
    !snapshot.bacterialAnalysisComplete &&
    snapshot.antigens >= balanceValues.adaptive.bacterialAnalysisAntigenCost;
  const canProducePlasmocyte =
    snapshot?.status === "running" &&
    isUnitUnlocked(missionId, "plasmocyte") &&
    snapshot.bacterialAnalysisComplete &&
    snapshot.atp >= unitDefinitions.plasmocyte.atpCost &&
    snapshot.cytokines >= unitDefinitions.plasmocyte.cytokineCost &&
    snapshot.antigens >= balanceValues.adaptive.plasmocyteAntigenCost;
  const canUseAdaptive =
    snapshot?.status === "running" &&
    isAbilityUnlocked(missionId, "massiveNeutralization") &&
    snapshot.bacterialAnalysisComplete &&
    snapshot.massiveNeutralizationCooldownMs <= 0 &&
    snapshot.antigens >= balanceValues.adaptive.massiveNeutralizationAntigenCost &&
    snapshot.atp >= balanceValues.adaptive.massiveNeutralizationAtpCost &&
    snapshot.cytokines >= balanceValues.adaptive.massiveNeutralizationCytokineCost;
  const canUseAntiviral =
    snapshot?.status === "running" &&
    isAbilityUnlocked(missionId, "interferons") &&
    snapshot.antiviralSignalCooldownMs <= 0 &&
    snapshot.cytokines >= balanceValues.antiviral.cytokineCost;
  const canProduceNk =
    snapshot?.status === "running" &&
    isUnitUnlocked(missionId, "nkCell") &&
    snapshot.atp >= unitDefinitions.nkCell.atpCost &&
    snapshot.cytokines >= unitDefinitions.nkCell.cytokineCost;
  const canResearchViral =
    snapshot?.status === "running" &&
    isResearchUnlocked(missionId, "viralAnalysis") &&
    !snapshot.viralAnalysisComplete &&
    snapshot.antigens >= balanceValues.adaptive.viralAnalysisAntigenCost;
  const canProduceCytotoxicT =
    snapshot?.status === "running" &&
    isUnitUnlocked(missionId, "cytotoxicT") &&
    snapshot.viralAnalysisComplete &&
    snapshot.atp >= unitDefinitions.cytotoxicT.atpCost &&
    snapshot.cytokines >= unitDefinitions.cytotoxicT.cytokineCost &&
    snapshot.antigens >= balanceValues.adaptive.cytotoxicTAntigenCost;
  const canUseTreatment = (treatmentId: TreatmentId): boolean => {
    const treatment = treatmentDefinitions[treatmentId];

    return Boolean(
      snapshot?.status === "running" &&
        mission.unlockedTreatments.includes(treatmentId) &&
        (snapshot.treatmentCooldowns[treatmentId] ?? 0) <= 0 &&
        snapshot.atp >= treatment.atpCost &&
        snapshot.cytokines >= treatment.cytokineCost &&
        snapshot.antigens >= treatment.antigenCost,
    );
  };

  return (
    <div className="page game-page">
      <div className="game-topbar">
        <div className="game-topbar-brand">
          <span className="eyebrow">
            {battleSource === "infinite"
              ? "Mode infini V9"
              : battleSource === "bodyMap"
                ? "Carte du corps V9"
                : "Campagne V6"}
          </span>
          <h1>{mission.title}</h1>
        </div>
        <div className="game-topbar-resources">
          <Gauge
            label="Sante du tissu"
            value={formatHealth(snapshot?.tissueHealth)}
            max={formatHealth(snapshot?.tissueMaxHealth) || 100}
            tone="health"
          />
          <Gauge
            label="ATP"
            value={formatAtp(snapshot?.atp)}
            max={balanceValues.maxAtp}
            tone="atp"
          />
          <Gauge
            label="Cytokines"
            value={formatAtp(snapshot?.cytokines)}
            max={balanceValues.maxCytokines}
            tone="cytokines"
          />
          <Gauge
            label="Antigenes"
            value={formatAtp(snapshot?.antigens)}
            max={balanceValues.maxAntigens}
            tone="antigens"
          />
          <Gauge
            label="Inflammation"
            value={formatAtp(snapshot?.inflammation)}
            max={balanceValues.inflammation.maxValue}
            tone="inflammation"
          />
        </div>
        <div className="game-topbar-status">
          <span className="topbar-stat">
            <span className="topbar-stat-label">Vague</span>
            <span className="topbar-stat-value">
              {snapshot?.infinite
                ? snapshot.currentWave
                : `${snapshot ? Math.min(snapshot.currentWave, snapshot.totalWaves) : 0}/${
                    snapshot?.totalWaves ?? 0
                  }`}
            </span>
          </span>
          <span className="topbar-stat">
            <span className="topbar-stat-label">Score</span>
            <span className="topbar-stat-value">{snapshot?.score ?? 0}</span>
          </span>
        </div>
      </div>

      <header className="game-header">
        <div className="game-actions">
          {isUnitUnlocked(missionId, "macrophage") ? (
            <Button
              disabled={!canProduceMacrophage}
              onClick={() => bridge.dispatch({ type: "produceMacrophage" })}
              variant="primary"
            >
              Macrophage (-{unitDefinitions.macrophage.atpCost} ATP)
            </Button>
          ) : null}
          {isUnitUnlocked(missionId, "neutrophil") ? (
            <Button
              disabled={!canProduceNeutrophil}
              onClick={() => bridge.dispatch({ type: "produceNeutrophil" })}
            >
              Neutrophile (-{unitDefinitions.neutrophil.atpCost} ATP, -
              {unitDefinitions.neutrophil.cytokineCost} CYT)
            </Button>
          ) : null}
          {isUnitUnlocked(missionId, "dendriticCell") ? (
            <Button
              disabled={!canProduceDendritic}
              onClick={() => bridge.dispatch({ type: "produceDendriticCell" })}
            >
              Dendritique (-{unitDefinitions.dendriticCell.atpCost} ATP, -
              {unitDefinitions.dendriticCell.cytokineCost} CYT)
            </Button>
          ) : null}
          {isResearchUnlocked(missionId, "bacterialAnalysis") ? (
            <Button
              disabled={!canResearch}
              onClick={() => bridge.dispatch({ type: "researchBacterialAnalysis" })}
            >
              Analyse bacterienne (-{balanceValues.adaptive.bacterialAnalysisAntigenCost} AG)
            </Button>
          ) : null}
          {isUnitUnlocked(missionId, "plasmocyte") ? (
            <Button
              disabled={!canProducePlasmocyte}
              onClick={() => bridge.dispatch({ type: "producePlasmocyte" })}
            >
              Plasmocyte (-{balanceValues.adaptive.plasmocyteAntigenCost} AG)
            </Button>
          ) : null}
          {isAbilityUnlocked(missionId, "massiveNeutralization") ? (
            <Button
              disabled={!canUseAdaptive}
              onClick={() => bridge.dispatch({ type: "useMassiveNeutralization" })}
            >
              Neutralisation massive
            </Button>
          ) : null}
          {isAbilityUnlocked(missionId, "interferons") ? (
            <Button
              disabled={!canUseAntiviral}
              onClick={() => bridge.dispatch({ type: "useAntiviralSignal" })}
            >
              Interferons (-{balanceValues.antiviral.cytokineCost} CYT)
            </Button>
          ) : null}
          {isUnitUnlocked(missionId, "nkCell") ? (
            <Button
              disabled={!canProduceNk}
              onClick={() => bridge.dispatch({ type: "produceNkCell" })}
            >
              Cellule NK (-{unitDefinitions.nkCell.atpCost} ATP, -
              {unitDefinitions.nkCell.cytokineCost} CYT)
            </Button>
          ) : null}
          {isResearchUnlocked(missionId, "viralAnalysis") ? (
            <Button
              disabled={!canResearchViral}
              onClick={() => bridge.dispatch({ type: "researchViralAnalysis" })}
            >
              Analyse virale (-{balanceValues.adaptive.viralAnalysisAntigenCost} AG)
            </Button>
          ) : null}
          {isUnitUnlocked(missionId, "cytotoxicT") ? (
            <Button
              disabled={!canProduceCytotoxicT}
              onClick={() => bridge.dispatch({ type: "produceCytotoxicT" })}
            >
              T cytotoxique (-{unitDefinitions.cytotoxicT.atpCost} ATP, -
              {unitDefinitions.cytotoxicT.cytokineCost} CYT, -
              {balanceValues.adaptive.cytotoxicTAntigenCost} AG)
            </Button>
          ) : null}
          {mission.unlockedTreatments.map((treatmentId) => {
            const treatment = treatmentDefinitions[treatmentId];
            const activeMs = snapshot?.activeTreatments[treatmentId] ?? 0;
            const cooldownMs = snapshot?.treatmentCooldowns[treatmentId] ?? 0;

            return (
              <Button
                disabled={!canUseTreatment(treatmentId)}
                key={treatmentId}
                onClick={() =>
                  bridge.dispatch({ type: "useTreatment", treatmentId })
                }
                title={`${treatment.gameplayDescription} ${treatment.scienceDescription}`}
              >
                {treatment.displayName} (-{treatment.atpCost} ATP
                {treatment.cytokineCost > 0 ? `, -${treatment.cytokineCost} CYT` : ""}
                ) {activeMs > 0 ? `actif ${formatCooldown(activeMs)}` : cooldownMs > 0 ? `CD ${formatCooldown(cooldownMs)}` : ""}
              </Button>
            );
          })}
          {canRestartBattle ? (
            <Button onClick={() => bridge.dispatch({ type: "restart" })}>
              Recommencer
            </Button>
          ) : null}
          <Button onClick={onBackToCampaign}>
            {battleSource === "infinite"
              ? "Retour mode infini"
              : battleSource === "bodyMap"
                ? "Retour carte"
                : "Retour missions"}
          </Button>
        </div>
      </header>

      <details className="mission-briefing-panel" open>
        <summary>Briefing / objectifs</summary>
        <div className="mission-briefing-content">
        <div>
          <strong>Briefing</strong>
          {mission.briefing.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div>
          <strong>Objectifs</strong>
          {(snapshot?.objectives ?? mission.objectives.map((objective) => ({
            id: objective.id,
            label: objective.label,
            complete: false,
            required: objective.required ?? false,
            progressLabel: "en attente",
          }))).map((objective) => (
            <span
              className={`objective-pill ${
                objective.complete ? "objective-pill-complete" : ""
              }`}
              key={objective.id}
            >
              {objective.complete ? "[x]" : "[ ]"} {objective.label}{" "}
              <em>{objective.progressLabel}</em>
            </span>
          ))}
        </div>
        <div>
          <strong>Science vs gameplay</strong>
          <p>
            {mission.memoryHintProfiles?.length
              ? `Memoire immunitaire: ${mission.memoryHintProfiles
                  .map((profile) =>
                    progress.immuneMemory.knownProfiles.includes(profile)
                      ? `${profile} deja reconnu`
                      : `${profile} a apprendre`,
                  )
                  .join(" / ")}.`
              : "Les mecaniques biologiques restent simplifiees pour le gameplay."}
          </p>
          {mission.unlockedTreatments.length ? (
            <p>
              Traitements disponibles:{" "}
              {mission.unlockedTreatments
                .map((id) => treatmentDefinitions[id].displayName)
                .join(", ")}
              .
            </p>
          ) : null}
          {snapshot?.tacticalMapSummary ? (
            <p>
              Carte seedee: {snapshot.tacticalMapSummary.templateId} / seed{" "}
              {snapshot.tacticalMapSummary.seed} / sites{" "}
              {snapshot.tacticalMapSummary.numberOfCombatSites} /{" "}
              {snapshot.tacticalMapSummary.validationStatus}
            </p>
          ) : null}
        </div>
        </div>
      </details>

      <section className="game-frame" aria-label="Canvas du jeu Immunostrat">
        <PhaserGame bridge={bridge} missionId={missionId} preparation={preparation} />
        {snapshot?.waveAlert && snapshot.status === "running" ? (
          <div className="wave-alert-overlay" role="status">
            <strong>{snapshot.waveAlert.message}</strong>
            <span>{snapshot.waveAlert.secondsRemaining}s</span>
          </div>
        ) : null}
        {snapshot && snapshot.status !== "running" ? (
          <div className="result-overlay">
            <div className="result-title">
              {snapshot.status === "victory" ? "Victoire" : "Defaite"}
            </div>
            <div className="result-score">
              {snapshot.infinite
                ? `Score infini ${snapshot.infinite.score} - Cycle ${snapshot.infinite.cycle} - Phase ${snapshot.infinite.phase.id}`
                : `Score ${snapshot.score} - Rang ${snapshot.rank}`}
            </div>
            <div className="result-objectives">
              {snapshot.objectives.map((objective) => (
                <span key={objective.id}>
                  {objective.complete ? "[x]" : "[ ]"} {objective.label}
                </span>
              ))}
            </div>
            {canRestartBattle ? (
              <Button onClick={() => bridge.dispatch({ type: "restart" })}>
                Recommencer
              </Button>
            ) : null}
            <Button onClick={onBackToCampaign}>
              {battleSource === "infinite"
                ? "Retour mode infini"
                : battleSource === "bodyMap"
                  ? "Retour carte du corps"
                  : "Retour missions"}
            </Button>
            {battleSource === "campaign" &&
            snapshot.status === "victory" &&
            playableNextMissionId ? (
              <Button
                disabled={!progress.unlockedMissionIds.includes(playableNextMissionId)}
                onClick={() => onPlayMission(playableNextMissionId)}
                variant="primary"
              >
                Mission suivante
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="hud-strip" aria-label="Statut du jeu V5">
        {snapshot?.infinite ? (
          <>
            <span className="hud-item">Score infini: {snapshot.infinite.score}</span>
            <span className="hud-item">Cycle: {snapshot.infinite.cycle}</span>
            <span className="hud-item">Vague: {snapshot.infinite.wave}</span>
            <span className="hud-item">
              Phase {snapshot.infinite.phase.id}: {snapshot.infinite.phase.name}
            </span>
            <span className="hud-item">
              Prochaine phase:{" "}
              {snapshot.infinite.nextPhaseAtCycle
                ? `cycle ${snapshot.infinite.nextPhaseAtCycle}`
                : "Nightmare"}
            </span>
          </>
        ) : null}
        <span className="hud-item">
          Bacteries:{" "}
          {snapshot?.entities.filter((entity) => entity.kind === "bacterium")
            .length ?? 0}
        </span>
        <span className="hud-item">
          Virus:{" "}
          {snapshot?.entities.filter((entity) => entity.kind === "virus").length ??
            0}
        </span>
        <span className="hud-item">
          Avancees:{" "}
          {snapshot?.entities.filter((entity) => entity.kind === "advancedThreat")
            .length ?? 0}
        </span>
        <span className="hud-item">
          Cellules: {snapshot?.healthyTissueCells ?? 0} saines /{" "}
          {snapshot?.infectedTissueCells ?? 0} infectees /{" "}
          {snapshot?.destroyedTissueCells ?? 0} detruites
        </span>
        <span className="hud-item">
          Selection: {snapshot?.selectedEntityIds.length ?? 0}
        </span>
        <span className="hud-item">
          Tissu: {formatTissueRepair(snapshot)}
        </span>
        {selectedUnits[0] ? (
          <span className="hud-item">
            Etat: {formatTacticalState(selectedUnits[0].tacticalState)} -
            engagement {Math.round(selectedUnits[0].engagementRadius ?? 0)} -
            {selectedUnits[0].lastOrderFeedback ?? "garde locale"}
          </span>
        ) : null}
        <span className="hud-item">
          NK/T:{" "}
          {snapshot?.entities.filter((entity) => entity.kind === "nkCell").length ??
            0}
          /
          {snapshot?.entities.filter((entity) => entity.kind === "cytotoxicT")
            .length ?? 0}
        </span>
        <span className="hud-item">
          Debris: {snapshot?.debrisCount ?? 0}
        </span>
        <span className="hud-item">
          Biofilm: {snapshot?.biofilmCount ?? 0}
        </span>
        <span className="hud-item">
          Analyse: {snapshot?.bacterialAnalysisComplete ? "complete" : "non"}
        </span>
        <span className="hud-item">
          Analyse virale: {snapshot?.viralAnalysisComplete ? "complete" : "non"}
        </span>
        <span className="hud-item">
          Neutrophile CD: {formatCooldown(snapshot?.neutrophilCooldownMs)}
        </span>
        <span className="hud-item">
          Adaptatif CD: {formatCooldown(snapshot?.massiveNeutralizationCooldownMs)}
        </span>
        <span className="hud-item">
          Antiviral:{" "}
          {snapshot && snapshot.antiviralActiveMs > 0
            ? `actif ${formatCooldown(snapshot.antiviralActiveMs)}`
            : `CD ${formatCooldown(snapshot?.antiviralSignalCooldownMs)}`}
        </span>
      </div>

      {snapshot?.infinite ? (
        <aside className="threat-panel" aria-label="Mutateurs infinis">
          <strong>Mutateurs actifs</strong>
          {snapshot.infinite.activeMutators.length ? (
            snapshot.infinite.activeMutators.map((mutator) => (
              <span className="threat-pill" key={mutator.id} title={mutator.description}>
                {mutator.name}
                <em>{mutator.tags.join("/")}</em>
              </span>
            ))
          ) : (
            <span className="threat-empty">Aucun mutateur actif en phase initiale</span>
          )}
        </aside>
      ) : null}

      <aside className="threat-panel" aria-label="Menaces detectees">
        <strong>Menaces detectees</strong>
        {snapshot && snapshot.infectedTissueCells > 0 ? (
          <span className="threat-pill">
            <span className="threat-dot" style={{ backgroundColor: "#8bbcff" }} />
            Cellule infectee detectee x{snapshot.infectedTissueCells}
            <em>viral</em>
          </span>
        ) : null}
        {snapshot?.threatSummary.length ? (
          snapshot.threatSummary.slice(0, 4).map((item) => {
            const definition = pathogenDefinitions[item.pathogenTypeId];

            return (
              <span className="threat-pill" key={item.pathogenTypeId}>
                <span
                  className="threat-dot"
                  style={{ backgroundColor: `#${definition.color.toString(16).padStart(6, "0")}` }}
                />
                {definition.displayName} x{item.count}
                <em
                  title={[
                    definition.gameplayRole,
                    definition.realLifeInspiration,
                    definition.simplificationNote,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {definition.subtype ?? definition.archetype}
                </em>
              </span>
            );
          })
        ) : (
          <span className="threat-empty">Aucune menace active</span>
        )}
      </aside>
    </div>
  );
}

function isUnitUnlocked(missionId: MissionId, unitTypeId: UnitTypeId): boolean {
  return missionDefinitions[missionId].unlockedUnits.includes(unitTypeId);
}

function isAbilityUnlocked(
  missionId: MissionId,
  abilityId: MissionAbilityId,
): boolean {
  return missionDefinitions[missionId].unlockedAbilities.includes(abilityId);
}

function isResearchUnlocked(
  missionId: MissionId,
  researchId: MissionResearchId,
): boolean {
  return missionDefinitions[missionId].unlockedResearch.includes(researchId);
}

type GaugeProps = {
  label: string;
  value: number;
  max: number;
  tone: "health" | "atp" | "cytokines" | "antigens" | "inflammation";
};

function Gauge({ label, value, max, tone }: GaugeProps) {
  const ratio = Math.max(0, Math.min(1, value / max));

  return (
    <div className="hud-gauge">
      <div className="hud-gauge-label">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="hud-gauge-track">
        <div
          className={`hud-gauge-fill hud-gauge-fill-${tone}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function formatHealth(value: number | undefined): number {
  return Math.max(0, Math.ceil(value ?? 0));
}

function formatAtp(value: number | undefined): number {
  return Math.floor(value ?? 0);
}

function formatCooldown(value: number | undefined): string {
  const ms = Math.max(0, value ?? 0);

  return ms === 0 ? "pret" : `${Math.ceil(ms / 1000)}s`;
}

function formatTissueRepair(snapshot: GameSnapshot | null): string {
  if (!snapshot) {
    return "en attente";
  }

  if (snapshot.tissueRepairStatus === "recovering") {
    return `reparation +${snapshot.tissueRepairRatePerSecond.toFixed(1)}/s`;
  }

  if (snapshot.tissueRepairStatus === "blocked") {
    const reasons: Record<string, string> = {
      infection: "bloquee infection",
      inflammation: "bloquee inflammation",
      combat: "bloquee combat",
    };

    return reasons[snapshot.tissueRepairBlockedReason ?? ""] ?? "bloquee";
  }

  return "stabilisation";
}

function formatTacticalState(state: string | undefined): string {
  const labels: Record<string, string> = {
    idle: "idle",
    movingToPoint: "deplacement",
    movingToSite: "site",
    guardingArea: "garde locale",
    engagingNearbyTarget: "engagement",
    collectingAntigen: "collecte",
    deliveringToLymph: "livraison lymphe",
    retreating: "repli",
    holdingPosition: "position tenue",
  };

  return labels[state ?? ""] ?? "garde locale";
}
