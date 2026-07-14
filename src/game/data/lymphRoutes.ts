import type { MapPoint, TacticalMapDefinition } from "./tacticalMaps";

export type LymphRoute = {
  id: string;
  exitId: string;
  path: MapPoint[];
  offMapBridge: MapPoint[];
};

export function createLymphRoutes(
  tacticalMap: TacticalMapDefinition,
): LymphRoute[] {
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
      offMapBridge: createOffMapBridge(tacticalMap, exit.id, exit.position),
    };
  });
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
    (deterministicRouteValue(exitId, 0, 17) * 2 - 1) *
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
  const edgeTarget = edgeTargets
    .map((point, index) => ({
      point,
      index,
      distance: pointDistance(point, exitPosition),
    }))
    .sort((left, right) =>
      left.distance === right.distance
        ? deterministicRouteValue(exitId, left.index, 73) -
          deterministicRouteValue(exitId, right.index, 73)
        : left.distance - right.distance,
    )[0]?.point ?? { ...exitPosition };
  const overshoot = 72;
  const target = {
    x:
      edgeTarget.x === 0
        ? -overshoot
        : edgeTarget.x === tacticalMap.worldWidth
          ? tacticalMap.worldWidth + overshoot
          : edgeTarget.x,
    y:
      edgeTarget.y === 0
        ? -overshoot
        : edgeTarget.y === tacticalMap.worldHeight
          ? tacticalMap.worldHeight + overshoot
          : edgeTarget.y,
  };
  const dx = target.x - exitPosition.x;
  const dy = target.y - exitPosition.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend =
    (deterministicRouteValue(exitId, 0, 79) * 2 - 1) *
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

function deterministicRouteValue(
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

function pointDistance(left: MapPoint, right: MapPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}
