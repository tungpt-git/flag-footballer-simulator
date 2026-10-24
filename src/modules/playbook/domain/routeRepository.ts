import type { Route } from "./route";

/** Persistence port for the Route aggregate. */
export type RouteRepository = {
  findAll: () => Promise<Route[]>;
};
