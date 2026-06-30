export const routes = {
  home: "home",
  campaign: "campaign",
  game: "game",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
