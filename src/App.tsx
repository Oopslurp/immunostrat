import { useState } from "react";
import { AppShell } from "./app/AppShell";
import { routes, type AppRoute } from "./app/routes";
import {
  applyBodyBattleOutcome,
  isBodyMapUnlocked,
} from "./game/bodyMap/bodyMapSystem";
import { createGeneratedBodyMapState } from "./game/bodyMap/bodyMapGenerator";
import {
  loadBodyMapState,
  resetBodyMapState,
  saveBodyMapState,
} from "./game/bodyMap/bodyMapSave";
import type {
  BodyMapDifficulty,
  BodyMapState,
  BodyRegionId,
} from "./game/bodyMap/bodyMapTypes";
import {
  completeMission,
  loadCampaignProgress,
  resetCampaignProgress,
  type MissionResultSummary,
  type MissionRunResultSummary,
} from "./game/campaign/progress";
import type { MissionId, MissionPreparation } from "./game/data/missions";
import { BodyMapPage } from "./pages/BodyMapPage";
import { CampaignPage } from "./pages/CampaignPage";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(routes.home);
  const [progress, setProgress] = useState(() => loadCampaignProgress());
  const [bodyMapState, setBodyMapState] = useState(() => loadBodyMapState());
  const [selectedBodyRegionId, setSelectedBodyRegionId] =
    useState<BodyRegionId>("skin");
  const [bodyBattleRegionId, setBodyBattleRegionId] =
    useState<BodyRegionId | null>(null);
  const [selectedMissionId, setSelectedMissionId] =
    useState<MissionId>("woundBacteriaV1");
  const [selectedPreparation, setSelectedPreparation] =
    useState<MissionPreparation>({});
  const bodyMapUnlocked = isBodyMapUnlocked(progress);

  const playMission = (missionId: MissionId, vaccinationId?: string | null) => {
    setSelectedMissionId(missionId);
    setSelectedPreparation({
      vaccinationId,
      memoryProfiles: progress.immuneMemory.knownProfiles,
    });
    setBodyBattleRegionId(null);
    setRoute(routes.game);
  };

  const handleMissionComplete = (result: MissionResultSummary) => {
    setProgress((currentProgress) => completeMission(currentProgress, result));
  };

  const updateBodyMapState = (nextState: BodyMapState) => {
    saveBodyMapState(nextState);
    setBodyMapState(nextState);
  };

  const launchBodyBattle = (
    regionId: BodyRegionId,
    missionId: MissionId,
    preparation: MissionPreparation,
  ) => {
    setSelectedBodyRegionId(regionId);
    setBodyBattleRegionId(regionId);
    setSelectedMissionId(missionId);
    setSelectedPreparation(preparation);
    setRoute(routes.game);
  };

  const startNewBodyMapGame = (difficulty: BodyMapDifficulty) => {
    const nextState = createGeneratedBodyMapState(difficulty);

    saveBodyMapState(nextState);
    setBodyMapState(nextState);
    setSelectedBodyRegionId(
      Object.values(nextState.regions).find((region) => region.infection >= 35)?.id ??
        "skin",
    );
    setBodyBattleRegionId(null);
    setRoute(routes.bodyMap);
  };

  const handleBodyBattleComplete = (result: MissionRunResultSummary) => {
    if (!bodyBattleRegionId) {
      return;
    }

    setBodyMapState((currentState) => {
      const nextState = applyBodyBattleOutcome(currentState, {
        ...result,
        regionId: bodyBattleRegionId,
        missionId: result.missionId,
        status: result.status,
        score: result.score,
      });

      saveBodyMapState(nextState);

      return nextState;
    });
  };

  const backFromGame = () => {
    setRoute(bodyBattleRegionId ? routes.bodyMap : routes.campaign);
  };

  return (
    <AppShell
      bodyMapUnlocked={bodyMapUnlocked}
      currentRoute={route}
      onNavigate={setRoute}
    >
      {route === routes.home ? (
        <HomePage
          bodyMapUnlocked={bodyMapUnlocked}
          onOpenBodyMap={() => setRoute(routes.bodyMap)}
          onStartNormalGame={() => startNewBodyMapGame("normal")}
          onPlay={() => setRoute(routes.campaign)}
        />
      ) : null}
      {route === routes.campaign ? (
        <CampaignPage
          progress={progress}
          onPlayMission={playMission}
          onResetProgress={() => setProgress(resetCampaignProgress())}
        />
      ) : null}
      {route === routes.bodyMap ? (
        <BodyMapPage
          progress={progress}
          selectedRegionId={selectedBodyRegionId}
          state={bodyMapState}
          onLaunchBattle={launchBodyBattle}
          onNewBodyMapGame={startNewBodyMapGame}
          onResetBodyMap={() => setBodyMapState(resetBodyMapState())}
          onSelectRegion={setSelectedBodyRegionId}
          onUpdateState={updateBodyMapState}
        />
      ) : null}
      {route === routes.game ? (
        <GamePage
          battleSource={bodyBattleRegionId ? "bodyMap" : "campaign"}
          missionId={selectedMissionId}
          progress={progress}
          onBackToCampaign={backFromGame}
          onBodyBattleComplete={handleBodyBattleComplete}
          onMissionComplete={
            bodyBattleRegionId ? () => undefined : handleMissionComplete
          }
          onPlayMission={playMission}
          preparation={selectedPreparation}
        />
      ) : null}
    </AppShell>
  );
}
