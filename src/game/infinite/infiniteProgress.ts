import type {
  InfiniteBestScore,
  InfiniteDifficulty,
  InfiniteRunInfo,
} from "../data/infiniteMode";

const INFINITE_SAVE_KEY = "immunostrat-infinite-progress-v1";
const INFINITE_SAVE_VERSION = 1;

export type InfiniteProgress = {
  version: number;
  bestRuns: Partial<Record<InfiniteDifficulty, InfiniteBestScore>>;
};

export function loadInfiniteProgress(): InfiniteProgress {
  if (typeof window === "undefined") {
    return createDefaultInfiniteProgress();
  }

  try {
    const raw = window.localStorage.getItem(INFINITE_SAVE_KEY);

    if (!raw) {
      return createDefaultInfiniteProgress();
    }

    const parsed = JSON.parse(raw) as Partial<InfiniteProgress>;

    if (parsed.version !== INFINITE_SAVE_VERSION) {
      return createDefaultInfiniteProgress();
    }

    return normalizeInfiniteProgress(parsed);
  } catch {
    return createDefaultInfiniteProgress();
  }
}

export function saveInfiniteProgress(progress: InfiniteProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    INFINITE_SAVE_KEY,
    JSON.stringify(normalizeInfiniteProgress(progress)),
  );
}

export function recordInfiniteRun(
  progress: InfiniteProgress,
  runInfo: InfiniteRunInfo,
): InfiniteProgress {
  const current = progress.bestRuns[runInfo.difficulty];

  if (current && current.score >= runInfo.score) {
    return progress;
  }

  const next = normalizeInfiniteProgress({
    ...progress,
    bestRuns: {
      ...progress.bestRuns,
      [runInfo.difficulty]: {
        score: runInfo.score,
        cycle: runInfo.cycle,
        wave: runInfo.wave,
        phase: runInfo.phase.id,
        difficulty: runInfo.difficulty,
        completedAt: new Date().toISOString(),
      },
    },
  });

  saveInfiniteProgress(next);

  return next;
}

export function resetInfiniteProgress(): InfiniteProgress {
  const progress = createDefaultInfiniteProgress();

  saveInfiniteProgress(progress);

  return progress;
}

function createDefaultInfiniteProgress(): InfiniteProgress {
  return {
    version: INFINITE_SAVE_VERSION,
    bestRuns: {},
  };
}

function normalizeInfiniteProgress(
  progress: Partial<InfiniteProgress>,
): InfiniteProgress {
  return {
    version: INFINITE_SAVE_VERSION,
    bestRuns: {
      normal: normalizeBest(progress.bestRuns?.normal),
      hard: normalizeBest(progress.bestRuns?.hard),
      nightmare: normalizeBest(progress.bestRuns?.nightmare),
    },
  };
}

function normalizeBest(
  best: InfiniteBestScore | undefined,
): InfiniteBestScore | undefined {
  if (!best) {
    return undefined;
  }

  return {
    score: Math.max(0, best.score),
    cycle: Math.max(1, best.cycle),
    wave: Math.max(1, best.wave),
    phase: Math.max(1, best.phase),
    difficulty: best.difficulty,
    completedAt: best.completedAt,
  };
}
