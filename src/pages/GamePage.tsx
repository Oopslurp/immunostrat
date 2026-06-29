import { useEffect, useMemo, useState } from "react";
import { balanceValues } from "../game/data/balance";
import { unitDefinitions } from "../game/data/units";
import { GameBridge, type GameSnapshot } from "../game/phaser/GameBridge";
import { PhaserGame } from "../game/phaser/PhaserGame";
import { Button } from "../ui/Button";

export function GamePage() {
  const bridge = useMemo(() => new GameBridge(), []);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);

  useEffect(() => bridge.subscribeSnapshot(setSnapshot), [bridge]);

  const canProduceMacrophage =
    snapshot?.status === "running" &&
    snapshot.atp >= unitDefinitions.macrophage.atpCost;
  const canProduceNeutrophil =
    snapshot?.status === "running" &&
    snapshot.atp >= unitDefinitions.neutrophil.atpCost &&
    snapshot.cytokines >= unitDefinitions.neutrophil.cytokineCost &&
    snapshot.neutrophilCooldownMs <= 0;
  const canProduceDendritic =
    snapshot?.status === "running" &&
    snapshot.atp >= unitDefinitions.dendriticCell.atpCost &&
    snapshot.cytokines >= unitDefinitions.dendriticCell.cytokineCost;
  const canResearch =
    snapshot?.status === "running" &&
    !snapshot.bacterialAnalysisComplete &&
    snapshot.antigens >= balanceValues.adaptive.bacterialAnalysisAntigenCost;
  const canProducePlasmocyte =
    snapshot?.status === "running" &&
    snapshot.bacterialAnalysisComplete &&
    snapshot.atp >= unitDefinitions.plasmocyte.atpCost &&
    snapshot.cytokines >= unitDefinitions.plasmocyte.cytokineCost &&
    snapshot.antigens >= balanceValues.adaptive.plasmocyteAntigenCost;
  const canUseAdaptive =
    snapshot?.status === "running" &&
    snapshot.bacterialAnalysisComplete &&
    snapshot.massiveNeutralizationCooldownMs <= 0 &&
    snapshot.antigens >= balanceValues.adaptive.massiveNeutralizationAntigenCost &&
    snapshot.atp >= balanceValues.adaptive.massiveNeutralizationAtpCost &&
    snapshot.cytokines >= balanceValues.adaptive.massiveNeutralizationCytokineCost;

  return (
    <div className="page game-page">
      <header className="game-header">
        <div>
          <span className="eyebrow">Prototype jouable V3</span>
          <h1>Plaie cutanee infectee</h1>
          <p>
            Produis macrophages et neutrophiles, controle les bacteries et
            collecte les debris avec des cellules dendritiques pour debloquer
            une reponse adaptative.
          </p>
        </div>
        <div className="game-actions">
          <Button
            disabled={!canProduceMacrophage}
            onClick={() => bridge.dispatch({ type: "produceMacrophage" })}
            variant="primary"
          >
            Macrophage (-{unitDefinitions.macrophage.atpCost} ATP)
          </Button>
          <Button
            disabled={!canProduceNeutrophil}
            onClick={() => bridge.dispatch({ type: "produceNeutrophil" })}
          >
            Neutrophile (-{unitDefinitions.neutrophil.atpCost} ATP, -
            {unitDefinitions.neutrophil.cytokineCost} CYT)
          </Button>
          <Button
            disabled={!canProduceDendritic}
            onClick={() => bridge.dispatch({ type: "produceDendriticCell" })}
          >
            Dendritique (-{unitDefinitions.dendriticCell.atpCost} ATP, -
            {unitDefinitions.dendriticCell.cytokineCost} CYT)
          </Button>
          <Button
            disabled={!canResearch}
            onClick={() => bridge.dispatch({ type: "researchBacterialAnalysis" })}
          >
            Analyse bacterienne (-{balanceValues.adaptive.bacterialAnalysisAntigenCost} AG)
          </Button>
          <Button
            disabled={!canProducePlasmocyte}
            onClick={() => bridge.dispatch({ type: "producePlasmocyte" })}
          >
            Plasmocyte (-{balanceValues.adaptive.plasmocyteAntigenCost} AG)
          </Button>
          <Button
            disabled={!canUseAdaptive}
            onClick={() => bridge.dispatch({ type: "useMassiveNeutralization" })}
          >
            Neutralisation massive
          </Button>
          <Button onClick={() => bridge.dispatch({ type: "restart" })}>
            Recommencer
          </Button>
        </div>
      </header>

      <section className="game-frame" aria-label="Canvas du jeu Immunostrat">
        <PhaserGame bridge={bridge} />
        {snapshot && snapshot.status !== "running" ? (
          <div className="result-overlay">
            <div className="result-title">
              {snapshot.status === "victory" ? "Victoire" : "Defaite"}
            </div>
            <Button onClick={() => bridge.dispatch({ type: "restart" })}>
              Recommencer
            </Button>
          </div>
        ) : null}
      </section>

      <div className="hud-strip" aria-label="Statut du jeu V1">
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
        <span className="hud-item">
          Vague: {snapshot ? Math.min(snapshot.currentWave, snapshot.totalWaves) : 0}/
          {snapshot?.totalWaves ?? 0}
        </span>
        <span className="hud-item">
          Bacteries:{" "}
          {snapshot?.entities.filter((entity) => entity.kind === "bacterium")
            .length ?? 0}
        </span>
        <span className="hud-item">
          Selection: {snapshot?.selectedEntityIds.length ?? 0}
        </span>
        <span className="hud-item">
          Debris: {snapshot?.debrisCount ?? 0}
        </span>
        <span className="hud-item">
          Analyse: {snapshot?.bacterialAnalysisComplete ? "complete" : "non"}
        </span>
        <span className="hud-item">
          Neutrophile CD: {formatCooldown(snapshot?.neutrophilCooldownMs)}
        </span>
        <span className="hud-item">
          Adaptatif CD: {formatCooldown(snapshot?.massiveNeutralizationCooldownMs)}
        </span>
      </div>
    </div>
  );
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
