import type { Route as RouteRecord } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import type { DecisionPoint, Route, RouteWaypoint } from "../domain/route";
import type { RouteRepository } from "../domain/routeRepository";

const toRoute = (route: RouteRecord): Route => ({
  id: route.id,
  name: route.name,
  type: route.type,
  waypoints: route.waypoints as RouteWaypoint[],
  decisionPoints: route.decisionPoints as DecisionPoint[],
});

export const prismaRouteRepository: RouteRepository = {
  findAll: async () => {
    const routes = await prisma.route.findMany({ orderBy: { name: "asc" } });
    return routes.map(toRoute);
  },
};
