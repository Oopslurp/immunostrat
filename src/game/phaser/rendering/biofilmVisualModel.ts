import { stableHash } from "../../types/shared";

export type BiofilmPixelPoint = Readonly<{ x: number; y: number }>;

export type BiofilmNodule = BiofilmPixelPoint &
  Readonly<{
    width: number;
    height: number;
    tone: 0 | 1;
  }>;

export type BiofilmPocket = BiofilmPixelPoint & Readonly<{ size: number }>;

export type BiofilmVisualPattern = Readonly<{
  boundary: readonly BiofilmPixelPoint[];
  innerBoundary: readonly BiofilmPixelPoint[];
  nodules: readonly BiofilmNodule[];
  pockets: readonly BiofilmPocket[];
}>;

export function createBiofilmVisualPattern(
  identity: string,
  radius: number,
): BiofilmVisualPattern {
  const random = createSeededRandom(stableHash(identity));
  const pointCount = 18;
  const boundary = Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * Math.PI * 2 - Math.PI / 2;
    const radialScale = 0.8 + random() * 0.2;

    return {
      x: Math.round(Math.cos(angle) * radius * radialScale),
      y: Math.round(Math.sin(angle) * radius * radialScale * (0.72 + random() * 0.08)),
    };
  });
  const innerBoundary = boundary.map((point, index) => ({
    x: Math.round(point.x * (0.72 + (index % 3) * 0.035)),
    y: Math.round(point.y * (0.7 + (index % 2) * 0.04)),
  }));
  const nodules = Array.from({ length: 16 }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius * 0.7;

    return {
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance * 0.72),
      width: index % 4 === 0 ? 5 : 3 + Math.floor(random() * 2),
      height: index % 3 === 0 ? 3 : 2,
      tone: index % 2 === 0 ? 0 : 1,
    } as const;
  });
  const pockets = Array.from({ length: 4 }, () => {
    const angle = random() * Math.PI * 2;
    const distance = (0.18 + random() * 0.42) * radius;

    return {
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance * 0.68),
      size: 4 + Math.floor(random() * 4),
    };
  });

  return { boundary, innerBoundary, nodules, pockets };
}

function createSeededRandom(seed: number): () => number {
  let value = seed || 0x6d2b79f5;

  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}
