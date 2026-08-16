export type TreatmentId = "antibiotic" | "antiviralDrug" | "antiInflammatory";

export type TreatmentDefinition = {
  id: TreatmentId;
  displayName: string;
  shortLabel: string;
  gameplayDescription: string;
  scienceDescription: string;
  simplificationNote: string;
  atpCost: number;
  cytokineCost: number;
  antigenCost: number;
  cooldownMs: number;
  durationMs: number;
  radius: number;
  visualIdentity: {
    shapeHint: string;
    colorHint: string;
    silhouetteHint: string;
    animationHint: string;
    effectHint: string;
    sizeClass: "small" | "medium" | "large" | "systemic";
    movementStyle: string;
    vfxTags: string[];
    futureSpriteKey?: string;
    futureSoundHint?: string;
  };
};

export const treatmentDefinitions: Record<TreatmentId, TreatmentDefinition> = {
  antibiotic: {
    id: "antibiotic",
    displayName: "Antibiotique",
    shortLabel: "ATB",
    gameplayDescription:
      "Inflige des dégâts modérés aux bactéries et affaiblit leur pression, avec efficacité réduite contre le biofilm.",
    scienceDescription:
      "Inspiré des médicaments qui ciblent des processus bactériens, sans effet direct sur les virus.",
    simplificationNote:
      "Le jeu condense l'effet en une impulsion tactique lisible, pas en traitement medical realiste.",
    atpCost: 34,
    cytokineCost: 10,
    antigenCost: 0,
    cooldownMs: 24000,
    durationMs: 0,
    radius: 360,
    visualIdentity: {
      shapeHint: "capsule tactique stylisee",
      colorHint: "bleu medical et blanc",
      silhouetteHint: "onde circulaire antibacterienne",
      animationHint: "pulse bref sur les bacteries",
      effectHint: "marques antibacteriennes",
      sizeClass: "systemic",
      movementStyle: "instant_pulse",
      vfxTags: ["treatment", "antibiotic", "bacteria"],
      futureSpriteKey: "treatment_antibiotic",
      futureSoundHint: "clean_medical_pulse",
    },
  },
  antiviralDrug: {
    id: "antiviralDrug",
    displayName: "Antiviral",
    shortLabel: "AV",
    gameplayDescription:
      "Ralentit les virus libres et reduit la production virale des cellules infectees pendant une courte duree.",
    scienceDescription:
      "Inspire des traitements qui limitent la replication virale sans detruire instantanement les cellules infectees.",
    simplificationNote:
      "Il ralentit la propagation mais ne remplace pas les interférons, NK ou T cytotoxiques.",
    atpCost: 30,
    cytokineCost: 18,
    antigenCost: 0,
    cooldownMs: 26000,
    durationMs: 14000,
    radius: 520,
    visualIdentity: {
      shapeHint: "signal antiviral radial",
      colorHint: "cyan et bleu clair",
      silhouetteHint: "champ protecteur",
      animationHint: "aura persistante qui ralentit les virus",
      effectHint: "particules bleues autour des cellules",
      sizeClass: "systemic",
      movementStyle: "persistent_field",
      vfxTags: ["treatment", "antiviral", "virus"],
      futureSpriteKey: "treatment_antiviral",
      futureSoundHint: "viral_slow_field",
    },
  },
  antiInflammatory: {
    id: "antiInflammatory",
    displayName: "Anti-inflammatoire",
    shortLabel: "AIF",
    gameplayDescription:
      "Fait baisser l'inflammation et les zones inflammatoires, mais attenue temporairement le bonus offensif.",
    scienceDescription:
      "Inspire des traitements qui diminuent une inflammation excessive pour proteger les tissus.",
    simplificationNote:
      "Dans le jeu, c'est un choix tactique : moins de degats collateraux, mais une reponse moins agressive.",
    atpCost: 22,
    cytokineCost: 0,
    antigenCost: 0,
    cooldownMs: 22000,
    durationMs: 12000,
    radius: 0,
    visualIdentity: {
      shapeHint: "vague douce de refroidissement",
      colorHint: "vert pale et cyan",
      silhouetteHint: "filtre calme",
      animationHint: "diminution progressive des halos rouges",
      effectHint: "brume apaisante",
      sizeClass: "systemic",
      movementStyle: "cooldown_wave",
      vfxTags: ["treatment", "inflammation", "calm"],
      futureSpriteKey: "treatment_anti_inflammatory",
      futureSoundHint: "inflammation_cooldown",
    },
  },
};
