import { useState } from "react";
import {
  infiniteDifficultySettings,
  type InfiniteDifficulty,
} from "../game/data/infiniteMode";
import type { InfiniteProgress } from "../game/infinite/infiniteProgress";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type InfinitePageProps = {
  progress: InfiniteProgress;
  onStart: (difficulty: InfiniteDifficulty) => void;
  onReset: () => void;
  onBackHome: () => void;
};

export function InfinitePage({
  progress,
  onStart,
  onReset,
  onBackHome,
}: InfinitePageProps) {
  const [difficulty, setDifficulty] = useState<InfiniteDifficulty>("normal");
  const selectedBest = progress.bestRuns[difficulty];

  return (
    <div className="page infinite-page">
      <header className="campaign-header">
        <div>
          <span className="eyebrow">V8 - Mode infini</span>
          <h1>Survie immunitaire</h1>
          <p>
            Un mode separe, avance et difficile : vagues progressives, phases,
            mutateurs, score et defaite inevitable a long terme.
          </p>
        </div>
        <div className="game-actions">
          <Button onClick={onBackHome}>Retour menu</Button>
          <Button onClick={onReset}>Reinitialiser records</Button>
        </div>
      </header>

      <section className="infinite-layout">
        <Panel className="infinite-launch-panel">
          <h2>Nouvelle partie infinie</h2>
          <p>
            Campagne et carte du corps restent separees. Ici, ton objectif est
            seulement de survivre, monter ton score et tenir le plus de cycles.
          </p>
          <label className="body-difficulty">
            Difficulte
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as InfiniteDifficulty)
              }
            >
              <option value="normal">Normal - score x1</option>
              <option value="hard">Difficile - score x1.5</option>
              <option value="nightmare">Nightmare - score x2</option>
            </select>
          </label>
          <div className="body-info-grid">
            <span>
              Score x{infiniteDifficultySettings[difficulty].scoreMultiplier}
            </span>
            <span>
              Limite ennemis{" "}
              {infiniteDifficultySettings[difficulty].maxActivePathogens}
            </span>
            <span>
              Ressources x
              {infiniteDifficultySettings[difficulty].resourceMultiplier}
            </span>
            <span>
              Mutateurs +{infiniteDifficultySettings[difficulty].mutatorExtraFrequency}
            </span>
          </div>
          <Button onClick={() => onStart(difficulty)} variant="primary">
            Nouvelle partie infinie
          </Button>
        </Panel>

        <Panel className="infinite-launch-panel">
          <h2>Meilleur score</h2>
          {selectedBest ? (
            <div className="infinite-record">
              <strong>{selectedBest.score}</strong>
              <span>Cycle {selectedBest.cycle}</span>
              <span>Vague {selectedBest.wave}</span>
              <span>Phase {selectedBest.phase}</span>
              <span>{new Date(selectedBest.completedAt).toLocaleDateString()}</span>
            </div>
          ) : (
            <p>Aucun record pour cette difficulte.</p>
          )}
          <div className="infinite-record-list">
            {(["normal", "hard", "nightmare"] as InfiniteDifficulty[]).map(
              (item) => {
                const best = progress.bestRuns[item];

                return (
                  <span className="body-alert" key={item}>
                    {infiniteDifficultySettings[item].label}:{" "}
                    {best ? `${best.score} pts, cycle ${best.cycle}` : "aucun"}
                  </span>
                );
              },
            )}
          </div>
        </Panel>

        <Panel className="infinite-launch-panel">
          <h2>Phases</h2>
          <p>1. Contamination simple</p>
          <p>2. Expansion bacterienne</p>
          <p>3. Resistance</p>
          <p>4. Infection virale</p>
          <p>5. Infection mixte</p>
          <p>6. Mutation</p>
          <p>7. Crise systemique</p>
          <p>8. Nightmare, avec hooks V9 uniquement</p>
        </Panel>
      </section>
    </div>
  );
}
