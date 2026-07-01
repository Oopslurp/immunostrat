import {
  clamp,
  createSeededRandom,
  deriveSeed,
  randomInRange,
  randomIntInRange,
} from "./tacticalMapSeed";
import { getMapScaleBalance } from "./mapScaleBalance";
import {
  getTacticalMapDefinition,
  type ChokePointDefinition,
  type CivilianCellZoneDefinition,
  type CombatSiteDefinition,
  type CorridorDefinition,
  type DiapedesisPointDefinition,
  type LymphaticExitDefinition,
  type MapPoint,
  type ObstacleDefinition,
  type PathogenSpawnZoneDefinition,
  type TacticalMapDefinition,
  type TacticalMapGenerationSummary,
  type TacticalMapId,
  type TacticalMapMode,
  type TacticalMapSizeCategory,
  type TacticalRegionType,
  type TacticalShape,
  type TissueZoneDefinition,
  type VesselPathDefinition,
} from "./tacticalMaps";

export type TacticalMapDifficulty = "easy" | "normal" | "hard";

export type TacticalMapGenerationInput = {
  templateId: TacticalMapId;
  seed: string;
  regionType?: TacticalRegionType;
  threatType?: string;
  difficulty?: TacticalMapDifficulty;
  mode: TacticalMapMode;
  mapSizeCategory?: TacticalMapSizeCategory;
  modifiers?: string[];
};

export type GeneratedTacticalMapDefinition = TacticalMapDefinition & {
  generationSummary: TacticalMapGenerationSummary;
};

type ValidationResult = {
  valid: boolean;
  messages: string[];
};

const MAX_GENERATION_RETRIES = 4;

export function generateTacticalMapFromTemplate(
  input: TacticalMapGenerationInput,
): GeneratedTacticalMapDefinition {
  const template = getTacticalMapDefinition(input.templateId);
  const difficulty = input.difficulty ?? "normal";
  const regionType = input.regionType ?? template.regionType;
  const threatType = input.threatType ?? template.recommendedThreats[0] ?? "mixed";

  if (input.mode === "campaign") {
    const validation = validateGeneratedTacticalMap(template);

    return withGenerationSummary(template, {
      input,
      regionType,
      threatType,
      difficulty,
      retryCount: 0,
      validation,
      validationStatus: validation.valid ? "valid" : "fallback",
    });
  }

  for (let retryCount = 0; retryCount < MAX_GENERATION_RETRIES; retryCount += 1) {
    const random = createSeededRandom(
      deriveSeed(input.seed, input.templateId, input.mode, difficulty, retryCount),
    );
    const candidate = varyTemplate(template, random, input, difficulty, regionType, threatType);
    const validation = validateGeneratedTacticalMap(candidate);

    if (validation.valid) {
      return withGenerationSummary(candidate, {
        input,
        regionType,
        threatType,
        difficulty,
        retryCount,
        validation,
        validationStatus: "valid",
      });
    }
  }

  const fallbackValidation = validateGeneratedTacticalMap(template);

  return withGenerationSummary(template, {
    input,
    regionType,
    threatType,
    difficulty,
    retryCount: MAX_GENERATION_RETRIES,
    validation: {
      valid: false,
      messages: [
        "Generation constraints failed after retries; stable template fallback used.",
        ...fallbackValidation.messages,
      ],
    },
    validationStatus: "fallback",
  });
}

export function validateGeneratedTacticalMap(
  map: TacticalMapDefinition,
): ValidationResult {
  const messages: string[] = [];

  if (map.worldWidth <= 0 || map.worldHeight <= 0) {
    messages.push("World dimensions must be positive.");
  }

  if (map.combatSites.length < 1) {
    messages.push("At least one combat site is required.");
  }

  if (map.diapedesisPoints.length < 1) {
    messages.push("At least one diapedesis point is required.");
  }

  if (map.lymphaticExits.length < 1) {
    messages.push("At least one lymphatic exit is required.");
  }

  if (map.pathogenSpawnZones.length < 1) {
    messages.push("At least one pathogen spawn zone is required.");
  }

  for (const site of map.combatSites) {
    if (!isPointInsideMap(site.position, map, map.minDistanceSiteToMapEdge * 0.45)) {
      messages.push(`Combat site ${site.id} is too close to a map edge.`);
    }
  }

  for (let index = 0; index < map.combatSites.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < map.combatSites.length; otherIndex += 1) {
      const distance = pointDistance(
        map.combatSites[index].position,
        map.combatSites[otherIndex].position,
      );

      if (distance < map.minDistanceBetweenCombatSites * 0.45) {
        messages.push(
          `Combat sites ${map.combatSites[index].id} and ${map.combatSites[otherIndex].id} are too close.`,
        );
      }
    }
  }

  const mainSite = map.combatSites[0];

  if (mainSite) {
    for (const entry of map.diapedesisPoints) {
      if (pointDistance(entry.position, mainSite.position) < map.minDistanceEntryToMainSite * 0.38) {
        messages.push(`Entry ${entry.id} is too close to the main combat site.`);
      }
    }
  }

  for (const exit of map.lymphaticExits) {
    const nearestEntryDistance = Math.min(
      ...map.diapedesisPoints.map((entry) => pointDistance(entry.position, exit.position)),
    );

    if (Number.isFinite(nearestEntryDistance) && nearestEntryDistance < map.minDistanceLymphExitToEntry * 0.35) {
      messages.push(`Lymph exit ${exit.id} is too close to an entry point.`);
    }
  }

  for (const spawn of map.pathogenSpawnZones) {
    if (!isPointInsideMap(spawn.position, map, spawn.radius * 0.35)) {
      messages.push(`Spawn zone ${spawn.id} is outside the map bounds.`);
    }

    const nearestEntryDistance = Math.min(
      ...map.diapedesisPoints.map((entry) => pointDistance(entry.position, spawn.position)),
    );

    if (Number.isFinite(nearestEntryDistance) && nearestEntryDistance < map.minDistanceSpawnToEntry * 0.35) {
      messages.push(`Spawn zone ${spawn.id} is too close to an entry point.`);
    }
  }

  return {
    valid: messages.length === 0,
    messages,
  };
}

function varyTemplate(
  template: TacticalMapDefinition,
  random: () => number,
  input: TacticalMapGenerationInput,
  difficulty: TacticalMapDifficulty,
  regionType: TacticalRegionType,
  threatType: string,
): TacticalMapDefinition {
  const siteCount = getSiteCount(template, input.mode, difficulty);
  const selectedSites = selectCombatSites(template, random, siteCount);
  const sitePositions = new Map<string, MapPoint>();
  const jitter = getJitterRadius(template, input.mode, difficulty);
  const siteEdgePadding = Math.max(template.minDistanceSiteToMapEdge * 0.55, 120);

  const combatSites = selectedSites.map((site, index) => {
    const position = jitterPoint(
      site.position,
      random,
      jitter * (index === 0 ? 0.45 : 1),
      template,
      Math.max(site.radius + 24, siteEdgePadding),
    );
    sitePositions.set(site.id, position);

    return {
      ...site,
      position,
      threatLevel: Math.max(1, site.threatLevel + getThreatAdjustment(threatType, difficulty)),
      infectionLevel: clamp(site.infectionLevel + randomInRange(random, -0.12, 0.16), 0.15, 1),
    };
  });

  const firstSite = combatSites[0] ?? template.combatSites[0];
  const diapedesisPoints = pickAndJitterEntries(
    template,
    random,
    input.mode,
    difficulty,
    input.mapSizeCategory ?? template.mapSizeCategory,
  );
  const reinforcementEntryPoints = template.reinforcementEntryPoints
    .map((entry) => {
      const matched = diapedesisPoints.find((point) => point.id === entry.id);

      return matched ?? jitterEntry(entry, random, template, jitter * 0.5);
    })
    .slice(0, Math.max(1, Math.min(diapedesisPoints.length, template.reinforcementEntryPoints.length)));
  const lymphaticExits = pickAndJitterExits(template, random, input.mode, difficulty);
  const pathogenSpawnZones = combatSites.map((site, index) =>
    createSpawnForSite(template, site, index, random),
  );
  const tissueZones = createTissueZonesForSites(template, combatSites, regionType);
  const civilianCellZones = createCivilianZonesForSites(template, combatSites);
  const corridors = createCorridors(firstSite, combatSites, diapedesisPoints, lymphaticExits);
  const chokePoints = createChokePoints(corridors);
  const vesselPaths = createVesselPaths(template, diapedesisPoints, combatSites, random);
  const obstacles = pickAndJitterObstacles(template, random, input.mode, difficulty);

  return {
    ...template,
    name: `${template.name} (${input.mode} seed)`,
    regionType,
    recommendedThreats: [threatType, ...template.recommendedThreats.filter((threat) => threat !== threatType)],
    mapSizeCategory: input.mapSizeCategory ?? template.mapSizeCategory,
    tissueZones,
    vesselPaths,
    diapedesisPoints,
    reinforcementEntryPoints,
    lymphaticExits,
    combatSites,
    pathogenSpawnZones,
    civilianCellZones,
    corridors,
    chokePoints,
    obstacles,
    dangerZones: tissueZones.filter((zone) => zone.status === "infected" || zone.status === "inflamed"),
    safeZones: lymphaticExits.map((exit) => ({
      id: `${exit.id}-safe-zone`,
      name: `Zone sure ${exit.name}`,
      shape: {
        kind: "circle",
        position: { ...exit.position },
        radius: Math.max(90, Math.round(exit.radius * 1.8)),
      },
      tissueHealth: 100,
      inflammationLevel: 0.1,
      status: "healthy",
      tags: ["safe", "lymph"],
    })),
    objectiveZones: combatSites.map((site) => ({
      id: `${site.id}-objective`,
      name: site.name,
      shape: {
        kind: "circle",
        position: { ...site.position },
        radius: Math.round(site.radius * 1.18),
      },
      tissueHealth: site.tissueHealth,
      inflammationLevel: site.inflammationLevel,
      status: site.initialStatus === "critical" ? "infected" : "inflamed",
      tags: ["objective", "combatSite"],
    })),
  };
}

function withGenerationSummary(
  map: TacticalMapDefinition,
  params: {
    input: TacticalMapGenerationInput;
    regionType: TacticalRegionType;
    threatType: string;
    difficulty: TacticalMapDifficulty;
    retryCount: number;
    validation: ValidationResult;
    validationStatus: TacticalMapGenerationSummary["validationStatus"];
  },
): GeneratedTacticalMapDefinition {
  return {
    ...map,
    generationSummary: {
      seed: params.input.seed,
      templateId: params.input.templateId,
      regionType: params.regionType,
      threatType: params.threatType,
      mode: params.input.mode,
      difficulty: params.difficulty,
      mapSizeCategory: params.input.mapSizeCategory ?? map.mapSizeCategory,
      numberOfCombatSites: map.combatSites.length,
      numberOfDiapedesisPoints: map.diapedesisPoints.length,
      numberOfLymphExits: map.lymphaticExits.length,
      validationStatus: params.validationStatus,
      validationMessages: params.validation.messages,
      retryCount: params.retryCount,
    },
  };
}

function getSiteCount(
  template: TacticalMapDefinition,
  mode: TacticalMapMode,
  difficulty: TacticalMapDifficulty,
): number {
  if (mode === "infinite") {
    return Math.max(4, Math.min(template.combatSites.length, 6));
  }

  const maxByDifficulty: Record<TacticalMapDifficulty, number> = {
    easy: 2,
    normal: 3,
    hard: 4,
  };

  return Math.max(1, Math.min(template.combatSites.length, maxByDifficulty[difficulty]));
}

function selectCombatSites(
  template: TacticalMapDefinition,
  random: () => number,
  siteCount: number,
): CombatSiteDefinition[] {
  const pool = [...template.combatSites];
  const selected: CombatSiteDefinition[] = [];

  if (pool[0]) {
    selected.push(pool.shift()!);
  }

  while (selected.length < siteCount && pool.length > 0) {
    const index = randomIntInRange(random, 0, pool.length - 1);
    const [site] = pool.splice(index, 1);
    selected.push(site);
  }

  return selected.sort((a, b) => a.priority - b.priority);
}

function getJitterRadius(
  template: TacticalMapDefinition,
  mode: TacticalMapMode,
  difficulty: TacticalMapDifficulty,
): number {
  const difficultyScale: Record<TacticalMapDifficulty, number> = {
    easy: 0.45,
    normal: 0.7,
    hard: 0.95,
  };
  const modeScale = mode === "infinite" ? 1.15 : 1;

  return Math.round(template.siteSpacing * 0.28 * difficultyScale[difficulty] * modeScale);
}

function getThreatAdjustment(threatType: string, difficulty: TacticalMapDifficulty): number {
  const difficultyBonus = difficulty === "hard" ? 2 : difficulty === "normal" ? 1 : 0;
  const threatBonus = threatType === "mixed" || threatType === "cancer" ? 1 : 0;

  return difficultyBonus + threatBonus;
}

function pickAndJitterEntries(
  template: TacticalMapDefinition,
  random: () => number,
  mode: TacticalMapMode,
  difficulty: TacticalMapDifficulty,
  mapSizeCategory: TacticalMapDefinition["mapSizeCategory"],
): DiapedesisPointDefinition[] {
  const balance = getMapScaleBalance({
    mode,
    mapSizeCategory,
    difficulty,
  });
  const baseDesired =
    mode === "infinite"
      ? Math.min(template.diapedesisPoints.length, 4)
      : difficulty === "hard"
        ? Math.min(template.diapedesisPoints.length, 3)
        : Math.min(template.diapedesisPoints.length, 2);
  const desired = Math.max(
    mapSizeCategory === "huge" ? 4 : mapSizeCategory === "large" ? 3 : mapSizeCategory === "medium" ? 2 : 1,
    baseDesired + balance.diapedesisPointCountModifier,
  );
  const entries = template.diapedesisPoints
    .slice(0, Math.max(1, desired))
    .map((entry) => jitterEntry(entry, random, template, template.siteSpacing * 0.12));

  while (entries.length < desired) {
    entries.push(createSupplementalEntry(template, random, entries.length));
  }

  return entries;
}

function createSupplementalEntry(
  template: TacticalMapDefinition,
  random: () => number,
  index: number,
): DiapedesisPointDefinition {
  const site = template.combatSites[index % template.combatSites.length] ?? template.combatSites[0];
  const side = index % 2 === 0 ? -1 : 1;
  const basePosition = site
    ? {
        x: site.position.x + side * template.siteSpacing * 0.5,
        y: site.position.y - template.siteSpacing * 0.32,
      }
    : {
        x: template.worldWidth * (0.22 + random() * 0.56),
        y: template.worldHeight * (0.18 + random() * 0.24),
      };

  return {
    id: `${template.id}-generated-entry-${index + 1}`,
    name: `Diapedese generee ${index + 1}`,
    position: clampPointToMap(basePosition, template, 90),
    allowedUnitTypes:
      index % 3 === 0
        ? ["macrophage", "neutrophil", "nkCell"]
        : ["macrophage", "dendriticCell", "plasmocyte", "cytotoxicT"],
    spawnRadius: 44,
    priority: 2,
    isDefault: false,
    visualHint: "generated supporting diapedesis point for large maps",
  };
}

function jitterEntry(
  entry: DiapedesisPointDefinition,
  random: () => number,
  map: TacticalMapDefinition,
  radius: number,
): DiapedesisPointDefinition {
  return {
    ...entry,
    position: jitterPoint(entry.position, random, radius, map, entry.spawnRadius + 30),
  };
}

function pickAndJitterExits(
  template: TacticalMapDefinition,
  random: () => number,
  mode: TacticalMapMode,
  difficulty: TacticalMapDifficulty,
): LymphaticExitDefinition[] {
  const desired =
    mode === "infinite"
      ? Math.min(template.lymphaticExits.length, 3)
      : difficulty === "easy"
        ? 1
        : Math.min(template.lymphaticExits.length, 2);

  return template.lymphaticExits
    .slice(0, Math.max(1, desired))
    .map((exit) => ({
      ...exit,
      position: jitterPoint(exit.position, random, template.siteSpacing * 0.16, template, exit.radius + 40),
    }));
}

function createSpawnForSite(
  template: TacticalMapDefinition,
  site: CombatSiteDefinition,
  index: number,
  random: () => number,
): PathogenSpawnZoneDefinition {
  const source =
    template.pathogenSpawnZones.find((zone) => zone.combatSiteId === site.id) ??
    template.pathogenSpawnZones[index % template.pathogenSpawnZones.length];
  const angle = randomInRange(random, -Math.PI, Math.PI);
  const distanceFromSite = site.radius + randomInRange(random, 170, 310);
  const position = clampPointToMap(
    {
      x: site.position.x + Math.cos(angle) * distanceFromSite,
      y: site.position.y + Math.sin(angle) * distanceFromSite,
    },
    template,
    source.radius + 24,
  );

  return {
    ...source,
    id: `${site.id}-spawn`,
    combatSiteId: site.id,
    position,
  };
}

function createTissueZonesForSites(
  template: TacticalMapDefinition,
  combatSites: CombatSiteDefinition[],
  regionType: TacticalRegionType,
): TissueZoneDefinition[] {
  const fallback = template.tissueZones[0];

  return combatSites.map((site, index) => {
    const source = template.tissueZones[index % template.tissueZones.length] ?? fallback;

    return {
      ...source,
      id: `${site.id}-tissue`,
      name: `Tissu ${site.name}`,
      shape: {
        kind: "circle",
        position: { ...site.position },
        radius: site.radius + (regionType === "blood" ? 80 : 120),
      },
      tissueHealth: site.tissueHealth,
      inflammationLevel: site.inflammationLevel,
      status: site.initialStatus === "critical" ? "infected" : "inflamed",
      tags: [...new Set([...source.tags, regionType, "generated"])],
    };
  });
}

function createCivilianZonesForSites(
  template: TacticalMapDefinition,
  combatSites: CombatSiteDefinition[],
): CivilianCellZoneDefinition[] {
  const fallback = template.civilianCellZones[0];

  return combatSites.map((site, index) => {
    const source = template.civilianCellZones[index % template.civilianCellZones.length] ?? fallback;

    return {
      ...source,
      id: `${site.id}-civilian-cells`,
      linkedTissueZoneId: `${site.id}-tissue`,
      position: {
        x: site.position.x - site.radius * 0.45,
        y: site.position.y + site.radius * 0.25,
      },
      radius: Math.max(90, Math.round(site.radius * 1.45)),
      density: clamp(source.density + index * 0.06, 0.35, 1),
    };
  });
}

function createCorridors(
  firstSite: CombatSiteDefinition,
  combatSites: CombatSiteDefinition[],
  entries: DiapedesisPointDefinition[],
  exits: LymphaticExitDefinition[],
): CorridorDefinition[] {
  const corridors: CorridorDefinition[] = [];

  entries.forEach((entry, index) => {
    corridors.push({
      id: `${entry.id}-to-${firstSite.id}`,
      name: `Route ${entry.name}`,
      fromZoneId: entry.id,
      toZoneId: firstSite.id,
      path: [{ ...entry.position }, midpoint(entry.position, firstSite.position), { ...firstSite.position }],
      width: 58,
      dangerLevel: 0.22 + index * 0.06,
      tags: ["entry", "generated"],
    });
  });

  combatSites.slice(1).forEach((site, index) => {
    corridors.push({
      id: `${firstSite.id}-to-${site.id}`,
      name: `Branche ${site.name}`,
      fromZoneId: firstSite.id,
      toZoneId: site.id,
      path: [
        { ...firstSite.position },
        {
          x: (firstSite.position.x + site.position.x) / 2,
          y: (firstSite.position.y + site.position.y) / 2 + (index % 2 === 0 ? 90 : -90),
        },
        { ...site.position },
      ],
      width: 64,
      dangerLevel: 0.35 + index * 0.08,
      tags: ["front", "generated"],
    });
  });

  exits.forEach((exit) => {
    const nearest = [...combatSites].sort(
      (a, b) => pointDistance(a.position, exit.position) - pointDistance(b.position, exit.position),
    )[0];

    if (!nearest) {
      return;
    }

    corridors.push({
      id: `${nearest.id}-to-${exit.id}`,
      name: `Drain ${exit.name}`,
      fromZoneId: nearest.id,
      toZoneId: exit.id,
      path: [{ ...nearest.position }, midpoint(nearest.position, exit.position), { ...exit.position }],
      width: 52,
      dangerLevel: 0.18,
      tags: ["lymph", "generated"],
    });
  });

  return corridors;
}

function createChokePoints(corridors: CorridorDefinition[]): ChokePointDefinition[] {
  return corridors.slice(0, 6).map((corridor, index) => ({
    id: `${corridor.id}-choke`,
    position: corridor.path[Math.floor(corridor.path.length / 2)] ?? corridor.path[0],
    radius: 46 + index * 4,
    linkedCorridorId: corridor.id,
    riskLevel: clamp(corridor.dangerLevel + 0.12, 0, 1),
    tags: ["generated", "choke"],
  }));
}

function createVesselPaths(
  template: TacticalMapDefinition,
  entries: DiapedesisPointDefinition[],
  combatSites: CombatSiteDefinition[],
  random: () => number,
): VesselPathDefinition[] {
  const firstEntry = entries[0];
  const vessels = template.vesselPaths.slice(0, Math.max(1, Math.min(template.vesselPaths.length, 3)));

  return vessels.map((vessel, index) => {
    const entry = entries[index % entries.length] ?? firstEntry;
    const site = combatSites[index % combatSites.length] ?? combatSites[0];
    const points = [
      jitterPoint(vessel.points[0] ?? entry.position, random, 60, template, 20),
      midpoint(entry.position, site.position),
      jitterPoint(vessel.points[vessel.points.length - 1] ?? site.position, random, 80, template, 20),
    ];

    return {
      ...vessel,
      points,
      connectedEntryPointIds: entries.map((candidate) => candidate.id),
    };
  });
}

function pickAndJitterObstacles(
  template: TacticalMapDefinition,
  random: () => number,
  mode: TacticalMapMode,
  difficulty: TacticalMapDifficulty,
): ObstacleDefinition[] {
  const desired = mode === "infinite" ? 8 : difficulty === "hard" ? 6 : 4;

  return template.obstacles.slice(0, Math.min(template.obstacles.length, desired)).map((obstacle) => ({
    ...obstacle,
    shape: jitterShape(obstacle.shape, random, template.siteSpacing * 0.12, template),
  }));
}

function jitterShape(
  shape: TacticalShape,
  random: () => number,
  radius: number,
  map: TacticalMapDefinition,
): TacticalShape {
  if (shape.kind === "circle") {
    return {
      ...shape,
      position: jitterPoint(shape.position, random, radius, map, shape.radius + 20),
    };
  }

  return {
    kind: "polygon",
    points: shape.points.map((point) => jitterPoint(point, random, radius * 0.45, map, 20)),
  };
}

function jitterPoint(
  point: MapPoint,
  random: () => number,
  radius: number,
  map: TacticalMapDefinition,
  padding: number,
): MapPoint {
  const angle = randomInRange(random, 0, Math.PI * 2);
  const distance = randomInRange(random, radius * 0.2, radius);

  return clampPointToMap(
    {
      x: point.x + Math.cos(angle) * distance,
      y: point.y + Math.sin(angle) * distance,
    },
    map,
    padding,
  );
}

function clampPointToMap(
  point: MapPoint,
  map: TacticalMapDefinition,
  padding: number,
): MapPoint {
  return {
    x: Math.round(clamp(point.x, padding, map.worldWidth - padding)),
    y: Math.round(clamp(point.y, padding, map.worldHeight - padding)),
  };
}

function isPointInsideMap(
  point: MapPoint,
  map: TacticalMapDefinition,
  padding: number,
): boolean {
  return (
    point.x >= padding &&
    point.y >= padding &&
    point.x <= map.worldWidth - padding &&
    point.y <= map.worldHeight - padding
  );
}

function midpoint(a: MapPoint, b: MapPoint): MapPoint {
  return {
    x: Math.round((a.x + b.x) / 2),
    y: Math.round((a.y + b.y) / 2),
  };
}

function pointDistance(a: MapPoint, b: MapPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}
