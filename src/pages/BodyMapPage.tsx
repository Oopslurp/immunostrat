import { useState } from "react";
import {
  activateRegionalNode,
  advanceStrategicTurn,
  assignReinforcement,
  getAvailableReinforcements,
  prepareBodyBattle,
  reinforcementCosts,
  toMissionPreparation,
} from "../game/bodyMap/bodyMapSystem";
import type {
  BodyMapDifficulty,
  BodyMapState,
  BodyRegionId,
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
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

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
}: BodyMapPageProps) {
  const [difficulty, setDifficulty] = useState<BodyMapDifficulty>(state.difficulty);
  const selectedDefinition = bodyRegionDefinitions[selectedRegionId];
  const selectedRegion = state.regions[selectedRegionId];
  const selectedNodeId = selectedDefinition.regionalNodeId;
  const selectedNode = state.regionalNodes[selectedNodeId];
  const selectedNodeDefinition = regionalNodeDefinitions[selectedNodeId];
  const availableReinforcements = getAvailableReinforcements(progress);
  const canLaunchBattle =
    selectedRegion.infection >= 15 || selectedRegion.status === "infected";

  const launchBattle = () => {
    const bodyPreparation = prepareBodyBattle(state, selectedRegionId);

    onLaunchBattle(
      selectedRegionId,
      bodyPreparation.missionId,
      toMissionPreparation(bodyPreparation, progress),
    );
  };

  return (
    <div className="page body-map-page">
      <header className="campaign-header">
        <div>
          <span className="eyebrow">V7 - Carte du corps</span>
          <h1>Strategie globale</h1>
          <p>
            Partie normale generee : chaque nouvelle partie cree des foyers
            differents. La campagne reste le mode apprentissage, le mode infini
            restera pour V8.
          </p>
        </div>
        <div className="game-actions">
          <label className="body-difficulty">
            Difficulte
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
          <Button onClick={() => onUpdateState(advanceStrategicTurn(state))}>
            Avancer un tour
          </Button>
          <Button onClick={onResetBodyMap}>Reinitialiser carte</Button>
        </div>
      </header>

      <section className="body-overview">
        <Metric label="Sante globale" value={state.globalHealth} tone="health" />
        <Metric label="Infection globale" value={state.globalInfection} tone="infection" />
        <Metric
          label="Inflammation systemique"
          value={state.systemicInflammation}
          tone="inflammation"
        />
        <div className="body-resource-row">
          <span>Tour {state.strategicTurn}</span>
          <span>{formatDifficulty(state.difficulty)}</span>
          <span>Seed {state.seed}</span>
          <span>ATP {Math.floor(state.globalResources.atp)}</span>
          <span>CYT {Math.floor(state.globalResources.cytokines)}</span>
          <span>AG {Math.floor(state.globalResources.antigens)}</span>
        </div>
      </section>

      <section className="body-map-layout">
        <Panel className="body-map-panel">
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
                >
                  <span>{definition.name}</span>
                  <em>{formatThreat(region.threat)}</em>
                  <strong>{Math.round(region.infection)}%</strong>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="body-detail-panel">
          <div className="body-detail-heading">
            <span className={`mission-status body-status-${selectedRegion.status}`}>
              {formatStatus(selectedRegion.status)}
            </span>
            <h2>{selectedDefinition.name}</h2>
            <p>{selectedDefinition.pedagogy}</p>
          </div>

          <div className="body-stat-list">
            <Metric label="Sante locale" value={selectedRegion.localHealth} tone="health" />
            <Metric label="Infection locale" value={selectedRegion.infection} tone="infection" />
            <Metric
              label="Inflammation locale"
              value={selectedRegion.inflammation}
              tone="inflammation"
            />
          </div>

          <div className="body-info-grid">
            <span>Menace: {formatThreat(selectedRegion.threat)}</span>
            <span>Mission locale: {missionDefinitions[selectedDefinition.linkedMissionId].displayName}</span>
            <span>
              Preset actif:{" "}
              {missionDefinitions[
                selectedRegion.activeBattleMissionId ??
                  selectedDefinition.linkedMissionId
              ].displayName}
            </span>
            <span>Ganglion: {selectedNodeDefinition.name}</span>
            <span>
              Signaux antigeniques: {selectedNode.antigenSignalsDelivered}
            </span>
          </div>

          <div className="threat-panel">
            <strong>Pathogenes</strong>
            {selectedRegion.pathogens.length ? (
              selectedRegion.pathogens.map((pathogenId) => (
                <span className="threat-pill" key={pathogenId}>
                  {pathogenDefinitions[pathogenId].displayName}
                  <em>{pathogenDefinitions[pathogenId].archetype}</em>
                </span>
              ))
            ) : (
              <span className="threat-empty">Aucun pathogene majeur</span>
            )}
          </div>

          <div className="body-reinforcement-panel">
            <strong>Renforts regionaux</strong>
            <div className="body-loadout">
              {availableReinforcements.map((unitTypeId) => {
                const cost = reinforcementCosts[unitTypeId];
                const count = selectedRegion.assignedReinforcements[unitTypeId] ?? 0;
                const canAfford =
                  state.globalResources.atp >= cost.atp &&
                  state.globalResources.cytokines >= cost.cytokines &&
                  state.globalResources.antigens >= cost.antigens;

                return (
                  <Button
                    disabled={!canAfford}
                    key={unitTypeId}
                    onClick={() =>
                      onUpdateState(
                        assignReinforcement(state, selectedRegionId, unitTypeId),
                      )
                    }
                  >
                    + {unitDefinitions[unitTypeId].displayName} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="body-action-row">
            <Button
              disabled={selectedNode.active}
              onClick={() => onUpdateState(activateRegionalNode(state, selectedNodeId))}
            >
              {selectedNode.active ? "Ganglion actif" : "Activer ganglion"}
            </Button>
            <Button disabled={!canLaunchBattle} onClick={launchBattle} variant="primary">
              Lancer bataille locale
            </Button>
          </div>
        </Panel>
      </section>

      <section className="body-lower-grid">
        <Panel className="body-alert-panel">
          <h2>Alertes</h2>
          {state.alerts.map((alert) => (
            <span className="body-alert" key={alert}>
              {alert}
            </span>
          ))}
        </Panel>
        <Panel className="body-alert-panel">
          <h2>Historique</h2>
          {state.history.map((entry) => (
            <span className="body-alert" key={entry}>
              {entry}
            </span>
          ))}
        </Panel>
        <Panel className="body-alert-panel">
          <h2>Aide biologique simplifiee</h2>
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
  label: string;
  value: number;
  tone: "health" | "infection" | "inflammation";
};

function Metric({ label, value, tone }: MetricProps) {
  const ratio = Math.max(0, Math.min(1, value / 100));

  return (
    <div className="body-metric">
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

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    healthy: "sain",
    alert: "alerte",
    infected: "infecte",
    highInflammation: "inflammation elevee",
    inBattle: "en bataille",
    controlled: "controle",
    weakened: "affaibli",
  };

  return labels[status] ?? status;
}

function formatThreat(threat: string): string {
  const labels: Record<string, string> = {
    none: "aucune",
    bacterial: "bacterienne",
    viral: "virale",
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
