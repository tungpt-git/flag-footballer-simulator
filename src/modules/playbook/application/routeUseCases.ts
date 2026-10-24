import type { Route } from "../domain/route";
import type { RouteRepository } from "../domain/routeRepository";

export type RouteUseCases = {
  listRoutes: () => Promise<Route[]>;
};

export const createRouteUseCases = (repository: RouteRepository): RouteUseCases => ({
  listRoutes: () => repository.findAll(),
});
