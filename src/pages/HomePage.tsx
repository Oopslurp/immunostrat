import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type HomePageProps = {
  onPlay: () => void;
  onOpenBodyMap: () => void;
  onStartNormalGame: () => void;
  onOpenInfinite: () => void;
  bodyMapUnlocked: boolean;
};

export function HomePage({
  onPlay,
  onOpenBodyMap,
  onStartNormalGame,
  onOpenInfinite,
  bodyMapUnlocked,
}: HomePageProps) {
  return (
    <div className="page home-layout">
      <section className="hero-copy" aria-labelledby="home-title">
        <span className="eyebrow">Prototype jouable V9</span>
        <h1 className="hero-title" id="home-title">
          Immunostrat
        </h1>
        <p className="hero-text">
          Campagne pour apprendre, partie normale sur carte du corps pour
          stabiliser l'organisme, mode infini pour survivre et scorer.
        </p>
        <div className="home-actions">
          <Button variant="primary" onClick={onPlay}>
            Campagne guidee
          </Button>
          <Button disabled={!bodyMapUnlocked} onClick={onStartNormalGame}>
            Partie normale
          </Button>
          <Button disabled={!bodyMapUnlocked} onClick={onOpenBodyMap}>
            Continuer carte du corps
          </Button>
          <Button onClick={onOpenInfinite}>Mode infini</Button>
        </div>
      </section>

      <Panel className="status-panel">
        <h2>Campagne et strategie globale</h2>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Architecture</span>
            <span className="stat-value">React / Phaser / Simulation</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Rendu</span>
            <span className="stat-value">Placeholders propres</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Gameplay</span>
            <span className="stat-value">Campagne / Normal / Infini</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Carte du corps</span>
            <span className="stat-value">
              {bodyMapUnlocked ? "Debloquee" : "Apres mission 7"}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mode infini</span>
            <span className="stat-value">Survie sans victoire finale</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Science</span>
            <span className="stat-value">Inspiree, simplifiee</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
