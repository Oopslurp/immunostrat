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
      width: 1500,
      height: 820,
      playArea: {
        x: 92,
        y: 118,
        width: 1320,
        height: 600,
        radius: 26,
      },
      grid: {
        startX: 142,
        endX: 1350,
        startY: 152,
        endY: 686,
        stepX: 92,
        skewX: 52,
      },
      tissueZone: {
        x: 130,
        y: 245,
        width: 210,
        height: 330,
      },
      tissueCore: { x: 235, y: 410 },
      lymphNode: { x: 410, y: 650, radius: 46 },
      bacteriaEntryZone: {
        x: 1345,
        yMin: 220,
        yMax: 625,
      },
      macrophageSpawn: { x: 280, y: 410 },
    },
    waves: [
      {
        startsAtMs: 1200,
        pathogenTypeId: "cocciRapid",
        count: 6,
        spawnIntervalMs: 680,
      },
      {
        startsAtMs: 9800,
        pathogenTypeId: "proliferatingBacillus",
        count: 5,
        spawnIntervalMs: 950,
      },
      {
        startsAtMs: 22500,
        pathogenTypeId: "resistantBacterium",
        count: 3,
        spawnIntervalMs: 1500,
      },
      {
        startsAtMs: 35000,
        pathogenTypeId: "biofilmColony",
        count: 2,
        spawnIntervalMs: 4200,
      },
      {
        startsAtMs: 50000,
        pathogenTypeId: "toxicBacterium",
        count: 3,
        spawnIntervalMs: 1350,
      },
      {
        startsAtMs: 59500,
        pathogenTypeId: "cocciRapid",
        count: 8,
        spawnIntervalMs: 560,
      },
      {
        startsAtMs: 66500,
        pathogenTypeId: "resistantBacterium",
        count: 2,
        spawnIntervalMs: 1800,
      },
    ] satisfies MissionWaveDefinition[],
  },
} as const;

export type MissionId = keyof typeof missionDefinitions;
