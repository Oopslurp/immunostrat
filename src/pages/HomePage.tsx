import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type HomePageProps = {
  onPlay: () => void;
};

export function HomePage({ onPlay }: HomePageProps) {
  return (
    <div className="page home-layout">
      <section className="hero-copy" aria-labelledby="home-title">
        <span className="eyebrow">Prototype jouable V5.1</span>
        <h1 className="hero-title" id="home-title">
          Immunostrat
        </h1>
        <p className="hero-text">
          Progresse dans une campagne de huit missions pour apprendre les
          bases de l'immunite innee, adaptative et antivirale.
        </p>
        <div className="home-actions">
          <Button variant="primary" onClick={onPlay}>
            Ouvrir la campagne
          </Button>
        </div>
      </section>

      <Panel className="status-panel">
        <h2>Virus et reponse cellulaire V5.1</h2>
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
            <span className="stat-value">Virus / NK / T cytotoxique</span>
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
