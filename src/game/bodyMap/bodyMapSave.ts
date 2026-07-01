import {
  createDefaultBodyMapState,
  normalizeBodyMapState,
} from "./bodyMapSystem";
import type { BodyMapState } from "./bodyMapTypes";

const BODY_MAP_SAVE_KEY = "immunostrat-body-map-v1";

export function loadBodyMapState(): BodyMapState {
  if (typeof window === "undefined") {
    return createDefaultBodyMapState();
  }

  try {
    const raw = window.localStorage.getItem(BODY_MAP_SAVE_KEY);

    if (!raw) {
      return createDefaultBodyMapState();
    }

    return normalizeBodyMapState(JSON.parse(raw) as Partial<BodyMapState>);
  } catch {
    return createDefaultBodyMapState();
  }
}

export function saveBodyMapState(state: BodyMapState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BODY_MAP_SAVE_KEY,
    JSON.stringify(normalizeBodyMapState(state)),
  );
}

export function resetBodyMapState(): BodyMapState {
  const state = createDefaultBodyMapState();

  saveBodyMapState(state);

  return state;
}

export function clearBodyMapState(): BodyMapState {
  const state = createDefaultBodyMapState();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(BODY_MAP_SAVE_KEY);
  }

  return state;
}

export function hasSavedBodyMapState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(BODY_MAP_SAVE_KEY) !== null;
}

export function hasRunningBodyMapState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(BODY_MAP_SAVE_KEY);

    if (!raw) {
      return false;
    }

    return normalizeBodyMapState(JSON.parse(raw) as Partial<BodyMapState>).runStatus === "running";
  } catch {
    return false;
  }
}
