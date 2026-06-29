import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type HomePageProps = {
  onPlay: () => void;
};

export function HomePage({ onPlay }: HomePageProps) {
  return (
    <div className="page home-layout">
      <section className="hero-copy" aria-labelledby="home-title">
        <span className="eyebrow">Prototype jouable V1</span>
        <h1 className="hero-title" id="home-title">
          Immunostrat
        </h1>
        <p className="hero-text">
          Defends une plaie cutanee contre des vagues de bacteries avec des
          macrophages. Le visuel reste volontairement simple : la priorite est
          le gameplay et l'architecture.
        </p>
        <div className="home-actions">
          <Button variant="primary" onClick={onPlay}>
            Lancer la mission
          </Button>
        </div>
      </section>

      <Panel className="status-panel">
        <h2>Prototype bacterien V1</h2>
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
            <span className="stat-value">Macrophages vs bacteries</span>
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
