import { useState } from "react";
import type { BodyMapDifficulty } from "../game/bodyMap/bodyMapTypes";
import type { BodyMapProgress } from "../game/bodyMap/bodyMapProgress";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type NormalGamePageProps = {
  progress: BodyMapProgress;
  hasRunningMap: boolean;
  onStart: (difficulty: BodyMapDifficulty) => void;
  onContinue: () => void;
  onResetResults: () => void;
  onBackHome: () => void;
};

export function NormalGamePage({
  progress,
  hasRunningMap,
  onStart,
  onContinue,
  onResetResults,
  onBackHome,
}: NormalGamePageProps) {
  const [difficulty, setDifficulty] = useState<BodyMapDifficulty>("normal");
  const bestForDifficulty = progress.bestScoreByDifficulty[difficulty];

  return (
    <div className="page infinite-page">
      <header className="campaign-header">
        <div>
          <span className="eyebrow">V9.2 - Partie normale</span>
          <h1>Carte du corps</h1>
          <p>
            Une partie strategique generee, gagnable, separee de la campagne et
            du mode infini. Stabilise l'organisme avant propagation systemique.
          </p>
        </div>
        <div className="game-actions">
          <Button onClick={onBackHome}>Retour menu</Button>
          <Button onClick={onResetResults}>Reinitialiser resultats</Button>
        </div>
      </header>

      <section className="infinite-layout">
        <Panel className="infinite-launch-panel">
          <h2>Nouvelle partie normale</h2>
          <p>
            Objectif : garder la sante globale, reduire l'infection, calmer
            l'inflammation et maintenir la stabilisation plusieurs tours.
          </p>
          <label className="body-difficulty">
            Difficulte
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as BodyMapDifficulty)
              }
            >
              <option value="easy">Facile - moins de foyers initiaux</option>
              <option value="normal">Normal - experience recommandee</option>
              <option value="hard">Difficile - menaces avancees plus frequentes</option>
            </select>
          </label>
          <div className="body-info-grid">
            <span>Victoire : organisme stabilise</span>
            <span>Defaite : organisme submerge</span>
            <span>Score : stabilisation</span>
            <span>Mode fini, pas infini</span>
          </div>
          <Button onClick={() => onStart(difficulty)} variant="primary">
            Generer la carte
          </Button>
          <Button disabled={!hasRunningMap} onClick={onContinue}>
            Continuer partie en cours
          </Button>
        </Panel>

        <Panel className="infinite-launch-panel">
          <h2>Meilleure stabilisation</h2>
          {bestForDifficulty ? (
            <div className="infinite-record">
              <strong>{bestForDifficulty.score}</strong>
              <span>Rang {bestForDifficulty.rank}</span>
              <span>Tour {bestForDifficulty.strategicTurn}</span>
              <span>Sante {bestForDifficulty.globalHealth}%</span>
              <span>
                {new Date(bestForDifficulty.completedAt).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <p>Aucune victoire pour cette difficulte.</p>
          )}
          <div className="infinite-record-list">
            <span className="body-alert">Victoires : {progress.victories}</span>
            <span className="body-alert">Defaites : {progress.defeats}</span>
            <span className="body-alert">
              Meilleure difficulte : {progress.highestDifficultyWon ?? "aucune"}
            </span>
          </div>
        </Panel>

        <Panel className="infinite-launch-panel">
          <h2>Modes separes</h2>
          <p>Campagne : apprentissage guide, missions fixes.</p>
          <p>Partie normale : carte du corps generee, victoire finale possible.</p>
          <p>Mode infini : survie avancee, score, pas de victoire finale.</p>
        </Panel>
      </section>
    </div>
  );
}
