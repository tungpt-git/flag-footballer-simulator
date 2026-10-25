import { connection } from "next/server";
import { createRouteUseCases } from "./application/routeUseCases";
import type { Route } from "./domain/route";
import { prismaRouteRepository } from "./infrastructure/prismaRouteRepository";
import { createRouteHandlers } from "./presentation/api/routeHandlers";

/** Server-side composition root: binds the Prisma adapter to the use cases, HTTP handlers and Server Component loaders. */
const routeUseCases = createRouteUseCases(prismaRouteRepository);

export const routeHandlers = createRouteHandlers(routeUseCases);

/** Reads the route catalog at request time. Call from Server Components inside a `<Suspense>` boundary. */
export const getRoutes = async (): Promise<Route[]> => {
  await connection();
  return routeUseCases.listRoutes();
};
