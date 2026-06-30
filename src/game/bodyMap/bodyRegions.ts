import type {
  BodyRegionDefinition,
  BodyRegionId,
  BodyRegionState,
  RegionalNodeDefinition,
  RegionalNodeId,
} from "./bodyMapTypes";

export const bodyRegionOrder: BodyRegionId[] = [
  "skin",
  "lungs",
  "intestine",
  "blood",
  "lymphNodes",
  "spleen",
  "boneMarrow",
  "liver",
];

export const bodyRegionDefinitions: Record<BodyRegionId, BodyRegionDefinition> = {
  skin: {
    id: "skin",
    name: "Peau",
    regionType: "barrier",
    mapPosition: { x: 18, y: 28 },
    connections: ["blood", "lymphNodes"],
    regionalNodeId: "skinNode",
    linkedMissionId: "skinBacterialSkirmish",
    preferredThreat: "bacterial",
    pedagogy:
      "La peau est une barriere. Une plaie peut laisser entrer des bacteries vers la lymphe puis le sang.",
  },
  lungs: {
    id: "lungs",
    name: "Poumons",
    regionType: "respiratory",
    mapPosition: { x: 48, y: 20 },
    connections: ["blood", "lymphNodes"],
    regionalNodeId: "thoracicNode",
    linkedMissionId: "lungViralSpread",
    preferredThreat: "viral",
    pedagogy:
      "Les poumons exposent beaucoup de cellules aux virus respiratoires. Les interferons ralentissent la propagation.",
  },
  intestine: {
    id: "intestine",
    name: "Intestin",
    regionType: "digestive",
    mapPosition: { x: 52, y: 66 },
    connections: ["blood", "lymphNodes", "liver"],
    regionalNodeId: "gutNode",
    linkedMissionId: "intestineBacillusSwarm",
    preferredThreat: "bacterial",
    pedagogy:
      "L'intestin concentre beaucoup de microbes. Le gameplay le simplifie en foyer bacterien dense.",
  },
  blood: {
    id: "blood",
    name: "Sang",
    regionType: "circulation",
    mapPosition: { x: 34, y: 47 },
    connections: ["skin", "lungs", "intestine", "spleen", "boneMarrow", "liver"],
    regionalNodeId: "bloodNode",
    linkedMissionId: "bloodMixedAlert",
    preferredThreat: "mixed",
    pedagogy:
      "Le sang transporte les cellules immunitaires, mais il peut aussi accelerer une propagation systemique.",
  },
  lymphNodes: {
    id: "lymphNodes",
    name: "Ganglions lymphatiques",
    regionType: "lymphatic",
    mapPosition: { x: 68, y: 42 },
    connections: ["skin", "lungs", "intestine", "blood", "spleen"],
    regionalNodeId: "bloodNode",
    linkedMissionId: "lymphNodeSignalResponse",
    preferredThreat: "mixed",
    pedagogy:
      "La lymphe transporte les informations antigeniques vers les ganglions regionaux.",
  },
  spleen: {
    id: "spleen",
    name: "Rate",
    regionType: "immuneOrgan",
    mapPosition: { x: 78, y: 55 },
    connections: ["blood", "lymphNodes", "liver"],
    regionalNodeId: "bloodNode",
    linkedMissionId: "spleenBloodFiltering",
    preferredThreat: "mixed",
    pedagogy:
      "La rate surveille le sang. Dans V7, elle sert surtout de relais strategique immunitaire.",
  },
  boneMarrow: {
    id: "boneMarrow",
    name: "Moelle osseuse",
    regionType: "production",
    mapPosition: { x: 22, y: 76 },
    connections: ["blood"],
    regionalNodeId: "bloodNode",
    linkedMissionId: "boneMarrowReinforcementPressure",
    preferredThreat: "none",
    pedagogy:
      "La moelle osseuse produit des cellules immunitaires. Si elle reste saine, les renforts restent accessibles.",
  },
  liver: {
    id: "liver",
    name: "Foie",
    regionType: "metabolic",
    mapPosition: { x: 72, y: 75 },
    connections: ["blood", "intestine", "spleen"],
    regionalNodeId: "bloodNode",
    linkedMissionId: "bloodMixedAlert",
    preferredThreat: "mixed",
    pedagogy:
      "Le foie est une zone de stabilisation simplifiee. Une infection systemique le met sous pression.",
  },
};

export const regionalNodeDefinitions: Record<
  RegionalNodeId,
  RegionalNodeDefinition
> = {
  skinNode: {
    id: "skinNode",
    name: "Ganglion peau",
    associatedRegionIds: ["skin"],
    description:
      "Recoit les signaux venus des tissus cutanes et accelere legerement l'analyse locale.",
  },
  thoracicNode: {
    id: "thoracicNode",
    name: "Ganglion thoracique",
    associatedRegionIds: ["lungs"],
    description:
      "Coordonne les signaux respiratoires et aide les reponses antivirales locales.",
  },
  gutNode: {
    id: "gutNode",
    name: "Ganglion intestinal",
    associatedRegionIds: ["intestine"],
    description:
      "Filtre les signaux digestifs et prepare une reponse adaptee aux foyers bacteriens.",
  },
  bloodNode: {
    id: "bloodNode",
    name: "Rate / relais systemique",
    associatedRegionIds: ["blood", "lymphNodes", "spleen", "boneMarrow", "liver"],
    description:
      "Relais strategique global pour les menaces circulantes et les signaux antigeniques.",
  },
};

export const initialBodyRegions: Record<BodyRegionId, BodyRegionState> = {
  skin: {
    id: "skin",
    status: "infected",
    localHealth: 78,
    infection: 58,
    inflammation: 34,
    threat: "bacterial",
    pathogens: ["cocciRapid", "proliferatingBacillus"],
    assignedReinforcements: { macrophage: 1 },
  },
  lungs: {
    id: "lungs",
    status: "alert",
    localHealth: 84,
    infection: 32,
    inflammation: 22,
    threat: "viral",
    pathogens: ["respiratoryVirus"],
    assignedReinforcements: {},
  },
  intestine: {
    id: "intestine",
    status: "alert",
    localHealth: 86,
    infection: 28,
    inflammation: 26,
    threat: "bacterial",
    pathogens: ["proliferatingBacillus", "resistantBacterium"],
    assignedReinforcements: {},
  },
  blood: {
    id: "blood",
    status: "healthy",
    localHealth: 92,
    infection: 12,
    inflammation: 14,
    threat: "none",
    pathogens: [],
    assignedReinforcements: {},
  },
  lymphNodes: {
    id: "lymphNodes",
    status: "controlled",
    localHealth: 90,
    infection: 8,
    inflammation: 18,
    threat: "none",
    pathogens: [],
    assignedReinforcements: {},
  },
  spleen: {
    id: "spleen",
    status: "healthy",
    localHealth: 94,
    infection: 5,
    inflammation: 12,
    threat: "none",
    pathogens: [],
    assignedReinforcements: {},
  },
  boneMarrow: {
    id: "boneMarrow",
    status: "healthy",
    localHealth: 96,
    infection: 2,
    inflammation: 8,
    threat: "none",
    pathogens: [],
    assignedReinforcements: {},
  },
  liver: {
    id: "liver",
    status: "healthy",
    localHealth: 92,
    infection: 6,
    inflammation: 12,
    threat: "none",
    pathogens: [],
    assignedReinforcements: {},
  },
};
