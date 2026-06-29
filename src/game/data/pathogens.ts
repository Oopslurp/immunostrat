export const pathogenDefinitions = {
  basicBacterium: {
    id: "basicBacterium",
    displayName: "Bacterie",
    maxHealth: 34,
    radius: 13,
    movementSpeed: 58,
    tissueDamage: 8,
    tissueAttackRange: 36,
    attackCooldownMs: 950,
  },
  toughBacterium: {
    id: "toughBacterium",
    displayName: "Bacterie resistante",
    maxHealth: 55,
    radius: 15,
    movementSpeed: 45,
    tissueDamage: 10,
    tissueAttackRange: 36,
    attackCooldownMs: 1100,
  },
} as const;

export type PathogenTypeId = keyof typeof pathogenDefinitions;
