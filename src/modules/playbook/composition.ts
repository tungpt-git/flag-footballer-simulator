import { createRouteUseCases } from "./application/routeUseCases";
import { prismaRouteRepository } from "./infrastructure/prismaRouteRepository";
import { createRouteHandlers } from "./presentation/api/routeHandlers";

/** Server-side composition root: binds the Prisma adapter to the use cases and HTTP handlers. */
export const routeHandlers = createRouteHandlers(createRouteUseCases(prismaRouteRepository));
