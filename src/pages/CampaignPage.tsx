import {
  campaignMissionOrder,
  missionDefinitions,
  type MissionId,
} from "../game/data/missions";
import {
  isMissionUnlocked,
  type CampaignProgress,
} from "../game/campaign/progress";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

type CampaignPageProps = {
  progress: CampaignProgress;
  onPlayMission: (missionId: MissionId) => void;
  onResetProgress: () => void;
};

export function CampaignPage({
  progress,
  onPlayMission,
  onResetProgress,
}: CampaignPageProps) {
  return (
    <div className="page campaign-page">
      <header className="campaign-header">
        <div>
          <span className="eyebrow">Campagne V6</span>
          <h1>Parcours immunitaire</h1>
          <p>
            Huit missions courtes pour apprendre progressivement macrophages,
            inflammation, antigenes, anticorps, virus et reponse cytotoxique.
          </p>
        </div>
        <Button onClick={onResetProgress}>Reinitialiser progression</Button>
      </header>

      <section className="mission-grid" aria-label="Selection de mission">
        {campaignMissionOrder.map((missionId, index) => {
          const mission = missionDefinitions[missionId];
          const unlocked = isMissionUnlocked(progress, missionId);
          const completion = progress.completedMissions[missionId];

          return (
            <Panel className="mission-card" key={missionId}>
              <div className="mission-card-topline">
                <span className="mission-index">{index + 1}</span>
                <span className={`mission-status ${getStatusClass(unlocked, !!completion)}`}>
                  {completion ? "terminee" : unlocked ? "disponible" : "verrouillee"}
                </span>
              </div>
              <h2>{mission.displayName}</h2>
              <p className="mission-subtitle">{mission.subtitle}</p>
              <p>{mission.description}</p>
              <ul className="mission-briefing">
                {mission.briefing.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mission-unlocks">
                {mission.unlockedUnits.map((unit) => (
                  <span key={unit}>{formatUnlock(unit)}</span>
                ))}
                {mission.unlockedAbilities.map((ability) => (
                  <span key={ability}>{formatUnlock(ability)}</span>
                ))}
              </div>
              {completion ? (
                <p className="mission-score">
                  Meilleur score {completion.bestScore} - Rang {completion.bestRank}
                </p>
              ) : null}
              <Button
                disabled={!unlocked}
                onClick={() => onPlayMission(missionId)}
                variant={unlocked ? "primary" : undefined}
              >
                {completion ? "Rejouer" : "Jouer"}
              </Button>
            </Panel>
          );
        })}
      </section>
    </div>
  );
}

function getStatusClass(unlocked: boolean, completed: boolean): string {
  if (completed) {
    return "mission-status-complete";
  }

  return unlocked ? "mission-status-open" : "mission-status-locked";
}

function formatUnlock(value: string): string {
  const labels: Record<string, string> = {
    macrophage: "Macrophage",
    neutrophil: "Neutrophile",
    dendriticCell: "Dendritique",
    plasmocyte: "Plasmocyte",
    nkCell: "NK",
    cytotoxicT: "T cytotoxique",
    interferons: "Interferons",
    massiveNeutralization: "Neutralisation",
  };

  return labels[value] ?? value;
}
