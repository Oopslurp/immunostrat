export const routes = {
  home: "home",
  campaign: "campaign",
  normal: "normal",
  bodyMap: "bodyMap",
  infinite: "infinite",
  game: "game",
  spriteLab: "spriteLab",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
