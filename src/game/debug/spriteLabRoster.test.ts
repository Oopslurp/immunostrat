import { describe, expect, it } from "vitest";
import { pathogenDefinitions } from "../data/pathogens";
import { unitDefinitions } from "../data/units";
import {
  spriteLabPathogens,
  spriteLabUnits,
  spriteLabWorldWidth,
} from "./spriteLabRoster";

describe("sprite lab roster", () => {
  it("lists every immune unit exactly once on one row", () => {
    expect(spriteLabUnits.map((entry) => entry.id)).toEqual(
      Object.keys(unitDefinitions),
    );
    expect(new Set(spriteLabUnits.map((entry) => entry.id)).size).toBe(
      spriteLabUnits.length,
    );
    expect(new Set(spriteLabUnits.map((entry) => entry.y)).size).toBe(1);
  });

  it("lists every pathogen exactly once on a separate row", () => {
    expect(spriteLabPathogens.map((entry) => entry.id)).toEqual(
      Object.keys(pathogenDefinitions),
    );
    expect(new Set(spriteLabPathogens.map((entry) => entry.id)).size).toBe(
      spriteLabPathogens.length,
    );
    expect(new Set(spriteLabPathogens.map((entry) => entry.y)).size).toBe(1);
    expect(spriteLabPathogens[0]?.y).not.toBe(spriteLabUnits[0]?.y);
  });

  it("keeps the full roster inside the horizontal debug world", () => {
    const lastX = Math.max(
      spriteLabUnits.at(-1)?.x ?? 0,
      spriteLabPathogens.at(-1)?.x ?? 0,
    );

    expect(spriteLabWorldWidth).toBeGreaterThan(lastX);
  });
});
