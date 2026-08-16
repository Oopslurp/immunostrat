import { useState } from "react";
import type { BodyMapDifficulty } from "../game/bodyMap/bodyMapTypes";
import type { BodyMapProgress } from "../game/bodyMap/bodyMapProgress";
import normalIconBody from "../assets/normal/normal-icon-body.png";
import normalIconCheck from "../assets/normal/normal-icon-check.png";
import normalIconHeart from "../assets/normal/normal-icon-heart.png";
import normalIconHome from "../assets/normal/normal-icon-home.png";
import normalIconOrbs from "../assets/normal/normal-icon-orbs.png";
import normalIconPlay from "../assets/normal/normal-icon-play.png";
import normalIconReset from "../assets/normal/normal-icon-reset.png";
import normalIconShield from "../assets/normal/normal-icon-shield.png";
import normalIconShieldHeart from "../assets/normal/normal-icon-shield-heart.png";
import normalIconTrophy from "../assets/normal/normal-icon-trophy.png";
import normalIconWarning from "../assets/normal/normal-icon-warning.png";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";

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
  const [confirmation, setConfirmation] = useState<"reset" | "overwrite" | null>(null);
  const bestForDifficulty = progress.bestScoreByDifficulty[difficulty];
  const difficultyStats = getNormalDifficultyStats(difficulty);

  return (
    <div className="mode-page mode-page-normal">
      <div className="mode-backdrop" aria-hidden="true" />
      <header className="mode-hero">
        <div className="mode-hero-main">
          <div className="mode-hero-icon mode-hero-icon-normal">
            <img src={normalIconBody} alt="" />
          </div>
          <div>
            <span className="eyebrow">V11.5 · Partie normale</span>
            <h1>Carte du corps</h1>
            <p>
              Stabilisez l'organisme avant propagation systémique. Choisissez
              une difficulté, générez une carte du corps, puis reprenez le
              contrôle région par région.
            </p>
          </div>
        </div>
        <div className="mode-actions">
          <Button className="mode-secondary-button" data-audio="back" onClick={onBackHome}>
            <img src={normalIconHome} alt="" />
            Retour menu
          </Button>
          <Button className="mode-secondary-button" onClick={() => setConfirmation("reset")}>
            <img src={normalIconReset} alt="" />
            Effacer statistiques
          </Button>
        </div>
      </header>

      <section className="mode-grid" aria-label="Preparation partie normale">
        <article className="mode-card mode-card-primary">
          <div className="mode-card-heading">
            <img src={normalIconShield} alt="" />
            <div>
              <span>Opération globale</span>
              <h2>Nouvelle partie normale</h2>
            </div>
          </div>
          <p>
            Gardez la santé globale, réduisez l'infection, calmez l'inflammation
            et maintenez la stabilisation sur plusieurs tours.
          </p>
          <label className="mode-select">
            <span>Difficulté</span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as BodyMapDifficulty)
              }
            >
              <option value="easy">Facile · moins de foyers initiaux</option>
              <option value="normal">Normal · expérience recommandée</option>
              <option value="hard">Difficile · menaces avancées plus fréquentes</option>
            </select>
          </label>
          <div className="mode-stat-grid">
            {difficultyStats.map((item) => (
              <span key={item.label}>
                <img src={item.icon} alt="" />
                <strong>{item.label}</strong>
                <em>{item.value}</em>
              </span>
            ))}
          </div>
          <Button
            className="mode-cta mode-cta-normal"
            onClick={() => hasRunningMap ? setConfirmation("overwrite") : onStart(difficulty)}
            variant="primary"
          >
            <img src={normalIconPlay} alt="" />
            Générer la carte
          </Button>
          <Button
            className="mode-continue-button"
            disabled={!hasRunningMap}
            onClick={onContinue}
          >
            <img src={normalIconCheck} alt="" />
            {hasRunningMap ? "Continuer la partie active" : "Aucune partie active"}
          </Button>
        </article>

        <article className="mode-card mode-record-card">
          <div className="mode-card-heading">
            <img src={normalIconTrophy} alt="" />
            <div>
              <span>Historique</span>
              <h2>Meilleure stabilisation</h2>
            </div>
          </div>
          {bestForDifficulty ? (
            <div className="mode-record mode-record-normal">
              <strong>{bestForDifficulty.score}</strong>
              <div>
                <span>Rang {bestForDifficulty.rank}</span>
                <span>Tour {bestForDifficulty.strategicTurn}</span>
                <span>Santé {bestForDifficulty.globalHealth}%</span>
                <span>
                  {new Date(bestForDifficulty.completedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          ) : (
            <p>Aucune victoire pour cette difficulté.</p>
          )}
          <div className="mode-record-list">
            <span>
              <img src={normalIconCheck} alt="" />
              Victoires : {progress.victories}
            </span>
            <span>
              <img src={normalIconWarning} alt="" />
              Défaites : {progress.defeats}
            </span>
            <span>
              <img src={normalIconOrbs} alt="" />
              Meilleure difficulté : {progress.highestDifficultyWon ?? "aucune"}
            </span>
            {progress.lastRun ? (
              <span>
                <img src={normalIconHeart} alt="" />
                Dernière partie : {progress.lastRun.status === "victory" ? "victoire" : "défaite"} ·
                score {progress.lastRun.score}
              </span>
            ) : null}
          </div>
        </article>

        <article className="mode-card mode-rules-card">
          <div className="mode-card-heading">
            <img src={normalIconShieldHeart} alt="" />
            <div>
              <span>Cadre de jeu</span>
              <h2>Modes séparés</h2>
            </div>
          </div>
          <div className="mode-rule-list">
            <p>
              <strong>Campagne</strong>
              Apprentissage guidé, missions fixes.
            </p>
            <p>
              <strong>Partie normale</strong>
              Carte du corps générée, victoire finale possible.
            </p>
            <p>
              <strong>Mode infini</strong>
              Survie avancée, score, pas de victoire finale.
            </p>
          </div>
        </article>
      </section>
      {confirmation === "reset" ? (
        <ConfirmDialog
          confirmLabel="Effacer"
          description="Toutes les statistiques du mode normal seront supprimées. La campagne ne sera pas affectée."
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            onResetResults();
            setConfirmation(null);
          }}
          title="Effacer les statistiques ?"
        />
      ) : null}
      {confirmation === "overwrite" ? (
        <ConfirmDialog
          confirmLabel="Nouvelle carte"
          description="La carte du corps actuellement active sera remplacée par une nouvelle génération."
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            onStart(difficulty);
            setConfirmation(null);
          }}
          title="Remplacer la partie active ?"
        />
      ) : null}
    </div>
  );
}

function getNormalDifficultyStats(difficulty: BodyMapDifficulty) {
  const labels: Record<BodyMapDifficulty, Array<{ label: string; value: string; icon: string }>> = {
    easy: [
      { label: "Objectif", value: "stabiliser", icon: normalIconShieldHeart },
      { label: "Pression", value: "réduite", icon: normalIconHeart },
      { label: "Score", value: "contrôle", icon: normalIconTrophy },
      { label: "Menaces", value: "modérées", icon: normalIconCheck },
    ],
    normal: [
      { label: "Objectif", value: "équilibre", icon: normalIconShieldHeart },
      { label: "Pression", value: "standard", icon: normalIconHeart },
      { label: "Score", value: "x1", icon: normalIconTrophy },
      { label: "Menaces", value: "variées", icon: normalIconOrbs },
    ],
    hard: [
      { label: "Objectif", value: "urgence", icon: normalIconWarning },
      { label: "Pression", value: "élevée", icon: normalIconHeart },
      { label: "Score", value: "risque", icon: normalIconTrophy },
      { label: "Menaces", value: "avancées", icon: normalIconWarning },
    ],
  };

  return labels[difficulty];
}
