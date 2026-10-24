import { createPlayerUseCases } from "./application/playerUseCases";
import { prismaPlayerRepository } from "./infrastructure/prismaPlayerRepository";
import { createPlayerHandlers } from "./presentation/api/playerHandlers";

/** Server-side composition root: binds the Prisma adapter to the use cases and HTTP handlers. */
export const playerHandlers = createPlayerHandlers(createPlayerUseCases(prismaPlayerRepository));
