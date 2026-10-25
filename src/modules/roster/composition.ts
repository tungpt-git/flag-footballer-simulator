import { connection } from "next/server";
import { createPlayerUseCases } from "./application/playerUseCases";
import type { PlayerProfile } from "./domain/player";
import { prismaPlayerRepository } from "./infrastructure/prismaPlayerRepository";
import { createPlayerHandlers } from "./presentation/api/playerHandlers";

/** Server-side composition root: binds the Prisma adapter to the use cases, HTTP handlers and Server Component loaders. */
export const playerUseCases = createPlayerUseCases(prismaPlayerRepository);

export const playerHandlers = createPlayerHandlers(playerUseCases);

/** Reads the roster at request time. Call from Server Components inside a `<Suspense>` boundary. */
export const getPlayers = async (): Promise<PlayerProfile[]> => {
  await connection();
  return playerUseCases.listPlayers();
};
