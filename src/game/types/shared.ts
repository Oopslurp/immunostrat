export type SceneKey = "BootScene" | "PreloadScene" | "MissionScene";

export type EntityId = string;

export type Vector2 = {
  x: number;
  y: number;
};

export type GameStatus = "running" | "victory" | "defeat";

export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(distanceSquared(a, b));
}

export function distanceSquared(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}

export function moveToward(
  current: Vector2,
  target: Vector2,
  maxDistance: number,
): Vector2 {
  const currentDistance = distance(current, target);

  if (currentDistance <= maxDistance || currentDistance === 0) {
    return { ...target };
  }

  const ratio = maxDistance / currentDistance;

  return {
    x: current.x + (target.x - current.x) * ratio,
    y: current.y + (target.y - current.y) * ratio,
  };
}

export function stableHash(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}
