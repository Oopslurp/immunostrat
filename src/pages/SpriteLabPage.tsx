import { spriteLabPathogens, spriteLabUnits } from "../game/debug/spriteLabRoster";
import { SpriteLabGame } from "../game/phaser/SpriteLabGame";
import { Button } from "../ui/Button";

type SpriteLabPageProps = {
  onBack: () => void;
};

export function SpriteLabPage({ onBack }: SpriteLabPageProps) {
  return (
    <div className="page sprite-lab-page">
      <header className="sprite-lab-page-header">
        <div>
          <span className="eyebrow">Outil temporaire · developpement uniquement</span>
          <h1>Laboratoire de sprites</h1>
          <p>
            {spriteLabUnits.length} unites et {spriteLabPathogens.length} pathogene(s),
            sans vagues, sauvegarde ou progression.
          </p>
        </div>
        <Button onClick={onBack}>Retour a l'accueil</Button>
      </header>
      <div className="sprite-lab-warning" role="note">
        Glissez une unite vers un pathogene, ou selectionnez l'unite puis cliquez
        sa cible. Les mouvements et attaques se declenchent automatiquement avec
        des points de vie infinis.
      </div>
      <SpriteLabGame />
    </div>
  );
}
