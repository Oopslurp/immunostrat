export function createRunSeed(prefix: string): string {
  const now = Date.now().toString(36);
  const entropy =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
      : now;

  return `${prefix}-${now}-${entropy}`;
}

export function deriveSeed(...parts: Array<string | number | undefined | null>): string {
  return parts
    .filter((part): part is string | number => part !== undefined && part !== null)
    .map((part) => String(part))
    .join("|");
}

export function createSeededRandom(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;

    return (hash >>> 0) / 4294967296;
  };
}

export function randomInRange(
  random: () => number,
  min: number,
  max: number,
): number {
  return min + (max - min) * random();
}

export function randomIntInRange(
  random: () => number,
  min: number,
  max: number,
): number {
  return Math.round(randomInRange(random, min, max));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
