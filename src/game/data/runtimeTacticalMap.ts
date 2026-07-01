import { missionDefinitions, type MissionId, type MissionPreparation } from "./missions";
import {
  generateTacticalMapFromTemplate,
  type GeneratedTacticalMapDefinition,
  type TacticalMapDifficulty,
} from "./tacticalMapGenerator";
import type { TacticalMapMode } from "./tacticalMaps";

export function createRuntimeTacticalMap(
  missionId: MissionId,
  preparation: MissionPreparation = {},
): GeneratedTacticalMapDefinition {
  const mission = missionDefinitions[missionId];
  const mode = getRuntimeMapMode(mission.mode, preparation);
  const templateId =
    preparation.tacticalMapTemplateId ??
    mission.map.tacticalMapId ??
    "skin_small_wound_fixed";
  const seed =
    preparation.tacticalMapSeed ??
    (mode === "campaign"
      ? `campaign-fixed-${missionId}-${templateId}`
      : `${mode}-fallback-${missionId}-${templateId}`);

  return generateTacticalMapFromTemplate({
    templateId,
    seed,
    mode,
    regionType: preparation.tacticalRegionType,
    threatType: preparation.tacticalThreatType,
    difficulty: preparation.tacticalDifficulty ?? mapInfiniteDifficulty(preparation),
  });
}

function getRuntimeMapMode(
  missionMode: string | undefined,
  preparation: MissionPreparation,
): TacticalMapMode {
  if (preparation.tacticalMapMode) {
    return preparation.tacticalMapMode;
  }

  if (missionMode === "infinite") {
    return "infinite";
  }

  if (preparation.bodyRegionId) {
    return "bodyBattle";
  }

  return "campaign";
}

function mapInfiniteDifficulty(
  preparation: MissionPreparation,
): TacticalMapDifficulty {
  if (preparation.infiniteDifficulty === "hard" || preparation.infiniteDifficulty === "nightmare") {
    return "hard";
  }

  return "normal";
}
