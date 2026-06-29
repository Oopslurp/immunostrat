import { describe, expect, it } from "vitest";
import { routes } from "../app/routes";
import { balanceValues } from "../game/data/balance";
import { scienceNotes } from "../game/content/scienceNotes";

describe("project foundation", () => {
  it("keeps navigation and content placeholders available", () => {
    expect(routes.home).toBe("home");
    expect(routes.game).toBe("game");
    expect(balanceValues.startingAtp).toBeGreaterThan(0);
    expect(scienceNotes).toEqual([]);
  });
});
