import { createPlayerUseCases } from "./application/playerUseCases";
import type { PlayerProfile } from "./domain/player";
import { prismaPlayerRepository } from "./infrastructure/prismaPlayerRepository";
import { createPlayerHandlers } from "./presentation/api/playerHandlers";
import { cacheLife } from "next/cache";

/** Server-side composition root: binds the Prisma adapter to the use cases, HTTP handlers and Server Component loaders. */
export const playerUseCases = createPlayerUseCases(prismaPlayerRepository);

export const playerHandlers = createPlayerHandlers(playerUseCases);

/** Reads the roster at request time. Call from Server Components inside a `<Suspense>` boundary. */
export const getPlayers = async (): Promise<PlayerProfile[]> => {
  "use cache";
  cacheLife("hours");
  return playerUseCases.listPlayers();
};
