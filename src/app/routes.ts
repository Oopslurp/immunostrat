export const routes = {
  home: "home",
  campaign: "campaign",
  normal: "normal",
  bodyMap: "bodyMap",
  infinite: "infinite",
  game: "game",
  encyclopedia: "encyclopedia",
  scienceVsGameplay: "scienceVsGameplay",
  spriteLab: "spriteLab",
} as const;

export type StaticAppRoute = (typeof routes)[keyof typeof routes];
export type EncyclopediaEntryRoute = `encyclopedia/${string}`;
export type AppRoute = StaticAppRoute | EncyclopediaEntryRoute;

const routePaths: Record<StaticAppRoute, string> = {
  [routes.home]: "",
  [routes.campaign]: "play/campaign",
  [routes.normal]: "play/normal",
  [routes.bodyMap]: "play/body-map",
  [routes.infinite]: "play/infinite",
  [routes.game]: "play/battle",
  [routes.encyclopedia]: "encyclopedia",
  [routes.scienceVsGameplay]: "science-vs-gameplay",
  [routes.spriteLab]: "lab/sprites",
};

const pathRoutes = new Map(
  Object.entries(routePaths).map(([route, path]) => [path, route as StaticAppRoute]),
);

export function encyclopediaEntryRoute(entryId: string): EncyclopediaEntryRoute {
  return `encyclopedia/${entryId}`;
}

export function getEncyclopediaEntryId(route: AppRoute): string | null {
  return route.startsWith("encyclopedia/")
    ? route.slice("encyclopedia/".length)
    : null;
}

export function appRouteToHash(route: AppRoute): string {
  const path = route.startsWith("encyclopedia/")
    ? route
    : routePaths[route as StaticAppRoute];

  return path ? `#/${path}` : "#/";
}

export function appRouteFromHash(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, "").replace(/\/+$/, "");

  if (path.startsWith("encyclopedia/") && path.length > "encyclopedia/".length) {
    return path as EncyclopediaEntryRoute;
  }

  return pathRoutes.get(path) ?? routes.home;
}
