import {
  campaignMissionOrder,
  missionDefinitions,
  type CampaignMissionId,
  type MissionId,
} from "../game/data/missions";
import {
  isMissionUnlocked,
  type CampaignProgress,
} from "../game/campaign/progress";
import campaignEmblem from "../assets/campaign/campaign-emblem.png";
import iconFire from "../assets/campaign/icon-fire.png";
import iconReset from "../assets/campaign/icon-reset.png";
import iconStar from "../assets/campaign/icon-star.png";
import iconTarget from "../assets/campaign/icon-target.png";
import iconTrophy from "../assets/campaign/icon-trophy.png";
import iconVaccine from "../assets/campaign/icon-vaccine.png";
import statusAvailable from "../assets/campaign/status-available.png";
import statusComplete from "../assets/campaign/status-complete.png";
import statusLocked from "../assets/campaign/status-locked.png";
import unitAntibody from "../assets/campaign/unit-antibody.png";
import unitBacteria from "../assets/campaign/unit-bacteria.png";
import unitBiofilm from "../assets/campaign/unit-biofilm.png";
import unitDebris from "../assets/campaign/unit-debris.png";
import unitDendritic from "../assets/campaign/unit-dendritic.png";
import unitMacrophage from "../assets/campaign/unit-macrophage.png";
import unitNeutrophil from "../assets/campaign/unit-neutrophil.png";
import unitNk from "../assets/campaign/unit-nk.png";
import unitPlasmocyte from "../assets/campaign/unit-plasmocyte.png";
import unitTissue from "../assets/campaign/unit-tissue.png";
import unitVirus from "../assets/campaign/unit-virus.png";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useState, type CSSProperties } from "react";

type CampaignPageProps = {
  progress: CampaignProgress;
  onPlayMission: (missionId: MissionId, vaccinationId?: string | null) => void;
  onResetProgress: () => void;
};

export function CampaignPage({
  progress,
  onPlayMission,
  onResetProgress,
}: CampaignPageProps) {
  const [selectedVaccinations, setSelectedVaccinations] = useState<
    Partial<Record<MissionId, string>>
  >({});
  const [confirmReset, setConfirmReset] = useState(false);
  const completedCount = campaignMissionOrder.filter(
    (missionId) => progress.completedMissions[missionId],
  ).length;
  const availableCount = campaignMissionOrder.filter((missionId) =>
    isMissionUnlocked(progress, missionId),
  ).length;
  const globalRank = getGlobalRank(progress);

  return (
    <div className="campaign-v11-page">
      <div className="campaign-v11-backdrop" aria-hidden="true" />
      <header className="campaign-v11-header">
        <div className="campaign-v11-title-block">
          <img className="campaign-v11-emblem" src={campaignEmblem} alt="" />
          <div>
            <span className="eyebrow">Campagne immunitaire</span>
            <h1>Parcours immunitaire</h1>
            <p>
              Huit opérations tactiques pour apprendre à défendre l'organisme,
              de la plaie cutanée jusqu'à l'infection mixte.
            </p>
          </div>
        </div>
        <div className="campaign-v11-progress">
          <div className="campaign-v11-progress-card">
            <span>Progression</span>
            <strong>
              {completedCount}/{campaignMissionOrder.length}
            </strong>
          </div>
          <div className="campaign-v11-progress-card">
            <span>Disponibles</span>
            <strong>{availableCount}</strong>
          </div>
          <div className="campaign-v11-progress-card">
            <span>Rang global</span>
            <strong>{globalRank ?? "-"}</strong>
          </div>
          <Button className="campaign-reset-button" onClick={() => setConfirmReset(true)}>
            <img src={iconReset} alt="" />
            Réinitialiser
          </Button>
        </div>
      </header>

      <section className="campaign-v11-grid" aria-label="Sélection de mission">
        {campaignMissionOrder.map((missionId, index) => {
          const mission = missionDefinitions[missionId];
          const unlocked = isMissionUnlocked(progress, missionId);
          const completion = progress.completedMissions[missionId];
          const completed = !!completion;
          const visual = missionVisuals[missionId];
          const status = getMissionStatus(unlocked, completed);
          const statusIcon = getStatusIcon(status);

          return (
            <article
              className={`campaign-mission-card campaign-mission-card-${status}`}
              key={missionId}
              style={{ "--mission-accent": visual.accent } as CSSProperties}
            >
              <div className="campaign-mission-node" aria-hidden="true">
                <span>{index + 1}</span>
              </div>
              <div className="campaign-mission-topline">
                <div className="campaign-mission-icon-wrap">
                  <img className="campaign-mission-icon" src={visual.icon} alt="" />
                </div>
                <div className="campaign-mission-status">
                  <img src={statusIcon} alt="" />
                  <span>{getStatusLabel(status)}</span>
                </div>
              </div>

              <div className="campaign-mission-copy">
                <span className="campaign-mission-kicker">Opération {index + 1}</span>
                <h2>{mission.displayName}</h2>
                <p className="mission-subtitle">{mission.subtitle}</p>
                <p className="campaign-mission-description">{mission.description}</p>
              </div>

              <div className="campaign-mission-objectives" aria-label="Objectifs principaux">
                {mission.objectives.slice(0, 2).map((objective) => (
                  <span key={objective.id}>
                    <img src={iconTarget} alt="" />
                    {objective.label}
                  </span>
                ))}
              </div>

              <div className="campaign-mission-briefing">
                {mission.briefing.slice(0, 2).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="mission-unlocks campaign-mission-tags">
                {mission.unlockedUnits.map((unit) => (
                  <span key={unit}>
                    {getUnlockIcon(unit) ? <img src={getUnlockIcon(unit)} alt="" /> : null}
                    {formatUnlock(unit)}
                  </span>
                ))}
                {mission.unlockedAbilities.map((ability) => (
                  <span key={ability}>
                    {getUnlockIcon(ability) ? <img src={getUnlockIcon(ability)} alt="" /> : null}
                    {formatUnlock(ability)}
                  </span>
                ))}
              </div>

              {mission.memoryHintProfiles?.length ? (
                <div className="campaign-mission-memory">
                  <img src={iconStar} alt="" />
                  <span>
                    Mémoire :{" "}
                    {mission.memoryHintProfiles
                      .map((profile) =>
                        progress.immuneMemory.knownProfiles.includes(profile)
                          ? `${profile} connu`
                          : `${profile} nouveau`,
                      )
                      .join(" / ")}
                  </span>
                </div>
              ) : null}
              {mission.vaccinationOptions?.length ? (
                <label className="mission-vaccine">
                  <span>
                    <img src={iconVaccine} alt="" />
                    Préparation
                  </span>
                  <select
                    disabled={!unlocked}
                    value={selectedVaccinations[missionId] ?? ""}
                    onChange={(event) =>
                      setSelectedVaccinations((current) => ({
                        ...current,
                        [missionId]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Aucune vaccination</option>
                    {mission.vaccinationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.displayName} (-{option.atpCost} ATP, +
                        {option.antigenBonus} AG)
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {completion ? (
                <div className="campaign-mission-score">
                  <span>
                    <img src={iconTrophy} alt="" />
                    {completion.bestScore}
                  </span>
                  <span>
                    <img src={iconStar} alt="" />
                    Rang {completion.bestRank}
                  </span>
                </div>
              ) : null}
              <Button
                disabled={!unlocked}
                className="campaign-mission-button"
                onClick={() =>
                  onPlayMission(missionId, selectedVaccinations[missionId] ?? null)
                }
                variant={unlocked ? "primary" : undefined}
              >
                {completion ? "Rejouer" : "Jouer"}
              </Button>
            </article>
          );
        })}
      </section>
      {confirmReset ? (
        <ConfirmDialog
          confirmLabel="Réinitialiser"
          description="Toutes les missions terminées, les rangs et la mémoire immunitaire de campagne seront effacés."
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            onResetProgress();
            setConfirmReset(false);
          }}
          title="Réinitialiser la campagne ?"
        />
      ) : null}
    </div>
  );
}

type MissionStatus = "complete" | "open" | "locked";

type MissionVisual = {
  icon: string;
  accent: string;
};

const missionVisuals: Record<CampaignMissionId, MissionVisual> = {
  woundBacteriaV1: { icon: unitBacteria, accent: "#ff9f43" },
  inflammatoryReactionV2: { icon: iconFire, accent: "#ff9f43" },
  persistentInfectionV3: { icon: unitBiofilm, accent: "#9acd32" },
  antigenAnalysisV4: { icon: unitDendritic, accent: "#b69cff" },
  adaptiveResponseV5: { icon: unitAntibody, accent: "#f5f0ff" },
  viralInfectionV6: { icon: unitVirus, accent: "#8c2fd9" },
  viralCleanupV7: { icon: unitNk, accent: "#5fd3ff" },
  mixedInfectionV8: { icon: campaignEmblem, accent: "#ffc76b" },
};

const unlockIcons: Record<string, string> = {
  macrophage: unitMacrophage,
  neutrophil: unitNeutrophil,
  dendriticCell: unitDendritic,
  plasmocyte: unitPlasmocyte,
  nkCell: unitNk,
  cytotoxicT: unitTissue,
  interferons: unitDebris,
  massiveNeutralization: unitAntibody,
};

function getMissionStatus(unlocked: boolean, completed: boolean): MissionStatus {
  if (completed) {
    return "complete";
  }

  return unlocked ? "open" : "locked";
}

function getStatusLabel(status: MissionStatus): string {
  const labels: Record<MissionStatus, string> = {
    complete: "terminée",
    open: "disponible",
    locked: "verrouillée",
  };

  return labels[status];
}

function getStatusIcon(status: MissionStatus): string {
  const icons: Record<MissionStatus, string> = {
    complete: statusComplete,
    open: statusAvailable,
    locked: statusLocked,
  };

  return icons[status];
}

function getUnlockIcon(value: string): string | undefined {
  return unlockIcons[value];
}

function getGlobalRank(progress: CampaignProgress): string | null {
  const ranks = campaignMissionOrder
    .map((missionId) => progress.completedMissions[missionId]?.bestRank)
    .filter((rank): rank is "C" | "B" | "A" | "S" => Boolean(rank));

  if (!ranks.length) {
    return null;
  }

  const rankScore = { C: 1, B: 2, A: 3, S: 4 };
  const average =
    ranks.reduce((sum, rank) => sum + rankScore[rank], 0) / ranks.length;

  if (average >= 3.7) {
    return "S";
  }

  if (average >= 2.7) {
    return "A";
  }

  if (average >= 1.7) {
    return "B";
  }

  return "C";
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
