export const unitDefinitions = {
  macrophage: {
    id: "macrophage",
    displayName: "Macrophage",
    atpCost: 35,
    cytokineCost: 0,
    maxHealth: 80,
    radius: 22,
    movementSpeed: 110,
    idleMovementSpeed: 18,
    attackRange: 58,
    attackDamage: 14,
    attackCooldownMs: 700,
    spawnPosition: { x: 250, y: 360 },
  },
  neutrophil: {
    id: "neutrophil",
    displayName: "Neutrophile",
    atpCost: 25,
    cytokineCost: 18,
    maxHealth: 45,
    radius: 17,
    movementSpeed: 165,
    idleMovementSpeed: 28,
    attackRange: 52,
    attackDamage: 19,
    attackCooldownMs: 520,
    spawnPosition: { x: 250, y: 405 },
  },
} as const;

export type UnitTypeId = keyof typeof unitDefinitions;
