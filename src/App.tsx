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
import type { InfiniteDifficulty } from "./game/data/infiniteMode";
import {
  completeMission,
  loadCampaignProgress,
  resetCampaignProgress,
  type MissionResultSummary,
  type MissionRunResultSummary,
} from "./game/campaign/progress";
import type { MissionId, MissionPreparation } from "./game/data/missions";
import {
  loadInfiniteProgress,
  recordInfiniteRun,
  resetInfiniteProgress,
} from "./game/infinite/infiniteProgress";
import { BodyMapPage } from "./pages/BodyMapPage";
import { CampaignPage } from "./pages/CampaignPage";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { InfinitePage } from "./pages/InfinitePage";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(routes.home);
  const [progress, setProgress] = useState(() => loadCampaignProgress());
  const [bodyMapState, setBodyMapState] = useState(() => loadBodyMapState());
  const [infiniteProgress, setInfiniteProgress] = useState(() =>
    loadInfiniteProgress(),
  );
  const [selectedBodyRegionId, setSelectedBodyRegionId] =
    useState<BodyRegionId>("skin");
  const [bodyBattleRegionId, setBodyBattleRegionId] =
    useState<BodyRegionId | null>(null);
  const [isInfiniteRun, setIsInfiniteRun] = useState(false);
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
    setIsInfiniteRun(false);
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
    setIsInfiniteRun(false);
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
    setIsInfiniteRun(false);
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

  const startInfiniteRun = (difficulty: InfiniteDifficulty) => {
    setSelectedMissionId("infiniteSurvivalV8");
    setSelectedPreparation({
      infiniteDifficulty: difficulty,
      memoryProfiles: progress.immuneMemory.knownProfiles,
    });
    setBodyBattleRegionId(null);
    setIsInfiniteRun(true);
    setRoute(routes.game);
  };

  const handleInfiniteComplete = (result: MissionRunResultSummary) => {
    const infinite = result.infinite;

    if (!infinite) {
      return;
    }

    setInfiniteProgress((currentProgress) =>
      recordInfiniteRun(currentProgress, infinite),
    );
  };

  const backFromGame = () => {
    setRoute(
      isInfiniteRun
        ? routes.infinite
        : bodyBattleRegionId
          ? routes.bodyMap
          : routes.campaign,
    );
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
          onOpenInfinite={() => setRoute(routes.infinite)}
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
      {route === routes.infinite ? (
        <InfinitePage
          progress={infiniteProgress}
          onBackHome={() => setRoute(routes.home)}
          onReset={() => setInfiniteProgress(resetInfiniteProgress())}
          onStart={startInfiniteRun}
        />
      ) : null}
      {route === routes.game ? (
        <GamePage
          battleSource={
            isInfiniteRun ? "infinite" : bodyBattleRegionId ? "bodyMap" : "campaign"
          }
          missionId={selectedMissionId}
          progress={progress}
          onBackToCampaign={backFromGame}
          onBodyBattleComplete={handleBodyBattleComplete}
          onInfiniteComplete={handleInfiniteComplete}
          onMissionComplete={
            bodyBattleRegionId || isInfiniteRun
              ? () => undefined
              : handleMissionComplete
          }
          onPlayMission={playMission}
          preparation={selectedPreparation}
        />
      ) : null}
    </AppShell>
  );
}
