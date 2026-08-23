import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "./app/AppShell";
import {
  appRouteFromHash,
  appRouteToHash,
  encyclopediaEntryRoute,
  getEncyclopediaEntryId,
  routes,
  type AppRoute,
} from "./app/routes";
import { audioDirector } from "./audio/AudioDirector";
import { useGlobalAudioInteractions } from "./audio/useAudioDirector";
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
import { EncyclopediaEntryPage } from "./pages/EncyclopediaEntryPage";
import { EncyclopediaPage } from "./pages/EncyclopediaPage";
import { HomePage } from "./pages/HomePage";
import { InfinitePage } from "./pages/InfinitePage";
import { NormalGamePage } from "./pages/NormalGamePage";
import { ScienceVsGameplayPage } from "./pages/ScienceVsGameplayPage";
import { CreditsPanel } from "./ui/CreditsPanel";
import { Modal } from "./ui/Modal";
import { SettingsPanel } from "./ui/SettingsPanel";

const GamePage = lazy(() =>
  import("./pages/GamePage").then((module) => ({ default: module.GamePage })),
);

const SpriteLabPage = lazy(() =>
  import("./pages/SpriteLabPage").then((module) => ({
    default: module.SpriteLabPage,
  })),
);

export default function App() {
  useGlobalAudioInteractions();
  const [route, setRoute] = useState<AppRoute>(() =>
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("spriteLab") === "1"
      ? routes.spriteLab
      : appRouteFromHash(window.location.hash),
  );
  const [appModal, setAppModal] = useState<"settings" | "credits" | null>(null);
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

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const nextHash = appRouteToHash(nextRoute);

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", appRouteToHash(routes.home));
    }

    const syncRoute = () => setRoute(appRouteFromHash(window.location.hash));
    window.addEventListener("hashchange", syncRoute);

    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    audioDirector.setScene(route === routes.game ? "game" : "menu");
  }, [route]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [route]);

  const playMission = (missionId: MissionId, vaccinationId?: string | null) => {
    setSelectedMissionId(missionId);
    setSelectedPreparation({
      vaccinationId,
      memoryProfiles: progress.immuneMemory.knownProfiles,
    });
    setBodyBattleRegionId(null);
    setIsInfiniteRun(false);
    navigate(routes.game);
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
    navigate(routes.game);
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
    navigate(routes.bodyMap);
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

    const nextState = applyBodyBattleOutcome(bodyMapState, {
      ...result,
      regionId: bodyBattleRegionId,
      missionId: result.missionId,
      status: result.status,
      score: result.score,
    });

    updateBodyMapState(nextState);
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

    const nextProgress = recordBodyMapRun(
      bodyMapProgress,
      nextState.finalSummary,
    );

    saveBodyMapProgress(nextProgress);
    setBodyMapProgress(nextProgress);
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
    navigate(routes.game);
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
    navigate(
      isInfiniteRun
        ? routes.infinite
        : bodyBattleRegionId
          ? routes.bodyMap
          : routes.campaign,
    );
  };
  const activeBodyBattleRegion = bodyBattleRegionId
    ? bodyMapState.regions[bodyBattleRegionId]
    : null;
  const canRestartCurrentBattle =
    !activeBodyBattleRegion || activeBodyBattleRegion.status !== "lost";
  const encyclopediaEntryId = getEncyclopediaEntryId(route);

  return (
    <>
    <AppShell
      bodyMapUnlocked={bodyMapUnlocked}
      currentRoute={route}
      onNavigate={navigate}
      onOpenSettings={() => setAppModal("settings")}
    >
      {route === routes.home ? (
        <HomePage
          bodyMapUnlocked={bodyMapUnlocked}
          onOpenCredits={() => setAppModal("credits")}
          onOpenEncyclopedia={() => navigate(routes.encyclopedia)}
          onOpenInfinite={() => navigate(routes.infinite)}
          onOpenScience={() => navigate(routes.scienceVsGameplay)}
          onOpenSettings={() => setAppModal("settings")}
          onStartNormalGame={() => navigate(routes.normal)}
          onPlay={() => navigate(routes.campaign)}
        />
      ) : null}
      {route === routes.encyclopedia ? (
        <EncyclopediaPage
          onOpenEntry={(entryId) => navigate(encyclopediaEntryRoute(entryId))}
          onOpenScience={() => navigate(routes.scienceVsGameplay)}
          onPlay={() => navigate(routes.campaign)}
        />
      ) : null}
      {encyclopediaEntryId ? (
        <EncyclopediaEntryPage
          entryId={encyclopediaEntryId}
          onBack={() => navigate(routes.encyclopedia)}
          onOpenEntry={(entryId) => navigate(encyclopediaEntryRoute(entryId))}
          onOpenScience={() => navigate(routes.scienceVsGameplay)}
        />
      ) : null}
      {route === routes.scienceVsGameplay ? (
        <ScienceVsGameplayPage
          onOpenEncyclopedia={() => navigate(routes.encyclopedia)}
          onPlay={() => navigate(routes.campaign)}
        />
      ) : null}
      {route === routes.normal ? (
        <NormalGamePage
          hasRunningMap={hasActiveBodyMapRun}
          progress={bodyMapProgress}
          onBackHome={() => navigate(routes.home)}
          onContinue={() => {
            if (hasActiveBodyMapRun) {
              navigate(routes.bodyMap);
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
          onBackHome={() => navigate(routes.home)}
          onSelectRegion={setSelectedBodyRegionId}
          onUpdateState={updateBodyMapState}
        />
      ) : null}
      {route === routes.infinite ? (
        <InfinitePage
          progress={infiniteProgress}
          onBackHome={() => navigate(routes.home)}
          onReset={() => setInfiniteProgress(resetInfiniteProgress())}
          onStart={startInfiniteRun}
        />
      ) : null}
      {route === routes.game ? (
        <Suspense fallback={<div className="page">Initialisation du terrain...</div>}>
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
            canRestartBattle={canRestartCurrentBattle}
          />
        </Suspense>
      ) : null}
      {route === routes.spriteLab ? (
        <Suspense fallback={<div className="page">Chargement du laboratoire...</div>}>
          <SpriteLabPage onBack={() => navigate(routes.home)} />
        </Suspense>
      ) : null}
    </AppShell>
    {appModal === "settings" ? (
      <Modal label="Réglages" onClose={() => setAppModal(null)}>
        <SettingsPanel onBack={() => setAppModal(null)} />
      </Modal>
    ) : null}
    {appModal === "credits" ? (
      <Modal label="Crédits" onClose={() => setAppModal(null)}>
        <CreditsPanel onBack={() => setAppModal(null)} />
      </Modal>
    ) : null}
    </>
  );
}
