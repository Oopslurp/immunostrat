import type { GameState } from "../game/simulation/core/GameState";
import type { GameAudioEvent } from "./audioEvents";

export class CombatAudioTracker {
  private previous: GameState | null = null;

  reset(state?: GameState): void {
    this.previous = state ?? null;
  }

  update(state: GameState): GameAudioEvent[] {
    const previous = this.previous;
    this.previous = state;

    if (!previous || state.elapsedMs < previous.elapsedMs) {
      return [];
    }

    const events: GameAudioEvent[] = [];
    const worldWidth = state.tacticalMap.worldWidth;
    const previousEffects = new Set(previous.effects.map((effect) => effect.id));

    for (const effect of state.effects) {
      if (previousEffects.has(effect.id)) continue;
      const source = effect.sourceEntityId
        ? state.entities[effect.sourceEntityId] ?? previous.entities[effect.sourceEntityId]
        : undefined;
      const name =
        effect.kind === "cytotoxic"
          ? source?.kind === "nkCell"
            ? "nk"
            : "cytotoxicT"
          : mapEffectKind(effect.kind);
      if (name) {
        events.push({ name, priority: getPriority(name), x: effect.position.x, y: effect.position.y, worldWidth });
      }
    }

    const previousNetIds = new Set(previous.netTraps.map((trap) => trap.id));
    for (const trap of state.netTraps) {
      if (!previousNetIds.has(trap.id)) {
        events.push({ name: "net", priority: 1, x: trap.position.x, y: trap.position.y, worldWidth });
      }
    }

    const previousBiofilmIds = new Set(previous.biofilmZones.map((zone) => zone.id));
    for (const zone of state.biofilmZones) {
      if (!previousBiofilmIds.has(zone.id)) {
        events.push({ name: "biofilm", priority: 2, x: zone.position.x, y: zone.position.y, worldWidth });
      }
    }

    const previousKills = sumCounts(previous.missionStats.pathogenKills);
    const nextKills = sumCounts(state.missionStats.pathogenKills);
    if (nextKills > previousKills) {
      events.push({ name: "clearance", priority: 2 });
    }

    if (
      state.missionStats.lymphSignalsDelivered >
      previous.missionStats.lymphSignalsDelivered
    ) {
      events.push({ name: "lymph", priority: 1 });
    }

    for (const entity of Object.values(state.entities)) {
      const previousEntity = previous.entities[entity.id];
      if (
        "carriedDebrisCount" in entity &&
        previousEntity &&
        "carriedDebrisCount" in previousEntity &&
        entity.carriedDebrisCount > previousEntity.carriedDebrisCount
      ) {
        events.push({ name: "dendritic", priority: 2, x: entity.position.x, y: entity.position.y, worldWidth });
        break;
      }
    }

    if (
      state.selectedEntityIds.join("|") !== previous.selectedEntityIds.join("|") &&
      state.selectedEntityIds.length > 0
    ) {
      events.push({ name: "selection", priority: 2 });
    }

    return dedupeEvents(events);
  }
}

function mapEffectKind(kind: GameState["effects"][number]["kind"]): GameAudioEvent["name"] | null {
  const mapping: Partial<Record<typeof kind, GameAudioEvent["name"]>> = {
    attack: "combat",
    tissueDamage: "combat",
    antibody: "antibody",
    antibodyImpact: "antibody",
    adaptive: "special",
    phagocytosis: "phagocytosis",
    infection: "infection",
    antiviral: "special",
    treatment: "special",
    netTrap: "net",
  };
  return mapping[kind] ?? null;
}

function getPriority(name: GameAudioEvent["name"]): AudioPriority {
  if (["phagocytosis", "net", "lymph", "wave", "victory", "defeat"].includes(name)) {
    return 1;
  }
  if (["combat", "antibody"].includes(name)) {
    return 3;
  }
  return 2;
}

type AudioPriority = 1 | 2 | 3;

function sumCounts(counts: Partial<Record<string, number>>): number {
  let total = 0;
  for (const value of Object.values(counts)) total += value ?? 0;
  return total;
}

function dedupeEvents(events: GameAudioEvent[]): GameAudioEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const bucket = typeof event.x === "number" ? Math.floor(event.x / 96) : 0;
    const key = `${event.name}-${bucket}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
