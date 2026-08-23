import campaignIcon from "../assets/home/home-icon-campaign.png";
import bodyMapIcon from "../assets/home/home-icon-bodymap.png";
import immunityEmblem from "../assets/home/home-emblem-immunity.png";
import heroChipIcon from "../assets/home/home-chip-cell.png";
import infiniteIcon from "../assets/home/home-icon-infinite.png";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type HomePageProps = {
  onPlay: () => void;
  onStartNormalGame: () => void;
  onOpenInfinite: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onOpenEncyclopedia: () => void;
  onOpenScience: () => void;
  bodyMapUnlocked: boolean;
};

export function HomePage({
  onPlay,
  onStartNormalGame,
  onOpenInfinite,
  onOpenSettings,
  onOpenCredits,
  onOpenEncyclopedia,
  onOpenScience,
  bodyMapUnlocked,
}: HomePageProps) {
  const modes = [
    {
      title: "Campagne",
      subtitle: "Apprendre les défenses",
      description:
        "Progresse mission par mission, des macrophages aux réponses adaptatives.",
      icon: campaignIcon,
      actionLabel: "Lancer",
      onClick: onPlay,
      primary: true,
    },
    {
      title: "Partie normale",
      subtitle: "Stabiliser le corps",
      description:
        "Choisis les régions à sauver, envoie des renforts, accepte parfois une perte.",
      icon: bodyMapIcon,
      actionLabel: bodyMapUnlocked ? "Nouvelle partie" : "Verrouillé",
      onClick: onStartNormalGame,
      disabled: !bodyMapUnlocked,
    },
    {
      title: "Mode infini",
      subtitle: "Tenir face aux vagues",
      description:
        "Survis le plus longtemps possible sur une grande carte biologique.",
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
          Coordonnez les défenses immunitaires pour contenir l'infection et
          l'inflammation sans sacrifier les tissus.
        </p>
        <div className="home-hero-status" aria-label="État du projet">
          <span>Version V12</span>
          <span>20 dossiers biologiques</span>
          <span>Choix de design expliqués</span>
        </div>
        <div className="home-public-actions" aria-label="Découvrir Immunostrat">
          <Button onClick={onPlay} variant="primary">
            Jouer
          </Button>
          <Button onClick={onOpenEncyclopedia}>Découvrir la science</Button>
          <a
            className="button home-github-link"
            href="https://github.com/Oopslurp/immunostrat"
            rel="noreferrer"
            target="_blank"
          >
            GitHub ↗
          </a>
        </div>
        <div className="home-utility-actions">
          <Button onClick={onOpenSettings}>Réglages</Button>
          <Button onClick={onOpenCredits}>Crédits</Button>
        </div>
        <span className="home-mode-label">Choisir un mode</span>
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
          <span className="eyebrow">Démarche du projet</span>
          <h2>Du vivant à la décision tactique</h2>
          <p>
            Chaque mécanique commence par une relation biologique, devient un
            modèle lisible, puis une question posée au joueur.
          </p>
        </div>
        <div className="home-method-grid">
          {[
            [
              "01",
              "Comprendre",
              "Identifier le phénomène et ses relations essentielles.",
            ],
            [
              "02",
              "Modéliser",
              "Choisir les états, variables et délais à conserver.",
            ],
            [
              "03",
              "Rendre jouable",
              "Transformer le modèle en risque, information et choix.",
            ],
          ].map(([index, title, description]) => (
            <div className="home-method-card" key={index}>
              <span>{index}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          ))}
        </div>
        <div className="home-science-links">
          <button onClick={onOpenEncyclopedia} type="button">
            <span>Encyclopédie immersive</span>
            <strong>Voir les cellules et toutes les familles de menaces →</strong>
          </button>
          <button onClick={onOpenScience} type="button">
            <span>Science vs Gameplay</span>
            <strong>Lire pourquoi les simplifications sont conscientes →</strong>
          </button>
        </div>
      </Panel>
    </div>
  );
}
