import { useEffect, useRef, useState } from "react";
import {
  activateRegionalNode,
  advanceStrategicTurn,
  applyPassiveBodyMapInfectionTick,
  assignReinforcement,
  canRegionLaunchBattle,
  getAvailableReinforcements,
  getBodyMapVictoryProgress,
  prepareBodyBattle,
  reinforcementCosts,
  removeAssignedReinforcement,
  toMissionPreparation,
} from "../game/bodyMap/bodyMapSystem";
import type {
  BodyMapDifficulty,
  BodyMapState,
  BodyRegionId,
  BodyRegionStatus,
} from "../game/bodyMap/bodyMapTypes";
import {
  bodyRegionDefinitions,
  bodyRegionOrder,
  regionalNodeDefinitions,
} from "../game/bodyMap/bodyRegions";
import type { CampaignProgress } from "../game/campaign/progress";
import {
  missionDefinitions,
  type MissionId,
  type MissionPreparation,
} from "../game/data/missions";
import { pathogenDefinitions } from "../game/data/pathogens";
import { unitDefinitions, type UnitTypeId } from "../game/data/units";
import iconAg from "../assets/bodymap-control/icon-ag.png";
import iconAlert from "../assets/bodymap-control/icon-alert.png";
import iconAtp from "../assets/bodymap-control/icon-atp.png";
import iconBattle from "../assets/bodymap-control/icon-battle.png";
import iconCriticalRegion from "../assets/bodymap-control/icon-critical-region.png";
import iconCyt from "../assets/bodymap-control/icon-cyt.png";
import iconDifficulty from "../assets/bodymap-control/icon-difficulty.png";
import iconGanglion from "../assets/bodymap-control/icon-ganglion.png";
import iconGlobalHealth from "../assets/bodymap-control/icon-global-health.png";
import iconGlobalInfection from "../assets/bodymap-control/icon-global-infection.png";
import iconGlobalInflammation from "../assets/bodymap-control/icon-global-inflammation.png";
import iconHelp from "../assets/bodymap-control/icon-help.png";
import iconHistory from "../assets/bodymap-control/icon-history.png";
import iconInfectedRegion from "../assets/bodymap-control/icon-infected-region.png";
import iconMission from "../assets/bodymap-control/icon-mission.png";
import iconPathogen from "../assets/bodymap-control/icon-pathogen.png";
import iconReinforcements from "../assets/bodymap-control/icon-reinforcements.png";
import iconSeed from "../assets/bodymap-control/icon-seed.png";
import iconSelection from "../assets/bodymap-control/icon-selection.png";
import iconStabilization from "../assets/bodymap-control/icon-stabilization.png";
import iconTurn from "../assets/bodymap-control/icon-turn.png";
import regionBloodAlert from "../assets/bodymap-control/region-blood-alert.png";
import regionBloodCritical from "../assets/bodymap-control/region-blood-critical.png";
import regionBloodHealthy from "../assets/bodymap-control/region-blood-healthy.png";
import regionBoneMarrowAlert from "../assets/bodymap-control/region-boneMarrow-alert.png";
import regionBoneMarrowCritical from "../assets/bodymap-control/region-boneMarrow-critical.png";
import regionBoneMarrowHealthy from "../assets/bodymap-control/region-boneMarrow-healthy.png";
import regionIntestineAlert from "../assets/bodymap-control/region-intestine-alert.png";
import regionIntestineCritical from "../assets/bodymap-control/region-intestine-critical.png";
import regionIntestineHealthy from "../assets/bodymap-control/region-intestine-healthy.png";
import regionLiverAlert from "../assets/bodymap-control/region-liver-alert.png";
import regionLiverCritical from "../assets/bodymap-control/region-liver-critical.png";
import regionLiverHealthy from "../assets/bodymap-control/region-liver-healthy.png";
import regionLungsAlert from "../assets/bodymap-control/region-lungs-alert.png";
import regionLungsCritical from "../assets/bodymap-control/region-lungs-critical.png";
import regionLungsHealthy from "../assets/bodymap-control/region-lungs-healthy.png";
import regionLymphNodesAlert from "../assets/bodymap-control/region-lymphNodes-alert.png";
import regionLymphNodesCritical from "../assets/bodymap-control/region-lymphNodes-critical.png";
import regionLymphNodesHealthy from "../assets/bodymap-control/region-lymphNodes-healthy.png";
import regionSkinAlert from "../assets/bodymap-control/region-skin-alert.png";
import regionSkinCritical from "../assets/bodymap-control/region-skin-critical.png";
import regionSkinHealthy from "../assets/bodymap-control/region-skin-healthy.png";
import regionSpleenAlert from "../assets/bodymap-control/region-spleen-alert.png";
import regionSpleenCritical from "../assets/bodymap-control/region-spleen-critical.png";
import regionSpleenHealthy from "../assets/bodymap-control/region-spleen-healthy.png";
import selectionRing from "../assets/bodymap-control/ui-selection-ring.png";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type RegionVisualState = "healthy" | "alert" | "critical";

const regionCardAssets: Record<
  BodyRegionId,
  Record<RegionVisualState, string>
> = {
  skin: {
    healthy: regionSkinHealthy,
    alert: regionSkinAlert,
    critical: regionSkinCritical,
  },
  lungs: {
    healthy: regionLungsHealthy,
    alert: regionLungsAlert,
    critical: regionLungsCritical,
  },
  intestine: {
    healthy: regionIntestineHealthy,
    alert: regionIntestineAlert,
    critical: regionIntestineCritical,
  },
  blood: {
    healthy: regionBloodHealthy,
    alert: regionBloodAlert,
    critical: regionBloodCritical,
  },
  lymphNodes: {
    healthy: regionLymphNodesHealthy,
    alert: regionLymphNodesAlert,
    critical: regionLymphNodesCritical,
  },
  spleen: {
    healthy: regionSpleenHealthy,
    alert: regionSpleenAlert,
    critical: regionSpleenCritical,
  },
  boneMarrow: {
    healthy: regionBoneMarrowHealthy,
    alert: regionBoneMarrowAlert,
    critical: regionBoneMarrowCritical,
  },
  liver: {
    healthy: regionLiverHealthy,
    alert: regionLiverAlert,
    critical: regionLiverCritical,
  },
};

type BodyMapPageProps = {
  progress: CampaignProgress;
  state: BodyMapState;
  selectedRegionId: BodyRegionId;
  onSelectRegion: (regionId: BodyRegionId) => void;
  onUpdateState: (state: BodyMapState) => void;
  onLaunchBattle: (
    regionId: BodyRegionId,
    missionId: MissionId,
    preparation: MissionPreparation,
  ) => void;
  onNewBodyMapGame: (difficulty: BodyMapDifficulty) => void;
  onResetBodyMap: () => void;
  onBackHome: () => void;
};

export function BodyMapPage({
  progress,
  state,
  selectedRegionId,
  onSelectRegion,
  onUpdateState,
  onLaunchBattle,
  onNewBodyMapGame,
  onResetBodyMap,
  onBackHome,
}: BodyMapPageProps) {
  const [difficulty, setDifficulty] = useState<BodyMapDifficulty>(state.difficulty);
  const selectedDefinition = bodyRegionDefinitions[selectedRegionId];
  const selectedRegion = state.regions[selectedRegionId];
  const selectedNodeId = selectedDefinition.regionalNodeId;
  const selectedNode = state.regionalNodes[selectedNodeId];
  const selectedNodeDefinition = regionalNodeDefinitions[selectedNodeId];
  const availableReinforcements = getAvailableReinforcements(progress);
  const victoryProgress = getBodyMapVictoryProgress(state);
  const isRunFinished = state.runStatus !== "running";
  const canLaunchBattle = !isRunFinished && canRegionLaunchBattle(selectedRegion);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (isRunFinished) {
      return;
    }

    const intervalId = window.setInterval(() => {
      onUpdateState(applyPassiveBodyMapInfectionTick(stateRef.current));
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isRunFinished, onUpdateState]);

  const launchBattle = () => {
    const bodyPreparation = prepareBodyBattle(state, selectedRegionId);

    onLaunchBattle(
      selectedRegionId,
      bodyPreparation.missionId,
      toMissionPreparation(bodyPreparation, progress),
    );
  };

  const selectedVisualState = getRegionVisualState(selectedRegion.status);
  const selectedRegionCard = regionCardAssets[selectedRegionId][selectedVisualState];

  return (
    <div className="body-map-page body-control-page">
      <div className="body-control-backdrop" aria-hidden="true" />
      <header className="body-command-header">
        <div className="body-command-title">
          <img src={iconStabilization} alt="" />
          <div>
            <span className="eyebrow">V9.2 - Partie normale</span>
            <h1>Strategie globale</h1>
            <p>
              Stabilise l'organisme plusieurs tours, surveille les foyers
              regionaux et choisis ou engager les renforts immunitaires.
            </p>
          </div>
        </div>

        <div className="body-command-actions">
          <label className="body-difficulty body-command-select">
            <img src={iconDifficulty} alt="" />
            <span>Difficulte</span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as BodyMapDifficulty)
              }
            >
              <option value="easy">Facile</option>
              <option value="normal">Normal</option>
              <option value="hard">Difficile</option>
            </select>
          </label>
          <Button onClick={() => onNewBodyMapGame(difficulty)}>
            Nouvelle partie
          </Button>
          <Button
            className="body-turn-button"
            disabled={isRunFinished}
            onClick={() => onUpdateState(advanceStrategicTurn(state))}
          >
            <img src={iconTurn} alt="" />
            Avancer un tour
          </Button>
          <Button onClick={onResetBodyMap}>Abandonner run</Button>
        </div>

        <div className="body-command-metrics">
          <Metric
            icon={iconGlobalHealth}
            label="Sante globale"
            value={state.globalHealth}
            tone="health"
          />
          <Metric
            icon={iconGlobalInfection}
            label="Infection globale"
            value={state.globalInfection}
            tone="infection"
          />
          <Metric
            icon={iconGlobalInflammation}
            label="Inflammation systemique"
            value={state.systemicInflammation}
            tone="inflammation"
          />
        </div>

        <div className="body-resource-row body-command-resources">
          <span><img src={iconTurn} alt="" />Tour {state.strategicTurn}</span>
          <span><img src={iconDifficulty} alt="" />{formatDifficulty(state.difficulty)}</span>
          <span><img src={iconSeed} alt="" />Seed {state.seed}</span>
          <span><img src={iconAtp} alt="" />ATP {Math.floor(state.globalResources.atp)}</span>
          <span><img src={iconCyt} alt="" />CYT {Math.floor(state.globalResources.cytokines)}</span>
          <span><img src={iconAg} alt="" />AG {Math.floor(state.globalResources.antigens)}</span>
        </div>
      </header>

      <section className="body-victory-panel body-global-status-panel">
        <Panel className="body-alert-panel body-command-panel">
          <div className="body-section-heading">
            <img src={iconStabilization} alt="" />
            <div>
              <span>Etat global</span>
              <h2>Stabilisation</h2>
            </div>
          </div>
          <div className="body-info-grid body-global-grid">
            <span>
              <img src={iconStabilization} alt="" />
              Stabilisation : {victoryProgress.stableTurns}/
              {victoryProgress.requiredStableTurns} tours
            </span>
            <span>
              <img src={iconInfectedRegion} alt="" />
              Regions infectees : {victoryProgress.infectedRegions}
            </span>
            <span>
              <img src={iconCriticalRegion} alt="" />
              Regions critiques : {victoryProgress.criticalRegions}
            </span>
            <span>
              <img src={state.runStatus === "victory" ? iconStabilization : iconAlert} alt="" />
              Etat :{" "}
              {state.runStatus === "victory"
                ? "victoire globale"
                : state.runStatus === "defeat"
                  ? "defaite globale"
                  : victoryProgress.ready
                    ? "presque stabilise"
                    : "en cours"}
            </span>
          </div>
          {victoryProgress.blockers.length ? (
            <div className="body-loadout body-alert-strip">
              {victoryProgress.blockerDetails.slice(0, 5).map((blocker) => (
                <span
                  className={`body-alert body-alert-${blocker.severity}`}
                  key={blocker.id}
                >
                  <img
                    src={
                      blocker.severity === "danger"
                        ? iconCriticalRegion
                        : blocker.severity === "warning"
                          ? iconAlert
                          : iconStabilization
                    }
                    alt=""
                  />
                  {blocker.message}
                </span>
              ))}
            </div>
          ) : (
            <p>Conditions atteintes : maintiens la stabilisation encore un tour.</p>
          )}
        </Panel>
      </section>

      <section className="body-map-layout body-command-main">
        <Panel className="body-map-panel body-map-command-panel">
          <div className="body-section-heading">
            <img src={iconSelection} alt="" />
            <div>
              <span>Carte tactique</span>
              <h2>Organisme regional</h2>
            </div>
          </div>
          <div className="body-map-canvas" aria-label="Carte strategique du corps">
            <svg
              className="body-map-links"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {bodyRegionOrder.flatMap((regionId) => {
                const source = bodyRegionDefinitions[regionId];

                return source.connections
                  .filter(
                    (targetId) =>
                      bodyRegionOrder.indexOf(regionId) <
                      bodyRegionOrder.indexOf(targetId),
                  )
                  .map((targetId) => {
                    const target = bodyRegionDefinitions[targetId];

                    return (
                      <line
                        key={`${regionId}-${targetId}`}
                        x1={source.mapPosition.x}
                        y1={source.mapPosition.y}
                        x2={target.mapPosition.x}
                        y2={target.mapPosition.y}
                      />
                    );
                  });
              })}
            </svg>
            {bodyRegionOrder.map((regionId) => {
              const definition = bodyRegionDefinitions[regionId];
              const region = state.regions[regionId];
              const visualState = getRegionVisualState(region.status);

              return (
                <button
                  className={`body-node body-node-${region.status} ${
                    selectedRegionId === regionId ? "body-node-selected" : ""
                  }`}
                  key={regionId}
                  onClick={() => onSelectRegion(regionId)}
                  style={{
                    left: `${definition.mapPosition.x}%`,
                    top: `${definition.mapPosition.y}%`,
                  }}
                  type="button"
                  aria-label={`${definition.name}, ${formatStatus(region.status)}, infection ${Math.round(region.infection)}%`}
                >
                  <img
                    className="body-node-card"
                    src={regionCardAssets[regionId][visualState]}
                    alt=""
                  />
                  {selectedRegionId === regionId ? (
                    <img className="body-node-ring" src={selectionRing} alt="" />
                  ) : null}
                  <span className="body-node-data">
                    <em>{formatThreat(region.threat)}</em>
                    <strong>{Math.round(region.infection)}%</strong>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="body-detail-panel body-region-command-panel">
          <div className="body-region-portrait">
            <img src={selectedRegionCard} alt="" />
            <div className="body-detail-heading">
              <span className={`mission-status body-status-${selectedRegion.status}`}>
                {formatStatus(selectedRegion.status)}
              </span>
              <h2>{selectedDefinition.name}</h2>
              <p>{selectedDefinition.pedagogy}</p>
            </div>
          </div>

          <div className="body-stat-list">
            <Metric
              icon={iconGlobalHealth}
              label="Sante locale"
              value={selectedRegion.localHealth}
              tone="health"
            />
            <Metric
              icon={iconGlobalInfection}
              label="Infection locale"
              value={selectedRegion.infection}
              tone="infection"
            />
            <Metric
              icon={iconGlobalInflammation}
              label="Inflammation locale"
              value={selectedRegion.inflammation}
              tone="inflammation"
            />
          </div>

          <div className="body-info-grid body-tactical-grid">
            <span><img src={iconAlert} alt="" />Menace: {formatThreat(selectedRegion.threat)}</span>
            <span>
              <img src={iconMission} alt="" />
              Mission locale: {missionDefinitions[selectedDefinition.linkedMissionId].displayName}
            </span>
            <span>
              <img src={iconMission} alt="" />
              Preset actif:{" "}
                  {missionDefinitions[
                selectedRegion.activeBattleMissionId ??
                  selectedDefinition.linkedMissionId
              ].displayName}
            </span>
            <span><img src={iconGanglion} alt="" />Ganglion: {selectedNodeDefinition.name}</span>
            <span>
              <img src={iconAg} alt="" />
              Signaux antigeniques: {selectedNode.antigenSignalsDelivered}
            </span>
            <span>
              <img src={iconBattle} alt="" />
              Tentatives locales: {selectedRegion.localDefeatStreak ?? 0}/3
            </span>
          </div>
          {selectedRegion.status === "lost" ? (
            <div className="body-alert body-alert-danger">
              Zone perdue : elle est abandonnee pour cette partie. Elle ne bloque
              plus la progression, mais la sante globale a deja encaisse la perte.
            </div>
          ) : null}

          <div className="threat-panel">
            <strong><img src={iconPathogen} alt="" />Pathogenes</strong>
            {selectedRegion.pathogens.length ? (
              selectedRegion.pathogens.map((pathogenId) => {
                const definition = pathogenDefinitions[pathogenId];

                return (
                <span
                  className="threat-pill"
                  key={pathogenId}
                  title={[
                    definition.gameplayRole,
                    definition.realLifeInspiration,
                    definition.simplificationNote,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {definition.displayName}
                  <em>{definition.subtype ?? definition.archetype}</em>
                </span>
                );
              })
            ) : (
              <span className="threat-empty">Aucun pathogene majeur</span>
            )}
          </div>

          <div className="body-reinforcement-panel">
            <strong><img src={iconReinforcements} alt="" />Renforts regionaux</strong>
            <div className="body-loadout">
              {availableReinforcements.map((unitTypeId) => {
                const cost = reinforcementCosts[unitTypeId];
                const count = selectedRegion.assignedReinforcements[unitTypeId] ?? 0;
                const canAfford =
                  state.globalResources.atp >= cost.atp &&
                  state.globalResources.cytokines >= cost.cytokines &&
                  state.globalResources.antigens >= cost.antigens &&
                  selectedRegion.status !== "lost" &&
                  !isRunFinished;

                return (
                  <div className="body-reinforcement-control" key={unitTypeId}>
                    <Button
                      disabled={count <= 0 || isRunFinished}
                      onClick={() =>
                        onUpdateState(
                          removeAssignedReinforcement(
                            state,
                            selectedRegionId,
                            unitTypeId,
                          ),
                        )
                      }
                      title={`Retirer un ${unitDefinitions[unitTypeId].displayName} et recuperer les ressources`}
                    >
                      -
                    </Button>
                    <Button
                      disabled={!canAfford}
                      onClick={() =>
                        onUpdateState(
                          assignReinforcement(state, selectedRegionId, unitTypeId),
                        )
                      }
                    >
                      + {unitDefinitions[unitTypeId].displayName} ({count})
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="body-action-row body-local-actions">
            <Button
              className="body-local-button"
              disabled={selectedNode.active || isRunFinished}
              onClick={() => onUpdateState(activateRegionalNode(state, selectedNodeId))}
            >
              <img src={iconGanglion} alt="" />
              {selectedNode.active ? "Ganglion actif" : "Activer ganglion"}
            </Button>
            <Button
              className="body-local-button body-local-primary"
              disabled={!canLaunchBattle}
              onClick={launchBattle}
              variant="primary"
            >
              <img src={iconBattle} alt="" />
              {selectedRegion.status === "lost"
                ? "Zone perdue"
                : selectedRegion.infection > 0 &&
                    selectedRegion.infection <= 18
                  ? "Nettoyer la zone"
                : "Lancer bataille locale"}
            </Button>
          </div>
        </Panel>
      </section>

      {state.finalSummary ? (
        <section className="body-final-panel">
          <Panel className="body-alert-panel">
            <span className={`mission-status body-status-${state.runStatus}`}>
              {state.finalSummary.status === "victory" ? "victoire" : "defaite"}
            </span>
            <h2>{state.finalSummary.title}</h2>
            <p>{state.finalSummary.cause}</p>
            <div className="body-info-grid">
              <span>Score : {state.finalSummary.score}</span>
              <span>Rang : {state.finalSummary.rank}</span>
              <span>Tour : {state.finalSummary.strategicTurn}</span>
              <span>Sante globale : {state.finalSummary.globalHealth}%</span>
              <span>Infection globale : {state.finalSummary.globalInfection}%</span>
              <span>
                Inflammation : {state.finalSummary.systemicInflammation}%
              </span>
              <span>
                Regions stabilisees : {state.finalSummary.stabilizedRegions}
              </span>
              <span>Regions critiques : {state.finalSummary.criticalRegions}</span>
              <span>Batailles gagnees : {state.finalSummary.battleStats.won}</span>
              <span>Batailles perdues : {state.finalSummary.battleStats.lost}</span>
            </div>
            <div className="body-action-row">
              <Button onClick={onBackHome}>Retour menu</Button>
              <Button onClick={() => onNewBodyMapGame(state.difficulty)}>
                Rejouer
              </Button>
              <Button onClick={() => onNewBodyMapGame(difficulty)} variant="primary">
                Nouvelle partie
              </Button>
            </div>
          </Panel>
        </section>
      ) : null}

      <section className="body-lower-grid">
        <Panel className="body-alert-panel">
          <div className="body-section-heading body-section-heading-small">
            <img src={iconAlert} alt="" />
            <h2>Alertes</h2>
          </div>
          {state.alerts.map((alert) => (
            <span className="body-alert" key={alert}>
              {alert}
            </span>
          ))}
        </Panel>
        <Panel className="body-alert-panel">
          <div className="body-section-heading body-section-heading-small">
            <img src={iconHistory} alt="" />
            <h2>Historique</h2>
          </div>
          {state.history.map((entry) => (
            <span className="body-alert" key={entry}>
              {entry}
            </span>
          ))}
        </Panel>
        <Panel className="body-alert-panel">
          <div className="body-section-heading body-section-heading-small">
            <img src={iconHelp} alt="" />
            <h2>Aide biologique simplifiee</h2>
          </div>
          <p>Les ganglions regionaux coordonnent la reponse adaptative.</p>
          <p>Le sang circule partout : utile aux renforts, dangereux pour la propagation.</p>
          <p>La moelle osseuse soutient la production de cellules immunitaires.</p>
          <p>La lymphe transporte les signaux antigeniques vers les ganglions.</p>
        </Panel>
      </section>
    </div>
  );
}

type MetricProps = {
  icon?: string;
  label: string;
  value: number;
  tone: "health" | "infection" | "inflammation";
};

function Metric({ icon, label, value, tone }: MetricProps) {
  const ratio = Math.max(0, Math.min(1, value / 100));

  return (
    <div className="body-metric">
      {icon ? <img className="body-metric-icon" src={icon} alt="" /> : null}
      <div className="hud-gauge-label">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="hud-gauge-track">
        <div
          className={`body-metric-fill body-metric-fill-${tone}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function getRegionVisualState(status: BodyRegionStatus): RegionVisualState {
  if (
    status === "healthy" ||
    status === "controlled" ||
    status === "inBattle"
  ) {
    return "healthy";
  }

  if (status === "alert" || status === "highInflammation") {
    return "alert";
  }

  return "critical";
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    healthy: "sain",
    alert: "alerte",
    infected: "infecte",
    highInflammation: "inflammation elevee",
    inBattle: "en bataille",
    controlled: "controle",
    weakened: "affaibli",
    critical: "critique",
    lost: "perdu",
    victory: "victoire",
    defeat: "defaite",
  };

  return labels[status] ?? status;
}

function formatThreat(threat: string): string {
  const labels: Record<string, string> = {
    none: "aucune",
    bacterial: "bacterienne",
    viral: "virale",
    fungal: "fongique",
    parasite: "parasitaire",
    cancer: "cellules anormales",
    opportunist: "opportuniste",
    mixed: "mixte",
  };

  return labels[threat] ?? threat;
}

function formatDifficulty(difficulty: BodyMapDifficulty): string {
  const labels: Record<BodyMapDifficulty, string> = {
    easy: "Facile",
    normal: "Normal",
    hard: "Difficile",
  };

  return labels[difficulty];
}
