import type { Vector2 } from "../../types/shared";

export const FOCUS_CAMERA_ZOOM_MULTIPLIER = 1.06;
export const FOCUS_CAMERA_TWEEN_DURATION_MS = 210;
export const FOCUS_CAMERA_EASE = "Expo.Out";

const FOCUS_CAMERA_REPOSITION_THRESHOLD_PX = 116;
const FOCUS_CAMERA_PAN_FRACTION = 0.58;

type FocusCameraTargetInput = Readonly<{
  unitPosition: Vector2;
  cameraScroll: Vector2;
  cameraZoom: number;
  tacticalZoom: number;
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
}>;

export type FocusCameraTarget = Readonly<{
  zoom: number;
  scrollX: number;
  scrollY: number;
  repositionsCamera: boolean;
}>;

export function getFocusCameraTarget({
  unitPosition,
  cameraScroll,
  cameraZoom,
  tacticalZoom,
  viewportWidth,
  viewportHeight,
  worldWidth,
  worldHeight,
}: FocusCameraTargetInput): FocusCameraTarget {
  const zoom = tacticalZoom * FOCUS_CAMERA_ZOOM_MULTIPLIER;
  const safeLeft = Math.min(300, viewportWidth * 0.28);
  const safeRight = Math.min(360, viewportWidth * 0.3);
  const safeTop = Math.min(110, viewportHeight * 0.18);
  const safeBottom = Math.min(190, viewportHeight * 0.28);
  const usefulCenterX = (safeLeft + viewportWidth - safeRight) / 2;
  const usefulCenterY = (safeTop + viewportHeight - safeBottom) / 2;
  const currentScreenX = (unitPosition.x - cameraScroll.x) * cameraZoom;
  const currentScreenY = (unitPosition.y - cameraScroll.y) * cameraZoom;
  const distanceFromUsefulCenter = Math.hypot(
    currentScreenX - usefulCenterX,
    currentScreenY - usefulCenterY,
  );
  const repositionsCamera =
    distanceFromUsefulCenter > FOCUS_CAMERA_REPOSITION_THRESHOLD_PX;
  const desiredScrollX = unitPosition.x - usefulCenterX / zoom;
  const desiredScrollY = unitPosition.y - usefulCenterY / zoom;
  const targetScrollX = repositionsCamera
    ? cameraScroll.x +
      (desiredScrollX - cameraScroll.x) * FOCUS_CAMERA_PAN_FRACTION
    : cameraScroll.x;
  const targetScrollY = repositionsCamera
    ? cameraScroll.y +
      (desiredScrollY - cameraScroll.y) * FOCUS_CAMERA_PAN_FRACTION
    : cameraScroll.y;
  const maxScrollX = Math.max(0, worldWidth - viewportWidth / zoom);
  const maxScrollY = Math.max(0, worldHeight - viewportHeight / zoom);

  return {
    zoom,
    scrollX: clamp(targetScrollX, 0, maxScrollX),
    scrollY: clamp(targetScrollY, 0, maxScrollY),
    repositionsCamera,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
