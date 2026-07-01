import { useState } from "react";
import { AppShell } from "./app/AppShell";
import { routes, type AppRoute } from "./app/routes";
import {
  applyBodyBattleOutcome,
  isBodyMapUnlocked,
} from "./game/bodyMap/bodyMapSystem";
import { createGeneratedBodyMapState } from "./game/bodyMap/bodyMapGenerator";
import {
  clearBodyMapState,
  hasRunningBodyMapState,
  loadBodyMapState,
  saveBodyMapState,
} from "./game/bodyMap/bodyMapSave";
import {
  loadBodyMapProgress,
  recordBodyMapRun,
  resetBodyMapProgress,
  saveBodyMapProgress,
} from "./game/bodyMap/bodyMapProgress";
import type {
  BodyMapDifficulty,
  BodyMapState,
  BodyRegionId,
} from "./game/bodyMap/bodyMapTypes";
import type { InfiniteDifficulty } from "./game/data/infiniteMode";
import { createRunSeed } from "./game/data/tacticalMapSeed";
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
import { NormalGamePage } from "./pages/NormalGamePage";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(routes.home);
  const [progress, setProgress] = useState(() => loadCampaignProgress());
  const [bodyMapState, setBodyMapState] = useState(() => loadBodyMapState());
  const [hasActiveBodyMapRun, setHasActiveBodyMapRun] = useState(() =>
    hasRunningBodyMapState(),
  );
  const [bodyMapProgress, setBodyMapProgress] = useState(() =>
    loadBodyMapProgress(),
  );
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
    maybeRecordBodyMapResult(bodyMapState, nextState);
    setHasActiveBodyMapRun(nextState.runStatus === "running");
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
    setHasActiveBodyMapRun(true);
    setSelectedBodyRegionId(
      Object.values(nextState.regions).find((region) => region.infection >= 35)?.id ??
        "skin",
    );
    setBodyBattleRegionId(null);
    setIsInfiniteRun(false);
    setRoute(routes.bodyMap);
  };

  const resetBodyMap = () => {
    const nextState = clearBodyMapState();

    setBodyMapState(nextState);
    setHasActiveBodyMapRun(false);
    setSelectedBodyRegionId("skin");
  };

  const resetNormalResults = () => {
    const nextProgress = resetBodyMapProgress();

    setBodyMapProgress(nextProgress);
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
      maybeRecordBodyMapResult(currentState, nextState);
      setHasActiveBodyMapRun(nextState.runStatus === "running");

      return nextState;
    });
  };

  const maybeRecordBodyMapResult = (
    previousState: BodyMapState,
    nextState: BodyMapState,
  ) => {
    if (
      previousState.runStatus !== "running" ||
      nextState.runStatus === "running" ||
      !nextState.finalSummary
    ) {
      return;
    }

    setBodyMapProgress((currentProgress) => {
      const nextProgress = recordBodyMapRun(
        currentProgress,
        nextState.finalSummary!,
      );

      saveBodyMapProgress(nextProgress);

      return nextProgress;
    });
  };

  const startInfiniteRun = (difficulty: InfiniteDifficulty) => {
    const tacticalMapSeed = createRunSeed("infinite");

    setSelectedMissionId("infiniteSurvivalV8");
    setSelectedPreparation({
      infiniteDifficulty: difficulty,
      memoryProfiles: progress.immuneMemory.knownProfiles,
      tacticalMapSeed,
      tacticalMapTemplateId: "infinite_large_tissue_template",
      tacticalMapMode: "infinite",
      tacticalRegionType: "mixed",
      tacticalThreatType: "mixed",
      tacticalDifficulty: difficulty === "normal" ? "normal" : "hard",
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
          onStartNormalGame={() => setRoute(routes.normal)}
          onPlay={() => setRoute(routes.campaign)}
        />
      ) : null}
      {route === routes.normal ? (
        <NormalGamePage
          hasRunningMap={hasActiveBodyMapRun}
          progress={bodyMapProgress}
          onBackHome={() => setRoute(routes.home)}
          onContinue={() => {
            if (hasActiveBodyMapRun) {
              setRoute(routes.bodyMap);
            }
          }}
          onResetResults={resetNormalResults}
          onStart={startNewBodyMapGame}
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
          onResetBodyMap={resetBodyMap}
          onBackHome={() => setRoute(routes.home)}
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
