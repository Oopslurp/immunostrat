import { useState } from "react";
import { AppShell } from "./app/AppShell";
import { routes, type AppRoute } from "./app/routes";
import {
  completeMission,
  loadCampaignProgress,
  resetCampaignProgress,
  type MissionResultSummary,
} from "./game/campaign/progress";
import type { MissionId, MissionPreparation } from "./game/data/missions";
import { CampaignPage } from "./pages/CampaignPage";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(routes.home);
  const [progress, setProgress] = useState(() => loadCampaignProgress());
  const [selectedMissionId, setSelectedMissionId] =
    useState<MissionId>("woundBacteriaV1");
  const [selectedPreparation, setSelectedPreparation] =
    useState<MissionPreparation>({});

  const playMission = (missionId: MissionId, vaccinationId?: string | null) => {
    setSelectedMissionId(missionId);
    setSelectedPreparation({
      vaccinationId,
      memoryProfiles: progress.immuneMemory.knownProfiles,
    });
    setRoute(routes.game);
  };

  const handleMissionComplete = (result: MissionResultSummary) => {
    setProgress((currentProgress) => completeMission(currentProgress, result));
  };

  return (
    <AppShell currentRoute={route} onNavigate={setRoute}>
      {route === routes.home ? (
        <HomePage onPlay={() => setRoute(routes.campaign)} />
      ) : null}
      {route === routes.campaign ? (
        <CampaignPage
          progress={progress}
          onPlayMission={playMission}
          onResetProgress={() => setProgress(resetCampaignProgress())}
        />
      ) : null}
      {route === routes.game ? (
        <GamePage
          missionId={selectedMissionId}
          progress={progress}
          onBackToCampaign={() => setRoute(routes.campaign)}
          onMissionComplete={handleMissionComplete}
          onPlayMission={playMission}
          preparation={selectedPreparation}
        />
      ) : null}
    </AppShell>
  );
}
