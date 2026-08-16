import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import campaignIcon from "../assets/home/home-icon-campaign.png";
import bodyMapIcon from "../assets/home/home-icon-bodymap.png";
import infiniteIcon from "../assets/home/home-icon-infinite.png";
import immunityEmblem from "../assets/home/home-emblem-immunity.png";
import heroChipIcon from "../assets/home/home-chip-cell.png";

type HomePageProps = {
  onPlay: () => void;
  onStartNormalGame: () => void;
  onOpenInfinite: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  bodyMapUnlocked: boolean;
};

export function HomePage({
  onPlay,
  onStartNormalGame,
  onOpenInfinite,
  onOpenSettings,
  onOpenCredits,
  bodyMapUnlocked,
}: HomePageProps) {
  const modes = [
    {
      title: "Campagne",
      subtitle: "Apprendre les défenses",
      description: "Progresse mission par mission, des macrophages aux réponses adaptatives.",
      icon: campaignIcon,
      actionLabel: "Lancer",
      onClick: onPlay,
      primary: true,
    },
    {
      title: "Partie normale",
      subtitle: "Stabiliser le corps",
      description: "Choisis les régions à sauver, envoie des renforts, accepte parfois une perte.",
      icon: bodyMapIcon,
      actionLabel: bodyMapUnlocked ? "Nouvelle partie" : "Verrouillé",
      onClick: onStartNormalGame,
      disabled: !bodyMapUnlocked,
    },
    {
      title: "Mode infini",
      subtitle: "Tenir face aux vagues",
      description: "Survis le plus longtemps possible sur une grande carte biologique.",
      icon: infiniteIcon,
      actionLabel: "Survivre",
      onClick: onOpenInfinite,
    },
  ];

  return (
    <div className="page home-layout home-v11-page">
      <section className="hero-copy home-hero-panel" aria-labelledby="home-title">
        <div className="home-hero-chip">
          <img alt="" src={heroChipIcon} />
          <span>Stratégie immunitaire tactique</span>
        </div>
        <h1 className="hero-title" id="home-title">
          Immunostrat
        </h1>
        <p className="hero-text">
          Déployez vos cellules. Contenez l'infection. Sauvez l'organisme.
        </p>
        <div className="home-hero-status" aria-label="Systèmes immunitaires actifs">
          <span>Campagne</span>
          <span>Organisme global</span>
          <span>Survie infinie</span>
        </div>
        <div className="home-utility-actions">
          <Button onClick={onOpenSettings}>Réglages</Button>
          <Button onClick={onOpenCredits}>Crédits</Button>
        </div>
        <div className="home-actions" aria-label="Modes de jeu">
          {modes.map((mode) => (
            <Button
              className="home-mode-button"
              disabled={mode.disabled}
              key={mode.title}
              onClick={mode.onClick}
              variant={mode.primary ? "primary" : "secondary"}
            >
              <img alt="" src={mode.icon} />
              <span>
                <strong>{mode.title}</strong>
                <em>{mode.actionLabel}</em>
              </span>
            </Button>
          ))}
        </div>
      </section>

      <Panel className="status-panel home-command-panel">
        <div className="home-emblem-wrap">
          <img alt="" className="home-emblem" src={immunityEmblem} />
        </div>
        <div>
          <span className="eyebrow">État de l'organisme</span>
          <h2>Choisissez votre front</h2>
          <p>
            Chaque mode reprend les mêmes règles de terrain : guider les cellules,
            tenir les foyers infectieux et garder l'inflammation sous contrôle.
          </p>
        </div>
        <div className="stat-grid home-intel-grid">
          {modes.map((mode) => (
            <button
              className="stat-item home-intel-card"
              disabled={mode.disabled}
              key={mode.title}
              onClick={mode.onClick}
              type="button"
            >
              <img alt="" src={mode.icon} />
              <span>
                <span className="stat-label">{mode.subtitle}</span>
                <span className="stat-value">{mode.description}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
