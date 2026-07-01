import type {
  BodyMapDifficulty,
  BodyMapFinalSummary,
} from "./bodyMapTypes";

const BODY_MAP_PROGRESS_KEY = "immunostrat-body-map-progress-v1";
const BODY_MAP_PROGRESS_VERSION = 1;

export type BodyMapProgress = {
  version: number;
  victories: number;
  defeats: number;
  bestVictory?: BodyMapFinalSummary;
  bestScoreByDifficulty: Partial<Record<BodyMapDifficulty, BodyMapFinalSummary>>;
  highestDifficultyWon?: BodyMapDifficulty;
  lastRun?: BodyMapFinalSummary;
};

export function createDefaultBodyMapProgress(): BodyMapProgress {
  return {
    version: BODY_MAP_PROGRESS_VERSION,
    victories: 0,
    defeats: 0,
    bestScoreByDifficulty: {},
  };
}

export function loadBodyMapProgress(): BodyMapProgress {
  if (typeof window === "undefined") {
    return createDefaultBodyMapProgress();
  }

  try {
    const raw = window.localStorage.getItem(BODY_MAP_PROGRESS_KEY);

    if (!raw) {
      return createDefaultBodyMapProgress();
    }

    return normalizeBodyMapProgress(
      JSON.parse(raw) as Partial<BodyMapProgress>,
    );
  } catch {
    return createDefaultBodyMapProgress();
  }
}

export function saveBodyMapProgress(progress: BodyMapProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BODY_MAP_PROGRESS_KEY,
    JSON.stringify(normalizeBodyMapProgress(progress)),
  );
}

export function resetBodyMapProgress(): BodyMapProgress {
  const progress = createDefaultBodyMapProgress();

  saveBodyMapProgress(progress);

  return progress;
}

export function recordBodyMapRun(
  progress: BodyMapProgress,
  summary: BodyMapFinalSummary,
): BodyMapProgress {
  const next = normalizeBodyMapProgress(progress);

  if (next.lastRun?.completedAt === summary.completedAt) {
    return next;
  }

  next.lastRun = summary;

  if (summary.status === "victory") {
    next.victories += 1;

    if (!next.bestVictory || summary.score > next.bestVictory.score) {
      next.bestVictory = summary;
    }

    const currentBest = next.bestScoreByDifficulty[summary.difficulty];

    if (!currentBest || summary.score > currentBest.score) {
      next.bestScoreByDifficulty[summary.difficulty] = summary;
    }

    next.highestDifficultyWon = getHighestDifficulty(
      next.highestDifficultyWon,
      summary.difficulty,
    );
  } else {
    next.defeats += 1;
  }

  return next;
}

function normalizeBodyMapProgress(
  progress: Partial<BodyMapProgress>,
): BodyMapProgress {
  if (progress.version !== BODY_MAP_PROGRESS_VERSION) {
    return createDefaultBodyMapProgress();
  }

  return {
    version: BODY_MAP_PROGRESS_VERSION,
    victories: Math.max(0, progress.victories ?? 0),
    defeats: Math.max(0, progress.defeats ?? 0),
    bestVictory: progress.bestVictory,
    bestScoreByDifficulty: progress.bestScoreByDifficulty ?? {},
    highestDifficultyWon: progress.highestDifficultyWon,
    lastRun: progress.lastRun,
  };
}

function getHighestDifficulty(
  current: BodyMapDifficulty | undefined,
  candidate: BodyMapDifficulty,
): BodyMapDifficulty {
  const ranks: Record<BodyMapDifficulty, number> = {
    easy: 1,
    normal: 2,
    hard: 3,
  };

  if (!current || ranks[candidate] > ranks[current]) {
    return candidate;
  }

  return current;
}
