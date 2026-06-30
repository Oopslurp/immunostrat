import { useEffect, useMemo, useState } from "react";
import { balanceValues } from "../game/data/balance";
import { pathogenDefinitions } from "../game/data/pathogens";
import { unitDefinitions } from "../game/data/units";
import { GameBridge, type GameSnapshot } from "../game/phaser/GameBridge";
import { PhaserGame } from "../game/phaser/PhaserGame";
import { Button } from "../ui/Button";

export function GamePage() {
  const bridge = useMemo(() => new GameBridge(), []);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const missionId = "woundBacteriaV1";

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
  const canUseAntiviral =
    snapshot?.status === "running" &&
    snapshot.antiviralSignalCooldownMs <= 0 &&
    snapshot.cytokines >= balanceValues.antiviral.cytokineCost;
  const canProduceNk =
    snapshot?.status === "running" &&
    snapshot.atp >= unitDefinitions.nkCell.atpCost &&
    snapshot.cytokines >= unitDefinitions.nkCell.cytokineCost;
  const canResearchViral =
    snapshot?.status === "running" &&
    !snapshot.viralAnalysisComplete &&
    snapshot.antigens >= balanceValues.adaptive.viralAnalysisAntigenCost;
  const canProduceCytotoxicT =
    snapshot?.status === "running" &&
    snapshot.viralAnalysisComplete &&
    snapshot.atp >= unitDefinitions.cytotoxicT.atpCost &&
    snapshot.cytokines >= unitDefinitions.cytotoxicT.cytokineCost &&
    snapshot.antigens >= balanceValues.adaptive.cytotoxicTAntigenCost;

  return (
    <div className="page game-page">
      <header className="game-header">
        <div>
          <span className="eyebrow">Prototype jouable V5.1</span>
          <h1>Plaie cutanee infectee</h1>
          <p>
            Produis macrophages, neutrophiles et NK, controle bacteries et virus,
            collecte les debris avec des cellules dendritiques puis debloque la
            reponse T cytotoxique contre les cellules infectees.
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
          <Button
            disabled={!canUseAntiviral}
            onClick={() => bridge.dispatch({ type: "useAntiviralSignal" })}
          >
            Interferons (-{balanceValues.antiviral.cytokineCost} CYT)
          </Button>
          <Button
            disabled={!canProduceNk}
            onClick={() => bridge.dispatch({ type: "produceNkCell" })}
          >
            Cellule NK (-{unitDefinitions.nkCell.atpCost} ATP, -
            {unitDefinitions.nkCell.cytokineCost} CYT)
          </Button>
          <Button
            disabled={!canResearchViral}
            onClick={() => bridge.dispatch({ type: "researchViralAnalysis" })}
          >
            Analyse virale (-{balanceValues.adaptive.viralAnalysisAntigenCost} AG)
          </Button>
          <Button
            disabled={!canProduceCytotoxicT}
            onClick={() => bridge.dispatch({ type: "produceCytotoxicT" })}
          >
            T cytotoxique (-{unitDefinitions.cytotoxicT.atpCost} ATP, -
            {unitDefinitions.cytotoxicT.cytokineCost} CYT, -
            {balanceValues.adaptive.cytotoxicTAntigenCost} AG)
          </Button>
          <Button onClick={() => bridge.dispatch({ type: "restart" })}>
            Recommencer
          </Button>
        </div>
      </header>

      <section className="game-frame" aria-label="Canvas du jeu Immunostrat">
        <PhaserGame bridge={bridge} missionId={missionId} />
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

      <div className="hud-strip" aria-label="Statut du jeu V5">
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
          Virus:{" "}
          {snapshot?.entities.filter((entity) => entity.kind === "virus").length ??
            0}
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
                <em>{definition.archetype}</em>
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
