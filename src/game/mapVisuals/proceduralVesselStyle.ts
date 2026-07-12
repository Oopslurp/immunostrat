import type { MapPoint } from "../data/tacticalMaps";

export const VESSEL_PIXEL_SCALE = 3;

export type ProceduralVesselLayerStyle = {
  width: number;
  color: number;
  alpha: number;
};

export type ProceduralVesselStyle = {
  shadow: ProceduralVesselLayerStyle;
  body: ProceduralVesselLayerStyle;
  inner: ProceduralVesselLayerStyle;
  highlight: ProceduralVesselLayerStyle;
  detailDark: ProceduralVesselLayerStyle;
  detailLight: ProceduralVesselLayerStyle;
  highlightOffset: number;
  jitterAmount: number;
};

export type PixelVesselBranch = {
  anchorIndex: number;
  points: MapPoint[];
};

const BODY_COLORS = [0x7e253c, 0x872b44] as const;

export function getProceduralVesselStyle(
  logicalWidth: number,
  vesselIndex = 0,
): ProceduralVesselStyle {
  const baseWidth = Math.max(8, Math.round(logicalWidth * 0.44));

  return {
    shadow: {
      width: baseWidth + 4,
      color: 0x3d1422,
      alpha: 0.4,
    },
    body: {
      width: baseWidth,
      color: BODY_COLORS[Math.abs(vesselIndex) % BODY_COLORS.length],
      alpha: 0.82,
    },
    inner: {
      width: Math.max(3, Math.round(baseWidth * 0.55)),
      color: 0xb33849,
      alpha: 0.68,
    },
    highlight: {
      width: Math.max(1, Math.round(baseWidth * 0.12)),
      color: 0xe56f78,
      alpha: 0.54,
    },
    detailDark: {
      width: Math.max(2, Math.round(baseWidth * 0.18)),
      color: 0x4d1f31,
      alpha: 0.68,
    },
    detailLight: {
      width: 1,
      color: 0xd95b68,
      alpha: 0.62,
    },
    highlightOffset: Math.max(1, Math.round(baseWidth * 0.13)),
    jitterAmount: Math.min(3, Math.max(1.25, baseWidth * 0.12)),
  };
}

export function createPixelVesselPath(
  points: MapPoint[],
  vesselId: string,
  pixelScale: number,
  jitterAmount: number,
): MapPoint[] {
  if (points.length < 2 || pixelScale <= 0) {
    return [];
  }

  const pixelPoints: MapPoint[] = [];
  const sampleSpacing = pixelScale * 10;

  for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex += 1) {
    const start = points[segmentIndex];
    const end = points[segmentIndex + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(length / sampleSpacing));
    const normalX = length > 0 ? -dy / length : 0;
    const normalY = length > 0 ? dx / length : 0;
    const firstStep = segmentIndex === 0 ? 0 : 1;

    for (let step = firstStep; step <= steps; step += 1) {
      const progress = step / steps;
      const isOriginalPoint = step === 0 || step === steps;
      const noise = isOriginalPoint
        ? 0
        : (deterministicVesselValue(vesselId, segmentIndex, step) * 2 - 1) *
          jitterAmount;
      const point = {
        x: Math.round((start.x + dx * progress + normalX * noise) / pixelScale),
        y: Math.round((start.y + dy * progress + normalY * noise) / pixelScale),
      };
      const previous = pixelPoints[pixelPoints.length - 1];

      if (!previous || previous.x !== point.x || previous.y !== point.y) {
        pixelPoints.push(point);
      }
    }
  }

  return pixelPoints;
}

export function createVesselHighlightPath(
  points: MapPoint[],
  offset: number,
): MapPoint[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)] ?? point;
    const next = points[Math.min(points.length - 1, index + 1)] ?? point;
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const tangentLength = Math.hypot(tangentX, tangentY);

    if (tangentLength < 0.001) {
      return { ...point };
    }

    return {
      x: Math.round(point.x - (tangentY / tangentLength) * offset),
      y: Math.round(point.y + (tangentX / tangentLength) * offset),
    };
  });
}

export function createPixelVesselBranches(
  points: MapPoint[],
  vesselId: string,
  bodyWidth: number,
): PixelVesselBranch[] {
  if (points.length < 10 || bodyWidth <= 0) {
    return [];
  }

  const candidates = [] as Array<{ index: number; score: number }>;
  const desiredBranchCount = Math.min(
    7,
    Math.max(5, Math.round(points.length / 12)),
  );
  const candidateCount = Math.min(
    points.length - 4,
    desiredBranchCount * 2,
  );
  const usedIndices = new Set<number>();

  for (let slot = 0; slot < candidateCount; slot += 1) {
    const progress = candidateCount === 1 ? 0.5 : slot / (candidateCount - 1);
    const index = Math.round(2 + progress * (points.length - 5));

    if (usedIndices.has(index)) {
      continue;
    }

    usedIndices.add(index);
    candidates.push({
      index,
      score: deterministicVesselValue(vesselId, index, 211),
    });
  }

  const branchCount = Math.min(desiredBranchCount, candidates.length);
  const selectedCandidates = candidates
    .sort((left, right) => right.score - left.score)
    .slice(0, branchCount)
    .sort((left, right) => left.index - right.index);

  const initialSide =
    deterministicVesselValue(vesselId, points.length, 223) > 0.5 ? 1 : -1;

  return selectedCandidates.map(({ index }, branchIndex) => {
    const previous = points[index - 1];
    const anchor = points[index];
    const next = points[index + 1];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const unitTangentX = tangentX / tangentLength;
    const unitTangentY = tangentY / tangentLength;
    const unitNormalX = -unitTangentY;
    const unitNormalY = unitTangentX;
    const side = branchIndex % 2 === 0 ? initialSide : -initialSide;
    const length =
      11 +
      Math.round(deterministicVesselValue(vesselId, index, 227) * 7) +
      Math.max(1, Math.round(bodyWidth * 0.45));
    const bend =
      (deterministicVesselValue(vesselId, index, 229) * 2 - 1) *
      Math.max(3, length * 0.3);

    return {
      anchorIndex: index,
      points: [
        { ...anchor },
        {
          x: Math.round(
            anchor.x +
              unitNormalX * side * length * 0.18 +
              unitTangentX * length * 0.14,
          ),
          y: Math.round(
            anchor.y +
              unitNormalY * side * length * 0.18 +
              unitTangentY * length * 0.14,
          ),
        },
        {
          x: Math.round(
            anchor.x +
              unitNormalX * side * length * 0.56 +
              unitTangentX * (length * 0.27 + bend * 0.35),
          ),
          y: Math.round(
            anchor.y +
              unitNormalY * side * length * 0.56 +
              unitTangentY * (length * 0.27 + bend * 0.35),
          ),
        },
        {
          x: Math.round(
            anchor.x +
              unitNormalX * side * length +
              unitTangentX * (length * 0.38 + bend),
          ),
          y: Math.round(
            anchor.y +
              unitNormalY * side * length +
              unitTangentY * (length * 0.38 + bend),
          ),
        },
      ],
    };
  });
}

export function deterministicVesselValue(
  vesselId: string,
  primaryIndex: number,
  secondaryIndex: number,
): number {
  const input = `${vesselId}:${primaryIndex}:${secondaryIndex}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}
