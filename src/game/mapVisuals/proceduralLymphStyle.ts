import type {
  MapPoint,
  TacticalMapDefinition,
} from "../data/tacticalMaps";

export const LYMPH_PIXEL_SCALE = 3;

export type ProceduralLymphLayerStyle = {
  width: number;
  color: number;
  alpha: number;
};

export type ProceduralLymphStyle = {
  shadow: ProceduralLymphLayerStyle;
  body: ProceduralLymphLayerStyle;
  inner: ProceduralLymphLayerStyle;
  highlight: ProceduralLymphLayerStyle;
  nodule: ProceduralLymphLayerStyle;
  cellDetail: ProceduralLymphLayerStyle;
};

export type LymphVisualRoute = {
  id: string;
  exitId: string;
  path: MapPoint[];
  offMapBridge: MapPoint[];
};

export function getProceduralLymphStyle(): ProceduralLymphStyle {
  return {
    shadow: { width: 10, color: 0x163f48, alpha: 0.14 },
    body: { width: 7, color: 0x55c7b7, alpha: 0.3 },
    inner: { width: 4, color: 0x8de3d1, alpha: 0.24 },
    highlight: { width: 1, color: 0xc3fff0, alpha: 0.2 },
    nodule: { width: 2, color: 0x6bd6c3, alpha: 0.24 },
    cellDetail: { width: 1, color: 0xb789c7, alpha: 0.24 },
  };
}

export function createLymphVisualRoutes(
  tacticalMap: TacticalMapDefinition,
): LymphVisualRoute[] {
  return tacticalMap.lymphaticExits.map((exit) => {
    const corridor = tacticalMap.corridors.find(
      (candidate) =>
        candidate.tags.includes("lymph") &&
        (candidate.fromZoneId === exit.id || candidate.toZoneId === exit.id),
    );
    const corridorPath = corridor?.path.map((point) => ({ ...point }));
    const path = corridorPath
      ? orientPathTowardExit(corridorPath, exit.position)
      : createDerivedLymphPath(tacticalMap, exit.id, exit.position);

    return {
      id: corridor?.id ?? `visual-lymph-${exit.id}`,
      exitId: exit.id,
      path,
      offMapBridge: createOffMapBridge(
        tacticalMap,
        exit.id,
        exit.position,
      ),
    };
  });
}

export function createPixelLymphPath(
  points: MapPoint[],
  routeId: string,
  pixelScale = LYMPH_PIXEL_SCALE,
): MapPoint[] {
  if (points.length < 2 || pixelScale <= 0) {
    return [];
  }

  const sampled =
    points.length === 3
      ? sampleQuadraticCurve(points[0], points[1], points[2], pixelScale)
      : sampleLinearPath(points, pixelScale);

  return sampled.reduce<MapPoint[]>((result, point, index) => {
    const previous = sampled[Math.max(0, index - 1)] ?? point;
    const next = sampled[Math.min(sampled.length - 1, index + 1)] ?? point;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const endpoint = index === 0 || index === sampled.length - 1;
    const jitter = endpoint
      ? 0
      : (deterministicLymphValue(routeId, index, 41) * 2 - 1) * 0.7;
    const pixelPoint = {
      x: Math.round(point.x / pixelScale - (dy / length) * jitter),
      y: Math.round(point.y / pixelScale + (dx / length) * jitter),
    };
    const last = result[result.length - 1];

    if (!last || last.x !== pixelPoint.x || last.y !== pixelPoint.y) {
      result.push(pixelPoint);
    }

    return result;
  }, []);
}

export function deterministicLymphValue(
  routeId: string,
  primaryIndex: number,
  secondaryIndex: number,
): number {
  const input = `${routeId}:${primaryIndex}:${secondaryIndex}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function createDerivedLymphPath(
  tacticalMap: TacticalMapDefinition,
  exitId: string,
  exitPosition: MapPoint,
): MapPoint[] {
  const nearestSite = [...tacticalMap.combatSites].sort(
    (left, right) =>
      pointDistance(left.position, exitPosition) -
      pointDistance(right.position, exitPosition),
  )[0];
  const start = nearestSite?.position ?? {
    x: tacticalMap.worldWidth / 2,
    y: tacticalMap.worldHeight / 2,
  };
  const dx = exitPosition.x - start.x;
  const dy = exitPosition.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const curveOffset =
    (deterministicLymphValue(exitId, 0, 17) * 2 - 1) *
    Math.min(64, length * 0.16);

  return [
    { ...start },
    {
      x: (start.x + exitPosition.x) / 2 + normalX * curveOffset,
      y: (start.y + exitPosition.y) / 2 + normalY * curveOffset,
    },
    { ...exitPosition },
  ];
}

function createOffMapBridge(
  tacticalMap: TacticalMapDefinition,
  exitId: string,
  exitPosition: MapPoint,
): MapPoint[] {
  const edgeTargets = [
    { x: 0, y: exitPosition.y },
    { x: tacticalMap.worldWidth, y: exitPosition.y },
    { x: exitPosition.x, y: 0 },
    { x: exitPosition.x, y: tacticalMap.worldHeight },
  ];
  const target = edgeTargets
    .map((point, index) => ({
      point,
      index,
      distance: pointDistance(point, exitPosition),
    }))
    .sort((left, right) =>
      left.distance === right.distance
        ? deterministicLymphValue(exitId, left.index, 73) -
          deterministicLymphValue(exitId, right.index, 73)
        : left.distance - right.distance,
    )[0]?.point ?? { ...exitPosition };
  const dx = target.x - exitPosition.x;
  const dy = target.y - exitPosition.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend =
    (deterministicLymphValue(exitId, 0, 79) * 2 - 1) *
    Math.min(42, length * 0.12);

  return [
    { ...exitPosition },
    {
      x: exitPosition.x + dx * 0.38 + normalX * bend,
      y: exitPosition.y + dy * 0.38 + normalY * bend,
    },
    {
      x: exitPosition.x + dx * 0.72 + normalX * bend * 0.45,
      y: exitPosition.y + dy * 0.72 + normalY * bend * 0.45,
    },
    target,
  ];
}

function orientPathTowardExit(
  points: MapPoint[],
  exitPosition: MapPoint,
): MapPoint[] {
  const firstDistance = pointDistance(points[0], exitPosition);
  const lastDistance = pointDistance(points[points.length - 1], exitPosition);

  return firstDistance < lastDistance ? points.reverse() : points;
}

function sampleQuadraticCurve(
  start: MapPoint,
  control: MapPoint,
  end: MapPoint,
  pixelScale: number,
): MapPoint[] {
  const estimatedLength =
    pointDistance(start, control) + pointDistance(control, end);
  const steps = Math.max(8, Math.ceil(estimatedLength / (pixelScale * 7)));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    const inverse = 1 - progress;

    return {
      x:
        inverse * inverse * start.x +
        2 * inverse * progress * control.x +
        progress * progress * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * progress * control.y +
        progress * progress * end.y,
    };
  });
}

function sampleLinearPath(points: MapPoint[], pixelScale: number): MapPoint[] {
  const sampled: MapPoint[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = pointDistance(start, end);
    const steps = Math.max(1, Math.ceil(length / (pixelScale * 7)));

    for (let step = index === 0 ? 0 : 1; step <= steps; step += 1) {
      const progress = step / steps;
      sampled.push({
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      });
    }
  }

  return sampled;
}

function pointDistance(left: MapPoint, right: MapPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}
