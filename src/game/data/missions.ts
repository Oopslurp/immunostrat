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
      tissueCells: [
        { x: 210, y: 315 },
        { x: 285, y: 305 },
        { x: 360, y: 335 },
        { x: 230, y: 405 },
        { x: 315, y: 405 },
        { x: 395, y: 430 },
        { x: 245, y: 500 },
        { x: 340, y: 520 },
        { x: 455, y: 500 },
        { x: 520, y: 385 },
        { x: 560, y: 475 },
        { x: 470, y: 305 },
      ],
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
        startsAtMs: 9000,
        pathogenTypeId: "respiratoryVirus",
        count: 4,
        spawnIntervalMs: 1200,
      },
      {
        startsAtMs: 15500,
        pathogenTypeId: "proliferatingBacillus",
        count: 5,
        spawnIntervalMs: 950,
      },
      {
        startsAtMs: 25500,
        pathogenTypeId: "respiratoryVirus",
        count: 5,
        spawnIntervalMs: 1050,
      },
      {
        startsAtMs: 33500,
        pathogenTypeId: "resistantBacterium",
        count: 3,
        spawnIntervalMs: 1500,
      },
      {
        startsAtMs: 45500,
        pathogenTypeId: "biofilmColony",
        count: 2,
        spawnIntervalMs: 4200,
      },
      {
        startsAtMs: 58000,
        pathogenTypeId: "toxicBacterium",
        count: 3,
        spawnIntervalMs: 1350,
      },
      {
        startsAtMs: 67000,
        pathogenTypeId: "respiratoryVirus",
        count: 7,
        spawnIntervalMs: 850,
      },
      {
        startsAtMs: 76000,
        pathogenTypeId: "cocciRapid",
        count: 8,
        spawnIntervalMs: 560,
      },
      {
        startsAtMs: 84000,
        pathogenTypeId: "resistantBacterium",
        count: 2,
        spawnIntervalMs: 1800,
      },
    ] satisfies MissionWaveDefinition[],
  },
} as const;

export type MissionId = keyof typeof missionDefinitions;
