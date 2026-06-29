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

  const canProduce =
    snapshot?.status === "running" &&
    snapshot.atp >= unitDefinitions.macrophage.atpCost;

  return (
    <div className="page game-page">
      <header className="game-header">
        <div>
          <span className="eyebrow">Prototype jouable V1</span>
          <h1>Plaie cutanee infectee</h1>
          <p>
            Produis des macrophages, deplace-les sur la carte et empeche les
            bacteries d'endommager le tissu.
          </p>
        </div>
        <div className="game-actions">
          <Button
            disabled={!canProduce}
            onClick={() => bridge.dispatch({ type: "produceMacrophage" })}
            variant="primary"
          >
            Macrophage (-{unitDefinitions.macrophage.atpCost} ATP)
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
      </div>
    </div>
  );
}

type GaugeProps = {
  label: string;
  value: number;
  max: number;
  tone: "health" | "atp";
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
