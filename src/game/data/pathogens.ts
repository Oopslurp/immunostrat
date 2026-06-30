import type { ImmuneUnitKind } from "../types/immune";

export type PathogenShape = "coccus" | "bacillus" | "rod" | "cluster" | "spore" | "virus";
export type PathogenSpecialBehavior =
  | "swarm"
  | "proliferator"
  | "resistant"
  | "biofilmSource"
  | "toxic"
  | "viral";

export type PathogenTypeId =
  | "cocciRapid"
  | "proliferatingBacillus"
  | "resistantBacterium"
  | "biofilmColony"
  | "toxicBacterium"
  | "respiratoryVirus"
  | "basicBacterium"
  | "toughBacterium";

export type PathogenSpawnDefinition = {
  childTypeId: string;
  intervalMs: number;
  initialDelayMs: number;
  maxChildren: number;
  spawnRadius: number;
};

export type PathogenBiofilmDefinition = {
  radius: number;
  damageTakenMultiplier: number;
  immuneSlowMultiplier: number;
  inflammationPerSecond: number;
};

export type PathogenDefinition = {
  id: string;
  pathogenClass: "bacterium" | "virus";
  displayName: string;
  scientificHint: string;
  description: string;
  family: string;
  archetype: string;
  antigenProfileId: string;
  maxHealth: number;
  radius: number;
  movementSpeed: number;
  tissueDamage: number;
  tissueAttackRange: number;
  attackCooldownMs: number;
  armor: number;
  debrisDropChance: number;
  antigenValue: number;
  inflammationPressureMultiplier: number;
  targetPriority: number;
  color: number;
  outlineColor: number;
  shape: PathogenShape;
  shortLabel: string;
  damageMultipliers: Partial<Record<ImmuneUnitKind, number>>;
  specialBehavior?: PathogenSpecialBehavior;
  spawn?: PathogenSpawnDefinition;
  biofilm?: PathogenBiofilmDefinition;
};

export const pathogenDefinitions: Record<PathogenTypeId, PathogenDefinition> = {
  cocciRapid: {
    id: "cocciRapid",
    pathogenClass: "bacterium",
    displayName: "Cocci rapides",
    scientificHint: "Staph/Strep-like",
    description: "Petites bacteries de swarm, faibles mais dangereuses en groupe.",
    family: "cocci",
    archetype: "swarm",
    antigenProfileId: "gramPositiveCocci",
    maxHealth: 22,
    radius: 10,
    movementSpeed: 82,
    tissueDamage: 4,
    tissueAttackRange: 34,
    attackCooldownMs: 820,
    armor: 0,
    debrisDropChance: 0.85,
    antigenValue: 4,
    inflammationPressureMultiplier: 0.9,
    targetPriority: 2,
    color: 0xff7f8f,
    outlineColor: 0x5a1824,
    shape: "coccus",
    shortLabel: "COC",
    damageMultipliers: {
      macrophage: 0.95,
      neutrophil: 1.35,
      plasmocyte: 1.05,
      nkCell: 0.45,
      cytotoxicT: 0.28,
    },
    specialBehavior: "swarm",
  },
  proliferatingBacillus: {
    id: "proliferatingBacillus",
    pathogenClass: "bacterium",
    displayName: "Bacilles proliferants",
    scientificHint: "E. coli-like",
    description: "Bacilles equilibres capables de creer une pression par petits groupes.",
    family: "bacillus",
    archetype: "envahissant",
    antigenProfileId: "entericBacilli",
    maxHealth: 36,
    radius: 13,
    movementSpeed: 58,
    tissueDamage: 7,
    tissueAttackRange: 36,
    attackCooldownMs: 950,
    armor: 1,
    debrisDropChance: 1,
    antigenValue: 6,
    inflammationPressureMultiplier: 1,
    targetPriority: 3,
    color: 0xffa24f,
    outlineColor: 0x60330d,
    shape: "bacillus",
    shortLabel: "BAC",
    damageMultipliers: {
      macrophage: 1,
      neutrophil: 1,
      plasmocyte: 1.08,
      nkCell: 0.42,
      cytotoxicT: 0.24,
    },
    specialBehavior: "proliferator",
    spawn: {
      childTypeId: "cocciRapid",
      intervalMs: 7200,
      initialDelayMs: 5200,
      maxChildren: 2,
      spawnRadius: 44,
    },
  },
  resistantBacterium: {
    id: "resistantBacterium",
    pathogenClass: "bacterium",
    displayName: "Bacterie resistante",
    scientificHint: "Mycobacterium-like",
    description: "Tank lent, riche en antigenes, peu sensible aux attaques faibles.",
    family: "resistant",
    archetype: "tank",
    antigenProfileId: "resistantWall",
    maxHealth: 76,
    radius: 16,
    movementSpeed: 34,
    tissueDamage: 9,
    tissueAttackRange: 38,
    attackCooldownMs: 1180,
    armor: 5,
    debrisDropChance: 1,
    antigenValue: 11,
    inflammationPressureMultiplier: 1.25,
    targetPriority: 5,
    color: 0xb95c6a,
    outlineColor: 0x3f111b,
    shape: "rod",
    shortLabel: "RES",
    damageMultipliers: {
      macrophage: 1.12,
      neutrophil: 0.65,
      plasmocyte: 1.3,
      nkCell: 0.32,
      cytotoxicT: 0.2,
    },
    specialBehavior: "resistant",
  },
  biofilmColony: {
    id: "biofilmColony",
    pathogenClass: "bacterium",
    displayName: "Colonie a biofilm",
    scientificHint: "Biofilm-like",
    description: "Colonie defensive qui protege les bacteries proches.",
    family: "biofilm",
    archetype: "siege",
    antigenProfileId: "biofilmMatrix",
    maxHealth: 95,
    radius: 22,
    movementSpeed: 16,
    tissueDamage: 6,
    tissueAttackRange: 42,
    attackCooldownMs: 1250,
    armor: 3,
    debrisDropChance: 1,
    antigenValue: 14,
    inflammationPressureMultiplier: 1.35,
    targetPriority: 8,
    color: 0x7cbf72,
    outlineColor: 0x1d4f2a,
    shape: "cluster",
    shortLabel: "BIO",
    damageMultipliers: {
      macrophage: 0.95,
      neutrophil: 0.85,
      plasmocyte: 0.9,
      nkCell: 0.25,
      cytotoxicT: 0.18,
    },
    specialBehavior: "biofilmSource",
    spawn: {
      childTypeId: "proliferatingBacillus",
      intervalMs: 6200,
      initialDelayMs: 3600,
      maxChildren: 3,
      spawnRadius: 72,
    },
    biofilm: {
      radius: 118,
      damageTakenMultiplier: 0.72,
      immuneSlowMultiplier: 0.9,
      inflammationPerSecond: 0.025,
    },
  },
  toxicBacterium: {
    id: "toxicBacterium",
    pathogenClass: "bacterium",
    displayName: "Bacterie toxique",
    scientificHint: "toxin-like",
    description: "Moins nombreuse, mais augmente la pression inflammatoire et les degats tissu.",
    family: "toxic",
    archetype: "burst damage",
    antigenProfileId: "toxinProfile",
    maxHealth: 42,
    radius: 14,
    movementSpeed: 52,
    tissueDamage: 12,
    tissueAttackRange: 40,
    attackCooldownMs: 1080,
    armor: 1,
    debrisDropChance: 0.95,
    antigenValue: 7,
    inflammationPressureMultiplier: 1.75,
    targetPriority: 6,
    color: 0xd8e35f,
    outlineColor: 0x556000,
    shape: "spore",
    shortLabel: "TOX",
    damageMultipliers: {
      macrophage: 1,
      neutrophil: 1.1,
      plasmocyte: 1.05,
      nkCell: 0.38,
      cytotoxicT: 0.22,
    },
    specialBehavior: "toxic",
  },
  respiratoryVirus: {
    id: "respiratoryVirus",
    pathogenClass: "virus",
    displayName: "Virus libre",
    scientificHint: "respiratory virus-like",
    description: "Particule virale fragile qui cherche a infecter les cellules civiles.",
    family: "virus",
    archetype: "infection",
    antigenProfileId: "viralCapsid",
    maxHealth: 16,
    radius: 8,
    movementSpeed: 96,
    tissueDamage: 0,
    tissueAttackRange: 0,
    attackCooldownMs: 1000,
    armor: 0,
    debrisDropChance: 0.75,
    antigenValue: 5,
    inflammationPressureMultiplier: 0.55,
    targetPriority: 4,
    color: 0x8bbcff,
    outlineColor: 0x193b73,
    shape: "virus",
    shortLabel: "VIR",
    damageMultipliers: {
      macrophage: 0.65,
      neutrophil: 0.45,
      plasmocyte: 1.55,
      nkCell: 0.9,
      cytotoxicT: 0.7,
    },
    specialBehavior: "viral",
  },
  basicBacterium: {
    id: "basicBacterium",
    pathogenClass: "bacterium",
    displayName: "Bacterie standard",
    scientificHint: "generic wound bacterium",
    description: "Profil historique V1, conserve comme alias de bacille simple.",
    family: "bacillus",
    archetype: "standard",
    antigenProfileId: "entericBacilli",
    maxHealth: 34,
    radius: 13,
    movementSpeed: 58,
    tissueDamage: 8,
    tissueAttackRange: 36,
    attackCooldownMs: 950,
    armor: 1,
    debrisDropChance: 1,
    antigenValue: 6,
    inflammationPressureMultiplier: 1,
    targetPriority: 3,
    color: 0xff8a75,
    outlineColor: 0x4f1820,
    shape: "bacillus",
    shortLabel: "STD",
    damageMultipliers: {
      macrophage: 1,
      neutrophil: 1,
      plasmocyte: 1.08,
      nkCell: 0.42,
      cytotoxicT: 0.24,
    },
  },
  toughBacterium: {
    id: "toughBacterium",
    pathogenClass: "bacterium",
    displayName: "Bacterie resistante V1",
    scientificHint: "legacy resistant bacterium",
    description: "Profil V3 conserve pour compatibilite des tests.",
    family: "resistant",
    archetype: "tank",
    antigenProfileId: "resistantWall",
    maxHealth: 55,
    radius: 15,
    movementSpeed: 45,
    tissueDamage: 10,
    tissueAttackRange: 36,
    attackCooldownMs: 1100,
    armor: 3,
    debrisDropChance: 1,
    antigenValue: 9,
    inflammationPressureMultiplier: 1.15,
    targetPriority: 5,
    color: 0xb95c6a,
    outlineColor: 0x3f111b,
    shape: "rod",
    shortLabel: "OLD",
    damageMultipliers: {
      macrophage: 1.08,
      neutrophil: 0.75,
      plasmocyte: 1.2,
      nkCell: 0.34,
      cytotoxicT: 0.2,
    },
    specialBehavior: "resistant",
  },
};
