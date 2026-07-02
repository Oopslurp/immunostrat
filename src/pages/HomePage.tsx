import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import campaignIcon from "../assets/home/home-icon-campaign.png";
import bodyMapIcon from "../assets/home/home-icon-bodymap.png";
import infiniteIcon from "../assets/home/home-icon-infinite.png";
import scienceIcon from "../assets/home/home-icon-science.png";
import immunityEmblem from "../assets/home/home-emblem-immunity.png";
import heroChipIcon from "../assets/home/home-chip-cell.png";

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
  const modes = [
    {
      title: "Campagne",
      subtitle: "Apprendre les defenses",
      description: "Progresse mission par mission, des macrophages aux reponses adaptatives.",
      icon: campaignIcon,
      actionLabel: "Lancer",
      onClick: onPlay,
      primary: true,
    },
    {
      title: "Partie normale",
      subtitle: "Stabiliser le corps",
      description: "Choisis les regions a sauver, envoie des renforts, accepte parfois une perte.",
      icon: bodyMapIcon,
      actionLabel: bodyMapUnlocked ? "Nouvelle partie" : "Verrouille",
      onClick: onStartNormalGame,
      disabled: !bodyMapUnlocked,
    },
    {
      title: "Carte du corps",
      subtitle: "Reprendre une crise",
      description: "Retourne sur la strategie globale et traite les foyers encore actifs.",
      icon: scienceIcon,
      actionLabel: bodyMapUnlocked ? "Continuer" : "Mission 7 requise",
      onClick: onOpenBodyMap,
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
          <span>Strategie immunitaire tactique</span>
        </div>
        <h1 className="hero-title" id="home-title">
          Immunostrat
        </h1>
        <p className="hero-text">
          Deployez vos cellules. Contenez l'infection. Sauvez l'organisme.
        </p>
        <div className="home-hero-status" aria-label="Etat du prototype">
          <span>Campagne jouable</span>
          <span>Carte du corps</span>
          <span>Mode infini</span>
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
          <span className="eyebrow">Etat de l'organisme</span>
          <h2>Choisissez votre front</h2>
          <p>
            Chaque mode reprend les memes regles de terrain : guider les cellules,
            tenir les foyers infectieux, et garder l'inflammation sous controle.
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
