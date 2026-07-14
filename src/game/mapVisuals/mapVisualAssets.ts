import mapBgBloodUrl from "../../assets/maps/v11/backgrounds/map_bg_blood.png";
import mapBgIntestineUrl from "../../assets/maps/v11/backgrounds/map_bg_intestine.png";
import mapBgLungUrl from "../../assets/maps/v11/backgrounds/map_bg_lung.png";
import mapBgLymphUrl from "../../assets/maps/v11/backgrounds/map_bg_lymph.png";
import mapBgMixedUrl from "../../assets/maps/v11/backgrounds/map_bg_mixed.png";
import mapBgSkinMultiUrl from "../../assets/maps/v11/backgrounds/map_bg_skin_multi.png";
import mapBgSkinSmallWoundUrl from "../../assets/maps/v11/backgrounds/map_bg_skin_small_wound.png";
import diapedesisEntryRingUrl from "../../assets/maps/v11/markers/diapedesis-entry-ring.png";
import lymphaticExitUrl from "../../assets/maps/v11/markers/lymphatic-exit.png";
import type {
  TacticalMapDefinition,
  TacticalMapId,
} from "../data/tacticalMaps";

export type LayerABackgroundAsset = {
  key: string;
  url: string;
  layer: "A";
  role: "background";
  tacticalMapIds: TacticalMapId[];
  backgroundTypes: TacticalMapDefinition["backgroundType"][];
  opacity: number;
};

export const MAP_LAYER_A_BACKGROUND_BY_TEMPLATE: Record<
  TacticalMapId,
  LayerABackgroundAsset
> = {
  skin_small_wound_fixed: {
    key: "map_bg_skin_small_wound",
    url: mapBgSkinSmallWoundUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["skin_small_wound_fixed"],
    backgroundTypes: ["skin"],
    opacity: 0.92,
  },
  skin_multi_wound_template: {
    key: "map_bg_skin_multi",
    url: mapBgSkinMultiUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["skin_multi_wound_template"],
    backgroundTypes: ["skin"],
    opacity: 0.9,
  },
  lung_branching_vessels_template: {
    key: "map_bg_lung",
    url: mapBgLungUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["lung_branching_vessels_template"],
    backgroundTypes: ["lung"],
    opacity: 0.9,
  },
  intestine_clustered_sites_template: {
    key: "map_bg_intestine",
    url: mapBgIntestineUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["intestine_clustered_sites_template"],
    backgroundTypes: ["intestine"],
    opacity: 0.9,
  },
  blood_vessel_crossroads_template: {
    key: "map_bg_blood",
    url: mapBgBloodUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["blood_vessel_crossroads_template"],
    backgroundTypes: ["blood"],
    opacity: 0.9,
  },
  lymph_node_signal_template: {
    key: "map_bg_lymph",
    url: mapBgLymphUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["lymph_node_signal_template"],
    backgroundTypes: ["lymph"],
    opacity: 0.9,
  },
  infinite_large_tissue_template: {
    key: "map_bg_mixed",
    url: mapBgMixedUrl,
    layer: "A",
    role: "background",
    tacticalMapIds: ["infinite_large_tissue_template"],
    backgroundTypes: ["mixed"],
    opacity: 0.9,
  },
};

export const MAP_LAYER_A_BACKGROUNDS: LayerABackgroundAsset[] = Object.values(
  MAP_LAYER_A_BACKGROUND_BY_TEMPLATE,
);

export const MAP_LAYER_A_FALLBACK_BACKGROUND =
  MAP_LAYER_A_BACKGROUND_BY_TEMPLATE.infinite_large_tissue_template;

export const DIAPEDESIS_ENTRY_MARKER_ASSET = {
  key: "v11-diapedesis-entry-ring",
  url: diapedesisEntryRingUrl,
} as const;

export const LYMPHATIC_EXIT_MARKER_ASSET = {
  key: "v11-lymphatic-exit",
  url: lymphaticExitUrl,
} as const;

export function getLayerABackgroundForMap(
  tacticalMap: TacticalMapDefinition,
): LayerABackgroundAsset {
  return (
    MAP_LAYER_A_BACKGROUND_BY_TEMPLATE[tacticalMap.id] ??
    MAP_LAYER_A_FALLBACK_BACKGROUND
  );
}
