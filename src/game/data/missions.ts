import type { PathogenTypeId } from "./pathogens";

export type MissionWaveDefinition = {
  startsAtMs: number;
  pathogenTypeId: PathogenTypeId;
  count: number;
  spawnIntervalMs: number;
};

export const missionDefinitions = {
  woundBacteriaV1: {
    id: "woundBacteriaV1",
    displayName: "Plaie cutanee infectee",
    map: {
      width: 1280,
      height: 720,
      playArea: {
        x: 84,
        y: 120,
        width: 1112,
        height: 500,
        radius: 26,
      },
      grid: {
        startX: 130,
        endX: 1140,
        startY: 148,
        endY: 592,
        stepX: 80,
        skewX: 44,
      },
      tissueZone: {
        x: 120,
        y: 210,
        width: 180,
        height: 300,
      },
      tissueCore: { x: 210, y: 360 },
      lymphNode: { x: 345, y: 520, radius: 44 },
      bacteriaEntryZone: {
        x: 1120,
        yMin: 220,
        yMax: 500,
      },
      macrophageSpawn: { x: 250, y: 360 },
    },
    waves: [
      {
        startsAtMs: 1200,
        pathogenTypeId: "basicBacterium",
        count: 4,
        spawnIntervalMs: 900,
      },
      {
        startsAtMs: 7600,
        pathogenTypeId: "basicBacterium",
        count: 8,
        spawnIntervalMs: 620,
      },
      {
        startsAtMs: 18500,
        pathogenTypeId: "toughBacterium",
        count: 7,
        spawnIntervalMs: 820,
      },
    ] satisfies MissionWaveDefinition[],
  },
} as const;

export type MissionId = keyof typeof missionDefinitions;
