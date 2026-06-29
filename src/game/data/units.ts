export const unitDefinitions = {
  macrophage: {
    id: "macrophage",
    displayName: "Macrophage",
    atpCost: 35,
    maxHealth: 80,
    radius: 22,
    movementSpeed: 110,
    idleMovementSpeed: 18,
    attackRange: 58,
    attackDamage: 14,
    attackCooldownMs: 700,
    spawnPosition: { x: 250, y: 360 },
  },
} as const;

export type UnitTypeId = keyof typeof unitDefinitions;
