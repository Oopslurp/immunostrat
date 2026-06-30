export const routes = {
  home: "home",
  campaign: "campaign",
  bodyMap: "bodyMap",
  infinite: "infinite",
  game: "game",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
