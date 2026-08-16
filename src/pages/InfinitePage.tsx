import { useState } from "react";
import {
  infiniteDifficultySettings,
  type InfiniteDifficulty,
} from "../game/data/infiniteMode";
import type { InfiniteProgress } from "../game/infinite/infiniteProgress";
import infiniteIconBiohazard from "../assets/infinite/infinite-icon-biohazard.png";
import infiniteIconCycle from "../assets/infinite/infinite-icon-cycle.png";
import infiniteIconDna from "../assets/infinite/infinite-icon-dna.png";
import infiniteIconHome from "../assets/infinite/infinite-icon-home.png";
import infiniteIconInfinity from "../assets/infinite/infinite-icon-infinity.png";
import infiniteIconMass from "../assets/infinite/infinite-icon-mass.png";
import infiniteIconReset from "../assets/infinite/infinite-icon-reset.png";
import infiniteIconSkull from "../assets/infinite/infinite-icon-skull.png";
import infiniteIconTrophy from "../assets/infinite/infinite-icon-trophy.png";
import infiniteIconWarning from "../assets/infinite/infinite-icon-warning.png";
import infiniteIconWave from "../assets/infinite/infinite-icon-wave.png";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";

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
  const [confirmReset, setConfirmReset] = useState(false);
  const selectedBest = progress.bestRuns[difficulty];
  const selectedSettings = infiniteDifficultySettings[difficulty];

  return (
    <div className="mode-page mode-page-infinite">
      <div className="mode-backdrop" aria-hidden="true" />
      <header className="mode-hero">
        <div className="mode-hero-main">
          <div className="mode-hero-icon mode-hero-icon-infinite">
            <img src={infiniteIconInfinity} alt="" />
          </div>
          <div>
            <span className="eyebrow">V11.5 · Mode infini</span>
            <h1>Survie immunitaire</h1>
            <p>
              Affrontez des vagues évolutives. Adaptez vos défenses. Tenez le
              plus longtemps possible pendant que la contamination s'intensifie.
            </p>
          </div>
        </div>
        <div className="mode-actions">
          <Button className="mode-secondary-button mode-secondary-button-danger" data-audio="back" onClick={onBackHome}>
            <img src={infiniteIconHome} alt="" />
            Retour menu
          </Button>
          <Button className="mode-secondary-button mode-secondary-button-danger" onClick={() => setConfirmReset(true)}>
            <img src={infiniteIconReset} alt="" />
            Réinitialiser les records
          </Button>
        </div>
      </header>

      <section className="mode-grid" aria-label="Préparation mode infini">
        <article className="mode-card mode-card-primary mode-card-danger">
          <div className="mode-card-heading">
            <img src={infiniteIconBiohazard} alt="" />
            <div>
              <span>Session de survie</span>
              <h2>Nouvelle partie infinie</h2>
            </div>
          </div>
          <p>
            Campagne et carte du corps restent séparées. Ici, l'objectif est de
            survivre, faire monter le score et tenir un maximum de cycles.
          </p>
          <label className="mode-select mode-select-danger">
            <span>Difficulté</span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as InfiniteDifficulty)
              }
            >
              <option value="normal">Normal - score x1</option>
              <option value="hard">Difficile · score x1,5</option>
              <option value="nightmare">Extrême · score x2</option>
            </select>
          </label>
          <div className="mode-stat-grid mode-stat-grid-danger">
            <span>
              <img src={infiniteIconTrophy} alt="" />
              <strong>Score</strong>
              <em>x{selectedSettings.scoreMultiplier}</em>
            </span>
            <span>
              <img src={infiniteIconSkull} alt="" />
              <strong>Ennemis</strong>
              <em>{selectedSettings.maxActivePathogens}</em>
            </span>
            <span>
              <img src={infiniteIconMass} alt="" />
              <strong>Ressources</strong>
              <em>x{selectedSettings.resourceMultiplier}</em>
            </span>
            <span>
              <img src={infiniteIconDna} alt="" />
              <strong>Mutateurs</strong>
              <em>+{selectedSettings.mutatorExtraFrequency}</em>
            </span>
          </div>
          <Button
            className="mode-cta mode-cta-infinite"
            onClick={() => onStart(difficulty)}
            variant="primary"
          >
            <img src={infiniteIconInfinity} alt="" />
            Nouvelle partie infinie
          </Button>
        </article>

        <article className="mode-card mode-record-card mode-card-danger">
          <div className="mode-card-heading">
            <img src={infiniteIconTrophy} alt="" />
            <div>
              <span>Archive de survie</span>
              <h2>Meilleur score</h2>
            </div>
          </div>
          {selectedBest ? (
            <div className="mode-record mode-record-infinite">
              <strong>{selectedBest.score}</strong>
              <div>
                <span>Cycle {selectedBest.cycle}</span>
                <span>Vague {selectedBest.wave}</span>
                <span>Phase {selectedBest.phase}</span>
                <span>{new Date(selectedBest.completedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          ) : (
            <p>Aucun record pour cette difficulté.</p>
          )}
          <div className="mode-record-list mode-record-list-danger">
            {(["normal", "hard", "nightmare"] as InfiniteDifficulty[]).map(
              (item) => {
                const best = progress.bestRuns[item];

                return (
                  <span key={item}>
                    <img
                      src={item === "nightmare" ? infiniteIconWarning : infiniteIconCycle}
                      alt=""
                    />
                    {infiniteDifficultySettings[item].label}:{" "}
                    {best ? `${best.score} pts, cycle ${best.cycle}` : "aucun"}
                  </span>
                );
              },
            )}
          </div>
        </article>

        <article className="mode-card mode-rules-card mode-card-danger">
          <div className="mode-card-heading">
            <img src={infiniteIconWave} alt="" />
            <div>
              <span>Escalade</span>
              <h2>Phases</h2>
            </div>
          </div>
          <ol className="mode-phase-list">
            <li><span>01</span>Contamination simple</li>
            <li><span>02</span>Expansion bactérienne</li>
            <li><span>03</span>Résistance</li>
            <li><span>04</span>Infection virale</li>
            <li><span>05</span>Infection mixte</li>
            <li><span>06</span>Mutation</li>
            <li><span>07</span>Crise systémique</li>
            <li><span>08</span>Extrême : champignons, parasites, opportunistes et cellules anormales</li>
          </ol>
        </article>
      </section>
      {confirmReset ? (
        <ConfirmDialog
          confirmLabel="Réinitialiser"
          description="Tous les meilleurs scores du mode infini seront supprimés."
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            onReset();
            setConfirmReset(false);
          }}
          title="Effacer les records ?"
        />
      ) : null}
    </div>
  );
}
