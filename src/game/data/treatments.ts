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
};

export const treatmentDefinitions: Record<TreatmentId, TreatmentDefinition> = {
  antibiotic: {
    id: "antibiotic",
    displayName: "Antibiotique",
    shortLabel: "ATB",
    gameplayDescription:
      "Inflige des degats moderes aux bacteries et affaiblit leur pression, avec efficacite reduite contre biofilm.",
    scienceDescription:
      "Inspire des medicaments qui ciblent des processus bacteriens, sans effet direct sur les virus.",
    simplificationNote:
      "Le jeu condense l'effet en une impulsion tactique lisible, pas en traitement medical realiste.",
    atpCost: 34,
    cytokineCost: 10,
    antigenCost: 0,
    cooldownMs: 24000,
    durationMs: 0,
    radius: 360,
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
      "Il ralentit la propagation mais ne remplace pas les interferons, NK ou T cytotoxiques.",
    atpCost: 30,
    cytokineCost: 18,
    antigenCost: 0,
    cooldownMs: 26000,
    durationMs: 14000,
    radius: 520,
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
  },
};
