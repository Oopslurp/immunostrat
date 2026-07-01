import { pathogenDefinitions, type PathogenTypeId } from "./pathogens";
import type { UnitTypeId } from "./units";

export type TacticalMapId =
  | "skin_small_wound_fixed"
  | "skin_multi_wound_template"
  | "lung_branching_vessels_template"
  | "intestine_clustered_sites_template"
  | "blood_vessel_crossroads_template"
  | "lymph_node_signal_template"
  | "infinite_large_tissue_template";

export type TacticalMapMode = "campaign" | "bodyBattle" | "infinite";
export type TacticalMapSizeCategory = "small" | "medium" | "large" | "huge";
export type TacticalRegionType =
  | "skin"
  | "lungs"
  | "intestine"
  | "blood"
  | "liver"
  | "spleen"
  | "lymphNodes"
  | "boneMarrow"
  | "mixed";

export type MapPoint = {
  x: number;
  y: number;
};

export type CircleShape = {
  kind: "circle";
  position: MapPoint;
  radius: number;
};

export type PolygonShape = {
  kind: "polygon";
  points: MapPoint[];
};

export type TacticalShape = CircleShape | PolygonShape;

export type TissueZoneDefinition = {
  id: string;
  name: string;
  shape: TacticalShape;
  tissueHealth: number;
  inflammationLevel: number;
  status: "healthy" | "fragile" | "inflamed" | "infected" | "deep";
  tags: string[];
};

export type VesselPathDefinition = {
  id: string;
  name: string;
  points: MapPoint[];
  width: number;
  vesselType: "capillary" | "venule" | "arteriole" | "vesselBranch";
  flowDirection: "forward" | "reverse" | "bidirectional";
  connectedEntryPointIds: string[];
  tags: string[];
  visualHint: string;
};

export type DiapedesisPointDefinition = {
  id: string;
  name: string;
  position: MapPoint;
  vesselPathId?: string;
  allowedUnitTypes?: UnitTypeId[];
  spawnRadius: number;
  priority: number;
  isDefault?: boolean;
  visualHint: string;
};

export type LymphaticExitDefinition = {
  id: string;
  name: string;
  position: MapPoint;
  radius: number;
  linkedRegionalNodeId?: string;
  acceptsSignals: boolean;
  exitType: "lymphExit" | "lymphChannel" | "localNodeExit";
  visualHint: string;
};

export type CombatSiteDefinition = {
  id: string;
  name: string;
  position: MapPoint;
  radius: number;
  initialStatus: "inactive" | "watched" | "infected" | "critical" | "controlled" | "cleared";
  threatLevel: number;
  pathogenTypes: PathogenTypeId[];
  preferredPathogenSubtypes: string[];
  infectionLevel: number;
  inflammationLevel: number;
  tissueHealth: number;
  objectives: string[];
  spawnZoneIds: string[];
  recommendedUnitTypes: UnitTypeId[];
  priority: number;
  visualHint: string;
};

export type PathogenSpawnZoneDefinition = {
  id: string;
  combatSiteId: string;
  position: MapPoint;
  radius: number;
  pathogenFamilies: Array<"bacterium" | "virus" | "fungus" | "parasite" | "cancer" | "opportunist" | "mixed">;
  pathogenSubtypes: string[];
  spawnIntensity: number;
  waveTags: string[];
  maxActiveLocalEntities: number;
};

export type CivilianCellZoneDefinition = {
  id: string;
  position: MapPoint;
  radius: number;
  density: number;
  vulnerability: number;
  linkedTissueZoneId: string;
  tags: string[];
};

export type CorridorDefinition = {
  id: string;
  name: string;
  fromZoneId: string;
  toZoneId: string;
  path: MapPoint[];
  width: number;
  dangerLevel: number;
  tags: string[];
};

export type ChokePointDefinition = {
  id: string;
  position: MapPoint;
  radius: number;
  linkedCorridorId: string;
  riskLevel: number;
  tags: string[];
};

export type ObstacleDefinition = {
  id: string;
  name: string;
  shape: TacticalShape;
  obstacleType: "membrane" | "denseTissue" | "cellCluster" | "blocked" | "slow";
  movementMultiplier: number;
  tags: string[];
};

export type TacticalMapVisualHints = {
  visualThemeHint: string;
  backgroundHint: string;
  vesselVisualHint: string;
  tissueVisualHint: string;
  lymphVisualHint: string;
  diapedesisVisualHint: string;
  infectionVisualHint: string;
  inflammationVisualHint: string;
  lightingHint: string;
  animationNotes: string[];
  v11PolishNotes: string[];
};

export type TacticalMapGenerationHints = {
  generationTags: string[];
  allowedRegions: TacticalRegionType[];
  difficultyRange: [number, number];
  templateWeight: number;
  randomizableSlots: string[];
  optionalCombatSites: MapPoint[];
  optionalVesselBranches: MapPoint[][];
  optionalLymphExits: MapPoint[];
  seedVariationHints: string[];
  possibleCombatSitePositions: MapPoint[];
  possibleEntryPointPositions: MapPoint[];
  possibleLymphExitPositions: MapPoint[];
  possibleSpawnZonePositions: MapPoint[];
  possibleObstaclePositions: MapPoint[];
};

export type TacticalMapValidationStatus = "valid" | "fallback";

export type TacticalMapGenerationSummary = {
  seed: string;
  templateId: TacticalMapId;
  regionType: TacticalRegionType;
  threatType: string;
  mode: TacticalMapMode;
  difficulty: "easy" | "normal" | "hard";
  mapSizeCategory: TacticalMapSizeCategory;
  numberOfCombatSites: number;
  numberOfDiapedesisPoints: number;
  numberOfLymphExits: number;
  validationStatus: TacticalMapValidationStatus;
  validationMessages: string[];
  retryCount: number;
};

export type TacticalMapDefinition = {
  id: TacticalMapId;
  name: string;
  description: string;
  modeCompatibility: TacticalMapMode[];
  regionType: TacticalRegionType;
  recommendedThreats: string[];
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  cameraBounds: { x: number; y: number; width: number; height: number };
  recommendedViewportScale: number;
  mapSizeCategory: TacticalMapSizeCategory;
  siteSpacing: number;
  minDistanceBetweenCombatSites: number;
  minDistanceEntryToMainSite: number;
  minDistanceLymphExitToEntry: number;
  minDistanceSiteToMapEdge: number;
  minDistanceSpawnToEntry: number;
  backgroundType: "skin" | "lung" | "intestine" | "blood" | "lymph" | "mixed";
  tissueZones: TissueZoneDefinition[];
  vesselPaths: VesselPathDefinition[];
  diapedesisPoints: DiapedesisPointDefinition[];
  reinforcementEntryPoints: DiapedesisPointDefinition[];
  lymphaticExits: LymphaticExitDefinition[];
  combatSites: CombatSiteDefinition[];
  pathogenSpawnZones: PathogenSpawnZoneDefinition[];
  civilianCellZones: CivilianCellZoneDefinition[];
  corridors: CorridorDefinition[];
  chokePoints: ChokePointDefinition[];
  obstacles: ObstacleDefinition[];
  dangerZones: TissueZoneDefinition[];
  safeZones: TissueZoneDefinition[];
  objectiveZones: TissueZoneDefinition[];
  visual: TacticalMapVisualHints;
  generation: TacticalMapGenerationHints;
  generationSummary?: TacticalMapGenerationSummary;
};

type LegacyMissionMap = {
  tacticalMapId?: TacticalMapId;
  immuneEntryPoints?: Array<{
    kind: "vessel" | "diapedesis" | "lymph";
    position: MapPoint;
  }>;
  lymphExit?: MapPoint;
  lymphNode?: MapPoint;
  macrophageSpawn?: MapPoint;
};

type TacticalMapSource = LegacyMissionMap | TacticalMapDefinition;

const campaignSkinVisual: TacticalMapVisualHints = {
  visualThemeHint: "Green living tissue with red-violet vessels and clear blue entry markers.",
  backgroundHint: "soft green tissue field with rounded cell pockets",
  vesselVisualHint: "thick red and violet branching placeholder vessels",
  tissueVisualHint: "translucent green pockets, fragile zones slightly brighter",
  lymphVisualHint: "yellow-green circular exits connected to lymph routes",
  diapedesisVisualHint: "blue circles sitting on vessel edges",
  infectionVisualHint: "orange-red circular war zones",
  inflammationVisualHint: "warm orange translucent overlays",
  lightingHint: "flat readable tactical lighting, no final bloom yet",
  animationNotes: [
    "V11 can pulse vessel flow and entry points.",
    "V11 can animate cells crossing vessel walls at diapedesis markers.",
  ],
  v11PolishNotes: [
    "Replace circles and lines with original pixel-art biological tiles.",
    "Keep labels optional and debug-like.",
  ],
};

const v952BaseGeneration: TacticalMapGenerationHints = {
  generationTags: ["template", "v9-5-1", "seed-ready"],
  allowedRegions: ["skin"],
  difficultyRange: [1, 4],
  templateWeight: 1,
  randomizableSlots: [
    "combatSites",
    "diapedesisPoints",
    "lymphaticExits",
    "vesselBranches",
    "obstacles",
  ],
  optionalCombatSites: [],
  optionalVesselBranches: [],
  optionalLymphExits: [],
  seedVariationHints: [
    "V9.5.2 may shift combat sites inside tissue zones.",
    "V9.5.2 may enable or disable optional vessel branches.",
  ],
  possibleCombatSitePositions: [],
  possibleEntryPointPositions: [],
  possibleLymphExitPositions: [],
  possibleSpawnZonePositions: [],
  possibleObstaclePositions: [],
};

export const tacticalMapDefinitions: Record<TacticalMapId, TacticalMapDefinition> = {
  skin_small_wound_fixed: expandTacticalMap({
    id: "skin_small_wound_fixed",
    name: "Plaie cutanee locale",
    description: "Carte de campagne simple avec une entree vasculaire et un foyer bacterien.",
    modeCompatibility: ["campaign"],
    regionType: "skin",
    recommendedThreats: ["bacterial", "wound"],
    width: 1500,
    height: 820,
    worldWidth: 1500,
    worldHeight: 820,
    cameraBounds: { x: 0, y: 0, width: 1500, height: 820 },
    recommendedViewportScale: 1,
    mapSizeCategory: "small",
    siteSpacing: 260,
    minDistanceBetweenCombatSites: 260,
    minDistanceEntryToMainSite: 320,
    minDistanceLymphExitToEntry: 300,
    minDistanceSiteToMapEdge: 120,
    minDistanceSpawnToEntry: 260,
    backgroundType: "skin",
    tissueZones: [
      zone("skin-pocket-core", "Poche de tissu exposee", 420, 410, 240, "infected", ["wound"]),
      zone("skin-pocket-left", "Tissu sain lateral", 230, 440, 170, "fragile", ["safe"]),
    ],
    vesselPaths: [
      vessel("skin-capillary-main", "Capillaire de plaie", [
        { x: 140, y: 380 },
        { x: 310, y: 350 },
        { x: 520, y: 390 },
        { x: 720, y: 360 },
      ], 24, ["vessel-entry-left", "diapedesis-upper"]),
    ],
    diapedesisPoints: [
      entry("skin-entry-main", "Diapedese plaie", 185, 384, "skin-capillary-main", ["macrophage", "neutrophil"], true),
      entry("skin-entry-upper", "Diapedese haute", 255, 265, "skin-capillary-main", ["neutrophil", "nkCell", "cytotoxicT"]),
    ],
    reinforcementEntryPoints: [
      entry("skin-entry-main", "Diapedese plaie", 185, 384, "skin-capillary-main", ["macrophage", "neutrophil"], true),
    ],
    lymphaticExits: [
      lymph("skin-lymph-exit", "Sortie lymphatique locale", 350, 675, "skinNode"),
    ],
    combatSites: [
      combatSite("skin-site-wound", "Foyer bacterien", 790, 405, 112, ["cocciRapid", "proliferatingBacillus"], ["macrophage"]),
    ],
    pathogenSpawnZones: [
      spawnZone("skin-spawn-wound", "skin-site-wound", 1320, 400, 120, ["bacterium"], ["rapid"]),
    ],
    civilianCellZones: [
      civilianZone("skin-cells-core", 440, 405, 250, 0.7, "skin-pocket-core", ["skin"]),
    ],
    corridors: [
      corridor("skin-corridor-entry", "Route plaie", "skin-pocket-left", "skin-pocket-core", [
        { x: 185, y: 384 },
        { x: 430, y: 405 },
        { x: 790, y: 405 },
      ], 70, 0.35),
    ],
    chokePoints: [
      choke("skin-choke-vessel-bend", 520, 390, 42, "skin-corridor-entry", 0.3),
    ],
    obstacles: [
      obstacle("skin-dense-margin", "Tissu dense de bordure", 610, 560, 95, "denseTissue"),
    ],
    dangerZones: [],
    safeZones: [zone("skin-safe-left", "Repli cutane", 210, 420, 100, "healthy", ["safe"])],
    objectiveZones: [zone("skin-objective-wound", "Nettoyer la plaie", 790, 405, 125, "infected", ["objective"])],
    visual: campaignSkinVisual,
    generation: {
      ...v952BaseGeneration,
      possibleCombatSitePositions: [{ x: 790, y: 405 }, { x: 880, y: 330 }],
      possibleEntryPointPositions: [{ x: 185, y: 384 }, { x: 255, y: 265 }],
      possibleLymphExitPositions: [{ x: 350, y: 675 }],
      possibleSpawnZonePositions: [{ x: 1320, y: 400 }],
      possibleObstaclePositions: [{ x: 610, y: 560 }],
    },
  }, getTemplateSize("skin_small_wound_fixed")),
  skin_multi_wound_template: expandTacticalMap({
    id: "skin_multi_wound_template",
    name: "Peau multi-fronts",
    description: "Template cutane avec plusieurs foyers, poches de tissu et sorties lymphatiques.",
    modeCompatibility: ["campaign", "bodyBattle"],
    regionType: "skin",
    recommendedThreats: ["bacterial", "fungal", "opportunist"],
    width: 1500,
    height: 820,
    worldWidth: 1500,
    worldHeight: 820,
    cameraBounds: { x: 0, y: 0, width: 1500, height: 820 },
    recommendedViewportScale: 0.92,
    mapSizeCategory: "medium",
    siteSpacing: 480,
    minDistanceBetweenCombatSites: 440,
    minDistanceEntryToMainSite: 390,
    minDistanceLymphExitToEntry: 430,
    minDistanceSiteToMapEdge: 150,
    minDistanceSpawnToEntry: 300,
    backgroundType: "skin",
    tissueZones: [
      zone("skin-multi-alpha", "Poche alpha", 360, 300, 170, "infected", ["front"]),
      zone("skin-multi-bravo", "Poche bravo", 860, 420, 220, "fragile", ["front"]),
      zone("skin-multi-charlie", "Poche charlie", 520, 620, 150, "inflamed", ["front"]),
    ],
    vesselPaths: [
      vessel("skin-multi-vessel-a", "Vaisseau superficiel", [
        { x: 90, y: 350 },
        { x: 300, y: 330 },
        { x: 520, y: 380 },
        { x: 760, y: 330 },
        { x: 1040, y: 390 },
      ], 26, ["skin-entry-west", "skin-entry-east"]),
      vessel("skin-multi-vessel-b", "Branche profonde", [
        { x: 280, y: 690 },
        { x: 560, y: 610 },
        { x: 830, y: 520 },
        { x: 1180, y: 610 },
      ], 20, ["skin-entry-east"]),
    ],
    diapedesisPoints: [
      entry("skin-entry-west", "Entree peau ouest", 180, 355, "skin-multi-vessel-a", ["macrophage", "neutrophil"], true),
      entry("skin-entry-east", "Entree peau est", 1180, 610, "skin-multi-vessel-b", ["neutrophil", "dendriticCell", "nkCell"]),
    ],
    reinforcementEntryPoints: [
      entry("skin-entry-west", "Entree peau ouest", 180, 355, "skin-multi-vessel-a", ["macrophage", "neutrophil"], true),
      entry("skin-entry-east", "Entree peau est", 1180, 610, "skin-multi-vessel-b", ["neutrophil", "dendriticCell", "nkCell"]),
    ],
    lymphaticExits: [
      lymph("skin-lymph-west", "Sortie lymphe ouest", 310, 685, "skinNode"),
      lymph("skin-lymph-north", "Sortie lymphe haute", 1040, 155, "skinNode"),
    ],
    combatSites: [
      combatSite("skin-alpha", "Plaie alpha", 390, 310, 118, ["cocciRapid", "proliferatingBacillus"], ["macrophage"]),
      combatSite("skin-bravo", "Biofilm bravo", 895, 430, 136, ["biofilmColony", "resistantBacterium"], ["macrophage", "neutrophil"]),
      combatSite("skin-charlie", "Inflammation charlie", 545, 620, 110, ["opportunistBacterium", "fungalSpore"], ["dendriticCell"]),
    ],
    pathogenSpawnZones: [
      spawnZone("skin-alpha-spawn", "skin-alpha", 390, 310, 76, ["bacterium"], ["rapid"]),
      spawnZone("skin-bravo-spawn", "skin-bravo", 895, 430, 88, ["bacterium"], ["biofilm"]),
      spawnZone("skin-charlie-spawn", "skin-charlie", 545, 620, 74, ["fungus", "opportunist"], ["flare"]),
    ],
    civilianCellZones: [
      civilianZone("skin-alpha-cells", 360, 300, 180, 0.75, "skin-multi-alpha", ["skin"]),
      civilianZone("skin-bravo-cells", 860, 420, 230, 0.62, "skin-multi-bravo", ["skin"]),
    ],
    corridors: [
      corridor("skin-route-alpha-bravo", "Corridor alpha-bravo", "skin-multi-alpha", "skin-multi-bravo", [
        { x: 390, y: 310 },
        { x: 560, y: 390 },
        { x: 895, y: 430 },
      ], 82, 0.45),
      corridor("skin-route-bravo-charlie", "Corridor bravo-charlie", "skin-multi-bravo", "skin-multi-charlie", [
        { x: 895, y: 430 },
        { x: 700, y: 540 },
        { x: 545, y: 620 },
      ], 70, 0.55),
    ],
    chokePoints: [
      choke("skin-choke-center", 650, 480, 38, "skin-route-alpha-bravo", 0.62),
    ],
    obstacles: [
      obstacle("skin-membrane-island", "Amas cellulaire", 700, 290, 86, "cellCluster"),
      obstacle("skin-dense-south", "Tissu dense sud", 760, 650, 100, "slow"),
    ],
    dangerZones: [zone("skin-danger-bravo", "Biofilm actif", 895, 430, 145, "infected", ["biofilm"])],
    safeZones: [zone("skin-safe-entry", "Zone de renfort", 190, 355, 90, "healthy", ["entry"])],
    objectiveZones: [zone("skin-objective-all", "Micro-fronts cutanes", 700, 445, 470, "infected", ["multi-front"])],
    visual: campaignSkinVisual,
    generation: {
      ...v952BaseGeneration,
      allowedRegions: ["skin"],
      difficultyRange: [2, 6],
      optionalCombatSites: [{ x: 1040, y: 250 }],
      optionalVesselBranches: [[{ x: 600, y: 180 }, { x: 850, y: 280 }, { x: 1120, y: 250 }]],
      optionalLymphExits: [{ x: 1210, y: 690 }],
      possibleCombatSitePositions: [{ x: 390, y: 310 }, { x: 895, y: 430 }, { x: 545, y: 620 }, { x: 1040, y: 250 }],
      possibleEntryPointPositions: [{ x: 180, y: 355 }, { x: 1180, y: 610 }, { x: 480, y: 170 }],
      possibleLymphExitPositions: [{ x: 310, y: 685 }, { x: 1040, y: 155 }, { x: 1210, y: 690 }],
      possibleSpawnZonePositions: [{ x: 390, y: 310 }, { x: 895, y: 430 }, { x: 545, y: 620 }],
      possibleObstaclePositions: [{ x: 700, y: 290 }, { x: 760, y: 650 }],
    },
  }, getTemplateSize("skin_multi_wound_template")),
  lung_branching_vessels_template: createAdvancedTemplate(
    "lung_branching_vessels_template",
    "Poumons ramifies",
    "lungs",
    "lung",
    ["campaign", "bodyBattle"],
    ["viral", "cells"],
    [
      combatSite("lung-alpha", "Foyer viral haut", 430, 280, 120, ["respiratoryVirus", "cytolyticVirus"], ["nkCell"]),
      combatSite("lung-bravo", "Foyer viral bas", 910, 500, 140, ["latentVirus", "immuneEvasiveVirus"], ["nkCell", "cytotoxicT"]),
      combatSite("lung-charlie", "Cellules infectees", 680, 390, 105, ["respiratoryVirus"], ["dendriticCell"]),
    ],
    [
      entry("lung-entry-a", "Diapedese alveolaire A", 220, 190, "lung-vessel-a", ["macrophage", "dendriticCell"], true),
      entry("lung-entry-b", "Flux NK/T", 1160, 300, "lung-vessel-a", ["nkCell", "cytotoxicT", "neutrophil"]),
    ],
    [
      lymph("lung-lymph-drain", "Drainage thoracique", 1250, 645, "thoracicNode"),
      lymph("lung-lymph-upper", "Sortie lymphatique haute", 520, 680, "thoracicNode"),
    ],
    "bluish-green lung tissue, many civilian cells, viral fronts",
  ),
  intestine_clustered_sites_template: createAdvancedTemplate(
    "intestine_clustered_sites_template",
    "Intestin a foyers groupes",
    "intestine",
    "intestine",
    ["bodyBattle", "campaign"],
    ["bacterial", "fungal", "parasite"],
    [
      combatSite("gut-alpha", "Cluster bacillaire", 350, 455, 135, ["proliferatingBacillus", "toxicBacterium"], ["neutrophil"]),
      combatSite("gut-bravo", "Couloir inflammatoire", 780, 330, 110, ["resistantBacterium", "opportunistBacterium"], ["macrophage"]),
      combatSite("gut-charlie", "Foyer parasite", 1040, 560, 150, ["parasiteHelminth", "migratoryLarva"], ["plasmocyte"]),
    ],
    [
      entry("gut-entry-a", "Diapedese muqueuse", 180, 595, "gut-vessel-a", ["macrophage", "neutrophil"], true),
      entry("gut-entry-b", "Renfort profond", 1180, 250, "gut-vessel-a", ["dendriticCell", "neutrophil"]),
    ],
    [lymph("gut-lymph-exit", "Drainage intestinal", 710, 700, "gutNode")],
    "sinuous intestine corridors, dense clusters and narrow paths",
  ),
  blood_vessel_crossroads_template: createAdvancedTemplate(
    "blood_vessel_crossroads_template",
    "Carrefour sanguin",
    "blood",
    "blood",
    ["bodyBattle"],
    ["mixed", "fast-spread"],
    [
      combatSite("blood-alpha", "Nid circulant", 450, 320, 115, ["cocciRapid", "respiratoryVirus"], ["macrophage", "nkCell"]),
      combatSite("blood-bravo", "Carrefour mixte", 820, 420, 155, ["proliferatingBacillus", "reactivatedLatentVirus"], ["neutrophil"]),
      combatSite("blood-charlie", "Alerte systemique", 1100, 580, 118, ["bloodProtozoan", "secondaryBacterium"], ["cytotoxicT"]),
    ],
    [
      entry("blood-entry-a", "Flux macrophage", 160, 330, "blood-vessel-a", ["macrophage"], true),
      entry("blood-entry-b", "Flux neutrophile", 760, 170, "blood-vessel-b", ["neutrophil", "nkCell"]),
      entry("blood-entry-c", "Flux adaptatif", 1280, 610, "blood-vessel-a", ["plasmocyte", "cytotoxicT"]),
    ],
    [
      lymph("blood-lymph-a", "Sortie lymphe gauche", 240, 675, "bloodNode"),
      lymph("blood-lymph-b", "Sortie lymphe droite", 1220, 250, "bloodNode"),
    ],
    "dominant vascular crossroads, open but dangerous propagation routes",
  ),
  lymph_node_signal_template: createAdvancedTemplate(
    "lymph_node_signal_template",
    "Relais lymphatique local",
    "lymphNodes",
    "lymph",
    ["campaign", "bodyBattle"],
    ["antigen", "signal"],
    [
      combatSite("lymph-alpha", "Front signal alpha", 410, 330, 100, ["cocciRapid", "respiratoryVirus"], ["dendriticCell"]),
      combatSite("lymph-bravo", "Relais contamine", 830, 460, 125, ["proliferatingBacillus", "respiratoryVirus"], ["dendriticCell", "plasmocyte"]),
    ],
    [
      entry("lymph-entry-a", "Canal dendritique", 330, 500, "lymph-vessel-a", ["macrophage", "dendriticCell"], true),
      entry("lymph-entry-b", "Renfort immune", 990, 360, "lymph-vessel-a", ["macrophage", "plasmocyte", "nkCell"]),
    ],
    [
      lymph("lymph-exit-core", "Ganglion local", 690, 650, "bloodNode"),
      lymph("lymph-exit-upper", "Sortie signal haute", 720, 190, "bloodNode"),
    ],
    "purple lymph signal map with many exits and dendritic routes",
  ),
  infinite_large_tissue_template: createInfiniteTemplate(),
};

export function getTacticalMapDefinition(id?: TacticalMapId): TacticalMapDefinition {
  return tacticalMapDefinitions[id ?? "skin_small_wound_fixed"];
}

export function getTacticalMapForMissionMap(map: TacticalMapSource): TacticalMapDefinition {
  if ("combatSites" in map) {
    return map;
  }

  return getTacticalMapDefinition(map.tacticalMapId);
}

export function getEntryPointForUnitFromTacticalMap(
  map: TacticalMapSource,
  unitTypeId: UnitTypeId,
  preferredPosition?: MapPoint | null,
): MapPoint | null {
  const tacticalMap = getTacticalMapForMissionMap(map);
  const candidates = [
    ...tacticalMap.reinforcementEntryPoints,
    ...tacticalMap.diapedesisPoints,
  ];
  const allowed = candidates
    .filter((point) => !point.allowedUnitTypes || point.allowedUnitTypes.includes(unitTypeId))
    .sort((a, b) => {
      if (preferredPosition) {
        return (
          pointDistance(a.position, preferredPosition) -
            pointDistance(b.position, preferredPosition) ||
          Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) ||
          b.priority - a.priority
        );
      }

      return Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || b.priority - a.priority;
    });

  return allowed[0]?.position ?? tacticalMap.diapedesisPoints[0]?.position ?? null;
}

function pointDistance(a: MapPoint, b: MapPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function getLymphExitForMissionMap(map: TacticalMapSource): MapPoint | null {
  const tacticalMap = getTacticalMapForMissionMap(map);
  const exit = tacticalMap.lymphaticExits.find((candidate) => candidate.acceptsSignals);

  return exit?.position ?? tacticalMap.lymphaticExits[0]?.position ?? null;
}

export function getTissueCellPositionsForMissionMap(map: TacticalMapSource): MapPoint[] {
  const tacticalMap = getTacticalMapForMissionMap(map);
  const positions: MapPoint[] = [];

  for (const zoneDefinition of tacticalMap.civilianCellZones) {
    const count = Math.max(4, Math.round(4 + zoneDefinition.density * 6));

    for (let index = 0; index < count; index += 1) {
      const angle = ((index * 137 + zoneDefinition.id.length * 19) % 360) * (Math.PI / 180);
      const ring = 0.18 + ((index % 4) / 4) * 0.62;

      positions.push({
        x: Math.round(zoneDefinition.position.x + Math.cos(angle) * zoneDefinition.radius * ring),
        y: Math.round(zoneDefinition.position.y + Math.sin(angle) * zoneDefinition.radius * ring),
      });
    }
  }

  return positions;
}

export function getPathogenSpawnPositionForWave(
  map: TacticalMapSource,
  pathogenTypeId: PathogenTypeId,
  waveIndex: number,
  spawnNumber: number,
  maxActiveCombatSites = Number.POSITIVE_INFINITY,
): MapPoint | null {
  const tacticalMap = getTacticalMapForMissionMap(map);
  const pathogenFamily = getSpawnFamily(pathogenDefinitions[pathogenTypeId].pathogenClass);
  const activeCombatSiteIds = new Set(
    tacticalMap.combatSites
      .slice(0, Math.max(1, Math.min(tacticalMap.combatSites.length, maxActiveCombatSites)))
      .map((site) => site.id),
  );
  const matchingZones = tacticalMap.pathogenSpawnZones.filter((zone) =>
    activeCombatSiteIds.has(zone.combatSiteId) &&
    (zone.pathogenFamilies.includes(pathogenFamily) ||
      zone.pathogenFamilies.includes("mixed") ||
      zone.pathogenSubtypes.includes(pathogenTypeId)),
  );
  const activeZones = tacticalMap.pathogenSpawnZones.filter((zone) =>
    activeCombatSiteIds.has(zone.combatSiteId),
  );
  const zones = matchingZones.length
    ? matchingZones
    : activeZones.length
      ? activeZones
      : tacticalMap.pathogenSpawnZones;
  const spawnZone = zones[waveIndex % Math.max(1, zones.length)];

  if (!spawnZone) {
    return null;
  }

  const angle = ((spawnNumber * 137 + waveIndex * 61) % 360) * (Math.PI / 180);
  const radius =
    pathogenFamily === "virus"
      ? spawnZone.radius * 1.45
      : Math.min(spawnZone.radius * 0.72, 24 + (spawnNumber % 5) * 12);

  return {
    x: spawnZone.position.x + Math.cos(angle) * radius,
    y: spawnZone.position.y + Math.sin(angle) * radius,
  };
}

function getSpawnFamily(
  pathogenClass: (typeof pathogenDefinitions)[PathogenTypeId]["pathogenClass"],
): PathogenSpawnZoneDefinition["pathogenFamilies"][number] {
  if (pathogenClass === "cancerCell") {
    return "cancer";
  }

  return pathogenClass;
}

function createAdvancedTemplate(
  id: TacticalMapId,
  name: string,
  regionType: TacticalRegionType,
  backgroundType: TacticalMapDefinition["backgroundType"],
  modeCompatibility: TacticalMapMode[],
  recommendedThreats: string[],
  combatSites: CombatSiteDefinition[],
  entries: DiapedesisPointDefinition[],
  exits: LymphaticExitDefinition[],
  themeHint: string,
): TacticalMapDefinition {
  const firstSite = combatSites[0];
  const secondSite = combatSites[1] ?? firstSite;
  const thirdSite = combatSites[2] ?? secondSite;

  return expandTacticalMap({
    id,
    name,
    description: `${name} prepare une carte biologique avec micro-fronts, vaisseaux et routes lymphatiques.`,
    modeCompatibility,
    regionType,
    recommendedThreats,
    width: 1500,
    height: 820,
    worldWidth: 1500,
    worldHeight: 820,
    cameraBounds: { x: 0, y: 0, width: 1500, height: 820 },
    recommendedViewportScale: id === "infinite_large_tissue_template" ? 0.78 : 0.9,
    mapSizeCategory: id === "infinite_large_tissue_template" ? "huge" : "large",
    siteSpacing: id === "infinite_large_tissue_template" ? 820 : 560,
    minDistanceBetweenCombatSites: id === "infinite_large_tissue_template" ? 760 : 480,
    minDistanceEntryToMainSite: id === "infinite_large_tissue_template" ? 520 : 420,
    minDistanceLymphExitToEntry: id === "infinite_large_tissue_template" ? 620 : 460,
    minDistanceSiteToMapEdge: id === "infinite_large_tissue_template" ? 260 : 170,
    minDistanceSpawnToEntry: id === "infinite_large_tissue_template" ? 420 : 320,
    backgroundType,
    tissueZones: [
      zone(`${id}-zone-alpha`, "Poche alpha", firstSite.position.x, firstSite.position.y, firstSite.radius + 90, "infected", ["front"]),
      zone(`${id}-zone-bravo`, "Poche bravo", secondSite.position.x, secondSite.position.y, secondSite.radius + 90, "fragile", ["front"]),
      zone(`${id}-zone-charlie`, "Poche charlie", thirdSite.position.x, thirdSite.position.y, thirdSite.radius + 70, "inflamed", ["front"]),
    ],
    vesselPaths: [
      vessel(`${regionType}-vessel-a`, "Reseau principal", [
        { x: 100, y: 300 },
        { x: 320, y: 240 },
        { x: 560, y: 360 },
        { x: 820, y: 300 },
        { x: 1120, y: 390 },
        { x: 1370, y: 330 },
      ], 28, entries.map((entryPoint) => entryPoint.id)),
      vessel(`${regionType}-vessel-b`, "Branche basse", [
        { x: 180, y: 690 },
        { x: 420, y: 585 },
        { x: 700, y: 650 },
        { x: 1000, y: 540 },
        { x: 1320, y: 650 },
      ], 22, entries.map((entryPoint) => entryPoint.id)),
    ],
    diapedesisPoints: entries,
    reinforcementEntryPoints: entries,
    lymphaticExits: exits,
    combatSites,
    pathogenSpawnZones: combatSites.map((site, index) =>
      spawnZone(`${site.id}-spawn`, site.id, site.position.x, site.position.y, Math.max(62, site.radius * 0.58), ["mixed"], [`site-${index + 1}`]),
    ),
    civilianCellZones: combatSites.map((site) =>
      civilianZone(`${site.id}-cells`, site.position.x, site.position.y, site.radius + 100, 0.7, `${id}-zone-alpha`, ["civilian"]),
    ),
    corridors: [
      corridor(`${id}-route-a`, "Route principale", firstSite.id, secondSite.id, [
        firstSite.position,
        { x: (firstSite.position.x + secondSite.position.x) / 2, y: (firstSite.position.y + secondSite.position.y) / 2 + 70 },
        secondSite.position,
      ], 72, 0.5),
      corridor(`${id}-route-b`, "Route secondaire", secondSite.id, thirdSite.id, [
        secondSite.position,
        { x: (secondSite.position.x + thirdSite.position.x) / 2, y: (secondSite.position.y + thirdSite.position.y) / 2 - 60 },
        thirdSite.position,
      ], 62, 0.6),
    ],
    chokePoints: [
      choke(`${id}-choke-a`, 650, 430, 40, `${id}-route-a`, 0.65),
      choke(`${id}-choke-b`, 930, 540, 36, `${id}-route-b`, 0.55),
    ],
    obstacles: [
      obstacle(`${id}-dense-a`, "Tissu dense", 580, 520, 95, "denseTissue"),
      obstacle(`${id}-slow-b`, "Membrane locale", 1010, 260, 74, "membrane"),
    ],
    dangerZones: combatSites.map((site) =>
      zone(`${site.id}-danger`, `${site.name} actif`, site.position.x, site.position.y, site.radius + 20, "infected", ["danger"]),
    ),
    safeZones: entries.map((entryPoint) =>
      zone(`${entryPoint.id}-safe`, entryPoint.name, entryPoint.position.x, entryPoint.position.y, entryPoint.spawnRadius + 46, "healthy", ["entry"]),
    ),
    objectiveZones: combatSites.map((site) =>
      zone(`${site.id}-objective`, site.name, site.position.x, site.position.y, site.radius + 12, "infected", ["objective"]),
    ),
    visual: {
      ...campaignSkinVisual,
      visualThemeHint: themeHint,
      backgroundHint: `${backgroundType} tactical biological placeholder`,
    },
    generation: {
      ...v952BaseGeneration,
      allowedRegions: [regionType],
      difficultyRange: modeCompatibility.includes("infinite") ? [4, 10] : [2, 7],
      templateWeight: 1,
      possibleCombatSitePositions: combatSites.map((site) => site.position),
      possibleEntryPointPositions: entries.map((entryPoint) => entryPoint.position),
      possibleLymphExitPositions: exits.map((exit) => exit.position),
      possibleSpawnZonePositions: combatSites.map((site) => site.position),
      possibleObstaclePositions: [{ x: 580, y: 520 }, { x: 1010, y: 260 }],
    },
  }, getTemplateSize(id));
}

function createInfiniteTemplate(): TacticalMapDefinition {
  return createAdvancedTemplate(
    "infinite_large_tissue_template",
    "Grande carte de survie",
    "mixed",
    "mixed",
    ["infinite"],
    ["mixed", "late-game", "multi-front"],
    [
      combatSite("inf-alpha", "Site alpha", 340, 245, 130, ["cocciRapid", "biofilmColony"], ["macrophage"]),
      combatSite("inf-bravo", "Site bravo", 925, 240, 128, ["toxicBacterium", "fungalSpore"], ["neutrophil"]),
      combatSite("inf-charlie", "Site charlie", 720, 455, 145, ["biofilmColony", "parasiteHelminth"], ["plasmocyte"]),
      combatSite("inf-delta", "Site delta", 360, 630, 118, ["sporeMold", "opportunistBacterium"], ["dendriticCell"]),
      combatSite("inf-echo", "Site echo", 1120, 610, 125, ["respiratoryVirus", "reactivatedLatentVirus"], ["nkCell", "cytotoxicT"]),
    ],
    [
      entry("inf-entry-a", "Entree neutrophile", 500, 105, "mixed-vessel-a", ["neutrophil", "nkCell"], true),
      entry("inf-entry-b", "Flux monocyte", 1280, 340, "mixed-vessel-a", ["macrophage", "plasmocyte"]),
      entry("inf-entry-c", "Porte macrophage", 500, 720, "mixed-vessel-b", ["macrophage", "dendriticCell"]),
      entry("inf-entry-d", "Canal dendritique", 1150, 720, "mixed-vessel-b", ["dendriticCell", "cytotoxicT"]),
    ],
    [
      lymph("inf-lymph-a", "Sortie lymphatique 1", 130, 355, "bloodNode"),
      lymph("inf-lymph-b", "Sortie lymphatique 2", 720, 740, "bloodNode"),
      lymph("inf-lymph-c", "Sortie lymphatique 3", 1320, 560, "bloodNode"),
    ],
    "large late-game map with five war zones, multiple entries and lymph exits",
  );
}

type TacticalMapSizeConfig = {
  worldWidth: number;
  worldHeight: number;
  mapSizeCategory: TacticalMapSizeCategory;
  recommendedViewportScale: number;
};

function getTemplateSize(id: TacticalMapId): TacticalMapSizeConfig {
  if (id === "skin_small_wound_fixed") {
    return {
      worldWidth: 1800,
      worldHeight: 1100,
      mapSizeCategory: "small",
      recommendedViewportScale: 1,
    };
  }

  if (id === "infinite_large_tissue_template") {
    return {
      worldWidth: 4800,
      worldHeight: 2800,
      mapSizeCategory: "huge",
      recommendedViewportScale: 0.78,
    };
  }

  if (id === "skin_multi_wound_template") {
    return {
      worldWidth: 2600,
      worldHeight: 1600,
      mapSizeCategory: "medium",
      recommendedViewportScale: 0.92,
    };
  }

  return {
    worldWidth: 3600,
    worldHeight: 2200,
    mapSizeCategory: "large",
    recommendedViewportScale: 0.88,
  };
}

function expandTacticalMap(
  template: TacticalMapDefinition,
  size: TacticalMapSizeConfig,
): TacticalMapDefinition {
  const scaleX = size.worldWidth / template.width;
  const scaleY = size.worldHeight / template.height;
  const radiusScale = Math.min(1.55, Math.sqrt(scaleX * scaleY));
  const widthScale = Math.min(1.7, Math.sqrt(scaleX * scaleY));
  const scalePoint = (point: MapPoint): MapPoint => ({
    x: Math.round(point.x * scaleX),
    y: Math.round(point.y * scaleY),
  });
  const scaleShape = (shape: TacticalShape): TacticalShape => {
    if (shape.kind === "circle") {
      return {
        kind: "circle",
        position: scalePoint(shape.position),
        radius: Math.round(shape.radius * radiusScale),
      };
    }

    return {
      kind: "polygon",
      points: shape.points.map(scalePoint),
    };
  };

  return {
    ...template,
    width: size.worldWidth,
    height: size.worldHeight,
    worldWidth: size.worldWidth,
    worldHeight: size.worldHeight,
    cameraBounds: {
      x: 0,
      y: 0,
      width: size.worldWidth,
      height: size.worldHeight,
    },
    recommendedViewportScale: size.recommendedViewportScale,
    mapSizeCategory: size.mapSizeCategory,
    siteSpacing: Math.round(template.siteSpacing * Math.max(scaleX, scaleY)),
    minDistanceBetweenCombatSites: Math.round(
      template.minDistanceBetweenCombatSites * Math.max(scaleX, scaleY),
    ),
    minDistanceEntryToMainSite: Math.round(
      template.minDistanceEntryToMainSite * Math.max(scaleX, scaleY),
    ),
    minDistanceLymphExitToEntry: Math.round(
      template.minDistanceLymphExitToEntry * Math.max(scaleX, scaleY),
    ),
    minDistanceSiteToMapEdge: Math.round(
      template.minDistanceSiteToMapEdge * Math.max(scaleX, scaleY),
    ),
    minDistanceSpawnToEntry: Math.round(
      template.minDistanceSpawnToEntry * Math.max(scaleX, scaleY),
    ),
    tissueZones: template.tissueZones.map((zoneDefinition) => ({
      ...zoneDefinition,
      shape: scaleShape(zoneDefinition.shape),
    })),
    vesselPaths: template.vesselPaths.map((vesselPath) => ({
      ...vesselPath,
      points: vesselPath.points.map(scalePoint),
      width: Math.round(vesselPath.width * widthScale),
    })),
    diapedesisPoints: template.diapedesisPoints.map((point) => ({
      ...point,
      position: scalePoint(point.position),
      spawnRadius: Math.round(point.spawnRadius * radiusScale),
    })),
    reinforcementEntryPoints: template.reinforcementEntryPoints.map((point) => ({
      ...point,
      position: scalePoint(point.position),
      spawnRadius: Math.round(point.spawnRadius * radiusScale),
    })),
    lymphaticExits: template.lymphaticExits.map((exit) => ({
      ...exit,
      position: scalePoint(exit.position),
      radius: Math.round(exit.radius * radiusScale),
    })),
    combatSites: template.combatSites.map((site) => ({
      ...site,
      position: scalePoint(site.position),
      radius: Math.round(site.radius * radiusScale),
    })),
    pathogenSpawnZones: template.pathogenSpawnZones.map((zoneDefinition) => ({
      ...zoneDefinition,
      position: scalePoint(zoneDefinition.position),
      radius: Math.round(zoneDefinition.radius * radiusScale),
    })),
    civilianCellZones: template.civilianCellZones.map((zoneDefinition) => ({
      ...zoneDefinition,
      position: scalePoint(zoneDefinition.position),
      radius: Math.round(zoneDefinition.radius * radiusScale),
    })),
    corridors: template.corridors.map((corridorDefinition) => ({
      ...corridorDefinition,
      path: corridorDefinition.path.map(scalePoint),
      width: Math.round(corridorDefinition.width * widthScale),
    })),
    chokePoints: template.chokePoints.map((chokePoint) => ({
      ...chokePoint,
      position: scalePoint(chokePoint.position),
      radius: Math.round(chokePoint.radius * radiusScale),
    })),
    obstacles: template.obstacles.map((obstacleDefinition) => ({
      ...obstacleDefinition,
      shape: scaleShape(obstacleDefinition.shape),
    })),
    dangerZones: template.dangerZones.map((zoneDefinition) => ({
      ...zoneDefinition,
      shape: scaleShape(zoneDefinition.shape),
    })),
    safeZones: template.safeZones.map((zoneDefinition) => ({
      ...zoneDefinition,
      shape: scaleShape(zoneDefinition.shape),
    })),
    objectiveZones: template.objectiveZones.map((zoneDefinition) => ({
      ...zoneDefinition,
      shape: scaleShape(zoneDefinition.shape),
    })),
    generation: {
      ...template.generation,
      optionalCombatSites: template.generation.optionalCombatSites.map(scalePoint),
      optionalVesselBranches:
        template.generation.optionalVesselBranches.map((branch) =>
          branch.map(scalePoint),
        ),
      optionalLymphExits: template.generation.optionalLymphExits.map(scalePoint),
      possibleCombatSitePositions:
        template.generation.possibleCombatSitePositions.map(scalePoint),
      possibleEntryPointPositions:
        template.generation.possibleEntryPointPositions.map(scalePoint),
      possibleLymphExitPositions:
        template.generation.possibleLymphExitPositions.map(scalePoint),
      possibleSpawnZonePositions:
        template.generation.possibleSpawnZonePositions.map(scalePoint),
      possibleObstaclePositions:
        template.generation.possibleObstaclePositions.map(scalePoint),
    },
  };
}

function zone(
  id: string,
  name: string,
  x: number,
  y: number,
  radius: number,
  status: TissueZoneDefinition["status"],
  tags: string[],
): TissueZoneDefinition {
  return {
    id,
    name,
    shape: { kind: "circle", position: { x, y }, radius },
    tissueHealth: status === "healthy" ? 100 : status === "fragile" ? 72 : 55,
    inflammationLevel: status === "inflamed" ? 65 : status === "infected" ? 45 : 12,
    status,
    tags,
  };
}

function vessel(
  id: string,
  name: string,
  points: MapPoint[],
  width: number,
  connectedEntryPointIds: string[],
): VesselPathDefinition {
  return {
    id,
    name,
    points,
    width,
    vesselType: "vesselBranch",
    flowDirection: "bidirectional",
    connectedEntryPointIds,
    tags: ["vessel", "route"],
    visualHint: "red-violet thick biological route",
  };
}

function entry(
  id: string,
  name: string,
  x: number,
  y: number,
  vesselPathId: string,
  allowedUnitTypes: UnitTypeId[],
  isDefault = false,
): DiapedesisPointDefinition {
  return {
    id,
    name,
    position: { x, y },
    vesselPathId,
    allowedUnitTypes,
    spawnRadius: 30,
    priority: isDefault ? 10 : 5,
    isDefault,
    visualHint: "blue immune entry circle",
  };
}

function lymph(
  id: string,
  name: string,
  x: number,
  y: number,
  linkedRegionalNodeId: string,
): LymphaticExitDefinition {
  return {
    id,
    name,
    position: { x, y },
    radius: 32,
    linkedRegionalNodeId,
    acceptsSignals: true,
    exitType: "lymphExit",
    visualHint: "yellow-green lymph exit",
  };
}

function combatSite(
  id: string,
  name: string,
  x: number,
  y: number,
  radius: number,
  pathogenTypes: PathogenTypeId[],
  recommendedUnitTypes: UnitTypeId[],
): CombatSiteDefinition {
  return {
    id,
    name,
    position: { x, y },
    radius,
    initialStatus: "infected",
    threatLevel: Math.max(1, Math.round(radius / 35)),
    pathogenTypes,
    preferredPathogenSubtypes: [],
    infectionLevel: 62,
    inflammationLevel: 38,
    tissueHealth: 70,
    objectives: ["clear-local-front"],
    spawnZoneIds: [`${id}-spawn`],
    recommendedUnitTypes,
    priority: Math.max(1, Math.round(radius / 40)),
    visualHint: "orange-red combat site marker",
  };
}

function spawnZone(
  id: string,
  combatSiteId: string,
  x: number,
  y: number,
  radius: number,
  pathogenFamilies: PathogenSpawnZoneDefinition["pathogenFamilies"],
  waveTags: string[],
): PathogenSpawnZoneDefinition {
  return {
    id,
    combatSiteId,
    position: { x, y },
    radius,
    pathogenFamilies,
    pathogenSubtypes: waveTags,
    spawnIntensity: 1,
    waveTags,
    maxActiveLocalEntities: 18,
  };
}

function civilianZone(
  id: string,
  x: number,
  y: number,
  radius: number,
  vulnerability: number,
  linkedTissueZoneId: string,
  tags: string[],
): CivilianCellZoneDefinition {
  return {
    id,
    position: { x, y },
    radius,
    density: 0.75,
    vulnerability,
    linkedTissueZoneId,
    tags,
  };
}

function corridor(
  id: string,
  name: string,
  fromZoneId: string,
  toZoneId: string,
  path: MapPoint[],
  width: number,
  dangerLevel: number,
): CorridorDefinition {
  return {
    id,
    name,
    fromZoneId,
    toZoneId,
    path,
    width,
    dangerLevel,
    tags: ["corridor", dangerLevel > 0.5 ? "danger" : "route"],
  };
}

function choke(
  id: string,
  x: number,
  y: number,
  radius: number,
  linkedCorridorId: string,
  riskLevel: number,
): ChokePointDefinition {
  return {
    id,
    position: { x, y },
    radius,
    linkedCorridorId,
    riskLevel,
    tags: ["choke", riskLevel > 0.5 ? "high-risk" : "medium-risk"],
  };
}

function obstacle(
  id: string,
  name: string,
  x: number,
  y: number,
  radius: number,
  obstacleType: ObstacleDefinition["obstacleType"],
): ObstacleDefinition {
  return {
    id,
    name,
    shape: { kind: "circle", position: { x, y }, radius },
    obstacleType,
    movementMultiplier: obstacleType === "slow" ? 0.62 : 0,
    tags: ["placeholder", obstacleType],
  };
}
