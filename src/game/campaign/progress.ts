import {
  campaignMissionOrder,
  getFirstMissionId,
  isMissionId,
  missionDefinitions,
  type MissionId,
} from "../data/missions";
import type { PathogenTypeId } from "../data/pathogens";
import type { InfiniteRunInfo } from "../data/infiniteMode";

const SAVE_KEY = "immunostrat-campaign-progress-v1";
const SAVE_VERSION = 1;

export type MissionCompletionRecord = {
  completedAt: string;
  bestScore: number;
  bestRank: "C" | "B" | "A" | "S";
};

export type CampaignProgress = {
  version: number;
  unlockedMissionIds: MissionId[];
  completedMissions: Partial<Record<MissionId, MissionCompletionRecord>>;
  immuneMemory: {
    knownProfiles: Array<"bacterial" | "viral">;
    analyzedPathogenTypes: string[];
  };
};

export type MissionResultSummary = {
  missionId: MissionId;
  score: number;
  rank: "C" | "B" | "A" | "S";
};

export type MissionRunResultSummary = MissionResultSummary & {
  status: "victory" | "defeat";
  tissueHealthRemaining?: number;
  tissueMaxHealth?: number;
  civilianCellsSaved?: number;
  civilianCellsLost?: number;
  infectedCellsRemaining?: number;
  enemiesRemaining?: number;
  inflammationPeak?: number;
  antigensCollected?: number;
  lymphSignalsDelivered?: number;
  adaptiveResearchCompleted?: boolean;
  treatmentsUsed?: Partial<Record<string, number>>;
  timeElapsedMs?: number;
  pathogenTypesEncountered?: PathogenTypeId[];
  infinite?: InfiniteRunInfo;
};

export function loadCampaignProgress(): CampaignProgress {
  if (typeof window === "undefined") {
    return createDefaultProgress();
  }

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return createDefaultProgress();
    }

    const parsed = JSON.parse(raw) as Partial<CampaignProgress>;

    if (parsed.version !== SAVE_VERSION) {
      return createDefaultProgress();
    }

    return normalizeProgress(parsed);
  } catch {
    return createDefaultProgress();
  }
}

export function saveCampaignProgress(progress: CampaignProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeProgress(progress)));
}

export function resetCampaignProgress(): CampaignProgress {
  const progress = createDefaultProgress();
  saveCampaignProgress(progress);

  return progress;
}

export function completeMission(
  progress: CampaignProgress,
  result: MissionResultSummary,
): CampaignProgress {
  const mission = missionDefinitions[result.missionId];
  const currentRecord = progress.completedMissions[result.missionId];
  const nextCompletedMissions = {
    ...progress.completedMissions,
    [result.missionId]: {
      completedAt: new Date().toISOString(),
      bestScore: Math.max(currentRecord?.bestScore ?? 0, result.score),
      bestRank: getBetterRank(currentRecord?.bestRank, result.rank),
    },
  };
  const nextUnlocked = new Set(progress.unlockedMissionIds);
  const nextMemoryProfiles = new Set(progress.immuneMemory.knownProfiles);
  const nextAnalyzedTypes = new Set(progress.immuneMemory.analyzedPathogenTypes);

  for (const profile of mission.memoryHintProfiles ?? []) {
    nextMemoryProfiles.add(profile);
  }

  for (const pathogenTypeId of mission.allowedPathogens) {
    nextAnalyzedTypes.add(pathogenTypeId);
  }

  if (mission.nextMissionId && isMissionId(mission.nextMissionId)) {
    nextUnlocked.add(mission.nextMissionId);
  }

  const next = normalizeProgress({
    version: SAVE_VERSION,
    unlockedMissionIds: Array.from(nextUnlocked),
    completedMissions: nextCompletedMissions,
    immuneMemory: {
      knownProfiles: Array.from(nextMemoryProfiles),
      analyzedPathogenTypes: Array.from(nextAnalyzedTypes),
    },
  });

  saveCampaignProgress(next);

  return next;
}

export function isMissionUnlocked(
  progress: CampaignProgress,
  missionId: MissionId,
): boolean {
  return progress.unlockedMissionIds.includes(missionId);
}

function createDefaultProgress(): CampaignProgress {
  return {
    version: SAVE_VERSION,
    unlockedMissionIds: [getFirstMissionId()],
    completedMissions: {},
    immuneMemory: {
      knownProfiles: [],
      analyzedPathogenTypes: [],
    },
  };
}

function normalizeProgress(progress: Partial<CampaignProgress>): CampaignProgress {
  const unlocked = new Set<MissionId>([getFirstMissionId()]);

  for (const missionId of progress.unlockedMissionIds ?? []) {
    if (isMissionId(missionId)) {
      unlocked.add(missionId);
    }
  }

  const completedMissions: CampaignProgress["completedMissions"] = {};

  for (const missionId of campaignMissionOrder) {
    const record = progress.completedMissions?.[missionId];

    if (record) {
      completedMissions[missionId] = {
        completedAt: record.completedAt,
        bestScore: Math.max(0, record.bestScore),
        bestRank: record.bestRank,
      };
      unlocked.add(missionId);
    }
  }

  return {
    version: SAVE_VERSION,
    unlockedMissionIds: campaignMissionOrder.filter((missionId) =>
      unlocked.has(missionId),
    ),
    completedMissions,
    immuneMemory: {
      knownProfiles: Array.from(
        new Set(
          (progress.immuneMemory?.knownProfiles ?? []).filter(
            (profile) => profile === "bacterial" || profile === "viral",
          ),
        ),
      ),
      analyzedPathogenTypes: Array.from(
        new Set(progress.immuneMemory?.analyzedPathogenTypes ?? []),
      ),
    },
  };
}

function getBetterRank(
  previous: MissionCompletionRecord["bestRank"] | undefined,
  next: MissionCompletionRecord["bestRank"],
): MissionCompletionRecord["bestRank"] {
  const ranks = ["C", "B", "A", "S"];

  if (!previous) {
    return next;
  }

  return ranks.indexOf(next) > ranks.indexOf(previous) ? next : previous;
}
