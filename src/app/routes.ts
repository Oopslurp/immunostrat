export const routes = {
  home: "home",
  game: "game",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
