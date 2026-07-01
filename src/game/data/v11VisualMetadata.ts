import type { V11VisualIdentity } from "../bodyMap/bodyMapTypes";

export type V11VisualMetadataId =
  | "civilianCell"
  | "infectedCell"
  | "antibody"
  | "cytokines"
  | "inflammation"
  | "regionalLymphNode"
  | "lymphExit"
  | "vaccination"
  | "immuneMemory";

export const v11VisualMetadata: Record<V11VisualMetadataId, V11VisualIdentity> = {
  civilianCell: {
    shapeHint: "cellule ronde saine",
    colorHint: "vert tendre",
    silhouetteHint: "cellule civile fragile",
    animationHint: "pulsation lente de tissu vivant",
    effectHint: "halo de sante faible",
    sizeClass: "medium",
    movementStyle: "static_tissue",
    vfxTags: ["tissue", "healthy", "civilian"],
    futureSpriteKey: "cell_civilian",
    futureSoundHint: "soft_tissue_pulse",
  },
  infectedCell: {
    shapeHint: "cellule saine envahie par particules virales",
    colorHint: "violet bleu",
    silhouetteHint: "cellule deformee",
    animationHint: "pulsation instable puis burst viral",
    effectHint: "halo d'infection",
    sizeClass: "medium",
    movementStyle: "static_infected",
    vfxTags: ["tissue", "infected", "virus"],
    futureSpriteKey: "cell_infected",
    futureSoundHint: "infection_tick",
  },
  antibody: {
    shapeHint: "forme Y tres lisible",
    colorHint: "cyan clair",
    silhouetteHint: "Y adaptatif",
    animationHint: "petit verrouillage vers cible",
    effectHint: "neutralisation brillante",
    sizeClass: "tiny",
    movementStyle: "homing_support",
    vfxTags: ["adaptive", "antibody", "neutralization"],
    futureSpriteKey: "fx_antibody_y",
    futureSoundHint: "antibody_chime",
  },
  cytokines: {
    shapeHint: "micro-particules circulaires",
    colorHint: "jaune ambre",
    silhouetteHint: "points de signal",
    animationHint: "diffusion rapide",
    effectHint: "ondes de recrutement",
    sizeClass: "tiny",
    movementStyle: "signal_particles",
    vfxTags: ["cytokine", "signal", "recruitment"],
    futureSpriteKey: "fx_cytokines",
    futureSoundHint: "signal_pop",
  },
  inflammation: {
    shapeHint: "halo de zone chaude",
    colorHint: "rouge orange",
    silhouetteHint: "zone circulaire pulsante",
    animationHint: "pulsation plus intense aux seuils dangereux",
    effectHint: "chaleur et bord tremblant",
    sizeClass: "large",
    movementStyle: "area_pulse",
    vfxTags: ["inflammation", "danger", "zone"],
    futureSpriteKey: "fx_inflammation_zone",
    futureSoundHint: "inflammation_rumble",
  },
  regionalLymphNode: {
    shapeHint: "noeud lumineux",
    colorHint: "violet et cyan",
    silhouetteHint: "petit centre d'analyse",
    animationHint: "charge de signal antigenique",
    effectHint: "anneaux de traitement",
    sizeClass: "medium",
    movementStyle: "static_analyzer",
    vfxTags: ["lymph", "analysis", "antigen"],
    futureSpriteKey: "building_lymph_node",
    futureSoundHint: "analysis_loop",
  },
  lymphExit: {
    shapeHint: "portail lymphatique",
    colorHint: "cyan pale",
    silhouetteHint: "sortie circulaire",
    animationHint: "aspiration douce des dendritiques",
    effectHint: "filet de lymphe",
    sizeClass: "medium",
    movementStyle: "exit_portal",
    vfxTags: ["lymph", "exit", "delivery"],
    futureSpriteKey: "building_lymph_exit",
    futureSoundHint: "lymph_delivery",
  },
  vaccination: {
    shapeHint: "preparation pre-mission",
    colorHint: "bleu medical et or",
    silhouetteHint: "badge de preparation",
    animationHint: "activation avant lancement",
    effectHint: "bonus leger au demarrage",
    sizeClass: "small",
    movementStyle: "pre_mission",
    vfxTags: ["vaccination", "preparation", "memory"],
    futureSpriteKey: "ui_vaccination",
    futureSoundHint: "prep_confirm",
  },
  immuneMemory: {
    shapeHint: "archive de profils antigeniques",
    colorHint: "or doux et violet",
    silhouetteHint: "memoire cellulaire abstraite",
    animationHint: "rappel lumineux discret",
    effectHint: "signal de deja-vu immunitaire",
    sizeClass: "small",
    movementStyle: "persistent_bonus",
    vfxTags: ["memory", "adaptive", "profile"],
    futureSpriteKey: "ui_immune_memory",
    futureSoundHint: "memory_recall",
  },
};
