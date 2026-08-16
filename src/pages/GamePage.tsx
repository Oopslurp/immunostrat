import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import {
  GameBridge,
  type GameSnapshot,
  type SelectionPresentationState,
} from "../game/phaser/GameBridge";
import { PhaserGame } from "../game/phaser/PhaserGame";
import {
  getEntitySpriteDefinition,
  type EntitySpriteDefinition,
} from "../game/phaser/assets/entitySpriteManifest";
import type { ImmuneUnitEntity } from "../game/simulation/entities";
import {
  getSelectedImmuneUnits,
  getUnitHealthRatio,
} from "../game/phaser/rendering/selectionHudModel";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { SettingsPanel } from "../ui/SettingsPanel";
import { audioDirector } from "../audio/AudioDirector";
import {
  canRetryBattleResult,
  getResultProcessingKey,
} from "../game/presentation/resultLifecycle";
import iconAg from "../assets/bodymap-control/icon-ag.png";
import iconAlert from "../assets/bodymap-control/icon-alert.png";
import iconAtp from "../assets/bodymap-control/icon-atp.png";
import iconCyt from "../assets/bodymap-control/icon-cyt.png";
import iconHealth from "../assets/bodymap-control/icon-global-health.png";
import iconInflammation from "../assets/bodymap-control/icon-global-inflammation.png";
import iconPathogen from "../assets/bodymap-control/icon-pathogen.png";
import iconSelection from "../assets/bodymap-control/icon-selection.png";
import cmdAntiInflammatory from "../assets/battle-hud/cmd-anti-inflammatory.png";
import cmdAntiviral from "../assets/battle-hud/cmd-antiviral.png";
import cmdBacterialAnalysis from "../assets/battle-hud/cmd-bacterial-analysis.png";
import cmdCytotoxic from "../assets/battle-hud/cmd-cytotoxic.png";
import cmdDendritic from "../assets/battle-hud/cmd-dendritic.png";
import cmdInterferons from "../assets/battle-hud/cmd-interferons.png";
import cmdMacrophage from "../assets/battle-hud/cmd-macrophage.png";
import cmdNeutralization from "../assets/battle-hud/cmd-neutralization.png";
import cmdNeutrophil from "../assets/battle-hud/cmd-neutrophil.png";
import cmdNk from "../assets/battle-hud/cmd-nk.png";
import cmdPlasmocyte from "../assets/battle-hud/cmd-plasmocyte.png";
import cmdViralAnalysis from "../assets/battle-hud/cmd-viral-analysis.png";

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

type BattleCommandGroupId = "cells" | "analysis" | "treatments";

type BattleCommand = {
  id: string;
  label: string;
  cost?: string;
  icon: string;
  disabled: boolean;
  onClick: () => void;
  title?: string;
  variant?: "primary" | "secondary";
};

type BattleCommandGroup = {
  id: BattleCommandGroupId;
  label: string;
  commands: BattleCommand[];
};

type SelectionCompositionItem = {
  id: UnitTypeId;
  label: string;
  count: number;
};

type UnitPortraitMeta = {
  label: string;
  toneClass: string;
  spriteDefinition: EntitySpriteDefinition;
};

type GameModal = "pause" | "settings" | "confirmRestart" | "confirmExit" | null;

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
  const [selectionPresentation, setSelectionPresentation] =
    useState<SelectionPresentationState>({
      hoveredSelectedUnitId: null,
      focusedSelectedUnitId: null,
    });
  const [gameModal, setGameModal] = useState<GameModal>(null);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const completedMissionRef = useRef<string | null>(null);
  const lastWaveAudioRef = useRef<string | null>(null);
  const restartInFlightRef = useRef(false);
  const mission = missionDefinitions[missionId];
  const nextMissionId = mission.nextMissionId;
  const playableNextMissionId =
    nextMissionId && isMissionId(nextMissionId) ? nextMissionId : null;
  const selectedUnits = useMemo(
    () =>
      snapshot
        ? getSelectedImmuneUnits(
            snapshot.entities,
            snapshot.selectedEntityIds,
          )
        : [],
    [snapshot],
  );

  useEffect(() => bridge.subscribeSnapshot(setSnapshot), [bridge]);
  useEffect(
    () => bridge.subscribeSelectionPresentation(setSelectionPresentation),
    [bridge],
  );
  useEffect(
    () => bridge.subscribeAudioEvent((event) => audioDirector.playGame(event)),
    [bridge],
  );
  useEffect(() => {
    completedMissionRef.current = null;
    lastWaveAudioRef.current = null;
    restartInFlightRef.current = false;
    setSnapshot(null);
    setGameModal(null);
    setSessionGeneration((generation) => generation + 1);
  }, [missionId]);
  useEffect(() => {
    const status = snapshot?.status;
    const modalOpen = gameModal !== null;
    bridge.setSessionPresentation({
      paused: status === "running" && modalOpen,
      inputBlocked: modalOpen || (status !== undefined && status !== "running"),
    });

    if (status && status !== "running") {
      audioDirector.setScene("result");
    } else if (modalOpen) {
      audioDirector.setScene("paused");
    } else {
      audioDirector.setScene("game");
    }
  }, [bridge, gameModal, snapshot?.status]);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        gameModal !== null ||
        snapshot?.status !== "running"
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      audioDirector.playUi("pause");
      setGameModal("pause");
    };
    const handleVisibility = () => {
      if (document.hidden && snapshot?.status === "running") {
        setGameModal("pause");
      }
    };

    window.addEventListener("keydown", handleEscape, true);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleEscape, true);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [gameModal, snapshot?.status]);
  useEffect(() => {
    if (!snapshot?.waveAlert || snapshot.status !== "running") return;
    const waveKey = `${snapshot.missionId}-${sessionGeneration}-${snapshot.currentWave}`;
    if (lastWaveAudioRef.current === waveKey) return;
    lastWaveAudioRef.current = waveKey;
    audioDirector.playGame({ name: "wave", priority: 1 });
  }, [sessionGeneration, snapshot]);
  useEffect(() => {
    if (!snapshot || snapshot.missionId !== missionId) {
      return;
    }

    if (snapshot.status === "running") {
      restartInFlightRef.current = false;
      completedMissionRef.current = null;
      return;
    }

    if (restartInFlightRef.current) {
      return;
    }

    const resultKey = getResultProcessingKey(
      snapshot.missionId,
      missionId,
      sessionGeneration,
      snapshot.status,
    );

    if (!resultKey || completedMissionRef.current === resultKey) {
      return;
    }

    completedMissionRef.current = resultKey;
    audioDirector.stopTransientVoices();
    audioDirector.playGame({
      name: snapshot.status === "victory" ? "victory" : "defeat",
      priority: 1,
    });

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
  }, [battleSource, missionId, onBodyBattleComplete, onInfiniteComplete, onMissionComplete, sessionGeneration, snapshot]);

  const restartBattle = () => {
    restartInFlightRef.current = true;
    lastWaveAudioRef.current = null;
    audioDirector.resetSession();
    setSessionGeneration((generation) => generation + 1);
    setGameModal(null);
    bridge.dispatch({ type: "restart" });
    bridge.setSessionPresentation({ paused: false, inputBlocked: false });
    audioDirector.setScene("game");
  };

  const leaveBattle = () => {
    setGameModal(null);
    audioDirector.stopTransientVoices();
    onBackToCampaign();
  };

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

  const objectives =
    snapshot?.objectives ??
    mission.objectives.map((objective) => ({
      id: objective.id,
      label: objective.label,
      complete: false,
      required: objective.required ?? false,
      progressLabel: "en attente",
    }));
  const hostileCount =
    snapshot?.entities.filter(
      (entity) =>
        entity.kind === "bacterium" ||
        entity.kind === "virus" ||
        entity.kind === "advancedThreat",
    ).length ?? 0;
  const virusCount =
    snapshot?.entities.filter((entity) => entity.kind === "virus").length ?? 0;
  const bacteriaCount =
    snapshot?.entities.filter((entity) => entity.kind === "bacterium").length ??
    0;
  const advancedThreatCount =
    snapshot?.entities.filter((entity) => entity.kind === "advancedThreat")
      .length ?? 0;
  const selectedComposition = getSelectionComposition(selectedUnits);
  const averageSelectedHealth = selectedUnits.length
    ? Math.round(
        selectedUnits.reduce(
          (sum, unit) => sum + (unit.health / unit.maxHealth) * 100,
          0,
        ) / selectedUnits.length,
      )
    : 0;
  const selectedLead = selectedUnits[0] ?? null;
  const selectionStatus = selectedLead
    ? formatTacticalState(selectedLead.tacticalState)
    : "aucune sélection";
  const waveLabel = snapshot?.infinite
    ? `V${snapshot.infinite.wave} / C${snapshot.infinite.cycle}`
    : `${snapshot ? Math.min(snapshot.currentWave, snapshot.totalWaves) : 0}/${
        snapshot?.totalWaves ?? 0
      }`;
  const phaseLabel = snapshot?.infinite
    ? snapshot.infinite.phase.name
    : battleSource === "bodyMap"
      ? "Bataille locale"
      : "Mission";
  const treatmentCommands: BattleCommand[] = mission.unlockedTreatments.map((treatmentId) => {
    const treatment = treatmentDefinitions[treatmentId];
    const activeMs = snapshot?.activeTreatments[treatmentId] ?? 0;
    const cooldownMs = snapshot?.treatmentCooldowns[treatmentId] ?? 0;
    const status =
      activeMs > 0
        ? `actif ${formatCooldown(activeMs)}`
        : cooldownMs > 0
          ? `CD ${formatCooldown(cooldownMs)}`
          : undefined;

    return {
      id: treatmentId,
      label: treatment.shortLabel,
      cost: `${treatment.atpCost} ATP${
        treatment.cytokineCost > 0 ? ` / ${treatment.cytokineCost} CYT` : ""
      }${status ? ` / ${status}` : ""}`,
      icon: getTreatmentIcon(treatmentId),
      disabled: !canUseTreatment(treatmentId),
      onClick: () => bridge.dispatch({ type: "useTreatment", treatmentId }),
      title: `${treatment.displayName}: ${treatment.gameplayDescription} ${treatment.scienceDescription}`,
    } satisfies BattleCommand;
  });
  const commandGroups: BattleCommandGroup[] = [
    {
      id: "cells" as const,
      label: "Cellules",
      commands: compactCommands([
        isUnitUnlocked(missionId, "macrophage")
          ? {
              id: "macrophage",
              label: "Macrophage",
              cost: `${unitDefinitions.macrophage.atpCost} ATP`,
              icon: cmdMacrophage,
              disabled: !canProduceMacrophage,
              onClick: () => bridge.dispatch({ type: "produceMacrophage" }),
              variant: "primary",
            }
          : null,
        isUnitUnlocked(missionId, "neutrophil")
          ? {
              id: "neutrophil",
              label: "Neutrophile",
              cost: `${unitDefinitions.neutrophil.atpCost} ATP / ${unitDefinitions.neutrophil.cytokineCost} CYT`,
              icon: cmdNeutrophil,
              disabled: !canProduceNeutrophil,
              onClick: () => bridge.dispatch({ type: "produceNeutrophil" }),
            }
          : null,
        isUnitUnlocked(missionId, "dendriticCell")
          ? {
              id: "dendriticCell",
              label: "Dendritique",
              cost: `${unitDefinitions.dendriticCell.atpCost} ATP / ${unitDefinitions.dendriticCell.cytokineCost} CYT`,
              icon: cmdDendritic,
              disabled: !canProduceDendritic,
              onClick: () => bridge.dispatch({ type: "produceDendriticCell" }),
            }
          : null,
        isUnitUnlocked(missionId, "plasmocyte")
          ? {
              id: "plasmocyte",
              label: "Plasmocyte",
              cost: `${balanceValues.adaptive.plasmocyteAntigenCost} AG`,
              icon: cmdPlasmocyte,
              disabled: !canProducePlasmocyte,
              onClick: () => bridge.dispatch({ type: "producePlasmocyte" }),
            }
          : null,
        isUnitUnlocked(missionId, "nkCell")
          ? {
              id: "nkCell",
              label: "Cellule NK",
              cost: `${unitDefinitions.nkCell.atpCost} ATP / ${unitDefinitions.nkCell.cytokineCost} CYT`,
              icon: cmdNk,
              disabled: !canProduceNk,
              onClick: () => bridge.dispatch({ type: "produceNkCell" }),
            }
          : null,
        isUnitUnlocked(missionId, "cytotoxicT")
          ? {
              id: "cytotoxicT",
              label: "T cytotoxique",
              cost: `${unitDefinitions.cytotoxicT.atpCost} ATP / ${balanceValues.adaptive.cytotoxicTAntigenCost} AG`,
              icon: cmdCytotoxic,
              disabled: !canProduceCytotoxicT,
              onClick: () => bridge.dispatch({ type: "produceCytotoxicT" }),
            }
          : null,
      ]),
    },
    {
      id: "analysis" as const,
      label: "Analyses",
      commands: compactCommands([
        isResearchUnlocked(missionId, "bacterialAnalysis")
          ? {
              id: "bacterialAnalysis",
              label: "Analyse bactérienne",
              cost: `${balanceValues.adaptive.bacterialAnalysisAntigenCost} AG`,
              icon: cmdBacterialAnalysis,
              disabled: !canResearch,
              onClick: () =>
                bridge.dispatch({ type: "researchBacterialAnalysis" }),
            }
          : null,
        isResearchUnlocked(missionId, "viralAnalysis")
          ? {
              id: "viralAnalysis",
              label: "Analyse virale",
              cost: `${balanceValues.adaptive.viralAnalysisAntigenCost} AG`,
              icon: cmdViralAnalysis,
              disabled: !canResearchViral,
              onClick: () => bridge.dispatch({ type: "researchViralAnalysis" }),
            }
          : null,
        isAbilityUnlocked(missionId, "interferons")
          ? {
              id: "interferons",
              label: "Interférons",
              cost:
                snapshot && snapshot.antiviralActiveMs > 0
                  ? `actif ${formatCooldown(snapshot.antiviralActiveMs)}`
                  : `${balanceValues.antiviral.cytokineCost} CYT`,
              icon: cmdInterferons,
              disabled: !canUseAntiviral,
              onClick: () => bridge.dispatch({ type: "useAntiviralSignal" }),
            }
          : null,
        isAbilityUnlocked(missionId, "massiveNeutralization")
          ? {
              id: "massiveNeutralization",
              label: "Neutralisation",
              cost: `${balanceValues.adaptive.massiveNeutralizationAntigenCost} AG`,
              icon: cmdNeutralization,
              disabled: !canUseAdaptive,
              onClick: () =>
                bridge.dispatch({ type: "useMassiveNeutralization" }),
            }
          : null,
      ]),
    },
    {
      id: "treatments" as const,
      label: "Traitements",
      commands: treatmentCommands,
    },
  ].filter((group) => group.commands.length > 0);

  return (
    <div className="page game-page">
      <div className="game-topbar">
        <div className="game-topbar-brand">
          <span className="eyebrow">
            {battleSource === "infinite"
              ? "Mode infini"
              : battleSource === "bodyMap"
                ? "Carte du corps"
                : "Campagne"}
          </span>
          <h1>{mission.title}</h1>
        </div>
        <div className="game-topbar-resources">
          <ResourceChip
            icon={iconHealth}
            label="Tissu"
            max={formatHealth(snapshot?.tissueMaxHealth) || 100}
            tone="health"
            value={formatHealth(snapshot?.tissueHealth)}
          />
          <ResourceChip
            icon={iconAtp}
            label="ATP"
            max={balanceValues.maxAtp}
            ratePerSecond={snapshot?.atpPerSecond}
            tone="atp"
            value={formatAtp(snapshot?.atp)}
          />
          <ResourceChip
            icon={iconCyt}
            label="CYT"
            max={balanceValues.maxCytokines}
            ratePerSecond={snapshot?.cytokinesPerSecond}
            tone="cytokines"
            value={formatAtp(snapshot?.cytokines)}
          />
          <ResourceChip
            icon={iconAg}
            label="AG"
            max={balanceValues.maxAntigens}
            ratePerSecond={snapshot?.antigensPerSecond}
            tone="antigens"
            value={formatAtp(snapshot?.antigens)}
          />
          <ResourceChip
            icon={iconInflammation}
            label="Infl."
            max={balanceValues.inflammation.maxValue}
            tone="inflammation"
            value={formatAtp(snapshot?.inflammation)}
          />
        </div>
        <div className="game-topbar-status">
          <span className="topbar-stat topbar-stat-phase">
            <span className="topbar-stat-label">Phase</span>
            <span className="topbar-stat-value">{phaseLabel}</span>
          </span>
          <span className="topbar-stat">
            <span className="topbar-stat-label">Vague</span>
            <span className="topbar-stat-value">{waveLabel}</span>
          </span>
          <span className="topbar-stat">
            <span className="topbar-stat-label">Score</span>
            <span className="topbar-stat-value">{snapshot?.score ?? 0}</span>
          </span>
        </div>
      </div>

      <header className="game-header">
        <BattleCommandBar groups={commandGroups} />
        <div className="battle-system-actions">
          <Button
            aria-label="Mettre la partie en pause"
            onClick={() => {
              audioDirector.playUi("pause");
              setGameModal("pause");
            }}
          >
            Pause
          </Button>
        </div>
      </header>

      <aside
        className="battle-selection-panel"
        aria-label="Escouade sélectionnée"
        onPointerLeave={() =>
          bridge.dispatchSelectionPresentation({
            type: "hoverSelectedUnit",
            entityId: null,
          })
        }
      >
        <div className="battle-panel-title">
          <img alt="" src={iconSelection} />
          <span>Escouade</span>
        </div>
        <div className="battle-selection-summary">
          <strong>
            {selectedUnits.length
              ? `${selectedUnits.length} unité${selectedUnits.length > 1 ? "s" : ""} sélectionnée${selectedUnits.length > 1 ? "s" : ""}`
              : "Aucune sélection"}
          </strong>
          <span>{selectionStatus}</span>
        </div>
        <div
          className="battle-squad-slots"
          aria-label="Portraits des unités sélectionnées"
        >
          {Array.from({ length: Math.max(6, selectedUnits.length) }).map(
            (_, index) => {
              const unit = selectedUnits[index] ?? null;
              const portrait = unit
                ? getUnitPortraitMeta(unit.unitTypeId)
                : null;

              return unit && portrait ? (
                <SquadUnitCard
                  bridge={bridge}
                  focused={
                    selectionPresentation.focusedSelectedUnitId === unit.id
                  }
                  hovered={
                    selectionPresentation.hoveredSelectedUnitId === unit.id
                  }
                  key={unit.id}
                  portrait={portrait}
                  unit={unit}
                />
              ) : (
                <span
                  className="battle-squad-slot battle-slot-empty"
                  key={`empty-${index}`}
                  title="Emplacement vide"
                />
              );
            },
          )}
        </div>
        {selectedUnits.length ? (
          <>
            <Gauge
              label="Santé moyenne"
              max={100}
              tone="health"
              value={averageSelectedHealth}
            />
            <div className="battle-composition-list">
              {selectedComposition.map((item) => (
                <span key={item.id}>
                  {item.label}
                  <strong>x{item.count}</strong>
                </span>
              ))}
            </div>
            {selectedLead?.lastOrderFeedback ? (
              <p className="battle-selection-note">{selectedLead.lastOrderFeedback}</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="battle-composition-list">
              <span className="battle-composition-empty">
                Sélection
                <strong>vide</strong>
              </span>
            </div>
            <p className="battle-selection-note">
              Clique gauche ou rectangle pour sélectionner une cellule.
            </p>
          </>
        )}
      </aside>

      <aside className="battle-objective-panel" aria-label="Objectifs et menaces">
        <div className="battle-panel-title">
          <img alt="" src={iconAlert} />
          <span>Objectifs</span>
        </div>
        <div className="battle-objective-list">
          {objectives.map((objective) => (
            <span
              className={objective.complete ? "battle-objective-complete" : ""}
              key={objective.id}
            >
              <strong>{objective.complete ? "OK" : objective.required ? "PRIO" : "OPT"}</strong>
              {objective.label}
              <em>{objective.progressLabel}</em>
            </span>
          ))}
        </div>
        <div className="battle-panel-title battle-panel-title-small">
          <img alt="" src={iconPathogen} />
          <span>Menaces</span>
        </div>
        <div className="battle-threat-list">
          <span className="battle-threat-item battle-threat-total">
            Pression active
            <strong>x{hostileCount}</strong>
          </span>
          {snapshot && snapshot.infectedTissueCells > 0 ? (
            <span className="battle-threat-item battle-threat-warning">
              Cellules infectées
              <strong>x{snapshot.infectedTissueCells}</strong>
            </span>
          ) : null}
          {snapshot?.threatSummary.length ? (
            snapshot.threatSummary.slice(0, 4).map((item) => {
              const definition = pathogenDefinitions[item.pathogenTypeId];

              return (
                <span className="battle-threat-item" key={item.pathogenTypeId}>
                  {definition.displayName}
                  <strong>x{item.count}</strong>
                </span>
              );
            })
          ) : (
            <span className="battle-threat-empty">Aucune menace active</span>
          )}
          {snapshot?.infinite?.activeMutators.length ? (
            <span className="battle-threat-item battle-threat-warning">
              Mutateurs
              <strong>x{snapshot.infinite.activeMutators.length}</strong>
            </span>
          ) : null}
        </div>
        <details className="battle-details-panel">
          <summary>Détails tactiques</summary>
          <div>
            {snapshot?.infinite ? (
              <>
                <span>Cycle {snapshot.infinite.cycle}</span>
                <span>Phase {snapshot.infinite.phase.name}</span>
                <span>
                  Prochaine:{" "}
                  {snapshot.infinite.nextPhaseAtCycle
                    ? `cycle ${snapshot.infinite.nextPhaseAtCycle}`
                    : "phase extrême"}
                </span>
              </>
            ) : null}
            <span>Bactéries : {bacteriaCount}</span>
            <span>Virus : {virusCount}</span>
            <span>Menaces avancées : {advancedThreatCount}</span>
            <span>Débris : {snapshot?.debrisCount ?? 0}</span>
            <span>Biofilm : {snapshot?.biofilmCount ?? 0}</span>
            <span>
              Cellules : {snapshot?.healthyTissueCells ?? 0} saines /{" "}
              {snapshot?.infectedTissueCells ?? 0} infectées
            </span>
            <span>Tissu : {formatTissueRepair(snapshot)}</span>
            <span>
              Analyse bactérienne :{" "}
              {snapshot?.bacterialAnalysisComplete ? "complète" : "non"}
            </span>
            <span>
              Analyse virale : {snapshot?.viralAnalysisComplete ? "complète" : "non"}
            </span>
            <span>Neutrophile : {formatCooldown(snapshot?.neutrophilCooldownMs)}</span>
            <span>
              Adaptatif: {formatCooldown(snapshot?.massiveNeutralizationCooldownMs)}
            </span>
            <span>
              Antiviral:{" "}
              {snapshot && snapshot.antiviralActiveMs > 0
                ? `actif ${formatCooldown(snapshot.antiviralActiveMs)}`
                : formatCooldown(snapshot?.antiviralSignalCooldownMs)}
            </span>
            {snapshot?.tacticalMapSummary ? (
              <span>
                Carte: {snapshot.tacticalMapSummary.templateId} / sites{" "}
                {snapshot.tacticalMapSummary.numberOfCombatSites}
              </span>
            ) : null}
          </div>
        </details>
        <details className="battle-details-panel battle-science-panel">
          <summary>Aide bio</summary>
          <div>
            {mission.briefing.slice(0, 2).map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              {mission.memoryHintProfiles?.length
                ? `Mémoire : ${mission.memoryHintProfiles
                    .map((profile) =>
                      progress.immuneMemory.knownProfiles.includes(profile)
                        ? `${profile} connu`
                        : `${profile} à apprendre`,
                    )
                    .join(" / ")}.`
                : "Science inspirée et simplifiée pour le gameplay."}
            </p>
          </div>
        </details>
      </aside>

      <section className="game-frame" aria-label="Canvas du jeu Immunostrat">
        <PhaserGame bridge={bridge} missionId={missionId} preparation={preparation} />
        {!snapshot ? (
          <div className="game-loading-overlay" role="status">
            <span className="bio-loader" aria-hidden="true" />
            <strong>Synchronisation immunitaire</strong>
            <em>Préparation du tissu...</em>
          </div>
        ) : null}
        {snapshot?.waveAlert && snapshot.status === "running" ? (
          <div className="wave-alert-overlay" role="status">
            <strong>{snapshot.waveAlert.message}</strong>
            <span>{snapshot.waveAlert.secondsRemaining}s</span>
          </div>
        ) : null}
        {snapshot && snapshot.status !== "running" ? (
          <BattleResultOverlay
            battleSource={battleSource}
            canRetry={canRetryBattleResult(battleSource, canRestartBattle)}
            nextMissionAvailable={Boolean(
              playableNextMissionId &&
                progress.unlockedMissionIds.includes(playableNextMissionId),
            )}
            onExit={leaveBattle}
            onNext={
              playableNextMissionId
                ? () => {
                    setSnapshot(null);
                    audioDirector.resetSession();
                    onPlayMission(playableNextMissionId);
                  }
                : undefined
            }
            onRetry={restartBattle}
            snapshot={snapshot}
          />
        ) : null}
      </section>

      {gameModal === "pause" ? (
        <Modal
          className="pause-dialog"
          label="Partie en pause"
          onClose={() => {
            audioDirector.playUi("resume");
            setGameModal(null);
          }}
        >
          <span className="modal-kicker">Simulation suspendue</span>
          <h2>Pause</h2>
          <p>Le tissu et les menaces restent figés pendant vos choix.</p>
          <div className="pause-menu-actions">
            <Button
              onClick={() => {
                audioDirector.playUi("resume");
                setGameModal(null);
              }}
              variant="primary"
            >
              Reprendre
            </Button>
            <Button onClick={() => setGameModal("settings")}>Réglages</Button>
            {canRestartBattle ? (
              <Button onClick={() => setGameModal("confirmRestart")}>Recommencer</Button>
            ) : null}
            <Button className="button-danger-soft" onClick={() => setGameModal("confirmExit")}>
              Quitter la bataille
            </Button>
          </div>
          <details className="pause-help">
            <summary>Aide tactique</summary>
            <p>Clic gauche : sélectionner ou donner un ordre.</p>
            <p>Clic droit-glissé ou ZQSD/WASD : déplacer la caméra.</p>
            <p>Survolez une unité de l’escouade pour la repérer sur le terrain.</p>
          </details>
          <span className="pause-hint">Échap pour reprendre</span>
        </Modal>
      ) : null}
      {gameModal === "settings" ? (
        <Modal label="Réglages en jeu" onClose={() => setGameModal("pause")}>
          <SettingsPanel onBack={() => setGameModal("pause")} title="Réglages en jeu" />
        </Modal>
      ) : null}
      {gameModal === "confirmRestart" ? (
        <ConfirmDialog
          confirmLabel="Recommencer"
          description="La progression de cette bataille sera perdue. Les règles et la carte resteront identiques."
          onCancel={() => setGameModal("pause")}
          onConfirm={restartBattle}
          title="Recommencer la bataille ?"
        />
      ) : null}
      {gameModal === "confirmExit" ? (
        <ConfirmDialog
          confirmLabel="Quitter"
          description="La bataille en cours sera abandonnée et ne modifiera pas votre progression."
          onCancel={() => setGameModal("pause")}
          onConfirm={leaveBattle}
          title="Quitter la bataille ?"
        />
      ) : null}

    </div>
  );
}

type BattleResultOverlayProps = {
  battleSource: "campaign" | "bodyMap" | "infinite";
  canRetry: boolean;
  nextMissionAvailable: boolean;
  onExit: () => void;
  onNext?: () => void;
  onRetry: () => void;
  snapshot: GameSnapshot;
};

function BattleResultOverlay({
  battleSource,
  canRetry,
  nextMissionAvailable,
  onExit,
  onNext,
  onRetry,
  snapshot,
}: BattleResultOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const victory = snapshot.status === "victory";
  const sourceLabel =
    battleSource === "infinite"
      ? "Survie immunitaire"
      : battleSource === "bodyMap"
        ? "Intervention régionale"
        : "Opération de campagne";
  const exitLabel =
    battleSource === "infinite"
      ? "Retour au mode infini"
      : battleSource === "bodyMap"
        ? "Retour à la carte du corps"
        : "Retour aux missions";
  const metrics = [
    { label: "Score", value: snapshot.infinite?.score ?? snapshot.score },
    { label: snapshot.infinite ? "Cycle" : "Rang", value: snapshot.infinite?.cycle ?? snapshot.rank },
    { label: "Durée", value: formatResultDuration(snapshot.elapsedMs) },
    {
      label: "Tissu préservé",
      value: `${Math.round((snapshot.tissueHealth / Math.max(1, snapshot.tissueMaxHealth)) * 100)}%`,
    },
    { label: "Cellules sauvées", value: snapshot.healthyTissueCells },
    { label: "Inflammation max.", value: Math.round(snapshot.peakInflammation) },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    const firstAction = dialog?.querySelector<HTMLElement>("button:not(:disabled)");
    firstAction?.focus();

    const trapResultFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const actions = Array.from(
        dialog.querySelectorAll<HTMLElement>("button:not(:disabled)"),
      );
      if (!actions.length) return;
      const first = actions[0];
      const last = actions.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapResultFocus, true);
    return () => document.removeEventListener("keydown", trapResultFocus, true);
  }, []);

  return (
    <div
      aria-label={victory ? "Résultat : victoire" : "Résultat : défaite"}
      aria-modal="true"
      className={`result-overlay result-overlay-${victory ? "victory" : "defeat"}`}
      ref={dialogRef}
      role="dialog"
    >
      <div className="result-panel">
        <div className="result-emblem" aria-hidden="true">
          <span />
        </div>
        <div className="result-heading">
          <span className="modal-kicker">{sourceLabel}</span>
          <h2>{victory ? "Victoire" : "Défaite"}</h2>
          <p>
            {victory
              ? "Le foyer infectieux est contenu. L’organisme peut poursuivre sa réponse."
              : "La pression infectieuse a dépassé les défenses locales. Réorganisez la réponse."}
          </p>
        </div>

        <div className="result-metrics" aria-label="Bilan de la bataille">
          {metrics.map((metric) => (
            <span key={metric.label}>
              <em>{metric.label}</em>
              <strong>{metric.value}</strong>
            </span>
          ))}
        </div>

        <div className="result-objectives">
          <strong>Objectifs</strong>
          {snapshot.objectives.map((objective) => (
            <span
              className={objective.complete ? "result-objective-complete" : "result-objective-incomplete"}
              key={objective.id}
            >
              <i aria-hidden="true">{objective.complete ? "✓" : "·"}</i>
              {objective.label}
            </span>
          ))}
        </div>

        <div className="result-actions">
          {battleSource === "campaign" && victory && onNext ? (
            <Button disabled={!nextMissionAvailable} onClick={onNext} variant="primary">
              Mission suivante
            </Button>
          ) : null}
          {canRetry ? (
            <Button onClick={onRetry} variant={!victory ? "primary" : "secondary"}>
              {victory ? "Rejouer" : "Réessayer"}
            </Button>
          ) : null}
          <Button data-audio="back" onClick={onExit}>{exitLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function formatResultDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

function isBattleCommand(command: BattleCommand | null): command is BattleCommand {
  return command !== null;
}

function compactCommands(commands: Array<BattleCommand | null>): BattleCommand[] {
  return commands.filter(isBattleCommand);
}

function getSelectionComposition(
  units: ImmuneUnitEntity[],
): SelectionCompositionItem[] {
  const composition = new Map<UnitTypeId, SelectionCompositionItem>();

  for (const unit of units) {
    const current = composition.get(unit.unitTypeId);

    if (current) {
      current.count += 1;
      continue;
    }

    composition.set(unit.unitTypeId, {
      id: unit.unitTypeId,
      label: unitDefinitions[unit.unitTypeId].displayName,
      count: 1,
    });
  }

  return [...composition.values()];
}

const unitPortraitMeta: Record<UnitTypeId, UnitPortraitMeta> = {
  macrophage: {
    label: "Macrophage",
    toneClass: "unit-portrait-macrophage",
    spriteDefinition: requireUnitSpriteDefinition("macrophage"),
  },
  neutrophil: {
    label: "Neutrophile",
    toneClass: "unit-portrait-neutrophil",
    spriteDefinition: requireUnitSpriteDefinition("neutrophil"),
  },
  dendriticCell: {
    label: "Cellule dendritique",
    toneClass: "unit-portrait-dendritic",
    spriteDefinition: requireUnitSpriteDefinition("dendriticCell"),
  },
  plasmocyte: {
    label: "Plasmocyte",
    toneClass: "unit-portrait-plasmocyte",
    spriteDefinition: requireUnitSpriteDefinition("plasmocyte"),
  },
  nkCell: {
    label: "Cellule NK",
    toneClass: "unit-portrait-nk",
    spriteDefinition: requireUnitSpriteDefinition("nkCell"),
  },
  cytotoxicT: {
    label: "T cytotoxique",
    toneClass: "unit-portrait-cytotoxic",
    spriteDefinition: requireUnitSpriteDefinition("cytotoxicT"),
  },
};

function getUnitPortraitMeta(unitTypeId: UnitTypeId): UnitPortraitMeta {
  return unitPortraitMeta[unitTypeId];
}

function requireUnitSpriteDefinition(
  unitTypeId: UnitTypeId,
): EntitySpriteDefinition {
  const definition = getEntitySpriteDefinition(unitTypeId);

  if (!definition) {
    throw new Error(`Missing canonical sprite definition for ${unitTypeId}`);
  }

  return definition;
}

function UnitPortrait({ portrait }: { portrait: UnitPortraitMeta }) {
  const { spriteDefinition } = portrait;
  const style: CSSProperties = {
    aspectRatio: `${spriteDefinition.frameWidth} / ${spriteDefinition.frameHeight}`,
    backgroundImage: `url("${spriteDefinition.path}")`,
    backgroundPosition: "0 0",
    backgroundRepeat: "no-repeat",
    backgroundSize: `${spriteDefinition.columns * 100}% ${spriteDefinition.rows * 100}%`,
  };

  return (
    <span
      aria-hidden="true"
      className="battle-squad-portrait"
      style={style}
    />
  );
}

type SquadUnitCardProps = {
  bridge: GameBridge;
  focused: boolean;
  hovered: boolean;
  portrait: UnitPortraitMeta;
  unit: ImmuneUnitEntity;
};

function SquadUnitCard({
  bridge,
  focused,
  hovered,
  portrait,
  unit,
}: SquadUnitCardProps) {
  const healthRatio = getUnitHealthRatio(unit);
  const healthPercent = Math.round(healthRatio * 100);
  const healthTone =
    healthRatio <= 0.4
      ? "battle-unit-health-low"
      : healthRatio <= 0.7
        ? "battle-unit-health-injured"
        : "battle-unit-health-stable";

  return (
    <button
      aria-label={`${portrait.label}, santé ${Math.ceil(unit.health)} sur ${Math.ceil(unit.maxHealth)}. ${focused ? "Unité focalisée, cliquer pour arrêter le focus." : "Cliquer pour focaliser cette unité."}`}
      aria-pressed={focused}
      className={[
        "battle-squad-slot",
        "battle-slot-active",
        portrait.toneClass,
        hovered ? "battle-slot-hovered" : "",
        focused ? "battle-slot-focused" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-entity-id={unit.id}
      data-sprite-key={portrait.spriteDefinition.textureKey}
      onClick={() =>
        bridge.dispatchSelectionPresentation({
          type: "toggleFocusedSelectedUnit",
          entityId: unit.id,
        })
      }
      onPointerEnter={() =>
        bridge.dispatchSelectionPresentation({
          type: "hoverSelectedUnit",
          entityId: unit.id,
        })
      }
      onPointerLeave={() =>
        bridge.dispatchSelectionPresentation({
          type: "hoverSelectedUnit",
          entityId: null,
        })
      }
      title={`${portrait.label} — Santé ${Math.ceil(unit.health)}/${Math.ceil(unit.maxHealth)}`}
      type="button"
    >
      <UnitPortrait portrait={portrait} />
      <span aria-hidden="true" className={`battle-unit-health ${healthTone}`}>
        <span style={{ width: `${healthPercent}%` }} />
      </span>
      {focused ? (
        <span aria-hidden="true" className="battle-squad-focus-marker" />
      ) : null}
    </button>
  );
}

function getTreatmentIcon(treatmentId: TreatmentId): string {
  if (treatmentId === "antiInflammatory") {
    return cmdAntiInflammatory;
  }

  return cmdAntiviral;
}

type GaugeProps = {
  label: string;
  value: number;
  max: number;
  ratePerSecond?: number;
  tone: "health" | "atp" | "cytokines" | "antigens" | "inflammation";
};

function BattleCommandBar({ groups }: { groups: BattleCommandGroup[] }) {
  return (
    <nav className="battle-command-bar" aria-label="Commandes de bataille">
      {groups.map((group) => (
        <section
          className="battle-command-group"
          data-command-group={group.id}
          key={group.id}
        >
          <div className="battle-command-group-title">{group.label}</div>
          <div className="battle-command-grid">
            {group.commands.map((command) => (
              <BattleActionCard
                command={command}
                groupId={group.id}
                key={command.id}
              />
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

function BattleActionCard({
  command,
  groupId,
}: {
  command: BattleCommand;
  groupId: BattleCommandGroupId;
}) {
  const stateClass = command.disabled
    ? "battle-action-card-disabled"
    : command.variant === "primary"
      ? "battle-action-card-primary"
      : "battle-action-card-ready";

  return (
    <button
      aria-label={command.cost ? `${command.label}, ${command.cost}` : command.label}
      className={`battle-action-card ${stateClass}`}
      data-command-group={groupId}
      disabled={command.disabled}
      onClick={command.onClick}
      title={command.title}
      type="button"
    >
      <span className="battle-action-icon" aria-hidden="true">
        <img alt="" src={command.icon} />
      </span>
      <span className="battle-action-copy">
        <strong>{command.label}</strong>
        {command.cost ? <em>{command.cost}</em> : <small>Action</small>}
      </span>
    </button>
  );
}

function ResourceChip({
  icon,
  label,
  max,
  ratePerSecond,
  tone,
  value,
}: GaugeProps & { icon: string }) {
  return (
    <div className={`battle-resource-chip battle-resource-chip-${tone}`}>
      <img alt="" src={icon} />
      <Gauge
        label={label}
        max={max}
        ratePerSecond={ratePerSecond}
        tone={tone}
        value={value}
      />
    </div>
  );
}

function Gauge({ label, value, max, ratePerSecond, tone }: GaugeProps) {
  const ratio = Math.max(0, Math.min(1, value / max));

  return (
    <div className="hud-gauge">
      <div className="hud-gauge-label">
        <span>
          {label}
          {ratePerSecond !== undefined && ratePerSecond > 0 ? (
            <small className="hud-gauge-income">
              +{formatIncomeRate(ratePerSecond)}/s
            </small>
          ) : null}
        </span>
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

function formatIncomeRate(value: number): string {
  return value >= 1 ? value.toFixed(1) : value.toFixed(2);
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
    idle: "en attente",
    movingToPoint: "déplacement",
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
