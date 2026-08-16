import { Button } from "./Button";

export function CreditsPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="credits-panel-content">
      <span className="modal-kicker">Archives du laboratoire</span>
      <h2>Crédits</h2>
      <p>
        Immunostrat est un jeu de stratégie biologique original développé avec
        React, Phaser et TypeScript.
      </p>
      <div className="credits-grid">
        <span><strong>Direction</strong>Conception et développement Immunostrat</span>
        <span><strong>Illustrations</strong>Assets biologiques originaux du projet</span>
        <span><strong>Audio V11.5</strong>Synthèse procédurale locale originale</span>
        <span><strong>Technologies</strong>React, Phaser, Vite</span>
      </div>
      <p className="credits-note">
        La science est volontairement simplifiée au service du gameplay.
      </p>
      <div className="modal-actions">
        <Button data-audio="back" onClick={onBack} variant="primary">Retour</Button>
      </div>
    </div>
  );
}
